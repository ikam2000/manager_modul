# -*- coding: utf-8 -*-
"""API для интеграции 1С, ERP, CRM: двухсторонняя передача данных."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import check_trial_or_subscription, check_entity_limit, check_nomenclature_per_supplier_limit
from app.models.api_key import ApiKey
from app.models.entity import (
    Category,
    SubCategory,
    Nomenclature,
    Supplier,
    Manufacturer,
    Supply,
    Contract,
    ContractAppendix,
)
from app.security import hash_api_key

router = APIRouter()

ENTITY_TYPES = ("category", "subcategory", "nomenclature", "supplier", "manufacturer", "supply", "contract", "contract_appendix")


class ApiKeyAuth:
    def __init__(self, company_id: int, api_key: ApiKey):
        self.company_id = company_id
        self.api_key = api_key

    def has_scope(self, scope: str) -> bool:
        s = (getattr(self.api_key, "scope", None) or "read,write").lower()
        return scope in s.split(",")


async def verify_api_key(
    x_api_key: str = Header(..., alias="X-Api-Key"),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyAuth:
    """Проверяет API-ключ и возвращает company_id и запись ApiKey."""
    key_hash = hash_api_key(x_api_key)
    r = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(401, "Неверный или неактивный API-ключ")
    exp = getattr(row, "expires_at", None)
    if exp and exp < datetime.utcnow():
        raise HTTPException(401, "API-ключ истёк")
    row.last_used_at = datetime.utcnow()
    await db.commit()
    from app.database import set_rls_tenant_ids
    await set_rls_tenant_ids(db, [row.company_id])
    return ApiKeyAuth(company_id=row.company_id, api_key=row)


async def require_api_key_trial(
    auth: ApiKeyAuth = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyAuth:
    """API-ключ + проверка trial/подписки компании."""
    await check_trial_or_subscription(auth.company_id, db)
    return auth


class EntityCreateBody(BaseModel):
    """Тело запроса на создание сущности."""

    entity_type: str
    data: dict[str, Any] = {}

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"entity_type": "nomenclature", "data": {"name": "Изделие А", "code": "IZD-001", "category_id": 1}},
                {"entity_type": "supplier", "data": {"name": "ООО Поставщик", "inn": "7707123456"}},
                {"entity_type": "supply", "data": {"supplier_id": 1, "nomenclature_id": 5, "quantity": 100}},
            ]
        }
    }


class EntityUpdateBody(BaseModel):
    """Тело запроса на обновление сущности."""

    data: dict[str, Any] = {}

    model_config = {
        "json_schema_extra": {
            "examples": [{"data": {"name": "Новое название", "code": "IZD-002"}}]
        }
    }


async def _list_entities(db: AsyncSession, company_id: int, entity_type: str, limit: int, offset: int):
    """Делегирует в соответствующий запрос по типу сущности."""
    if entity_type == "category":
        q = select(Category).where(Category.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        return [{"id": c.id, "company_id": c.company_id, "name": c.name} for c in r.scalars().all()]
    if entity_type == "subcategory":
        q = select(SubCategory).join(Category).where(Category.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        return [{"id": s.id, "category_id": s.category_id, "name": s.name} for s in r.scalars().all()]
    if entity_type == "nomenclature":
        q = select(Nomenclature).where(Nomenclature.company_id == company_id, Nomenclature.is_deleted == False).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{c: getattr(n, c) for c in ["id", "company_id", "code", "name", "category_id", "subcategory_id", "tag_number", "package_number", "specification", "manufacturer_id"]} for n in items]
    if entity_type == "supplier":
        q = select(Supplier).where(Supplier.company_id == company_id, Supplier.is_deleted == False).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{c: getattr(s, c) for c in ["id", "company_id", "name", "phone", "address", "inn"]} for s in items]
    if entity_type == "manufacturer":
        q = select(Manufacturer).where(Manufacturer.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{c: getattr(m, c) for c in ["id", "company_id", "name", "address"]} for m in items]
    if entity_type == "supply":
        q = select(Supply).where(Supply.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{"id": s.id, "supplier_id": s.supplier_id, "nomenclature_id": s.nomenclature_id, "quantity": s.quantity, "production_date": str(s.production_date) if s.production_date else None} for s in items]
    if entity_type == "contract":
        q = select(Contract).where(Contract.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{"id": c.id, "supplier_id": c.supplier_id, "number": c.number, "date_start": str(c.date_start) if c.date_start else None, "date_end": str(c.date_end) if c.date_end else None} for c in items]
    if entity_type == "contract_appendix":
        q = select(ContractAppendix).join(Contract).where(Contract.company_id == company_id).limit(limit).offset(offset)
        r = await db.execute(q)
        items = r.scalars().all()
        return [{"id": a.id, "contract_id": a.contract_id, "name": a.name} for a in items]
    return []


@router.get(
    "/entities",
    summary="Список сущностей",
    description="Получение списка сущностей по типу. Требуется заголовок X-Api-Key.",
)
async def api_list_entities(
    auth: ApiKeyAuth = Depends(require_api_key_trial),
    db: AsyncSession = Depends(get_db),
    entity_type: str = Query(..., description="category | subcategory | nomenclature | supplier | manufacturer | supply | contract | contract_appendix"),
    limit: int = Query(50, le=200, description="Макс. 200 записей"),
    offset: int = Query(0, ge=0),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(400, f"entity_type должен быть одним из: {ENTITY_TYPES}")
    items = await _list_entities(db, auth.company_id, entity_type, limit, offset)
    return {"items": items}


@router.post(
    "/entities",
    summary="Создание сущности",
    description="Создание сущности по типу. Тело: {entity_type, data}. Поля data зависят от типа (name, code, category_id и т.д.).",
)
async def api_create_entity(
    body: EntityCreateBody,
    auth: ApiKeyAuth = Depends(require_api_key_trial),
    db: AsyncSession = Depends(get_db),
):
    if body.entity_type not in ENTITY_TYPES:
        raise HTTPException(400, f"entity_type должен быть одним из: {ENTITY_TYPES}")
    data = body.data or {}
    company_id = auth.company_id
    data["company_id"] = company_id

    if body.entity_type == "category":
        cat = Category(company_id=company_id, name=data.get("name", ""))
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        return {"id": cat.id, "entity_type": "category"}

    if body.entity_type == "subcategory":
        sub = SubCategory(category_id=data.get("category_id", 0), name=data.get("name", ""))
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return {"id": sub.id, "entity_type": "subcategory"}

    if body.entity_type == "nomenclature":
        await check_entity_limit(company_id, "nomenclature", db)
        supplier_id = data.get("supplier_id")
        if supplier_id:
            await check_nomenclature_per_supplier_limit(company_id, supplier_id, db)
        nom = Nomenclature(
            company_id=company_id,
            code=data.get("code"),
            name=data.get("name", ""),
            category_id=data.get("category_id"),
            subcategory_id=data.get("subcategory_id"),
            tag_number=data.get("tag_number"),
            package_number=data.get("package_number"),
            specification=data.get("specification"),
            question_sheet_no=data.get("question_sheet_no"),
            manufacturer_id=data.get("manufacturer_id"),
        )
        db.add(nom)
        await db.commit()
        await db.refresh(nom)
        return {"id": nom.id, "entity_type": "nomenclature"}

    if body.entity_type == "supplier":
        await check_entity_limit(company_id, "suppliers", db)
        sup = Supplier(
            company_id=company_id,
            name=data.get("name", ""),
            phone=data.get("phone"),
            address=data.get("address"),
            inn=data.get("inn"),
        )
        db.add(sup)
        await db.commit()
        await db.refresh(sup)
        return {"id": sup.id, "entity_type": "supplier"}

    if body.entity_type == "manufacturer":
        await check_entity_limit(company_id, "manufacturers", db)
        man = Manufacturer(
            company_id=company_id,
            name=data.get("name", ""),
            address=data.get("address"),
        )
        db.add(man)
        await db.commit()
        await db.refresh(man)
        return {"id": man.id, "entity_type": "manufacturer"}

    if body.entity_type == "supply":
        sup_id = data.get("supplier_id")
        nom_id = data.get("nomenclature_id")
        if not sup_id or not nom_id:
            raise HTTPException(400, "Требуются supplier_id и nomenclature_id")
        r = await db.execute(select(Supplier).where(Supplier.id == sup_id, Supplier.company_id == company_id))
        if not r.scalar_one_or_none():
            raise HTTPException(400, "Поставщик не найден")
        supply = Supply(
            supplier_id=sup_id,
            nomenclature_id=nom_id,
            quantity=float(data.get("quantity", 1)),
            production_date=data.get("production_date"),
            calibration_date=data.get("calibration_date"),
        )
        db.add(supply)
        await db.commit()
        await db.refresh(supply)
        return {"id": supply.id, "entity_type": "supply"}

    if body.entity_type == "contract":
        sup_id = data.get("supplier_id")
        if not sup_id:
            raise HTTPException(400, "Требуется supplier_id")
        r = await db.execute(select(Supplier).where(Supplier.id == sup_id, Supplier.company_id == company_id))
        if not r.scalar_one_or_none():
            raise HTTPException(400, "Поставщик не найден")
        c = Contract(
            supplier_id=sup_id,
            number=data.get("number", ""),
            date_start=data.get("date_start"),
            date_end=data.get("date_end"),
        )
        db.add(c)
        await db.commit()
        await db.refresh(c)
        return {"id": c.id, "entity_type": "contract"}

    if body.entity_type == "contract_appendix":
        cid = data.get("contract_id")
        if not cid:
            raise HTTPException(400, "Требуется contract_id")
        r = await db.execute(
            select(Contract).join(Supplier).where(Contract.id == cid, Supplier.company_id == company_id)
        )
        if not r.scalar_one_or_none():
            raise HTTPException(400, "Договор не найден")
        a = ContractAppendix(contract_id=cid, name=data.get("name", ""))
        db.add(a)
        await db.commit()
        await db.refresh(a)
        return {"id": a.id, "entity_type": "contract_appendix"}

    raise HTTPException(400, "Неизвестный тип сущности")


@router.get(
    "/entities/{entity_type}/{id}",
    summary="Получить сущность по ID",
)
async def api_get_entity(
    entity_type: str,
    id: int,
    auth: ApiKeyAuth = Depends(require_api_key_trial),
    db: AsyncSession = Depends(get_db),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(400, f"entity_type должен быть одним из: {ENTITY_TYPES}")
    items = await _list_entities(db, auth.company_id, entity_type, limit=1000, offset=0)
    for it in items:
        if it.get("id") == id:
            return it
    raise HTTPException(404, "Не найдено")


@router.put(
    "/entities/{entity_type}/{id}",
    summary="Обновить сущность",
    description="Поддерживается для nomenclature, supplier, manufacturer. Тело: {data: {поле: значение}}.",
)
async def api_update_entity(
    entity_type: str,
    id: int,
    body: EntityUpdateBody,
    auth: ApiKeyAuth = Depends(require_api_key_trial),
    db: AsyncSession = Depends(get_db),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(400, f"entity_type должен быть одним из: {ENTITY_TYPES}")
    data = body.data or {}
    company_id = auth.company_id

    if entity_type == "nomenclature":
        r = await db.execute(select(Nomenclature).where(Nomenclature.id == id, Nomenclature.company_id == company_id))
        obj = r.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Не найдено")
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await db.commit()
        await db.refresh(obj)
        return {"id": obj.id, "entity_type": "nomenclature"}

    if entity_type == "supplier":
        r = await db.execute(select(Supplier).where(Supplier.id == id, Supplier.company_id == company_id))
        obj = r.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Не найдено")
        for k, v in data.items():
            if hasattr(obj, k) and k != "company_id":
                setattr(obj, k, v)
        await db.commit()
        await db.refresh(obj)
        return {"id": obj.id, "entity_type": "supplier"}

    if entity_type == "manufacturer":
        r = await db.execute(select(Manufacturer).where(Manufacturer.company_id == auth.company_id, Manufacturer.id == id))
        obj = r.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Не найдено")
        for k, v in data.items():
            if hasattr(obj, k) and k != "company_id":
                setattr(obj, k, v)
        await db.commit()
        await db.refresh(obj)
        return {"id": obj.id, "entity_type": "manufacturer"}

    raise HTTPException(400, "Обновление данного типа сущности пока не поддерживается")


@router.delete(
    "/entities/{entity_type}/{id}",
    summary="Удалить сущность (soft delete)",
    description="Поддерживается для nomenclature, supplier. Запись помечается is_deleted=True.",
)
async def api_delete_entity(
    entity_type: str,
    id: int,
    auth: ApiKeyAuth = Depends(require_api_key_trial),
    db: AsyncSession = Depends(get_db),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(400, f"entity_type должен быть одним из: {ENTITY_TYPES}")

    company_id = auth.company_id

    if entity_type == "nomenclature":
        r = await db.execute(select(Nomenclature).where(Nomenclature.id == id, Nomenclature.company_id == company_id))
        obj = r.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Не найдено")
        obj.is_deleted = True
        await db.commit()
        return {"ok": True}

    if entity_type == "supplier":
        r = await db.execute(select(Supplier).where(Supplier.id == id, Supplier.company_id == company_id))
        obj = r.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Не найдено")
        obj.is_deleted = True
        await db.commit()
        return {"ok": True}

    raise HTTPException(400, "Удаление данного типа сущности пока не поддерживается")

