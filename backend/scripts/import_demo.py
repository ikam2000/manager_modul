# -*- coding: utf-8 -*-
"""Импорт пользователя demo@ikamdocs.ru и сущностей из JSON в текущую БД (TARGET)."""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.compat  # noqa: F401

from sqlalchemy import select
from app.database import init_db, close_db
from app.dependencies import check_entity_limit, check_nomenclature_per_supplier_limit
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


def parse_dt(s):
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


async def import_demo(input_path: str):
    await init_db()
    from app.database import AsyncSessionLocal

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with AsyncSessionLocal() as db:
        # Проверить, нет ли уже demo
        existing = (await db.execute(select(User).where(User.email == "demo@ikamdocs.ru").limit(1))).scalar_one_or_none()
        if existing:
            print("Пользователь demo@ikamdocs.ru уже существует. Пропуск импорта.")
            return

        # Планы — сопоставить по имени
        plan_map = {}
        for p in data.get("plans", []):
            plan = (await db.execute(select(Plan).where(Plan.name == p["name"]).limit(1))).scalar_one_or_none()
            if not plan:
                plan = Plan(
                    name=p["name"],
                    price_monthly=p.get("price_monthly", 0),
                    price_yearly=p.get("price_yearly", 0),
                    max_users=p.get("max_users", 5),
                    is_active=p.get("is_active", True),
                )
                db.add(plan)
                await db.flush()
            plan_map[p["id"]] = plan.id

        # Компания
        comp = data["company"]
        company = Company(
            name=comp["name"],
            inn=comp.get("inn"),
            legal_address=comp.get("legal_address"),
        )
        db.add(company)
        await db.flush()

        # Пользователи
        user_map = {}
        for ud in data.get("users", []):
            user = User(
                email=ud["email"],
                full_name=ud["full_name"],
                hashed_password=ud["hashed_password"],
                role=Role(ud["role"]) if isinstance(ud["role"], str) else ud["role"],
            )
            db.add(user)
            await db.flush()
            user_map[ud["id"]] = user.id

        # UserCompany
        for uc in data.get("user_companies", []):
            uid = user_map.get(uc["user_id"])
            if uid:
                db.add(UserCompany(
                    user_id=uid,
                    company_id=company.id,
                    role=Role(uc["role"]) if isinstance(uc["role"], str) else uc["role"],
                    can_impersonate=uc.get("can_impersonate", False),
                ))

        # Subscription
        plan_id = plan_map.get(data["subscriptions"][0]["plan_id"]) if data.get("subscriptions") else None
        if plan_id:
            sub = data["subscriptions"][0]
            db.add(Subscription(
                company_id=company.id,
                plan_id=plan_id,
                status=sub.get("status", "active"),
                expires_at=parse_dt(sub.get("expires_at")),
            ))

        await db.flush()

        # Категории
        cat_map = {}
        for c in data.get("categories", []):
            cat = Category(company_id=company.id, name=c["name"])
            db.add(cat)
            await db.flush()
            cat_map[c["_export_id"]] = cat.id

        # Подкатегории
        subcat_map = {}
        for sc in data.get("subcategories", []):
            cid = cat_map.get(sc["_category_export_id"])
            if cid:
                subcat = SubCategory(category_id=cid, name=sc["name"])
                db.add(subcat)
                await db.flush()
                subcat_map[sc["_export_id"]] = subcat.id

        # Поставщики
        supp_map = {}
        for s in data.get("suppliers", []):
            await check_entity_limit(company.id, "suppliers", db)
            supp = Supplier(
                company_id=company.id,
                name=s["name"],
                phone=s.get("phone"),
                address=s.get("address"),
                inn=s.get("inn"),
                extra_fields=s.get("extra_fields"),
            )
            db.add(supp)
            await db.flush()
            supp_map[s["_export_id"]] = supp.id

        # Производители
        mfr_map = {}
        for m in data.get("manufacturers", []):
            await check_entity_limit(company.id, "manufacturers", db)
            mfr = Manufacturer(
                company_id=company.id,
                name=m["name"],
                address=m.get("address"),
                extra_fields=m.get("extra_fields"),
            )
            db.add(mfr)
            await db.flush()
            mfr_map[m["_export_id"]] = mfr.id

        # Номенклатура
        nom_map = {}
        for n in data.get("nomenclature", []):
            await check_entity_limit(company.id, "nomenclature", db)
            supplier_id = supp_map.get(n.get("_supplier_export_id")) if n.get("_supplier_export_id") else None
            if supplier_id:
                await check_nomenclature_per_supplier_limit(company.id, supplier_id, db)
            nom = Nomenclature(
                company_id=company.id,
                code=n.get("code"),
                name=n["name"],
                category_id=cat_map.get(n.get("_category_export_id")),
                subcategory_id=subcat_map.get(n.get("_subcategory_export_id")),
                tag_number=n.get("tag_number"),
                package_number=n.get("package_number"),
                specification=n.get("specification"),
                question_sheet_no=n.get("question_sheet_no"),
                price=n.get("price"),
                manufacturer_id=mfr_map.get(n.get("_manufacturer_export_id")),
                extra_fields=n.get("extra_fields"),
            )
            db.add(nom)
            await db.flush()
            nom_map[n["_export_id"]] = nom.id

        # Договоры
        contract_map = {}
        for c in data.get("contracts", []):
            con = Contract(
                company_id=company.id,
                supplier_id=supp_map.get(c.get("_supplier_export_id")),
                number=c.get("number"),
                date_start=datetime.fromisoformat(c["date_start"]).date() if c.get("date_start") else None,
                date_end=datetime.fromisoformat(c["date_end"]).date() if c.get("date_end") else None,
                extra_fields=c.get("extra_fields"),
            )
            db.add(con)
            await db.flush()
            contract_map[c["_export_id"]] = con.id

        # Приложения к договорам
        for a in data.get("contract_appendices", []):
            cid = contract_map.get(a["_contract_export_id"])
            if cid:
                db.add(ContractAppendix(contract_id=cid, name=a["name"], extra_fields=a.get("extra_fields")))

        # Поставки
        for s in data.get("supplies", []):
            db.add(Supply(
                company_id=company.id,
                supplier_id=supp_map.get(s.get("_supplier_export_id")),
                nomenclature_id=nom_map.get(s.get("_nomenclature_export_id")),
                quantity=s.get("quantity", 1),
                production_date=datetime.fromisoformat(s["production_date"]).date() if s.get("production_date") else None,
                calibration_date=datetime.fromisoformat(s["calibration_date"]).date() if s.get("calibration_date") else None,
                extra_fields=s.get("extra_fields"),
            ))

        await db.commit()
        print("Импорт завершён успешно.")
        print(f"Компания: {company.name}, ID={company.id}")
        print("Логин: demo@ikamdocs.ru / Demo123!")
        if "user@demo.ikamdocs.ru" in [u["email"] for u in data.get("users", [])]:
            print("Логин (user): user@demo.ikamdocs.ru / User123!")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "demo_export.json"
    asyncio.run(import_demo(path))
    asyncio.run(close_db())
