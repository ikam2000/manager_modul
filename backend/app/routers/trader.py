# -*- coding: utf-8 -*-
"""Trader module: markup settings, trader nomenclature, import/export, Shopify sync."""

import csv
from datetime import date, datetime
from pathlib import Path
from typing import Any
import io
import json

import base64
import hashlib
import hmac
import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import select, exists, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user, get_current_trader, get_user_company_id, get_user_company_ids, check_trader_trial_or_paid, check_entity_limit, check_nomenclature_per_supplier_limit
from app.models.user import User, Role, Company
from app.models.entity import (
    Nomenclature,
    Category,
    SubCategory,
    Supplier,
    Supply,
    TraderSupplierMarkup,
    TraderCategoryMarkup,
    TraderMarkupHistory,
)
from app.services.trader_price import compute_final_price

router = APIRouter()


async def _get_trader_company_id(user: User, db: AsyncSession) -> int:
    """Get company_id for trader context. Проверяет trial/подписку."""
    cid = await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(403, "Нет доступа к компании")
    await check_trader_trial_or_paid(cid, db)
    return cid


# --- Markup schemas ---


class SupplierMarkupCreate(BaseModel):
    supplier_id: int
    markup_percent: float


class SupplierMarkupUpdate(BaseModel):
    markup_percent: float


class CategoryMarkupCreate(BaseModel):
    category_id: int
    markup_percent: float


class CategoryMarkupUpdate(BaseModel):
    markup_percent: float


class SupplierMarkupBatchItem(BaseModel):
    supplier_id: int
    markup_percent: float


class SupplierMarkupBatchCreate(BaseModel):
    items: list[SupplierMarkupBatchItem]


async def _log_markup_history(
    db: AsyncSession,
    cid: int,
    action: str,
    entity_type: str,
    entity_id: int,
    entity_name: str | None,
    old_markup: float | None,
    new_markup: float | None,
):
    rec = TraderMarkupHistory(
        company_id=cid,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        old_markup_percent=old_markup,
        new_markup_percent=new_markup,
    )
    db.add(rec)


# --- Supplier Markups ---


