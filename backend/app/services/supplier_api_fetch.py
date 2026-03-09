# -*- coding: utf-8 -*-
"""Сервис выкачки номенклатуры по API поставщика. Используется в ручном запуске и CRON."""

from datetime import date
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import check_entity_limit, check_nomenclature_per_supplier_limit
from app.models.entity import Nomenclature, Supplier


def _parse_date(val: str) -> date | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip()[:10]
    if len(s) < 8:
        return None
    try:
        if "-" in s and s.count("-") == 2:
            parts = s.split("-")
            if len(parts[0]) == 4:
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            return date(int(parts[2]), int(parts[1]), int(parts[0]))
        if "." in s and s.count(".") == 2:
            parts = s.split(".")
            if len(parts[2]) == 4:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        return None
    except (ValueError, TypeError, IndexError):
        return None


async def fetch_supplier_api(db: AsyncSession, supplier_id: int, company_id: int) -> dict[str, Any]:
    """
    Выкачка номенклатуры по API поставщика.
    Возвращает {"created": int, "updated": int, "error": str | None}.
    """
    r = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.company_id == company_id,
            Supplier.is_deleted == False,
        )
    )
    sup = r.scalar_one_or_none()
    if not sup:
        return {"created": 0, "updated": 0, "error": "Поставщик не найден"}
    cfg = (sup.extra_fields or {}).get("import_config") or {}
    src = cfg.get("import_source")
    if src not in ("api", "oauth"):
        return {"created": 0, "updated": 0, "error": "Источник импорта не API/OAuth"}
    api_url = (cfg.get("api_url") or "").strip()
    if not api_url:
        return {"created": 0, "updated": 0, "error": "Не указан URL API"}
    api_key = (cfg.get("api_key") or "").strip() or None
    field_map = cfg.get("api_field_map") or {}
    if not field_map:
        field_map = {"barcode": "ean", "name": "name", "purchase_price": "price", "stock": "stock", "expiry_date": "expiry_date"}

    headers: dict[str, str] = {"Accept": "application/json"}
    if src == "oauth":
        access_token = (cfg.get("oauth_access_token") or "").strip()
        if not access_token:
            return {"created": 0, "updated": 0, "error": "OAuth не подключен. Выполните подключение."}
        headers["Authorization"] = f"Bearer {access_token}"
    elif api_key:
        headers["Authorization"] = f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(api_url, headers=headers)
    except Exception as e:
        return {"created": 0, "updated": 0, "error": str(e)}
    if resp.status_code != 200:
        return {"created": 0, "updated": 0, "error": f"API вернул {resp.status_code}: {resp.text[:150]}"}
    try:
        data = resp.json()
    except Exception as e:
        return {"created": 0, "updated": 0, "error": f"Некорректный JSON: {e}"}
    items = data if isinstance(data, list) else (data.get("items") or data.get("data") or data.get("products") or [])
    if not isinstance(items, list):
        return {"created": 0, "updated": 0, "error": "Ожидается массив или {items: [...]}"}

    created = 0
    updated = 0
    for row in items:
        if not isinstance(row, dict):
            continue
        nom_data: dict[str, Any] = {}
        for our_key, apik in field_map.items():
            val = row.get(apik)
            if val is None:
                continue
            if our_key == "purchase_price" or our_key == "stock":
                try:
                    nom_data[our_key] = float(str(val).replace(",", "."))
                except (ValueError, TypeError):
                    pass
            elif our_key == "expiry_date":
                nom_data[our_key] = _parse_date(str(val)) if val else None
            else:
                nom_data[our_key] = str(val).strip()[:255] if our_key in ("name", "code") else str(val).strip()[:100]
        name_val = (nom_data.get("name") or nom_data.get("barcode") or nom_data.get("code") or "").strip()
        if not name_val:
            continue
        barcode_val = (nom_data.get("barcode") or "").strip() or None
        existing = None
        if barcode_val:
            ex_r = await db.execute(
                select(Nomenclature).where(
                    Nomenclature.company_id == company_id,
                    Nomenclature.barcode == barcode_val,
                    Nomenclature.is_deleted == False,
                )
            )
            existing = ex_r.scalar_one_or_none()
        if existing:
            if nom_data.get("purchase_price") is not None:
                existing.purchase_price = nom_data["purchase_price"]
            if nom_data.get("stock") is not None:
                existing.stock = nom_data["stock"]
            if nom_data.get("expiry_date") is not None:
                existing.expiry_date = nom_data["expiry_date"]
            existing.supplier_id = supplier_id
            updated += 1
        else:
            await check_entity_limit(company_id, "nomenclature", db)
            await check_nomenclature_per_supplier_limit(company_id, supplier_id, db)
            nom = Nomenclature(
                company_id=company_id,
                name=name_val[:255],
                code=nom_data.get("code") or None,
                barcode=barcode_val,
                purchase_price=nom_data.get("purchase_price"),
                stock=nom_data.get("stock"),
                expiry_date=nom_data.get("expiry_date"),
                supplier_id=supplier_id,
            )
            db.add(nom)
            created += 1
    await db.commit()
    return {"created": created, "updated": updated, "error": None}
