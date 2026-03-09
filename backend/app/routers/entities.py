# -*- coding: utf-8 -*-
"""CRUD сущностей: категории, номенклатура, поставщики, поставки и т.д."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func, exists, cast, Text, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    get_current_user,
    get_user_company_ids,
    get_user_company_id,
    require_can_delete_entities,
    get_user_permissions,
    check_entity_limit,
    check_nomenclature_per_supplier_limit,
    require_trial_or_subscription,
)
from app.models.user import User, Role
from app.models.entity import (
    Category,
    SubCategory,
    Supplier,
    Manufacturer,
    Customer,
    SupplierCustomer,
    SupplierManufacturer,
    CustomerSupplier,
    CustomerManufacturer,
    Nomenclature,
    Supply,
    Contract,
    ContractAppendix,
)
from app.schemas.entity import (
    CategoryCreate,
    CategoryUpdate,
    CategoryOut,
    SubCategoryCreate,
    SubCategoryUpdate,
    SubCategoryOut,
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    ManufacturerCreate,
    ManufacturerUpdate,
    ManufacturerOut,
    NomenclatureCreate,
    NomenclatureUpdate,
    NomenclatureOut,
    SupplyBatchCreate,
    SupplyCreate,
    SupplyUpdate,
    SupplyOut,
    ContractCreate,
    ContractUpdate,
    ContractOut,
    ContractAppendixCreate,
    ContractAppendixUpdate,
    ContractAppendixOut,
    CustomerCreate,
    CustomerUpdate,
    CustomerOut,
)

router = APIRouter()


def _company_filter(model, company_ids: list[int] | None):
    """Фильтр по компании: None = супер-админ без ограничений."""
    if company_ids is None:
        return True  # no filter
    return model.company_id.in_(company_ids)


# --- Categories ---


@router.get("/categories", response_model=dict)
async def list_categories(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query("name"),
    sort_order: str | None = Query("asc"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Category)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Category.company_id == company_id)
    if search:
        q = q.where(Category.name.ilike(f"%{search}%"))
    col = Category.name if (sort_by or "name") == "name" else (Category.id if sort_by == "id" else Category.name)
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(Category)
    if company_ids is not None:
        count_q = count_q.where(Category.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Category.company_id == company_id)
    if search:
        count_q = count_q.where(Category.name.ilike(f"%{search}%"))
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": [CategoryOut.model_validate(c) for c in items], "total": total}


@router.post("/categories", response_model=CategoryOut)
async def create_category(
    data: CategoryCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid and user.role != Role.super_admin:
        raise HTTPException(400, "Не указана компания")
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    cat = Category(company_id=cid, name=data.name)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.get("/categories/{id}", response_model=CategoryOut)
async def get_category(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Category).where(Category.id == id)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Категория не найдена")
    return CategoryOut.model_validate(cat)


@router.patch("/categories/{id}", response_model=CategoryOut)
async def update_category(
    id: int,
    data: CategoryUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Category).where(Category.id == id)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Категория не найдена")
    if data.name is not None:
        cat.name = data.name
    await db.commit()
    await db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.delete("/categories/{id}")
async def delete_category(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Category).where(Category.id == id)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Категория не найдена")
    await db.delete(cat)
    await db.commit()
    return {"ok": True}


# --- SubCategories ---


@router.get("/subcategories", response_model=dict)
async def list_subcategories(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query("name"),
    sort_order: str | None = Query("asc"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(SubCategory).join(Category, SubCategory.category_id == Category.id)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    if category_id is not None:
        q = q.where(SubCategory.category_id == category_id)
    if search:
        q = q.where(SubCategory.name.ilike(f"%{search}%"))
    col = SubCategory.name if (sort_by or "name") == "name" else (SubCategory.id if sort_by == "id" else SubCategory.name)
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(SubCategory).join(
        Category, SubCategory.category_id == Category.id
    )
    if company_ids is not None:
        count_q = count_q.where(Category.company_id.in_(company_ids))
    if category_id is not None:
        count_q = count_q.where(SubCategory.category_id == category_id)
    if search:
        count_q = count_q.where(SubCategory.name.ilike(f"%{search}%"))
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": [SubCategoryOut.model_validate(s) for s in items], "total": total}


@router.post("/subcategories", response_model=SubCategoryOut)
async def create_subcategory(
    data: SubCategoryCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(Category).where(Category.id == data.category_id)
    )
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Категория не найдена")
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and cat.company_id not in company_ids:
        raise HTTPException(403, "Нет доступа к категории")
    sub = SubCategory(category_id=data.category_id, name=data.name)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return SubCategoryOut.model_validate(sub)


@router.get("/subcategories/{id}", response_model=SubCategoryOut)
async def get_subcategory(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(SubCategory)
        .join(Category, SubCategory.category_id == Category.id)
        .where(SubCategory.id == id)
    )
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    sub = r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Подкатегория не найдена")
    return SubCategoryOut.model_validate(sub)


@router.patch("/subcategories/{id}", response_model=SubCategoryOut)
async def update_subcategory(
    id: int,
    data: SubCategoryUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(SubCategory)
        .join(Category, SubCategory.category_id == Category.id)
        .where(SubCategory.id == id)
    )
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    sub = r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Подкатегория не найдена")
    if data.category_id is not None:
        sub.category_id = data.category_id
    if data.name is not None:
        sub.name = data.name
    await db.commit()
    await db.refresh(sub)
    return SubCategoryOut.model_validate(sub)


@router.delete("/subcategories/{id}")
async def delete_subcategory(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(SubCategory)
        .join(Category, SubCategory.category_id == Category.id)
        .where(SubCategory.id == id)
    )
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None:
        q = q.where(Category.company_id.in_(company_ids))
    r = await db.execute(q)
    sub = r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Подкатегория не найдена")
    await db.delete(sub)
    await db.commit()
    return {"ok": True}


# --- Suppliers ---


@router.get("/suppliers", response_model=dict)
async def list_suppliers(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    search: str | None = Query(None),
    include_deleted: bool = Query(False),
    sort_by: str | None = Query(None),
    sort_order: str | None = Query("asc"),
    limit: int = Query(20, le=500),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Supplier.company_id == company_id)
    if not include_deleted:
        q = q.where(Supplier.is_deleted == False)
    if search:
        q = q.where(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.inn.ilike(f"%{search}%"),
            )
        )
    order_col = Supplier.name
    if sort_order == "desc":
        q = q.order_by(order_col.desc())
    else:
        q = q.order_by(order_col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(Supplier)
    if company_ids is not None:
        count_q = count_q.where(Supplier.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Supplier.company_id == company_id)
    if not include_deleted:
        count_q = count_q.where(Supplier.is_deleted == False)
    if search:
        count_q = count_q.where(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.inn.ilike(f"%{search}%"),
            )
        )
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": [SupplierOut.model_validate(s) for s in items], "total": total}


@router.post("/suppliers", response_model=SupplierOut)
async def create_supplier(
    data: SupplierCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    await check_entity_limit(cid, "suppliers", db)
    sup = Supplier(
        company_id=cid,
        name=data.name,
        phone=data.phone,
        address=data.address,
        inn=data.inn,
        kpp=data.kpp,
        ogrn=data.ogrn,
        email=data.email,
        legal_address=data.legal_address,
        bank_name=data.bank_name,
        bank_bik=data.bank_bik,
        bank_account=data.bank_account,
        bank_corr=data.bank_corr,
        contact_person=data.contact_person,
        delivery_address=data.delivery_address,
        supply_address=data.supply_address,
        extra_fields=data.extra_fields,
    )
    db.add(sup)
    await db.commit()
    await db.refresh(sup)
    from app.services.audit import write_audit
    await write_audit(db, company_id=cid, user_id=user.id, action="create", entity_type="supplier", entity_id=sup.id, new_value={"name": sup.name})
    await db.commit()
    return SupplierOut.model_validate(sup)


@router.get("/suppliers/{id}", response_model=SupplierOut)
async def get_supplier(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    return SupplierOut.model_validate(sup)


@router.patch("/suppliers/{id}", response_model=SupplierOut)
async def update_supplier(
    id: int,
    data: SupplierUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    for attr in ("name", "phone", "address", "inn", "kpp", "ogrn", "email", "legal_address",
                 "bank_name", "bank_bik", "bank_account", "bank_corr", "contact_person",
                 "delivery_address", "supply_address"):
        val = getattr(data, attr, None)
        if val is not None:
            setattr(sup, attr, None if val == "" else val)
    if data.extra_fields is not None:
        sup.extra_fields = {**(sup.extra_fields or {}), **data.extra_fields}
    from app.services.audit import write_audit
    await write_audit(db, company_id=sup.company_id, user_id=user.id, action="update", entity_type="supplier", entity_id=id, new_value={"name": sup.name})
    await db.commit()
    await db.refresh(sup)
    return SupplierOut.model_validate(sup)


@router.delete("/suppliers/{id}")
async def delete_supplier(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    from app.services.audit import write_audit
    if soft:
        sup.is_deleted = True
        await write_audit(db, company_id=sup.company_id, user_id=user.id, action="delete", entity_type="supplier", entity_id=id, old_value={"name": sup.name})
        await db.commit()
    else:
        await write_audit(db, company_id=sup.company_id, user_id=user.id, action="delete", entity_type="supplier", entity_id=id, old_value={"name": sup.name})
        await db.delete(sup)
        await db.commit()
    return {"ok": True}


# --- Manufacturers ---


@router.get("/manufacturers", response_model=dict)
async def list_manufacturers(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    search: str | None = Query(None),
    include_deleted: bool = Query(False),
    sort_by: str | None = Query(None),
    sort_order: str | None = Query("asc"),
    limit: int = Query(20, le=500),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Manufacturer)
    if company_ids is not None:
        q = q.where(Manufacturer.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Manufacturer.company_id == company_id)
    if not include_deleted:
        q = q.where(Manufacturer.is_deleted == False)
    if search:
        q = q.where(Manufacturer.name.ilike(f"%{search}%"))
    order_col = Manufacturer.name
    if sort_order == "desc":
        q = q.order_by(order_col.desc())
    else:
        q = q.order_by(order_col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(Manufacturer)
    if company_ids is not None:
        count_q = count_q.where(Manufacturer.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Manufacturer.company_id == company_id)
    if not include_deleted:
        count_q = count_q.where(Manufacturer.is_deleted == False)
    if search:
        count_q = count_q.where(Manufacturer.name.ilike(f"%{search}%"))
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": [ManufacturerOut.model_validate(m) for m in items], "total": total}


@router.post("/manufacturers", response_model=ManufacturerOut)
async def create_manufacturer(
    data: ManufacturerCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    await check_entity_limit(cid, "manufacturers", db)
    mfr = Manufacturer(
        company_id=cid,
        name=data.name,
        address=data.address,
        phone=data.phone,
        inn=data.inn,
        kpp=data.kpp,
        ogrn=data.ogrn,
        email=data.email,
        legal_address=data.legal_address,
        bank_name=data.bank_name,
        bank_bik=data.bank_bik,
        bank_account=data.bank_account,
        bank_corr=data.bank_corr,
        contact_person=data.contact_person,
        delivery_address=data.delivery_address,
        supply_address=data.supply_address,
        extra_fields=data.extra_fields,
    )
    db.add(mfr)
    await db.commit()
    await db.refresh(mfr)
    return ManufacturerOut.model_validate(mfr)


@router.get("/manufacturers/{id}", response_model=ManufacturerOut)
async def get_manufacturer(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Manufacturer).where(Manufacturer.id == id)
    if company_ids is not None:
        q = q.where(Manufacturer.company_id.in_(company_ids))
    r = await db.execute(q)
    mfr = r.scalar_one_or_none()
    if not mfr:
        raise HTTPException(404, "Производитель не найден")
    return ManufacturerOut.model_validate(mfr)


@router.patch("/manufacturers/{id}", response_model=ManufacturerOut)
async def update_manufacturer(
    id: int,
    data: ManufacturerUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Manufacturer).where(Manufacturer.id == id)
    if company_ids is not None:
        q = q.where(Manufacturer.company_id.in_(company_ids))
    r = await db.execute(q)
    mfr = r.scalar_one_or_none()
    if not mfr:
        raise HTTPException(404, "Производитель не найден")
    for attr in ("name", "address", "phone", "inn", "kpp", "ogrn", "email", "legal_address",
                 "bank_name", "bank_bik", "bank_account", "bank_corr", "contact_person",
                 "delivery_address", "supply_address"):
        val = getattr(data, attr, None)
        if val is not None:
            setattr(mfr, attr, None if val == "" else val)
    if data.extra_fields is not None:
        mfr.extra_fields = {**(mfr.extra_fields or {}), **data.extra_fields}
    await db.commit()
    await db.refresh(mfr)
    return ManufacturerOut.model_validate(mfr)


@router.delete("/manufacturers/{id}")
async def delete_manufacturer(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Manufacturer).where(Manufacturer.id == id)
    if company_ids is not None:
        q = q.where(Manufacturer.company_id.in_(company_ids))
    r = await db.execute(q)
    mfr = r.scalar_one_or_none()
    if not mfr:
        raise HTTPException(404, "Производитель не найден")
    if soft:
        mfr.is_deleted = True
        await db.commit()
    else:
        await db.delete(mfr)
        await db.commit()
    return {"ok": True}


# --- Customers ---


@router.get("/customers", response_model=dict)
async def list_customers(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and not company_ids:
        return {"items": [], "total": 0}
    q = select(Customer).where(Customer.company_id.in_(company_ids), Customer.is_deleted == False)
    if search:
        q = q.where(or_(Customer.name.ilike(f"%{search}%"), Customer.inn.ilike(f"%{search}%")))
    q = q.order_by(Customer.name.asc()).limit(limit).offset(offset)
    r = await db.execute(q)
    items = r.scalars().all()
    cq = select(func.count()).select_from(Customer).where(Customer.company_id.in_(company_ids), Customer.is_deleted == False)
    if search:
        cq = cq.where(or_(Customer.name.ilike(f"%{search}%"), Customer.inn.ilike(f"%{search}%")))
    total = (await db.execute(cq)).scalar() or 0
    return {"items": [CustomerOut.model_validate(c) for c in items], "total": total}


@router.post("/customers", response_model=CustomerOut)
async def create_customer(
    data: CustomerCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    await check_entity_limit(cid, "customers", db)
    cust = Customer(
        company_id=cid,
        name=data.name,
        inn=data.inn,
        kpp=data.kpp,
        address=data.address,
        phone=data.phone,
        email=data.email,
        legal_address=data.legal_address,
        delivery_address=data.delivery_address,
        supply_address=data.supply_address,
        bank_name=data.bank_name,
        bank_bik=data.bank_bik,
        bank_account=data.bank_account,
        bank_corr=data.bank_corr,
        contact_person=data.contact_person,
        extra_fields=data.extra_fields,
    )
    db.add(cust)
    await db.commit()
    await db.refresh(cust)
    return CustomerOut.model_validate(cust)


@router.get("/customers/{id}", response_model=CustomerOut)
async def get_customer(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Customer).where(Customer.id == id, Customer.is_deleted == False)
    if company_ids is not None:
        q = q.where(Customer.company_id.in_(company_ids))
    r = await db.execute(q)
    cust = r.scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Заказчик не найден")
    return CustomerOut.model_validate(cust)


@router.patch("/customers/{id}", response_model=CustomerOut)
async def update_customer(
    id: int,
    data: CustomerUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Customer).where(Customer.id == id, Customer.is_deleted == False)
    if company_ids is not None:
        q = q.where(Customer.company_id.in_(company_ids))
    r = await db.execute(q)
    cust = r.scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Заказчик не найден")
    for attr in ("name", "inn", "kpp", "address", "phone", "email", "legal_address",
                 "delivery_address", "supply_address", "bank_name", "bank_bik",
                 "bank_account", "bank_corr", "contact_person"):
        val = getattr(data, attr, None)
        if val is not None:
            setattr(cust, attr, None if val == "" else val)
    if data.extra_fields is not None:
        cust.extra_fields = {**(cust.extra_fields or {}), **data.extra_fields}
    await db.commit()
    await db.refresh(cust)
    return CustomerOut.model_validate(cust)


@router.delete("/customers/{id}")
async def delete_customer(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Customer).where(Customer.id == id)
    if company_ids is not None:
        q = q.where(Customer.company_id.in_(company_ids))
    r = await db.execute(q)
    cust = r.scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Заказчик не найден")
    if soft:
        cust.is_deleted = True
        await db.commit()
    else:
        await db.delete(cust)
        await db.commit()
    return {"ok": True}


# --- Supplier links (customers, manufacturers) ---


@router.get("/suppliers/{id}/links")
async def get_supplier_links(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает заказчиков и производителей, привязанных к поставщику."""
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставщик не найден")
    sc = await db.execute(select(SupplierCustomer.customer_id).where(SupplierCustomer.supplier_id == id))
    customer_ids = [row[0] for row in sc.all()]
    sm = await db.execute(select(SupplierManufacturer.manufacturer_id).where(SupplierManufacturer.supplier_id == id))
    manufacturer_ids = [row[0] for row in sm.all()]
    customers = []
    if customer_ids:
        cust_r = await db.execute(select(Customer).where(Customer.id.in_(customer_ids), Customer.is_deleted == False))
        customers = [{"id": c.id, "name": c.name} for c in cust_r.scalars().all()]
    manufacturers = []
    if manufacturer_ids:
        mfr_r = await db.execute(select(Manufacturer).where(Manufacturer.id.in_(manufacturer_ids), Manufacturer.is_deleted == False))
        manufacturers = [{"id": m.id, "name": m.name} for m in mfr_r.scalars().all()]
    return {"customers": customers, "manufacturers": manufacturers}


