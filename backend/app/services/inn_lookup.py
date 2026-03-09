# -*- coding: utf-8 -*-
"""Поиск организации по ИНН: entity_registry -> DaData API."""

import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.entity_registry import EntityRegistry

logger = logging.getLogger(__name__)

DADATA_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"


def _normalize_inn(inn: str) -> str | None:
    """Оставляем только цифры. ИНН 10 или 12 символов."""
    clean = "".join(c for c in str(inn or "").strip() if c.isdigit())
    if not clean or len(clean) not in (10, 12):
        return None
    return clean


async def lookup_by_inn(inn: str, db: AsyncSession) -> dict[str, Any] | None:
    """
    Ищет организацию по ИНН: сначала entity_registry, затем DaData.
    При нахождении через DaData — сохраняет в registry.
    """
    normalized = _normalize_inn(inn)
    if not normalized:
        return None

    # 1. Проверяем кэш
    r = await db.execute(select(EntityRegistry).where(EntityRegistry.inn == normalized))
    row = r.scalar_one_or_none()
    if row:
        return {
            "inn": row.inn,
            "name": row.name,
            "kpp": row.kpp,
            "ogrn": row.ogrn,
            "legal_address": row.legal_address,
            "address": row.address,
            "phone": row.phone,
            "email": row.email,
            "bank_name": row.bank_name,
            "bank_bik": row.bank_bik,
            "bank_account": row.bank_account,
            "bank_corr": row.bank_corr,
            "contact_person": row.contact_person,
        }

    # 2. DaData
    settings = get_settings()
    if not settings.dadata_api_key:
        return None

    async with httpx.AsyncClient(timeout=10.0) as client:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Token {settings.dadata_api_key}",
        }
        if settings.dadata_secret:
            headers["X-Secret"] = settings.dadata_secret
        try:
            resp = await client.post(DADATA_URL, json={"query": normalized}, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("DaData lookup failed for INN=%s: %s", normalized, e)
            return None

    suggestions = data.get("suggestions") or []
    if not suggestions:
        return None

    d = suggestions[0].get("data") or {}
    name_obj = d.get("name") or {}
    name_val = name_obj.get("short_with_opf") or name_obj.get("full_with_opf") or name_obj.get("short") or ""
    addr = d.get("address") or {}
    legal_addr = addr.get("unrestricted_value") or addr.get("value") or ""
    phones = d.get("phones") or []
    phone_val = phones[0].get("value") if phones else None
    emails = d.get("emails") or []
    email_val = emails[0].get("value") if emails else None
    mgmt = d.get("management") or {}
    contact_val = mgmt.get("name") if mgmt else None

    result = {
        "inn": d.get("inn") or normalized,
        "name": name_val or None,
        "kpp": d.get("kpp") or None,
        "ogrn": d.get("ogrn") or None,
        "legal_address": legal_addr or None,
        "address": legal_addr or None,
        "phone": phone_val,
        "email": email_val,
        "bank_name": None,
        "bank_bik": None,
        "bank_account": None,
        "bank_corr": None,
        "contact_person": contact_val,
    }

    await save_to_registry(normalized, result, db)
    return result


async def save_to_registry(inn: str, data: dict[str, Any], db: AsyncSession) -> None:
    """Upsert в entity_registry."""
    from datetime import datetime

    normalized = _normalize_inn(inn)
    if not normalized:
        return

    r = await db.execute(select(EntityRegistry).where(EntityRegistry.inn == normalized))
    existing = r.scalar_one_or_none()
    now = datetime.utcnow()

    row_data = {
        "inn": normalized,
        "name": data.get("name"),
        "kpp": data.get("kpp"),
        "ogrn": data.get("ogrn"),
        "legal_address": data.get("legal_address"),
        "address": data.get("address"),
        "phone": data.get("phone"),
        "email": data.get("email"),
        "bank_name": data.get("bank_name"),
        "bank_bik": data.get("bank_bik"),
        "bank_account": data.get("bank_account"),
        "bank_corr": data.get("bank_corr"),
        "contact_person": data.get("contact_person"),
        "source": "dadata",
        "updated_at": now,
    }

    if existing:
        for k, v in row_data.items():
            if k != "inn":
                setattr(existing, k, v)
        await db.flush()
    else:
        db.add(EntityRegistry(**row_data))
        await db.flush()