@router.get("/markup/suppliers")
async def list_supplier_markups(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """List supplier markups for trader company."""
    cid = await _get_trader_company_id(user, db)
    q = (
        select(TraderSupplierMarkup, Supplier.name.label("supplier_name"))
        .join(Supplier, TraderSupplierMarkup.supplier_id == Supplier.id)
        .where(
            TraderSupplierMarkup.company_id == cid,
            Supplier.is_deleted == False,
        )
    )
    r = await db.execute(q)
    rows = r.all()
    return {
        "items": [
            {
                "company_id": row.TraderSupplierMarkup.company_id,
                "supplier_id": row.TraderSupplierMarkup.supplier_id,
                "supplier_name": row.supplier_name,
                "markup_percent": row.TraderSupplierMarkup.markup_percent,
            }
            for row in rows
        ]
    }


@router.post("/markup/suppliers")
async def create_supplier_markup(
    data: SupplierMarkupCreate,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == data.supplier_id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    rec = TraderSupplierMarkup(
        company_id=cid,
        supplier_id=data.supplier_id,
        markup_percent=data.markup_percent,
    )
    db.add(rec)
    try:
        await db.commit()
        await _log_markup_history(db, cid, "create", "supplier", data.supplier_id, sup.name, None, data.markup_percent)
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(400, "Наценка для этого поставщика уже существует")
    return {"company_id": cid, "supplier_id": data.supplier_id, "markup_percent": data.markup_percent}


@router.patch("/markup/suppliers/{supplier_id}")
async def update_supplier_markup(
    supplier_id: int,
    data: SupplierMarkupUpdate,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    q = select(TraderSupplierMarkup).where(
        TraderSupplierMarkup.company_id == cid,
        TraderSupplierMarkup.supplier_id == supplier_id,
    )
    r = await db.execute(q)
    rec = r.scalar_one_or_none()
    if not rec:
        raise HTTPException(404, "Наценка поставщика не найдена")
    old_mk = rec.markup_percent
    rec.markup_percent = data.markup_percent
    sup_r = await db.execute(select(Supplier.name).where(Supplier.id == supplier_id))
    sup_name = sup_r.scalar_one_or_none()
    await db.commit()
    await _log_markup_history(db, cid, "update", "supplier", supplier_id, sup_name[0] if sup_name else None, old_mk, data.markup_percent)
    await db.commit()
    return {"company_id": cid, "supplier_id": supplier_id, "markup_percent": data.markup_percent}


@router.post("/markup/suppliers/batch")
async def create_supplier_markups_batch(
    data: SupplierMarkupBatchCreate,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Добавить несколько наценок по поставщикам за один запрос."""
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    results = []
    for item in data.items:
        sid = item.supplier_id
        mk = item.markup_percent
        q = select(Supplier).where(Supplier.id == sid)
        if company_ids is not None:
            q = q.where(Supplier.company_id.in_(company_ids))
        r = await db.execute(q)
        sup = r.scalar_one_or_none()
        if not sup:
            continue
        existing = await db.execute(
            select(TraderSupplierMarkup).where(
                TraderSupplierMarkup.company_id == cid,
                TraderSupplierMarkup.supplier_id == sid,
            )
        )
        if existing.scalar_one_or_none():
            continue
        rec = TraderSupplierMarkup(company_id=cid, supplier_id=sid, markup_percent=mk)
        db.add(rec)
        results.append({"supplier_id": sid, "supplier_name": sup.name, "markup_percent": mk})
    await db.commit()
    for res in results:
        await _log_markup_history(db, cid, "create", "supplier", res["supplier_id"], res["supplier_name"], None, res["markup_percent"])
    if results:
        await db.commit()
    return {"added": len(results), "items": results}


@router.delete("/markup/suppliers/{supplier_id}")
async def delete_supplier_markup(
    supplier_id: int,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    q = select(TraderSupplierMarkup).where(
        TraderSupplierMarkup.company_id == cid,
        TraderSupplierMarkup.supplier_id == supplier_id,
    )
    r = await db.execute(q)
    rec = r.scalar_one_or_none()
    if not rec:
        raise HTTPException(404, "Наценка поставщика не найдена")
    old_mk = rec.markup_percent
    sup_r = await db.execute(select(Supplier.name).where(Supplier.id == supplier_id))
    sup_name = sup_r.scalar_one_or_none()
    await db.delete(rec)
    await db.commit()
    await _log_markup_history(db, cid, "delete", "supplier", supplier_id, sup_name[0] if sup_name else None, old_mk, None)
    await db.commit()
    return {"ok": True}


# --- Category Markups ---


@router.get("/markup/categories")
async def list_category_markups(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    q = (
        select(TraderCategoryMarkup, Category.name.label("category_name"))
        .join(Category, TraderCategoryMarkup.category_id == Category.id)
        .where(TraderCategoryMarkup.company_id == cid)
    )
    r = await db.execute(q)
    rows = r.all()
    return {
        "items": [
            {
                "company_id": row.TraderCategoryMarkup.company_id,
                "category_id": row.TraderCategoryMarkup.category_id,
                "category_name": row.category_name,
                "markup_percent": row.TraderCategoryMarkup.markup_percent,
            }
            for row in rows
        ]
    }


@router.post("/markup/categories")
async def create_category_markup(
    data: CategoryMarkupCreate,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    q = select(Category).where(Category.id == data.category_id)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Категория не найдена")
    rec = TraderCategoryMarkup(
        company_id=cid,
        category_id=data.category_id,
        markup_percent=data.markup_percent,
    )
    db.add(rec)
    try:
        await db.commit()
        await _log_markup_history(db, cid, "create", "category", data.category_id, cat.name, None, data.markup_percent)
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(400, "Наценка для этой категории уже существует")
    return {"company_id": cid, "category_id": data.category_id, "markup_percent": data.markup_percent}


@router.patch("/markup/categories/{category_id}")
async def update_category_markup(
    category_id: int,
    data: CategoryMarkupUpdate,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    q = select(TraderCategoryMarkup).where(
        TraderCategoryMarkup.company_id == cid,
        TraderCategoryMarkup.category_id == category_id,
    )
    r = await db.execute(q)
    rec = r.scalar_one_or_none()
    if not rec:
        raise HTTPException(404, "Наценка категории не найдена")
    old_mk = rec.markup_percent
    rec.markup_percent = data.markup_percent
    cat_r = await db.execute(select(Category.name).where(Category.id == category_id))
    cat_name = cat_r.scalar_one_or_none()
    await db.commit()
    await _log_markup_history(db, cid, "update", "category", category_id, cat_name[0] if cat_name else None, old_mk, data.markup_percent)
    await db.commit()
    return {"company_id": cid, "category_id": category_id, "markup_percent": data.markup_percent}


@router.delete("/markup/categories/{category_id}")
async def delete_category_markup(
    category_id: int,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    cid = await _get_trader_company_id(user, db)
    q = select(TraderCategoryMarkup).where(
        TraderCategoryMarkup.company_id == cid,
        TraderCategoryMarkup.category_id == category_id,
    )
    r = await db.execute(q)
    rec = r.scalar_one_or_none()
    if not rec:
        raise HTTPException(404, "Наценка категории не найдена")
    old_mk = rec.markup_percent
    cat_r = await db.execute(select(Category.name).where(Category.id == category_id))
    cat_name = cat_r.scalar_one_or_none()
    await db.delete(rec)
    await db.commit()
    await _log_markup_history(db, cid, "delete", "category", category_id, cat_name[0] if cat_name else None, old_mk, None)
    await db.commit()
    return {"ok": True}


@router.get("/markup/history")
async def list_markup_history(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
):
    """История изменений наценок."""
    cid = await _get_trader_company_id(user, db)
    q = (
        select(TraderMarkupHistory)
        .where(TraderMarkupHistory.company_id == cid)
        .order_by(TraderMarkupHistory.created_at.desc())
        .limit(limit)
    )
    r = await db.execute(q)
    rows = r.scalars().all()
    return {
        "items": [
            {
                "id": h.id,
                "action": h.action,
                "entity_type": h.entity_type,
                "entity_id": h.entity_id,
                "entity_name": h.entity_name,
                "old_markup_percent": h.old_markup_percent,
                "new_markup_percent": h.new_markup_percent,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in rows
        ]
    }


@router.get("/suppliers")
async def list_trader_suppliers(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
):
    """Список поставщиков для трейдера: название, телефон, адрес, дата заведения, кол-во товаров."""
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.company_id == cid, Supplier.is_deleted == False)
    if company_ids is not None and cid not in company_ids:
        q = q.where(Supplier.company_id.in_(company_ids))
    if search:
        q = q.where(or_(Supplier.name.ilike(f"%{search}%"), Supplier.inn.ilike(f"%{search}%")))
    col = Supplier.name if sort_by == "name" else (Supplier.created_at if sort_by == "created_at" else Supplier.name)
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc()).limit(limit).offset(offset)
    result = await db.execute(q)
    suppliers = result.scalars().all()
    supplier_ids = [s.id for s in suppliers]
    supplier_nom_count: dict[int, int] = {}
    if supplier_ids:
        for sid in supplier_ids:
            cnt_q = select(func.count(func.distinct(Nomenclature.id))).select_from(Nomenclature).where(
                Nomenclature.company_id == cid,
                Nomenclature.is_deleted == False,
                or_(
                    Nomenclature.supplier_id == sid,
                    exists().where(
                        Supply.nomenclature_id == Nomenclature.id,
                        Supply.supplier_id == sid,
                        Supply.company_id == cid,
                        Supply.is_deleted == False,
                    ),
                ),
            )
            r = await db.execute(cnt_q)
            supplier_nom_count[sid] = r.scalar() or 0
    count_q = select(func.count()).select_from(Supplier).where(Supplier.company_id == cid, Supplier.is_deleted == False)
    if search:
        count_q = count_q.where(or_(Supplier.name.ilike(f"%{search}%"), Supplier.inn.ilike(f"%{search}%")))
    total = (await db.execute(count_q)).scalar() or 0
    return {
        "items": [
            {
                "id": s.id,
                "name": s.name,
                "phone": s.phone,
                "address": s.address,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "product_count": supplier_nom_count.get(s.id, 0),
                "import_source": (s.extra_fields or {}).get("import_config", {}).get("import_source") or "excel",
            }
            for s in suppliers
        ],
        "total": total,
    }


@router.get("/categories")
async def list_trader_categories(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
):
    """Список категорий для трейдера: название, кол-во товаров."""
    cid = await _get_trader_company_id(user, db)
    q = select(Category).where(Category.company_id == cid).order_by(Category.name)
    if search:
        q = q.where(Category.name.ilike(f"%{search}%"))
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    categories = result.scalars().all()
    cat_nom_count: dict[int, int] = {}
    for c in categories:
        cnt_r = await db.execute(
            select(func.count()).select_from(Nomenclature).where(
                Nomenclature.company_id == cid,
                Nomenclature.category_id == c.id,
                Nomenclature.is_deleted == False,
            )
        )
        cat_nom_count[c.id] = cnt_r.scalar() or 0
    count_q = select(func.count()).select_from(Category).where(Category.company_id == cid)
    if search:
        count_q = count_q.where(Category.name.ilike(f"%{search}%"))
    total = (await db.execute(count_q)).scalar() or 0
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "product_count": cat_nom_count.get(c.id, 0),
            }
            for c in categories
        ],
        "total": total,
    }


@router.post("/suppliers/{supplier_id}/fetch-api")
async def fetch_supplier_api_endpoint(
    supplier_id: int,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Ручной запуск выкачки данных от поставщика по API. import_config: import_source=api, api_url, api_key, api_field_map."""
    from app.services.supplier_api_fetch import fetch_supplier_api

    cid = await _get_trader_company_id(user, db)
    result = await fetch_supplier_api(db, supplier_id, cid)
    if result.get("error"):
        if "не найден" in (result["error"] or ""):
            raise HTTPException(404, result["error"])
        if "не API" in (result["error"] or ""):
            raise HTTPException(400, result["error"])
        if "Не указан" in (result["error"] or ""):
            raise HTTPException(400, result["error"])
        raise HTTPException(502, result["error"])
    created = result.get("created", 0)
    updated = result.get("updated", 0)
    return {"created": created, "updated": updated, "message": f"Создано: {created}, обновлено: {updated}"}


def _oauth_state_encode(supplier_id: int, company_id: int) -> str:
    payload = {"supplier_id": supplier_id, "company_id": company_id, "nonce": secrets.token_urlsafe(16)}
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(
        __import__("app.config", fromlist=["get_settings"]).get_settings().secret_key.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{raw}.{sig}"


def _oauth_state_decode(state: str) -> tuple[int, int] | None:
    from app.config import get_settings
    try:
        parts = state.split(".")
        if len(parts) != 2:
            return None
        raw, sig = parts
        pad = 4 - len(raw) % 4
        if pad != 4:
            raw += "=" * pad
        payload = json.loads(base64.urlsafe_b64decode(raw).decode())
        expected = hmac.new(
            get_settings().secret_key.encode(),
            parts[0].encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return int(payload.get("supplier_id", 0)), int(payload.get("company_id", 0))
    except Exception:
        return None


@router.post("/suppliers/{supplier_id}/oauth/init")
async def supplier_oauth_init(
    supplier_id: int,
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Начать OAuth для поставщика. Требует import_config с oauth_auth_url, oauth_token_url, oauth_client_id, oauth_client_secret, api_url."""
    from app.config import get_settings
    cid = await _get_trader_company_id(user, db)
    r = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.company_id == cid,
            Supplier.is_deleted == False,
        )
    )
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    cfg = (sup.extra_fields or {}).get("import_config") or {}
    if cfg.get("import_source") != "oauth":
        raise HTTPException(400, "Источник импорта должен быть OAuth. Сохраните настройки.")
    auth_url = (cfg.get("oauth_auth_url") or "").strip()
    token_url = (cfg.get("oauth_token_url") or "").strip()
    client_id = (cfg.get("oauth_client_id") or "").strip()
    client_secret = (cfg.get("oauth_client_secret") or "").strip()
    api_url_cfg = (cfg.get("api_url") or "").strip()
    if not auth_url or not token_url or not client_id or not client_secret:
        raise HTTPException(400, "Укажите oauth_auth_url, oauth_token_url, oauth_client_id, oauth_client_secret")
    if not api_url_cfg:
        raise HTTPException(400, "Укажите api_url для выкачки")
    base = get_settings().base_url.rstrip("/")
    callback_url = f"{base}/trader/suppliers/oauth/callback"
    state = _oauth_state_encode(supplier_id, cid)
    scopes = (cfg.get("oauth_scopes") or "").strip()
    params = {
        "client_id": client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "state": state,
    }
    if scopes:
        params["scope"] = scopes
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return {"redirect_url": url}


@router.get("/suppliers/oauth/callback")
async def supplier_oauth_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback для поставщика. Публичный endpoint."""
    from app.config import get_settings
    base = get_settings().base_url.rstrip("/")
    redirect_back = f"{base}/cabinet/entities/supplier/0"
    if error:
        return RedirectResponse(url=f"{redirect_back}?oauth_error={error}")
    if not code or not state:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=missing_params")
    decoded = _oauth_state_decode(state)
    if not decoded:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=invalid_state")
    supplier_id, company_id = decoded
    redirect_back = f"{base}/cabinet/entities/supplier/{supplier_id}"
    r = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.company_id == company_id,
            Supplier.is_deleted == False,
        )
    )
    sup = r.scalar_one_or_none()
    if not sup:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=not_found")
    cfg = dict((sup.extra_fields or {}).get("import_config") or {})
    token_url = (cfg.get("oauth_token_url") or "").strip()
    client_id = (cfg.get("oauth_client_id") or "").strip()
    client_secret = (cfg.get("oauth_client_secret") or "").strip()
    if not token_url or not client_id or not client_secret:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=config")
    callback_url = f"{base}/trader/suppliers/oauth/callback"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": callback_url,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Accept": "application/json"},
            )
    except Exception as e:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=request_failed")
    if resp.status_code != 200:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=token_exchange")
    try:
        data = resp.json()
    except Exception:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=invalid_response")
    access_token = data.get("access_token")
    if not access_token:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=no_token")
    cfg["oauth_access_token"] = access_token
    cfg["oauth_refresh_token"] = data.get("refresh_token") or ""
    expires_in = data.get("expires_in")
    if expires_in:
        from datetime import datetime, timedelta
        cfg["oauth_expires_at"] = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    sup_extra = dict(sup.extra_fields or {})
    sup_extra["import_config"] = cfg
    sup.extra_fields = sup_extra
    sup.updated_at = datetime.utcnow()
    await db.commit()
    return RedirectResponse(url=f"{redirect_back}?oauth=connected")


@router.get("/categories-by-supplier")
async def list_categories_by_supplier(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    supplier_id: int = Query(...),
):
    """Категории, в которых есть номенклатура от указанного поставщика."""
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    # Категории из номенклатуры, связанной с этим поставщиком (через nomenclature.supplier_id или supplies)
    subq = select(Nomenclature.category_id).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
        Nomenclature.category_id.isnot(None),
        or_(
            Nomenclature.supplier_id == supplier_id,
            exists().where(
                Supply.nomenclature_id == Nomenclature.id,
                Supply.supplier_id == supplier_id,
                Supply.is_deleted == False,
            ),
        ),
    ).distinct()
    r = await db.execute(subq)
    cat_ids = [row[0] for row in r.all() if row[0]]
    if not cat_ids:
        return {"items": []}
    q = select(Category.id, Category.name).where(
        Category.id.in_(cat_ids),
        Category.company_id == cid,
    )
    q = q.order_by(Category.name.asc())
    rr = await db.execute(q)
    return {"items": [{"id": row.id, "name": row.name} for row in rr.all()]}


# --- Trader Nomenclature List (with computed prices) ---


async def _get_markup_maps(db: AsyncSession, company_id: int) -> tuple[dict[int, float], dict[int, float], float]:
    """(supplier_markups, category_markups, default_markup)"""
    supp_q = select(TraderSupplierMarkup).where(TraderSupplierMarkup.company_id == company_id)
    cat_q = select(TraderCategoryMarkup).where(TraderCategoryMarkup.company_id == company_id)
    comp_q = select(Company.default_markup_percent).where(Company.id == company_id)
    supp_r = (await db.execute(supp_q)).scalars().all()
    cat_r = (await db.execute(cat_q)).scalars().all()
    comp_r = (await db.execute(comp_q)).scalar_one_or_none()
    supplier_map = {s.supplier_id: s.markup_percent for s in supp_r}
    category_map = {c.category_id: c.markup_percent for c in cat_r}
    default_markup = (comp_r or 0) if comp_r is not None else 0.0
    return supplier_map, category_map, default_markup


_TRADER_SORT_COLUMNS = {"name", "code", "barcode", "purchase_price", "stock", "expiry_date", "supplier_sku", "brand", "updated_at"}


@router.get("/nomenclature")
async def list_trader_nomenclature(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    supplier_id: int | None = Query(None),
    category_id: int | None = Query(None),
    in_stock: bool | None = Query(None, description="True = only with stock > 0"),
    search: str | None = Query(None),
    limit: int = Query(20, le=10000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("name", description="name, code, barcode, purchase_price, stock, expiry_date, supplier_sku, brand, updated_at"),
    sort_order: str = Query("asc", description="asc | desc"),
):
    """List nomenclature with computed final_price. Trader context."""
    try:
        return await _list_trader_nomenclature_impl(user, db, supplier_id, category_id, in_stock, search, limit, offset, sort_by, sort_order)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


async def _list_trader_nomenclature_impl(user, db, supplier_id, category_id, in_stock, search, limit, offset, sort_by: str = "name", sort_order: str = "asc"):
    cid = await _get_trader_company_id(user, db)
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and cid not in company_ids and user.role != Role.super_admin:
        raise HTTPException(403, "Нет доступа")
    q = select(Nomenclature).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
    )
    if supplier_id is not None:
        q = q.where(
            or_(
                Nomenclature.supplier_id == supplier_id,
                exists().where(
                    Supply.nomenclature_id == Nomenclature.id,
                    Supply.supplier_id == supplier_id,
                    Supply.is_deleted == False,
                ),
            )
        )
    if category_id is not None:
        q = q.where(Nomenclature.category_id == category_id)
    if in_stock is True:
        q = q.where(Nomenclature.stock.isnot(None), Nomenclature.stock > 0)
    if search and search.strip():
        s = f"%{search.strip()}%"
        conds = [Nomenclature.name.ilike(s), Nomenclature.code.ilike(s)]
        if hasattr(Nomenclature, "barcode"):
            conds.append(Nomenclature.barcode.ilike(s))
        q = q.where(or_(*conds))
    order_col = Nomenclature.name
    if sort_by and sort_by in _TRADER_SORT_COLUMNS and hasattr(Nomenclature, sort_by):
        order_col = getattr(Nomenclature, sort_by)
    desc = sort_order and str(sort_order).lower() == "desc"
    q = q.order_by(order_col.desc() if desc else order_col.asc()).limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    supp_map, cat_map, default_markup = await _get_markup_maps(db, cid)
    # Load category, supplier names
    cat_ids = {n.category_id for n in items if n.category_id}
    supp_ids = {n.supplier_id for n in items if n.supplier_id}
    for n in items:
        if n.supplier_id is None and n.id:
            supp_sub = select(Supply.supplier_id).where(
                Supply.nomenclature_id == n.id,
                Supply.is_deleted == False,
            ).limit(1)
            sr = await db.execute(supp_sub)
            row = sr.scalar_one_or_none()
            if row is not None:
                supp_ids.add(int(row))
    cat_names: dict[int, str] = {}
    supp_names: dict[int, str] = {}
    if cat_ids:
        cat_r = await db.execute(select(Category.id, Category.name).where(Category.id.in_(cat_ids)))
        cat_names = {int(row[0]): str(row[1]) for row in cat_r.all()}
    if supp_ids:
        supp_r = await db.execute(select(Supplier.id, Supplier.name).where(Supplier.id.in_(supp_ids), Supplier.is_deleted == False))
        supp_names = {int(row[0]): str(row[1]) for row in supp_r.all()}
    out = []
    for n in items:
        supp_id = n.supplier_id
        if supp_id is None:
            s = select(Supply.supplier_id).where(Supply.nomenclature_id == n.id, Supply.is_deleted == False).limit(1)
            r = await db.execute(s)
            row = r.scalar_one_or_none()
            supp_id = int(row) if row is not None else None
        cat_mk = cat_map.get(n.category_id) if n.category_id else None
        supp_mk = supp_map.get(supp_id) if supp_id else None
        final_price, eff_markup = compute_final_price(
            n.purchase_price,
            n.markup_percent,
            cat_mk,
            supp_mk,
            default_markup,
        )
        d: dict[str, Any] = {
            "id": n.id,
            "name": n.name,
            "code": n.code,
            "barcode": n.barcode,
            "supplier_sku": n.supplier_sku,
            "brand": n.brand,
            "category_id": n.category_id,
            "category_name": cat_names.get(n.category_id or 0, "") if n.category_id else "",
            "supplier_id": supp_id,
            "supplier_name": supp_names.get(supp_id or 0, "") if supp_id else "",
            "unit": n.unit,
            "pack_size": n.pack_size,
            "moq": n.moq,
            "purchase_price": n.purchase_price,
            "price_currency": n.price_currency,
            "markup_percent": n.markup_percent,
            "effective_markup_percent": eff_markup,
            "final_price": final_price,
            "stock": n.stock,
            "expiry_date": n.expiry_date.isoformat() if n.expiry_date else None,
            "days_to_expiry": n.days_to_expiry,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
            "extra_fields": n.extra_fields if n.extra_fields else {},
        }
        out.append(d)
    count_q = select(func.count()).select_from(Nomenclature).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
    )
    if supplier_id is not None:
        count_q = count_q.where(
            or_(
                Nomenclature.supplier_id == supplier_id,
                exists().where(
                    Supply.nomenclature_id == Nomenclature.id,
                    Supply.supplier_id == supplier_id,
                    Supply.is_deleted == False,
                ),
            )
        )
    if category_id is not None:
        count_q = count_q.where(Nomenclature.category_id == category_id)
    if in_stock is True:
        count_q = count_q.where(Nomenclature.stock.isnot(None), Nomenclature.stock > 0)
    if search and search.strip():
        s = f"%{search.strip()}%"
        conds = [Nomenclature.name.ilike(s), Nomenclature.code.ilike(s)]
        if hasattr(Nomenclature, "barcode"):
            conds.append(Nomenclature.barcode.ilike(s))
        count_q = count_q.where(or_(*conds))
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": out, "total": total}


# --- Export Excel ---


@router.get("/export")
async def export_trader_excel(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
    supplier_id: int | None = Query(None),
    category_id: int | None = Query(None),
    in_stock: bool | None = Query(None),
):
    """Export trader nomenclature to Excel with barcode, name, category, supplier, purchase_price, markup%, final_price, stock, expiry_date."""
    cid = await _get_trader_company_id(user, db)
    q = select(Nomenclature).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
    )
    if supplier_id is not None:
        q = q.where(
            or_(
                Nomenclature.supplier_id == supplier_id,
                exists().where(
                    Supply.nomenclature_id == Nomenclature.id,
                    Supply.supplier_id == supplier_id,
                    Supply.is_deleted == False,
                ),
            )
        )
    if category_id is not None:
        q = q.where(Nomenclature.category_id == category_id)
    if in_stock is True:
        q = q.where(Nomenclature.stock.isnot(None), Nomenclature.stock > 0)
    q = q.order_by(Nomenclature.name.asc())
    result = await db.execute(q)
    items = result.scalars().all()
    supp_map, cat_map, default_markup = await _get_markup_maps(db, cid)
    cat_ids = {n.category_id for n in items if n.category_id}
    supp_ids = {n.supplier_id for n in items if n.supplier_id}
    cat_names = {}
    supp_names = {}
    if cat_ids:
        r = await db.execute(select(Category.id, Category.name).where(Category.id.in_(cat_ids)))
        cat_names = {row.id: row.name for row in r.all()}
    if supp_ids:
        r = await db.execute(select(Supplier.id, Supplier.name).where(Supplier.id.in_(supp_ids), Supplier.is_deleted == False))
        supp_names = {row.id: row.name for row in r.all()}
    rows_data = []
    for n in items:
        supp_id = n.supplier_id
        if supp_id is None:
            s = select(Supply.supplier_id).where(Supply.nomenclature_id == n.id, Supply.is_deleted == False).limit(1)
            r = await db.execute(s)
            row = r.scalar_one_or_none()
            supp_id = int(row) if row is not None else None
        cat_mk = cat_map.get(n.category_id) if n.category_id else None
        supp_mk = supp_map.get(supp_id) if supp_id else None
        final_price, _ = compute_final_price(n.purchase_price, n.markup_percent, cat_mk, supp_mk, default_markup)
        rows_data.append({
            "supplier_sku": n.supplier_sku or "",
            "code": n.code or "",
            "barcode": n.barcode or "",
            "name": n.name,
            "brand": n.brand or "",
            "category": cat_names.get(n.category_id or 0, "") if n.category_id else "",
            "supplier": supp_names.get(supp_id or 0, "") if supp_id else "",
            "unit": n.unit or "",
            "pack_size": n.pack_size or "",
            "moq": n.moq if n.moq is not None else "",
            "purchase_price": n.purchase_price or "",
            "price_currency": n.price_currency or "",
            "markup_percent": n.markup_percent if n.markup_percent is not None else "",
            "final_price": final_price or "",
            "stock": n.stock if n.stock is not None else "",
            "expiry_date": n.expiry_date.isoformat() if n.expiry_date else "",
            "days_to_expiry": n.days_to_expiry if n.days_to_expiry is not None else "",
            "updated_at": n.updated_at.isoformat() if n.updated_at else "",
        })
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Товары"
        headers = ["Артикул поставщика", "Внутр. артикул", "Баркод", "Наименование", "Бренд", "Категория", "Поставщик", "Ед.", "Упаковка", "MOQ", "Цена", "Валюта", "Наценка %", "Итоговая", "Остаток", "Срок годности", "Дней до годности", "Обновлено"]
        ws.append(headers)
        for r in rows_data:
            ws.append([
                r["supplier_sku"],
                r["code"],
                r["barcode"],
                r["name"],
                r["brand"],
                r["category"],
                r["supplier"],
                r["unit"],
                r["pack_size"],
                r["moq"],
                r["purchase_price"],
                r["price_currency"],
                r["markup_percent"],
                r["final_price"],
                r["stock"],
                r["expiry_date"],
                r["days_to_expiry"],
                r["updated_at"],
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="trader_export.xlsx"'},
        )
    except ImportError:
        raise HTTPException(500, "Модуль openpyxl не установлен")


# --- Dashboard (Phase 4) ---


@router.get("/dashboard")
async def trader_dashboard(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """KPI: suppliers, products, categories, sync platforms, by_supplier, by_category, total_sales, profit, margin."""
    from app.models.oauth_connection import OAuthConnection
    cid = await _get_trader_company_id(user, db)
    supp_count = (await db.execute(
        select(func.count()).select_from(Supplier).where(
            Supplier.company_id == cid,
            Supplier.is_deleted == False,
        )
    )).scalar() or 0
    prod_count = (await db.execute(
        select(func.count()).select_from(Nomenclature).where(
            Nomenclature.company_id == cid,
            Nomenclature.is_deleted == False,
        )
    )).scalar() or 0
    cat_count = (await db.execute(
        select(func.count()).select_from(Category).where(Category.company_id == cid)
    )).scalar() or 0
    oauth_r = await db.execute(
        select(OAuthConnection.provider, OAuthConnection.store_url, OAuthConnection.store_id).where(
            OAuthConnection.company_id == cid,
        )
    )
    oauth_conns = [
        {"provider": row.provider, "store": row.store_url or row.store_id or "—"}
        for row in oauth_r.fetchall()
    ]
    api_supp_r = await db.execute(select(Supplier).where(
        Supplier.company_id == cid,
        Supplier.is_deleted == False,
    ))
    api_suppliers = [
        s for s in api_supp_r.scalars().all()
        if (s.extra_fields or {}).get("import_config", {}).get("import_source") in ("api", "oauth")
    ]
    by_cat_r = await db.execute(
        select(Nomenclature.category_id, func.count(Nomenclature.id).label("cnt"))
        .where(
            Nomenclature.company_id == cid,
            Nomenclature.is_deleted == False,
            Nomenclature.category_id.isnot(None),
        )
        .group_by(Nomenclature.category_id)
    )
    cat_counts = {row.category_id: row.cnt for row in by_cat_r.fetchall()}
    nom_by_supp = await db.execute(
        select(Nomenclature.supplier_id, func.count(Nomenclature.id).label("cnt"))
        .where(
            Nomenclature.company_id == cid,
            Nomenclature.is_deleted == False,
            Nomenclature.supplier_id.isnot(None),
        )
        .group_by(Nomenclature.supplier_id)
    )
    supp_map = {s.id: s.name for s in (await db.execute(select(Supplier).where(Supplier.company_id == cid, Supplier.is_deleted == False))).scalars().all()}
    by_supplier = [
        {"supplier_id": row.supplier_id, "supplier_name": supp_map.get(row.supplier_id) or "—", "product_count": row.cnt}
        for row in nom_by_supp.fetchall()
    ][:10]
    cat_ids = list(cat_counts.keys())[:10]
    categories = (await db.execute(
        select(Category).where(Category.id.in_(cat_ids), Category.company_id == cid)
    )).scalars().all() if cat_ids else []
    cat_name_map = {c.id: c.name for c in categories}
    by_category = [
        {"category_id": cid, "category_name": cat_name_map.get(cid) or "—", "product_count": cat_counts.get(cid, 0)}
        for cid in cat_ids
    ]
    return {
        "suppliers_count": supp_count,
        "products_count": prod_count,
        "categories_count": cat_count,
        "sync_platforms": oauth_conns,
        "api_suppliers_count": len(api_suppliers),
        "total_sales": 0,
        "profit": 0,
        "margin": 0,
        "turnover_days": 0,
        "by_supplier": by_supplier,
        "by_category": by_category,
    }


# --- Trader Import ---

TRADER_IMPORT_FIELDS = {
    "barcode", "name", "code", "supplier_sku", "brand",
    "unit", "pack_size", "moq", "purchase_price", "price_currency",
    "stock", "expiry_date", "days_to_expiry",
}


def _parse_date(val: str) -> date | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip()[:10]
    if len(s) < 8:
        return None
    try:
        if "-" in s and s.count("-") == 2:  # YYYY-MM-DD or DD-MM-YYYY
            parts = s.split("-")
            if len(parts[0]) == 4:  # YYYY-MM-DD
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            return date(int(parts[2]), int(parts[1]), int(parts[0]))
        if "." in s and s.count(".") == 2:
            parts = s.split(".")
            return date(int(parts[2]), int(parts[1]), int(parts[0]))
    except (ValueError, IndexError, TypeError):
        pass
    return None


def _parse_float(val: str) -> float | None:
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(str(val).replace(",", ".").replace("\xa0", ""))
    except (ValueError, TypeError):
        return None


# Паттерны для автосопоставления колонок (заголовок -> поле)
_TRADER_HEADER_MAP = [
    (("артикул поставщика", "supplier sku", "supplier_sku", "код поставщика", "vendor sku"), "supplier_sku"),
    (("внутренний артикул", "internal sku", "product id", "product_id", "наш код"), "code"),
    (("баркод", "barcode", "штрихкод", "ean", "gtin", "код ean"), "barcode"),
    (("наименование", "name", "название", "товар", "product", "product name"), "name"),
    (("бренд", "brand", "марка"), "brand"),
    (("категория", "category", "кат."), "category_raw"),  # в extra_fields для последующей нормализации
    (("единица", "unit", "ед. изм", "единица измерения"), "unit"),
    (("упаковка", "pack", "pack size", "в коробке", "шт в коробке", "кол-во в упаковке"), "pack_size"),
    (("моq", "moq", "мин. заказ", "минимальный заказ", "min order"), "moq"),
    (("закупочная", "purchase", "цена закуп", "цена поставщика", "cost", "price", "цена"), "purchase_price"),
    (("валюта", "currency", "curr"), "price_currency"),
    (("остаток", "stock", "кол-во", "количество", "к-во", "qt", "available"), "stock"),
    (("срок годности", "expiry", "годен до", "дата годности", "expiry date"), "expiry_date"),
    (("дней до годности", "days to expiry", "days_to_expiry", "срок хранения"), "days_to_expiry"),
]


def _suggest_trader_mapping(header: str) -> str | None:
    """По тексту заголовка вернуть suggested mapTo или None."""
    h = (header or "").strip().lower()
    for patterns, field in _TRADER_HEADER_MAP:
        if any(p in h for p in patterns):
            return field
    return None


@router.post("/import/preview")
async def trader_import_preview(
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Распознать файл: вернуть заголовки, превью строк и предложенное сопоставление колонок."""
    await _get_trader_company_id(user, db)
    if not files:
        raise HTTPException(400, "Выберите файл")
    uf = files[0]
    content = await uf.read()
    ext = Path(uf.filename or "").suffix.lower()
    mime = uf.content_type or ""

    headers: dict[int, str] = {}
    preview_rows: list[dict[int, str]] = []
    suggested_mappings: dict[str, str] = {}

    def _cell(v: Any) -> str:
        return (str(v).strip() if v is not None else "")[:200]

    try:
        if ext == ".csv":
            text = content.decode("utf-8-sig", errors="replace")
            reader = csv.reader(io.StringIO(text), delimiter=";")
            rows = list(reader)
            if len(rows) < 2:
                reader = csv.reader(io.StringIO(text), delimiter=",")
                rows = list(reader)
            if rows:
                for ci, v in enumerate(rows[0]):
                    h = _cell(v)
                    if h:
                        headers[ci] = h
                        sf = _suggest_trader_mapping(h)
                        if sf:
                            suggested_mappings[str(ci)] = sf
                for row in rows[1:6]:
                    row_dict: dict[int, str] = {}
                    for ci in headers:
                        val = _cell(row[ci]) if ci < len(row) else ""
                        if val:
                            row_dict[ci] = val
                    if row_dict:
                        preview_rows.append(row_dict)
        elif ext in (".xlsx", ".xls"):
            from app.routers.documents import _extract_universal
            uni = _extract_universal(content, uf.filename or "doc.xlsx", mime)
            detected = uni.get("detected_columns", [])
            rows_data = uni.get("rows_data", [])
            for dc in detected:
                idx = dc.get("index", len(headers))
                name = dc.get("name", f"Колонка {idx}")[:200]
                headers[idx] = name
                sf = _suggest_trader_mapping(name)
                if sf:
                    suggested_mappings[str(idx)] = sf
            preview_rows = rows_data[:6]
        else:
            raise HTTPException(400, "Поддерживаются Excel (.xlsx, .xls) и CSV")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Ошибка чтения файла: {e}")

    return {
        "headers": headers,
        "preview_rows": preview_rows,
        "suggested_mappings": suggested_mappings,
    }


async def _run_trader_excel_import_core(
    db: AsyncSession,
    company_id: int,
    files_data: list[tuple[bytes, str, str]],
    mappings: dict,
    mode: str,
    supplier_id: int | None,
    category_id: int | None,
) -> dict:
    """Ядро импорта trader Excel. files_data = [(content, filename, mime), ...]."""
    from app.routers.documents import _extract_universal

    base_count_nom_per_supplier = 0
    if supplier_id:
        r = await db.execute(
            select(func.count()).select_from(Nomenclature).where(
                Nomenclature.company_id == company_id,
                Nomenclature.supplier_id == supplier_id,
                Nomenclature.is_deleted == False,
            )
        )
        base_count_nom_per_supplier = (r.scalar() or 0)
    created_for_supplier = 0
    limit_reached = False
    limit_message: str | None = None

    created = 0
    updated = 0
    for content, filename, mime in files_data:
        ext = Path(filename or "").suffix.lower()
        rows_data: list[dict[int, Any]] = []
        if ext == ".csv":
            try:
                from app.config import get_settings
                max_rows = getattr(get_settings(), "max_import_rows", 100_000) or 100_000
                text = content.decode("utf-8-sig", errors="replace")
                reader = csv.reader(io.StringIO(text), delimiter=";")
                rows = list(reader)
                if len(rows) < 2:
                    reader = csv.reader(io.StringIO(text), delimiter=",")
                    rows = list(reader)
                if len(rows) > max_rows:
                    rows = rows[:max_rows]
                for ri, row in enumerate(rows):
                    if ri == 0 and all(not str(c).strip() for c in row):
                        continue
                    row_dict: dict[int, Any] = {}
                    for ci, v in enumerate(row):
                        val = str(v).strip()
                        if val:
                            row_dict[ci] = val
                    if row_dict:
                        rows_data.append(row_dict)
            except Exception:
                pass
        elif ext in (".xlsx", ".xls"):
            uni = _extract_universal(content, filename or "doc.xlsx", mime)
            rows_data = uni.get("rows_data", [])
        else:
            continue
        if not rows_data:
            continue

        file_idx = 0
        file_map = mappings.get(str(file_idx), mappings.get(file_idx, {}))
        for row in rows_data:
            nom_data: dict[str, Any] = {}
            extra_data: dict[str, Any] = {}
            for col_idx_str, m in file_map.items():
                col_idx = int(col_idx_str) if isinstance(col_idx_str, str) else col_idx_str
                map_to = (m or {}).get("mapTo") or (m or {}).get("mapto", "")
                if not map_to:
                    continue
                val = row.get(col_idx) or row.get(str(col_idx)) or ""
                if not str(val).strip():
                    continue
                val = str(val).strip()
                if map_to.startswith("extra:"):
                    key = map_to[6:].strip()
                    if key:
                        parsed = _parse_float(val)
                        extra_data[key] = parsed if parsed is not None else val[:255]
                    continue
                if map_to == "category_raw":
                    extra_data["category_raw"] = val[:255]
                    continue
                if map_to not in TRADER_IMPORT_FIELDS:
                    continue
                if map_to == "purchase_price":
                    nom_data[map_to] = _parse_float(val)
                elif map_to == "stock":
                    nom_data[map_to] = _parse_float(val)
                elif map_to in ("moq", "days_to_expiry"):
                    nom_data[map_to] = _parse_float(val)
                elif map_to == "expiry_date":
                    nom_data[map_to] = _parse_date(val)
                elif map_to in ("name", "brand"):
                    nom_data[map_to] = val[:255]
                elif map_to in ("code", "supplier_sku", "unit", "pack_size", "price_currency"):
                    nom_data[map_to] = val[:100]
                else:
                    nom_data[map_to] = val[:100]
            name_val = (nom_data.get("name") or nom_data.get("barcode") or nom_data.get("code") or "").strip()
            if not name_val:
                continue
            barcode_val = (nom_data.get("barcode") or "").strip() or None
            existing = None
            if mode == "update_by_barcode" and barcode_val:
                r = await db.execute(
                    select(Nomenclature).where(
                        Nomenclature.company_id == company_id,
                        Nomenclature.barcode == barcode_val,
                        Nomenclature.is_deleted == False,
                    )
                )
                existing = r.scalar_one_or_none()
            def _apply_nom_fields(obj: Any) -> None:
                for k, v in nom_data.items():
                    if v is not None and hasattr(obj, k):
                        setattr(obj, k, v)

            if existing:
                _apply_nom_fields(existing)
                if supplier_id is not None:
                    existing.supplier_id = supplier_id
                if category_id is not None:
                    existing.category_id = category_id
                if extra_data:
                    merged = dict(existing.extra_fields or {})
                    merged.update(extra_data)
                    existing.extra_fields = merged
                updated += 1
            else:
                if limit_reached:
                    continue
                try:
                    await check_entity_limit(company_id, "nomenclature", db)
                    if supplier_id:
                        await check_nomenclature_per_supplier_limit(
                            company_id, supplier_id, db,
                            current_count_override=base_count_nom_per_supplier + created_for_supplier,
                        )
                except HTTPException as e:
                    if e.status_code == 403:
                        limit_reached = True
                        limit_message = e.detail or "Достигнут лимит. Оформите подписку для расширения."
                        continue
                    raise
                created_for_supplier += 1
                nom = Nomenclature(
                    company_id=company_id,
                    name=name_val[:255],
                    code=nom_data.get("code") or None,
                    barcode=barcode_val,
                    purchase_price=nom_data.get("purchase_price"),
                    stock=nom_data.get("stock"),
                    expiry_date=nom_data.get("expiry_date"),
                    supplier_id=supplier_id,
                    category_id=category_id,
                    supplier_sku=nom_data.get("supplier_sku"),
                    brand=nom_data.get("brand"),
                    unit=nom_data.get("unit"),
                    pack_size=nom_data.get("pack_size"),
                    moq=nom_data.get("moq"),
                    price_currency=nom_data.get("price_currency"),
                    days_to_expiry=nom_data.get("days_to_expiry"),
                    extra_fields=extra_data if extra_data else None,
                )
                db.add(nom)
                created += 1
    return {
        "created": created,
        "updated": updated,
        "limit_reached": limit_reached,
        "limit_message": limit_message,
    }


@router.post("/import")
async def trader_import_excel(
    files: list[UploadFile] = File(...),
    column_mappings: str = Form(..., description='JSON: {"0": {"mapTo": "barcode"}, "1": {"mapTo": "name"}, ...}'),
    mode: str = Form("add_new", description="add_new | update_by_barcode"),
    supplier_id: int | None = Form(None),
    category_id: int | None = Form(None),
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Import Excel with trader fields: barcode, purchase_price, stock, expiry_date. Mode: add_new or update_by_barcode."""
    cid = await _get_trader_company_id(user, db)
    try:
        mappings = json.loads(column_mappings)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Неверный JSON в column_mappings: {e}")
    if mode not in ("add_new", "update_by_barcode"):
        raise HTTPException(400, "mode должен быть add_new или update_by_barcode")

    files_data: list[tuple[bytes, str, str]] = []
    for uf in files:
        content = await uf.read()
        mime = uf.content_type or "application/octet-stream"
        files_data.append((content, uf.filename or "doc", mime))

    result = await _run_trader_excel_import_core(
        db, cid, files_data, mappings, mode, supplier_id, category_id,
    )
    await db.commit()

    SUBSCRIPTION_URL = "/cabinet/payment"
    limit_reached = result.get("limit_reached", False)
    limit_message = result.get("limit_message")
    msg = f"Создано: {result.get('created', 0)}, обновлено: {result.get('updated', 0)}"
    if limit_reached and limit_message:
        msg += f". {limit_message}"
    return {
        "created": result.get("created", 0),
        "updated": result.get("updated", 0),
        "message": msg,
        "limit_reached": limit_reached,
        "limit_message": limit_message if limit_reached else None,
        "subscription_url": SUBSCRIPTION_URL if limit_reached else None,
    }


# --- Shopify Sync (Phase 3) ---


@router.post("/sync/shopify")
async def sync_to_shopify(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Push prices and stock to connected Shopify store. Uses OAuth token from oauth_connections. GraphQL Admin API."""
    from app.models.oauth_connection import OAuthConnection

    cid = await _get_trader_company_id(user, db)
    q = select(OAuthConnection).where(
        OAuthConnection.company_id == cid,
        OAuthConnection.provider == "shopify",
    )
    r = await db.execute(q)
    conn = r.scalar_one_or_none()
    if not conn or not conn.access_token:
        raise HTTPException(400, "Shopify не подключен. Подключите магазин в разделе Интеграции.")

    access_token = conn.get_access_token()
    store_url = conn.store_url or ""
    if not store_url:
        raise HTTPException(400, "URL магазина Shopify не указан")
    if store_url.startswith("https://"):
        store_url = store_url.replace("https://", "")
    if store_url.endswith("/"):
        store_url = store_url.rstrip("/")
    graphql_url = f"https://{store_url}/admin/api/2024-01/graphql.json"

    supp_map, cat_map, default_markup = await _get_markup_maps(db, cid)

    # Поставщики, для которых включена выгрузка на Shopify
    sup_q = select(Supplier).where(
        Supplier.company_id == cid,
        Supplier.is_deleted == False,
        Supplier.extra_fields.isnot(None),
    )
    sup_r = await db.execute(sup_q)
    shopify_supplier_ids: set[int] = set()
    for s in sup_r.scalars().all():
        cfg = (s.extra_fields or {}).get("import_config") or {}
        platforms = cfg.get("sync_to_platforms") or []
        if "shopify" in platforms:
            shopify_supplier_ids.add(s.id)

    nom_q = select(Nomenclature).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
        Nomenclature.barcode.isnot(None),
    )
    nom_r = await db.execute(nom_q)
    items = nom_r.scalars().all()

    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

    import httpx
    updated = 0
    errors = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for n in items:
            supp_id = n.supplier_id
            if supp_id is None:
                s = select(Supply.supplier_id).where(
                    Supply.nomenclature_id == n.id,
                    Supply.is_deleted == False,
                ).limit(1)
                r2 = await db.execute(s)
                row = r2.scalar_one_or_none()
                supp_id = int(row) if row is not None else None
            # Фильтр по sync_to_platforms: только поставщики с "shopify". Пустой список = выгружать всё.
            if shopify_supplier_ids and (supp_id is None or supp_id not in shopify_supplier_ids):
                continue
            cat_mk = cat_map.get(n.category_id) if n.category_id else None
            supp_mk = supp_map.get(supp_id) if supp_id else None
            final_price, _ = compute_final_price(
                n.purchase_price, n.markup_percent, cat_mk, supp_mk, default_markup
            )
            if final_price is None:
                continue
            barcode = (n.barcode or "").strip()
            if not barcode:
                continue
            inv_qty = int(n.stock) if n.stock is not None and n.stock >= 0 else 0
            try:
                query = """
                query ($id: ID!) {
                    productVariant(id: $id) {
                        id
                        inventoryItem { id }
                    }
                }
                """
                lookup_query = """
                query ($query: String!) {
                    productVariants(first: 1, query: $query) {
                        edges {
                            node {
                                id
                                inventoryItem { id }
                            }
                        }
                    }
                }
                """
                lookup_body = {
                    "query": lookup_query,
                    "variables": {"query": f"sku:{barcode}"},
                }
                resp = await client.post(graphql_url, json=lookup_body, headers=headers)
                if resp.status_code != 200:
                    errors.append(f"{barcode}: HTTP {resp.status_code}")
                    continue
                data = resp.json()
                errs = data.get("errors", [])
                if errs:
                    errors.append(f"{barcode}: {errs[0].get('message', str(errs))[:80]}")
                    continue
                edges = data.get("data", {}).get("productVariants", {}).get("edges", [])
                if not edges:
                    continue
                node = edges[0]["node"]
                variant_gid = node["id"]
                inv_item_id = node.get("inventoryItem", {}).get("id") if node.get("inventoryItem") else None

                update_mutation = """
                mutation productVariantUpdate($input: ProductVariantInput!) {
                    productVariantUpdate(input: $input) {
                        productVariant { id }
                        userErrors { field message }
                    }
                }
                """
                update_body = {
                    "query": update_mutation,
                    "variables": {
                        "input": {
                            "id": variant_gid,
                            "price": str(final_price),
                        }
                    },
                }
                up_resp = await client.post(graphql_url, json=update_body, headers=headers)
                if up_resp.status_code != 200:
                    errors.append(f"{barcode}: update HTTP {up_resp.status_code}")
                    continue
                up_data = up_resp.json()
                ue = up_data.get("data", {}).get("productVariantUpdate", {}).get("userErrors", [])
                if ue:
                    errors.append(f"{barcode}: {ue[0].get('message', str(ue))[:80]}")
                    continue
                if inv_item_id and inv_qty >= 0:
                    inv_item_num = inv_item_id.split("/")[-1] if isinstance(inv_item_id, str) and "/" in inv_item_id else inv_item_id
                    rest_url = f"https://{store_url}/admin/api/2024-01/inventory_levels/set.json"
                    loc_resp = await client.get(
                        f"https://{store_url}/admin/api/2024-01/locations.json",
                        params={"limit": 1},
                        headers=headers,
                    )
                    loc_id = None
                    if loc_resp.status_code == 200:
                        locs = loc_resp.json().get("locations", [])
                        if locs:
                            loc_id = locs[0].get("id")
                    if loc_id:
                        inv_payload = {
                            "location_id": loc_id,
                            "inventory_item_id": int(inv_item_num),
                            "available": inv_qty,
                        }
                        inv_resp = await client.post(rest_url, json=inv_payload, headers=headers)
                        if inv_resp.status_code in (200, 201):
                            updated += 1
                        else:
                            updated += 1
                    else:
                        updated += 1
                else:
                    updated += 1
            except Exception as e:
                errors.append(f"{barcode}: {str(e)}")

    return {
        "synced": updated,
        "errors": errors[:20],
        "message": f"Обновлено в Shopify: {updated}",
    }


async def _get_items_for_platform(
    db: AsyncSession,
    cid: int,
    platform: str,
    supp_map: dict,
    cat_map: dict,
    default_markup: float,
) -> tuple[list, set[int]]:
    """Номенклатура и supplier_ids для выгрузки на площадку. Фильтр по sync_to_platforms."""
    sup_q = select(Supplier).where(
        Supplier.company_id == cid,
        Supplier.is_deleted == False,
        Supplier.extra_fields.isnot(None),
    )
    sup_r = await db.execute(sup_q)
    platform_supplier_ids: set[int] = set()
    for s in sup_r.scalars().all():
        cfg = (s.extra_fields or {}).get("import_config") or {}
        if platform in (cfg.get("sync_to_platforms") or []):
            platform_supplier_ids.add(s.id)

    nom_q = select(Nomenclature).where(
        Nomenclature.company_id == cid,
        Nomenclature.is_deleted == False,
    )
    nom_r = await db.execute(nom_q)
    items = []
    for n in nom_r.scalars().all():
        supp_id = n.supplier_id
        if supp_id is None:
            r2 = await db.execute(
                select(Supply.supplier_id).where(
                    Supply.nomenclature_id == n.id,
                    Supply.is_deleted == False,
                ).limit(1)
            )
            row = r2.scalar_one_or_none()
            supp_id = int(row) if row is not None else None
        if platform_supplier_ids and (supp_id is None or supp_id not in platform_supplier_ids):
            continue
        cat_mk = cat_map.get(n.category_id) if n.category_id else None
        supp_mk = supp_map.get(supp_id) if supp_id else None
        final_price, _ = compute_final_price(
            n.purchase_price, n.markup_percent, cat_mk, supp_mk, default_markup
        )
        if final_price is None:
            continue
        items.append((n, str(final_price), int(n.stock) if n.stock is not None and n.stock >= 0 else 0))
    return items, platform_supplier_ids


@router.post("/sync/wildberries")
async def sync_to_wildberries(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Выгрузка цен и остатков на Wildberries. Требуется wb_nm_id в extra_fields номенклатуры."""
    from app.models.oauth_connection import OAuthConnection

    import httpx

    cid = await _get_trader_company_id(user, db)
    q = select(OAuthConnection).where(
        OAuthConnection.company_id == cid,
        OAuthConnection.provider == "wildberries",
    )
    r = await db.execute(q)
    conn = r.scalar_one_or_none()
    if not conn or not conn.access_token:
        raise HTTPException(400, "Wildberries не подключен. Подключите в разделе Интеграции.")
    api_key = conn.get_access_token()

    supp_map, cat_map, default_markup = await _get_markup_maps(db, cid)
    items, _ = await _get_items_for_platform(db, cid, "wildberries", supp_map, cat_map, default_markup)

    updated = 0
    errors: list[str] = []
    base_url = "https://marketplace-api.wildberries.ru"

    async with httpx.AsyncClient(timeout=30.0) as client:
        prices_batch: list[dict] = []
        stocks_batch: list[dict] = []
        for n, price_str, inv_qty in items:
            wb_nm_id = None
            if n.extra_fields and isinstance(n.extra_fields, dict):
                wb_nm_id = n.extra_fields.get("wb_nm_id") or n.extra_fields.get("wb_nmId")
            if wb_nm_id is None:
                errors.append(f"{n.name or n.barcode}: не указан wb_nm_id в доп. полях")
                continue
            try:
                nm = int(wb_nm_id)
            except (ValueError, TypeError):
                errors.append(f"{n.name}: неверный wb_nm_id")
                continue
            prices_batch.append({"nmId": nm, "price": str(int(float(price_str)))})
            stocks_batch.append({"nmId": nm, "stocks": [{"warehouseId": 0, "amount": inv_qty}]})

        if prices_batch:
            pr_resp = await client.post(
                f"{base_url}/public/api/v1/prices",
                headers={"Authorization": api_key, "Content-Type": "application/json"},
                json=prices_batch,
            )
            if pr_resp.status_code in (200, 201):
                updated += len(prices_batch)
            else:
                errors.append(f"Цены WB: {pr_resp.status_code} {pr_resp.text[:150]}")
        if stocks_batch:
            st_resp = await client.put(
                f"{base_url}/api/v3/stocks",
                headers={"Authorization": api_key, "Content-Type": "application/json"},
                json={"stocks": stocks_batch},
            )
            if st_resp.status_code in (200, 201):
                updated += len(stocks_batch)
            elif not errors:
                errors.append(f"Остатки WB: {st_resp.status_code} {st_resp.text[:150]}")

    return {
        "synced": updated,
        "errors": errors[:20],
        "message": f"Обновлено в Wildberries: {updated}",
    }


@router.post("/sync/ozon")
async def sync_to_ozon(
    user: User = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    """Выгрузка цен и остатков на Ozon. offer_id = баркод. Client-Id и Api-Key в oauth_connection (store_id, access_token)."""
    from app.models.oauth_connection import OAuthConnection

    import httpx

    cid = await _get_trader_company_id(user, db)
    q = select(OAuthConnection).where(
        OAuthConnection.company_id == cid,
        OAuthConnection.provider == "ozon",
    )
    r = await db.execute(q)
    conn = r.scalar_one_or_none()
    if not conn or not conn.access_token:
        raise HTTPException(400, "Ozon не подключен. Подключите в разделе Интеграции.")

    client_id = conn.store_id or conn.store_url or ""
    api_key = conn.get_access_token()
    if not client_id:
        raise HTTPException(400, "Укажите Client-Id Ozon в настройках подключения.")

    supp_map, cat_map, default_markup = await _get_markup_maps(db, cid)
    items, _ = await _get_items_for_platform(db, cid, "ozon", supp_map, cat_map, default_markup)

    updated = 0
    errors: list[str] = []
    base_url = "https://api-seller.ozon.ru"

    headers = {
        "Client-Id": str(client_id),
        "Api-Key": api_key,
        "Content-Type": "application/json",
    }

    prices_payload: list[dict] = []
    for n, price_str, inv_qty in items:
        offer_id = None
        if n.extra_fields and isinstance(n.extra_fields, dict):
            offer_id = n.extra_fields.get("ozon_offer_id")
        if not offer_id and n.barcode:
            offer_id = str(n.barcode).strip()
        if not offer_id:
            errors.append(f"{n.name}: нет offer_id (баркод или ozon_offer_id)")
            continue
        price_val = str(round(float(price_str), 2))
        prices_payload.append({
            "offer_id": str(offer_id),
            "price": price_val,
            "old_price": price_val,
            "auto_action_enabled": "DISABLED",
        })

    async with httpx.AsyncClient(timeout=30.0) as client:
        if prices_payload:
            batch_size = 100
            for i in range(0, len(prices_payload), batch_size):
                batch = prices_payload[i : i + batch_size]
                resp = await client.post(
                    f"{base_url}/v1/product/import/prices",
                    headers=headers,
                    json={"prices": batch},
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    results = data.get("result", [])
                    updated += sum(1 for r in results if r.get("updated"))
                else:
                    errors.append(f"Ozon цены: {resp.status_code} {resp.text[:150]}")

    return {
        "synced": updated,
        "errors": errors[:20],
        "message": f"Обновлено в Ozon: {updated}",
    }