@router.post("/suppliers/{id}/customers/{customer_id}")
async def add_supplier_customer(
    id: int,
    customer_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    for (model, eid, name) in [(Supplier, id, "поставщик"), (Customer, customer_id, "заказчик")]:
        q = select(model).where(model.id == eid)
        if company_ids is not None:
            q = q.where(model.company_id.in_(company_ids))
        if hasattr(model, "is_deleted"):
            q = q.where(model.is_deleted == False)
        r = await db.execute(q)
        if not r.scalar_one_or_none():
            raise HTTPException(404, f"{name} не найден")
    try:
        db.add(SupplierCustomer(supplier_id=id, customer_id=customer_id))
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(400, "Связь уже существует")
    return {"ok": True}


@router.delete("/suppliers/{id}/customers/{customer_id}")
async def remove_supplier_customer(
    id: int,
    customer_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    if not r.scalar_one_or_none():
        raise HTTPException(404, "Поставщик не найден")
    await db.execute(delete(SupplierCustomer).where(
        SupplierCustomer.supplier_id == id,
        SupplierCustomer.customer_id == customer_id,
    ))
    await db.commit()
    return {"ok": True}


@router.post("/suppliers/{id}/manufacturers/{manufacturer_id}")
async def add_supplier_manufacturer(
    id: int,
    manufacturer_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    for (model, eid, name) in [(Supplier, id, "поставщик"), (Manufacturer, manufacturer_id, "производитель")]:
        q = select(model).where(model.id == eid)
        if company_ids is not None:
            q = q.where(model.company_id.in_(company_ids))
        if hasattr(model, "is_deleted"):
            q = q.where(model.is_deleted == False)
        r = await db.execute(q)
        if not r.scalar_one_or_none():
            raise HTTPException(404, f"{name} не найден")
    try:
        db.add(SupplierManufacturer(supplier_id=id, manufacturer_id=manufacturer_id))
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(400, "Связь уже существует")
    return {"ok": True}


@router.delete("/suppliers/{id}/manufacturers/{manufacturer_id}")
async def remove_supplier_manufacturer(
    id: int,
    manufacturer_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supplier).where(Supplier.id == id)
    if company_ids is not None:
        q = q.where(Supplier.company_id.in_(company_ids))
    r = await db.execute(q)
    if not r.scalar_one_or_none():
        raise HTTPException(404, "Поставщик не найден")
    await db.execute(delete(SupplierManufacturer).where(
        SupplierManufacturer.supplier_id == id,
        SupplierManufacturer.manufacturer_id == manufacturer_id,
    ))
    await db.commit()
    return {"ok": True}


# --- Nomenclature ---


@router.get("/nomenclature", response_model=dict)
async def list_nomenclature(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    category_id: int | None = Query(None),
    subcategory_id: int | None = Query(None),
    manufacturer_id: int | None = Query(None),
    supplier_id: int | None = Query(None),
    search: str | None = Query(None),
    include_deleted: bool = Query(False),
    sort_by: str | None = Query(None, description="name|code|tag_number|package_number"),
    sort_order: str | None = Query("asc", description="asc|desc"),
    limit: int = Query(20, le=500),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and len(company_ids) == 0:
        return {"items": [], "total": 0}
    q = select(Nomenclature)
    if company_ids is not None:
        q = q.where(Nomenclature.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Nomenclature.company_id == company_id)
    if category_id is not None:
        q = q.where(Nomenclature.category_id == category_id)
    if subcategory_id is not None:
        q = q.where(Nomenclature.subcategory_id == subcategory_id)
    if manufacturer_id is not None:
        q = q.where(Nomenclature.manufacturer_id == manufacturer_id)
    if supplier_id is not None:
        supply_exists = exists().where(
            Supply.nomenclature_id == Nomenclature.id,
            Supply.supplier_id == supplier_id,
            Supply.is_deleted == False,
        )
        q = q.where(supply_exists)
    if not include_deleted:
        q = q.where(Nomenclature.is_deleted == False)
    search_clean = (search or "").strip() if search else ""
    if search_clean:
        from sqlalchemy.orm import aliased
        mfr_alias = aliased(Manufacturer)
        supp_alias = aliased(Supplier)
        # Подзапрос ID: DISTINCT только по id (избегаем json в DISTINCT)
        id_subq = (
            select(Nomenclature.id)
            .outerjoin(mfr_alias, Nomenclature.manufacturer_id == mfr_alias.id)
            .outerjoin(Supply, and_(Supply.nomenclature_id == Nomenclature.id, Supply.is_deleted == False))
            .outerjoin(supp_alias, Supply.supplier_id == supp_alias.id)
            .where(or_(
                Nomenclature.name.ilike(f"%{search_clean}%"),
                Nomenclature.code.ilike(f"%{search_clean}%"),
                Nomenclature.tag_number.ilike(f"%{search_clean}%"),
                Nomenclature.package_number.ilike(f"%{search_clean}%"),
                mfr_alias.name.ilike(f"%{search_clean}%"),
                supp_alias.name.ilike(f"%{search_clean}%"),
                cast(Nomenclature.extra_fields, Text).ilike(f"%{search_clean}%"),
            ))
            .distinct()
        )
        if company_ids is not None:
            id_subq = id_subq.where(Nomenclature.company_id.in_(company_ids))
        if company_id is not None and user.role == Role.super_admin:
            id_subq = id_subq.where(Nomenclature.company_id == company_id)
        if category_id is not None:
            id_subq = id_subq.where(Nomenclature.category_id == category_id)
        if subcategory_id is not None:
            id_subq = id_subq.where(Nomenclature.subcategory_id == subcategory_id)
        if manufacturer_id is not None:
            id_subq = id_subq.where(Nomenclature.manufacturer_id == manufacturer_id)
        if supplier_id is not None:
            id_subq = id_subq.where(exists().where(
                Supply.nomenclature_id == Nomenclature.id,
                Supply.supplier_id == supplier_id,
                Supply.is_deleted == False,
            ))
        if not include_deleted:
            id_subq = id_subq.where(Nomenclature.is_deleted == False)
        q = select(Nomenclature).where(Nomenclature.id.in_(id_subq))
    order_col = Nomenclature.name
    if sort_by == "code":
        order_col = Nomenclature.code
    elif sort_by == "tag_number":
        order_col = Nomenclature.tag_number
    elif sort_by == "package_number":
        order_col = Nomenclature.package_number
    if sort_order == "desc":
        q = q.order_by(order_col.desc())
    else:
        q = q.order_by(order_col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(Nomenclature)
    if company_ids is not None:
        count_q = count_q.where(Nomenclature.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Nomenclature.company_id == company_id)
    if category_id is not None:
        count_q = count_q.where(Nomenclature.category_id == category_id)
    if subcategory_id is not None:
        count_q = count_q.where(Nomenclature.subcategory_id == subcategory_id)
    if manufacturer_id is not None:
        count_q = count_q.where(Nomenclature.manufacturer_id == manufacturer_id)
    if supplier_id is not None:
        supply_ex = exists().where(
            Supply.nomenclature_id == Nomenclature.id,
            Supply.supplier_id == supplier_id,
            Supply.is_deleted == False,
        )
        count_q = count_q.where(supply_ex)
    if not include_deleted:
        count_q = count_q.where(Nomenclature.is_deleted == False)
    if search_clean:
        from sqlalchemy.orm import aliased
        mfr_a = aliased(Manufacturer)
        supp_a = aliased(Supplier)
        id_subq = (
            select(Nomenclature.id)
            .outerjoin(mfr_a, Nomenclature.manufacturer_id == mfr_a.id)
            .outerjoin(Supply, and_(Supply.nomenclature_id == Nomenclature.id, Supply.is_deleted == False))
            .outerjoin(supp_a, Supply.supplier_id == supp_a.id)
            .where(or_(
                Nomenclature.name.ilike(f"%{search_clean}%"),
                Nomenclature.code.ilike(f"%{search_clean}%"),
                Nomenclature.tag_number.ilike(f"%{search_clean}%"),
                Nomenclature.package_number.ilike(f"%{search_clean}%"),
                mfr_a.name.ilike(f"%{search_clean}%"),
                supp_a.name.ilike(f"%{search_clean}%"),
                cast(Nomenclature.extra_fields, Text).ilike(f"%{search_clean}%"),
            ))
            .distinct()
        )
        if company_ids is not None:
            id_subq = id_subq.where(Nomenclature.company_id.in_(company_ids))
        if company_id is not None and user.role == Role.super_admin:
            id_subq = id_subq.where(Nomenclature.company_id == company_id)
        if category_id is not None:
            id_subq = id_subq.where(Nomenclature.category_id == category_id)
        if subcategory_id is not None:
            id_subq = id_subq.where(Nomenclature.subcategory_id == subcategory_id)
        if manufacturer_id is not None:
            id_subq = id_subq.where(Nomenclature.manufacturer_id == manufacturer_id)
        if supplier_id is not None:
            id_subq = id_subq.where(exists().where(
                Supply.nomenclature_id == Nomenclature.id,
                Supply.supplier_id == supplier_id,
                Supply.is_deleted == False,
            ))
        if not include_deleted:
            id_subq = id_subq.where(Nomenclature.is_deleted == False)
        count_q = select(func.count()).select_from(id_subq.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    nom_ids = [n.id for n in items]
    total_qty_map: dict[int, float] = {}
    if nom_ids:
        # Подсчёт общего количества по поставкам (nomenclature_id + extra_fields.items)
        supp_q = select(Supply).where(
            Supply.is_deleted == False,
            or_(
                Supply.nomenclature_id.in_(nom_ids),
                Supply.extra_fields.isnot(None),
            ),
        )
        if company_ids is not None:
            supp_q = supp_q.where(Supply.company_id.in_(company_ids))
        if supplier_id is not None:
            supp_q = supp_q.where(Supply.supplier_id == supplier_id)
        supp_res = await db.execute(supp_q)
        for s in supp_res.scalars().all():
            if s.nomenclature_id and s.nomenclature_id in nom_ids:
                total_qty_map[s.nomenclature_id] = total_qty_map.get(s.nomenclature_id, 0) + (s.quantity or 0)
            for it in (s.extra_fields or {}).get("items") or []:
                if isinstance(it, dict):
                    nid = it.get("nomenclature_id")
                    if nid in nom_ids:
                        q = float(it.get("quantity") or 1)
                        total_qty_map[nid] = total_qty_map.get(nid, 0) + q
    out_items = []
    for n in items:
        d = NomenclatureOut.model_validate(n).model_dump()
        d["total_quantity"] = total_qty_map.get(n.id, 0)
        out_items.append(d)
    return {"items": out_items, "total": total}


@router.post("/nomenclature", response_model=NomenclatureOut)
async def create_nomenclature(
    data: NomenclatureCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    await check_entity_limit(cid, "nomenclature", db)
    sid = getattr(data, "supplier_id", None)
    if sid:
        await check_nomenclature_per_supplier_limit(cid, sid, db)
    nom = Nomenclature(
        company_id=cid,
        code=data.code,
        name=data.name,
        price=data.price,
        category_id=data.category_id,
        subcategory_id=data.subcategory_id,
        tag_number=data.tag_number,
        package_number=data.package_number,
        specification=data.specification,
        question_sheet_no=data.question_sheet_no,
        manufacturer_id=data.manufacturer_id,
        extra_fields=data.extra_fields,
        barcode=getattr(data, "barcode", None),
        purchase_price=getattr(data, "purchase_price", None),
        markup_percent=getattr(data, "markup_percent", None),
        stock=getattr(data, "stock", None),
        expiry_date=getattr(data, "expiry_date", None),
        supplier_id=getattr(data, "supplier_id", None),
    )
    db.add(nom)
    await db.commit()
    await db.refresh(nom)
    return NomenclatureOut.model_validate(nom)


@router.get("/nomenclature/{id}", response_model=NomenclatureOut)
async def get_nomenclature(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Nomenclature).where(Nomenclature.id == id)
    if company_ids is not None:
        q = q.where(Nomenclature.company_id.in_(company_ids))
    r = await db.execute(q)
    nom = r.scalar_one_or_none()
    if not nom:
        raise HTTPException(404, "Номенклатура не найдена")
    return NomenclatureOut.model_validate(nom)


@router.patch("/nomenclature/{id}", response_model=NomenclatureOut)
async def update_nomenclature(
    id: int,
    data: NomenclatureUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Nomenclature).where(Nomenclature.id == id)
    if company_ids is not None:
        q = q.where(Nomenclature.company_id.in_(company_ids))
    r = await db.execute(q)
    nom = r.scalar_one_or_none()
    if not nom:
        raise HTTPException(404, "Номенклатура не найдена")
    dump = data.model_dump(exclude_unset=True)
    if dump.get("is_deleted") is True:
        perms = await get_user_permissions(user, nom.company_id, db)
        if not perms.get("can_delete_entities"):
            raise HTTPException(403, "Нет права отключать номенклатуру")
    for k, v in dump.items():
        setattr(nom, k, v)
    await db.commit()
    await db.refresh(nom)
    return NomenclatureOut.model_validate(nom)


@router.delete("/nomenclature/{id}")
async def delete_nomenclature(
    id: int,
    user: User = Depends(require_can_delete_entities),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Nomenclature).where(Nomenclature.id == id)
    if company_ids is not None:
        q = q.where(Nomenclature.company_id.in_(company_ids))
    r = await db.execute(q)
    nom = r.scalar_one_or_none()
    if not nom:
        raise HTTPException(404, "Номенклатура не найдена")
    if soft:
        nom.is_deleted = True
        await db.commit()
    else:
        # Проверка: есть ли поставки, ссылающиеся на эту номенклатуру (FK constraint)
        supp_check = select(func.count()).select_from(Supply).where(
            Supply.nomenclature_id == id,
            Supply.is_deleted == False,
        )
        if company_ids is not None:
            supp_check = supp_check.where(Supply.company_id.in_(company_ids))
        cnt = (await db.execute(supp_check)).scalar() or 0
        if cnt > 0:
            raise HTTPException(
                400,
                "Невозможно удалить безвозвратно: номенклатура используется в поставках. Используйте «Отключить» (soft delete).",
            )
        await db.delete(nom)
        await db.commit()
    return {"ok": True}


# --- Supplies ---


@router.get("/supplies", response_model=dict)
async def list_supplies(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    supplier_id: int | None = Query(None),
    nomenclature_id: int | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query("created_at"),
    sort_order: str | None = Query("desc"),
    include_deleted: bool = Query(False),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supply)
    if company_ids is not None:
        q = q.where(Supply.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Supply.company_id == company_id)
    if supplier_id is not None:
        q = q.where(Supply.supplier_id == supplier_id)
    if nomenclature_id is not None:
        q = q.where(Supply.nomenclature_id == nomenclature_id)
    if not include_deleted:
        q = q.where(Supply.is_deleted == False)
    if search:
        try:
            sid = int(search.strip())
            q = q.where(Supply.id == sid)
        except ValueError:
            pass
    sb = sort_by or "created_at"
    if sb in ("manufacturer", "manufacturer_name"):
        q = q.outerjoin(Nomenclature, Supply.nomenclature_id == Nomenclature.id).outerjoin(
            Manufacturer, Nomenclature.manufacturer_id == Manufacturer.id
        )
        oc = Manufacturer.name.desc() if sort_order == "desc" else Manufacturer.name.asc()
        q = q.order_by(oc.nulls_last())
    elif sb in ("category", "category_name"):
        q = q.outerjoin(Nomenclature, Supply.nomenclature_id == Nomenclature.id).outerjoin(
            Category, Nomenclature.category_id == Category.id
        )
        oc = Category.name.desc() if sort_order == "desc" else Category.name.asc()
        q = q.order_by(oc.nulls_last())
    elif sb in ("subcategory", "subcategory_name"):
        q = q.outerjoin(Nomenclature, Supply.nomenclature_id == Nomenclature.id).outerjoin(
            SubCategory, Nomenclature.subcategory_id == SubCategory.id
        )
        oc = SubCategory.name.desc() if sort_order == "desc" else SubCategory.name.asc()
        q = q.order_by(oc.nulls_last())
    else:
        col = Supply.created_at if sb == "created_at" else (
            Supply.id if sb == "id" else (Supply.quantity if sb == "quantity" else Supply.created_at)
        )
        q = q.order_by(col.desc() if sort_order == "desc" else col.asc())
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    supplies = result.unique().scalars().all()
    nom_ids_set: set[int] = set()
    for s in supplies:
        if s.nomenclature_id:
            nom_ids_set.add(s.nomenclature_id)
        ef = s.extra_fields or {}
        for it in (ef.get("items") or []):
            if isinstance(it, dict) and it.get("nomenclature_id"):
                nom_ids_set.add(it["nomenclature_id"])
    nom_ids = list(nom_ids_set)
    supp_ids = [s.supplier_id for s in supplies if s.supplier_id]
    nom_map: dict[int, tuple] = {}  # id -> (name, manufacturer_name, category_name, subcategory_name)
    if nom_ids:
        nom_q = (
            select(Nomenclature, Manufacturer.name.label("mfr_name"), Category.name.label("cat_name"), SubCategory.name.label("subcat_name"))
            .outerjoin(Manufacturer, Nomenclature.manufacturer_id == Manufacturer.id)
            .outerjoin(Category, Nomenclature.category_id == Category.id)
            .outerjoin(SubCategory, Nomenclature.subcategory_id == SubCategory.id)
            .where(Nomenclature.id.in_(nom_ids))
        )
        nom_res = await db.execute(nom_q)
        for row in nom_res.all():
            n = row.Nomenclature
            nom_map[n.id] = (
                (n.name or n.code or "")[:100],
                (row.mfr_name or "")[:255] if row.mfr_name else "",
                (row.cat_name or "")[:255] if row.cat_name else "",
                (row.subcat_name or "")[:255] if row.subcat_name else "",
            )
    supp_map: dict[int, str] = {}
    if supp_ids:
        supp_res = await db.execute(select(Supplier.id, Supplier.name).where(Supplier.id.in_(supp_ids)))
        for srow in supp_res.all():
            supp_map[srow.id] = (srow.name or "")[:255]
    items = []
    for s in supplies:
        d = SupplyOut.model_validate(s).model_dump()
        ef = s.extra_fields or {}
        items_list = ef.get("items")
        first_nom_id = s.nomenclature_id or (items_list[0]["nomenclature_id"] if items_list and isinstance(items_list[0], dict) else None)
        nom_info = nom_map.get(first_nom_id) if first_nom_id else None
        d["manufacturer_name"] = nom_info[1] if nom_info else ""
        d["category_name"] = nom_info[2] if nom_info else ""
        d["subcategory_name"] = nom_info[3] if nom_info else ""
        if items_list and isinstance(items_list, list):
            names = []
            for it in items_list[:10]:
                if isinstance(it, dict):
                    nom_id = it.get("nomenclature_id")
                    nm = it.get("name") or (nom_map.get(nom_id, ("", "", "", ""))[0] if nom_id else "")
                    if nm:
                        names.append(nm)
            d["nomenclature_name"] = "; ".join(names) if names else (nom_info[0] if nom_info else "")
            if len(items_list) > 10:
                d["nomenclature_name"] += f" … (+{len(items_list) - 10})"
        else:
            d["nomenclature_name"] = nom_info[0] if nom_info else ""
        d["supplier_name"] = supp_map.get(s.supplier_id, "") if s.supplier_id else ""
        # Кол-во уникальных номенклатур (позиций) в поставке
        d["unique_items_count"] = len(items_list) if items_list and isinstance(items_list, list) else (1 if s.nomenclature_id else 0)
        items.append(d)
    count_q = select(func.count()).select_from(Supply)
    if company_ids is not None:
        count_q = count_q.where(Supply.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Supply.company_id == company_id)
    if supplier_id is not None:
        count_q = count_q.where(Supply.supplier_id == supplier_id)
    if nomenclature_id is not None:
        count_q = count_q.where(Supply.nomenclature_id == nomenclature_id)
    if not include_deleted:
        count_q = count_q.where(Supply.is_deleted == False)
    if search:
        try:
            sid = int(search.strip())
            count_q = count_q.where(Supply.id == sid)
        except ValueError:
            pass
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": items, "total": total}


@router.post("/supplies/batch")
async def create_supplies_batch(
    data: SupplyBatchCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Создать несколько поставок одной операцией (общие параметры + список номенклатуры)."""
    cid = await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Нет доступа к компании")
    created = []
    for it in data.items:
        sup = Supply(
            company_id=cid,
            supplier_id=data.supplier_id,
            nomenclature_id=it.nomenclature_id,
            quantity=it.quantity,
            production_date=data.production_date,
            delivery_date=data.delivery_date,
            calibration_date=None,
            extra_fields=data.extra_fields,
        )
        db.add(sup)
        await db.flush()
        created.append({"id": sup.id})
    await db.commit()
    return {"created": len(created), "items": created}


@router.post("/supplies", response_model=SupplyOut)
async def create_supply(
    data: SupplyCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    sup = Supply(
        company_id=cid,
        supplier_id=data.supplier_id,
        nomenclature_id=data.nomenclature_id,
        quantity=data.quantity,
        production_date=data.production_date,
        delivery_date=data.delivery_date,
        calibration_date=data.calibration_date,
        extra_fields=data.extra_fields,
    )
    db.add(sup)
    await db.commit()
    await db.refresh(sup)
    return SupplyOut.model_validate(sup)


@router.get("/supplies/{id}", response_model=SupplyOut)
async def get_supply(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supply).where(Supply.id == id)
    if company_ids is not None:
        q = q.where(Supply.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставка не найдена")
    return SupplyOut.model_validate(sup)


@router.patch("/supplies/{id}", response_model=SupplyOut)
async def update_supply(
    id: int,
    data: SupplyUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supply).where(Supply.id == id)
    if company_ids is not None:
        q = q.where(Supply.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставка не найдена")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sup, k, v)
    await db.commit()
    await db.refresh(sup)
    return SupplyOut.model_validate(sup)


@router.delete("/supplies/{id}")
async def delete_supply(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Supply).where(Supply.id == id)
    if company_ids is not None:
        q = q.where(Supply.company_id.in_(company_ids))
    r = await db.execute(q)
    sup = r.scalar_one_or_none()
    if not sup:
        raise HTTPException(404, "Поставка не найдена")
    if soft:
        sup.is_deleted = True
        await db.commit()
    else:
        await db.delete(sup)
        await db.commit()
    return {"ok": True}


# --- Contracts ---


@router.get("/contracts", response_model=dict)
async def list_contracts(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    company_id: int | None = Query(None),
    supplier_id: int | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query("created_at"),
    sort_order: str | None = Query("desc"),
    include_deleted: bool = Query(False),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Contract)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        q = q.where(Contract.company_id == company_id)
    if supplier_id is not None:
        q = q.where(Contract.supplier_id == supplier_id)
    if not include_deleted:
        q = q.where(Contract.is_deleted == False)
    if search:
        if search.strip().isdigit():
            q = q.where(Contract.id == int(search.strip()))
        else:
            q = q.where(Contract.number.ilike(f"%{search}%"))
    col = Contract.created_at if (sort_by or "created_at") == "created_at" else (
        Contract.id if sort_by == "id" else (Contract.number if sort_by == "number" else Contract.created_at)
    )
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc()).limit(limit).offset(offset)
    result = await db.execute(q)
    items = result.scalars().all()
    count_q = select(func.count()).select_from(Contract)
    if company_ids is not None:
        count_q = count_q.where(Contract.company_id.in_(company_ids))
    if company_id is not None and user.role == Role.super_admin:
        count_q = count_q.where(Contract.company_id == company_id)
    if supplier_id is not None:
        count_q = count_q.where(Contract.supplier_id == supplier_id)
    if not include_deleted:
        count_q = count_q.where(Contract.is_deleted == False)
    if search:
        if search.strip().isdigit():
            count_q = count_q.where(Contract.id == int(search.strip()))
        else:
            count_q = count_q.where(Contract.number.ilike(f"%{search}%"))
    total = (await db.execute(count_q)).scalar() or 0
    return {"items": [ContractOut.model_validate(c) for c in items], "total": total}


@router.post("/contracts", response_model=ContractOut)
async def create_contract(
    data: ContractCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    cid = data.company_id or await get_user_company_id(user, db)
    if not cid:
        raise HTTPException(400, "Укажите company_id")
    con = Contract(
        company_id=cid,
        supplier_id=data.supplier_id,
        number=data.number,
        date_start=data.date_start,
        date_end=data.date_end,
        extra_fields=data.extra_fields,
    )
    db.add(con)
    await db.commit()
    await db.refresh(con)
    return ContractOut.model_validate(con)


@router.get("/contracts/{id}", response_model=ContractOut)
async def get_contract(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Contract).where(Contract.id == id)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    r = await db.execute(q)
    con = r.scalar_one_or_none()
    if not con:
        raise HTTPException(404, "Договор не найден")
    return ContractOut.model_validate(con)


@router.patch("/contracts/{id}", response_model=ContractOut)
async def update_contract(
    id: int,
    data: ContractUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Contract).where(Contract.id == id)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    r = await db.execute(q)
    con = r.scalar_one_or_none()
    if not con:
        raise HTTPException(404, "Договор не найден")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(con, k, v)
    await db.commit()
    await db.refresh(con)
    return ContractOut.model_validate(con)


@router.delete("/contracts/{id}")
async def delete_contract(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    company_ids = await get_user_company_ids(user, db)
    q = select(Contract).where(Contract.id == id)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    r = await db.execute(q)
    con = r.scalar_one_or_none()
    if not con:
        raise HTTPException(404, "Договор не найден")
    if soft:
        con.is_deleted = True
        await db.commit()
    else:
        await db.delete(con)
        await db.commit()
    return {"ok": True}


# --- Contract appendices ---


@router.get("/contracts/{contract_id}/appendices", response_model=dict)
async def list_contract_appendices(
    contract_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    company_ids = await get_user_company_ids(user, db)
    q = (
        select(ContractAppendix)
        .join(Contract, ContractAppendix.contract_id == Contract.id)
        .where(ContractAppendix.contract_id == contract_id)
    )
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    q = q.where(ContractAppendix.is_deleted == False)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": [ContractAppendixOut.model_validate(a) for a in items]}


@router.post("/contracts/{contract_id}/appendices", response_model=ContractAppendixOut)
async def create_contract_appendix(
    contract_id: int,
    data: ContractAppendixCreate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    if data.contract_id != contract_id:
        raise HTTPException(400, "contract_id не совпадает")
    r = await db.execute(select(Contract).where(Contract.id == contract_id))
    con = r.scalar_one_or_none()
    if not con:
        raise HTTPException(404, "Договор не найден")
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and con.company_id not in company_ids:
        raise HTTPException(403, "Нет доступа к договору")
    app = ContractAppendix(contract_id=contract_id, name=data.name, extra_fields=data.extra_fields)
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return ContractAppendixOut.model_validate(app)


@router.patch("/appendices/{id}", response_model=ContractAppendixOut)
async def update_contract_appendix(
    id: int,
    data: ContractAppendixUpdate,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(ContractAppendix)
        .join(Contract, ContractAppendix.contract_id == Contract.id)
        .where(ContractAppendix.id == id)
    )
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    r = await db.execute(q)
    app = r.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Приложение не найдено")
    if data.contract_id is not None:
        app.contract_id = data.contract_id
    if data.name is not None:
        app.name = data.name
    if data.extra_fields is not None:
        app.extra_fields = {**(app.extra_fields or {}), **data.extra_fields}
    await db.commit()
    await db.refresh(app)
    return ContractAppendixOut.model_validate(app)


@router.delete("/appendices/{id}")
async def delete_contract_appendix(
    id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    soft: bool = Query(True),
):
    q = (
        select(ContractAppendix)
        .join(Contract, ContractAppendix.contract_id == Contract.id)
        .where(ContractAppendix.id == id)
    )
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None:
        q = q.where(Contract.company_id.in_(company_ids))
    r = await db.execute(q)
    app = r.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Приложение не найдено")
    if soft:
        app.is_deleted = True
        await db.commit()
    else:
        await db.delete(app)
        await db.commit()
    return {"ok": True}
