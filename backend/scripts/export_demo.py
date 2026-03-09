# -*- coding: utf-8 -*-
"""Экспорт пользователя demo@ikamdocs.ru и всех сущностей его компании в JSON."""

import asyncio
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.compat  # noqa: F401

from sqlalchemy import select
from app.database import init_db, close_db
from app.models.user import User, Company, UserCompany, Role
from app.models.entity import (
    Category,
    SubCategory,
    Supplier,
    Manufacturer,
    Nomenclature,
    Supply,
    Contract,
    ContractAppendix,
)
from app.models.subscription import Plan, Subscription


def serialize(obj):
    """Преобразование объектов в JSON-сериализуемый вид."""
    if obj is None:
        return None
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, (Role,)):
        return obj.value if hasattr(obj, "value") else str(obj)
    if hasattr(obj, "__dict__"):
        d = {}
        for k, v in obj.__dict__.items():
            if k.startswith("_") or k in ("registry", "metadata"):
                continue
            if hasattr(v, "value"):  # Enum
                d[k] = v.value
            elif isinstance(v, (date, datetime)):
                d[k] = v.isoformat()
            else:
                d[k] = v
        return d
    return obj


async def export_demo(output_path: str):
    await init_db()
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        # Найти demo-админа и его компанию
        admin = (
            await db.execute(select(User).where(User.email == "demo@ikamdocs.ru").limit(1))
        ).scalar_one_or_none()
        if not admin:
            print("Пользователь demo@ikamdocs.ru не найден.")
            return

        uc = (
            await db.execute(
                select(UserCompany)
                .where(UserCompany.user_id == admin.id)
                .limit(1)
            )
        ).scalar_one_or_none()
        if not uc:
            print("Компания не привязана к demo@ikamdocs.ru")
            return

        company = await db.get(Company, uc.company_id)
        if not company:
            print("Компания не найдена.")
            return

        cid = company.id
        print(f"Экспорт компании ID={cid}: {company.name}")

        # Планы (для subscription)
        plans = (await db.execute(select(Plan).where(Plan.is_active == True))).scalars().all()
        plans_data = [
            {
                "id": p.id,
                "name": p.name,
                "price_monthly": p.price_monthly,
                "price_yearly": p.price_yearly,
                "max_users": getattr(p, "max_users", 5),
                "is_active": p.is_active,
            }
            for p in plans
        ]

        # Пользователи компании
        rows = (await db.execute(select(UserCompany.user_id).where(UserCompany.company_id == cid))).all()
        user_ids = [r[0] for r in rows]
        users = (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all() if user_ids else []
        users_data = []
        for u in users:
            ud = {c.key: getattr(u, c.key) for c in u.__table__.columns}
            ud["role"] = u.role.value if hasattr(u.role, "value") else str(u.role)
            ud["created_at"] = u.created_at.isoformat() if u.created_at else None
            ud["updated_at"] = u.updated_at.isoformat() if u.updated_at else None
            users_data.append(ud)

        user_companies = (await db.execute(select(UserCompany).where(UserCompany.company_id == cid))).scalars().all()
        ucs_data = [
            {
                "user_id": uc.user_id,
                "company_id": uc.company_id,
                "role": uc.role.value if hasattr(uc.role, "value") else str(uc.role),
                "can_impersonate": uc.can_impersonate,
            }
            for uc in user_companies
        ]

        # Компания
        company_data = {
            c.key: (getattr(company, c.key).isoformat() if isinstance(getattr(company, c.key), (date, datetime)) else getattr(company, c.key))
            for c in company.__table__.columns
            if c.key != "id"
        }
        company_data["_export_id"] = company.id

        # Subscription
        subs = (await db.execute(select(Subscription).where(Subscription.company_id == cid))).scalars().all()
        subs_data = [
            {
                "plan_id": s.plan_id,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            }
            for s in subs
        ]

        # Категории и подкатегории
        cats = (await db.execute(select(Category).where(Category.company_id == cid))).scalars().all()
        cats_data = [{"_export_id": c.id, "name": c.name} for c in cats]
        cat_id_map = {c["_export_id"]: i for i, c in enumerate(cats_data)}

        subcats = (await db.execute(
            select(SubCategory).join(Category).where(Category.company_id == cid)
        )).scalars().all()
        subcats_data = []
        for sc in subcats:
            subcats_data.append({
                "_export_id": sc.id,
                "_category_export_id": sc.category_id,
                "name": sc.name,
            })

        # Поставщики, производители
        suppliers = (await db.execute(select(Supplier).where(Supplier.company_id == cid, Supplier.is_deleted == False))).scalars().all()
        suppliers_data = [{"_export_id": s.id, "name": s.name, "phone": s.phone, "address": s.address, "inn": s.inn, "extra_fields": s.extra_fields} for s in suppliers]
        supp_id_map = {s["_export_id"]: i for i, s in enumerate(suppliers_data)}

        manufacturers = (await db.execute(select(Manufacturer).where(Manufacturer.company_id == cid, Manufacturer.is_deleted == False))).scalars().all()
        mfr_data = [{"_export_id": m.id, "name": m.name, "address": m.address, "extra_fields": m.extra_fields} for m in manufacturers]
        mfr_id_map = {m["_export_id"]: i for i, m in enumerate(mfr_data)}

        # Номенклатура
        noms = (await db.execute(select(Nomenclature).where(Nomenclature.company_id == cid, Nomenclature.is_deleted == False))).scalars().all()
        noms_data = []
        for n in noms:
            noms_data.append({
                "_export_id": n.id,
                "code": n.code,
                "name": n.name,
                "_category_export_id": n.category_id,
                "_subcategory_export_id": n.subcategory_id,
                "tag_number": n.tag_number,
                "package_number": n.package_number,
                "specification": n.specification,
                "question_sheet_no": n.question_sheet_no,
                "price": n.price,
                "_manufacturer_export_id": n.manufacturer_id,
                "extra_fields": n.extra_fields,
            })

        # Договоры
        contracts = (await db.execute(select(Contract).where(Contract.company_id == cid, Contract.is_deleted == False))).scalars().all()
        contracts_data = []
        for c in contracts:
            contracts_data.append({
                "_export_id": c.id,
                "_supplier_export_id": c.supplier_id,
                "number": c.number,
                "date_start": c.date_start.isoformat() if c.date_start else None,
                "date_end": c.date_end.isoformat() if c.date_end else None,
                "extra_fields": c.extra_fields,
            })

        # Приложения к договорам
        con_ids = [c.id for c in contracts]
        appendices = (await db.execute(
            select(ContractAppendix).where(
                ContractAppendix.contract_id.in_(con_ids),
                ContractAppendix.is_deleted == False,
            )
        )).scalars().all()
        appendices_data = [
            {"_contract_export_id": a.contract_id, "name": a.name, "extra_fields": a.extra_fields}
            for a in appendices
        ]

        # Поставки
        supplies = (await db.execute(select(Supply).where(Supply.company_id == cid, Supply.is_deleted == False))).scalars().all()
        supplies_data = []
        for s in supplies:
            supplies_data.append({
                "_supplier_export_id": s.supplier_id,
                "_nomenclature_export_id": s.nomenclature_id,
                "quantity": s.quantity,
                "production_date": s.production_date.isoformat() if s.production_date else None,
                "calibration_date": s.calibration_date.isoformat() if s.calibration_date else None,
                "extra_fields": s.extra_fields,
            })

        export = {
            "version": 1,
            "exported_at": datetime.now().isoformat(),
            "plans": plans_data,
            "company": company_data,
            "users": users_data,
            "user_companies": ucs_data,
            "subscriptions": subs_data,
            "categories": cats_data,
            "subcategories": subcats_data,
            "suppliers": suppliers_data,
            "manufacturers": mfr_data,
            "nomenclature": noms_data,
            "contracts": contracts_data,
            "contract_appendices": appendices_data,
            "supplies": supplies_data,
        }

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export, f, ensure_ascii=False, indent=2)

        print(f"Экспорт сохранён: {output_path}")
        print(f"  Пользователей: {len(users_data)}, Компания: 1")
        print(f"  Категорий: {len(cats_data)}, Подкатегорий: {len(subcats_data)}")
        print(f"  Поставщиков: {len(suppliers_data)}, Производителей: {len(mfr_data)}")
        print(f"  Номенклатуры: {len(noms_data)}, Договоров: {len(contracts_data)}, Поставок: {len(supplies_data)}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo_export.json"
    asyncio.run(export_demo(out))
    asyncio.run(close_db())
