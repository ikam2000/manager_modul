# -*- coding: utf-8 -*-
"""Наполнение демо-данными для презентации."""

import asyncio
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Добавляем backend в path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.compat  # noqa: F401 — патч SQLAlchemy для Python 3.14

from sqlalchemy import select
from app.database import init_db
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
from app.security import hash_password


async def seed():
    await init_db()
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        # Plans: 3 тарифа 15000, 30000, 50000 ₽/мес
        old_basic = (await db.execute(select(Plan).where(Plan.name == "Базовый").limit(1))).scalar_one_or_none()
        if old_basic:
            old_basic.is_active = False  # деактивируем старый тариф
        for name, price_month in [("Старт", 15000), ("Бизнес", 30000), ("Про", 50000)]:
            existing = (await db.execute(select(Plan).where(Plan.name == name).limit(1))).scalar_one_or_none()
            if not existing:
                price_kopeck = price_month * 100
                price_yearly_kopeck = int(price_kopeck * 10)  # 10 мес при оплате за год
                db.add(Plan(
                    name=name,
                    price_monthly=price_kopeck,
                    price_yearly=price_yearly_kopeck,
                    max_users={"Старт": 5, "Бизнес": 15, "Про": 50}[name],
                ))
        await db.flush()
        plan = (await db.execute(select(Plan).where(Plan.name == "Старт").limit(1))).scalar_one_or_none()

        # Demo Company
        company = (
            await db.execute(select(Company).where(Company.name == "ООО Демо-Компания").limit(1))
        ).scalar_one_or_none()
        if not company:
            company = Company(
                name="ООО Демо-Компания",
                inn="7707123456",
                legal_address="г. Москва, ул. Демонстрационная, д. 1",
            )
            db.add(company)
            await db.flush()

        # Demo admin
        admin = (
            await db.execute(select(User).where(User.email == "demo@ikamdocs.ru").limit(1))
        ).scalar_one_or_none()
        if not admin:
            admin = User(
                email="demo@ikamdocs.ru",
                full_name="Демо Администратор",
                hashed_password=hash_password("Demo123!"),
                role=Role.admin,
            )
            db.add(admin)
            await db.flush()
            uc = UserCompany(user_id=admin.id, company_id=company.id, role=Role.admin, can_impersonate=True)
            db.add(uc)

        # Demo user
        user = (
            await db.execute(select(User).where(User.email == "user@demo.ikamdocs.ru").limit(1))
        ).scalar_one_or_none()
        if not user:
            user = User(
                email="user@demo.ikamdocs.ru",
                full_name="Демо Пользователь",
                hashed_password=hash_password("User123!"),
                role=Role.user,
            )
            db.add(user)
            await db.flush()
            uc = UserCompany(user_id=user.id, company_id=company.id, role=Role.user)
            db.add(uc)

        await db.flush()

        # Subscription for demo company
        sub = (
            await db.execute(
                select(Subscription)
                .where(Subscription.company_id == company.id)
                .order_by(Subscription.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if not sub:
            sub = Subscription(
                company_id=company.id,
                plan_id=plan.id,
                status="active",
                expires_at=datetime.utcnow() + timedelta(days=365),
            )
            db.add(sub)

        # Categories
        cat1 = (
            await db.execute(
                select(Category).where(
                    Category.company_id == company.id, Category.name == "Измерительное оборудование"
                )
            )
        ).scalar_one_or_none()
        if not cat1:
            cat1 = Category(company_id=company.id, name="Измерительное оборудование")
            db.add(cat1)
            await db.flush()

        cat2 = (
            await db.execute(
                select(Category).where(
                    Category.company_id == company.id, Category.name == "КИПиА"
                )
            )
        ).scalar_one_or_none()
        if not cat2:
            cat2 = Category(company_id=company.id, name="КИПиА")
            db.add(cat2)
            await db.flush()

        # Subcategories
        subcat1 = (
            await db.execute(
                select(SubCategory)
                .where(SubCategory.category_id == cat1.id, SubCategory.name == "Манометры")
            )
        ).scalar_one_or_none()
        if not subcat1:
            subcat1 = SubCategory(category_id=cat1.id, name="Манометры")
            db.add(subcat1)
            await db.flush()

        # Suppliers
        sup1 = (
            await db.execute(
                select(Supplier).where(
                    Supplier.company_id == company.id, Supplier.name == "ООО МанометрСервис"
                )
            )
        ).scalar_one_or_none()
        if not sup1:
            await check_entity_limit(company.id, "suppliers", db)
            sup1 = Supplier(
                company_id=company.id,
                name="ООО МанометрСервис",
                phone="+7 (495) 123-45-67",
                address="г. Москва, ул. Поставщиков, 15",
                inn="7707987654",
            )
            db.add(sup1)
            await db.flush()

        sup2 = (
            await db.execute(
                select(Supplier).where(
                    Supplier.company_id == company.id, Supplier.name == "ИП Иванов"
                )
            )
        ).scalar_one_or_none()
        if not sup2:
            await check_entity_limit(company.id, "suppliers", db)
            sup2 = Supplier(
                company_id=company.id,
                name="ИП Иванов",
                phone="+7 (916) 555-12-34",
                address="г. Подольск",
                inn="5021234567",
            )
            db.add(sup2)
            await db.flush()

        # Manufacturers
        mfr1 = (
            await db.execute(
                select(Manufacturer).where(
                    Manufacturer.company_id == company.id,
                    Manufacturer.name == "Завод КИП",
                )
            )
        ).scalar_one_or_none()
        if not mfr1:
            await check_entity_limit(company.id, "manufacturers", db)
            mfr1 = Manufacturer(
                company_id=company.id,
                name="Завод КИП",
                address="г. Тула, промзона Северная",
            )
            db.add(mfr1)
            await db.flush()

        # Nomenclature
        nom1 = (
            await db.execute(
                select(Nomenclature).where(
                    Nomenclature.company_id == company.id,
                    Nomenclature.code == "МП-100",
                )
            )
        ).scalar_one_or_none()
        if not nom1:
            await check_entity_limit(company.id, "nomenclature", db)
            nom1 = Nomenclature(
                company_id=company.id,
                code="МП-100",
                name="Манометр показывающий 0-1 МПа",
                category_id=cat1.id,
                subcategory_id=subcat1.id,
                tag_number="ТН-001",
                specification="Диаметр 100 мм, класс точности 1.5",
                manufacturer_id=mfr1.id,
            )
            db.add(nom1)
            await db.flush()

        nom2 = (
            await db.execute(
                select(Nomenclature).where(
                    Nomenclature.company_id == company.id,
                    Nomenclature.code == "МП-160",
                )
            )
        ).scalar_one_or_none()
        if not nom2:
            await check_entity_limit(company.id, "nomenclature", db)
            nom2 = Nomenclature(
                company_id=company.id,
                code="МП-160",
                name="Манометр показывающий 0-2.5 МПа",
                category_id=cat1.id,
                subcategory_id=subcat1.id,
                tag_number="ТН-002",
                manufacturer_id=mfr1.id,
            )
            db.add(nom2)
            await db.flush()

        nom3 = (
            await db.execute(
                select(Nomenclature).where(
                    Nomenclature.company_id == company.id,
                    Nomenclature.code == "BJLM-80H",
                )
            )
        ).scalar_one_or_none()
        if not nom3:
            await check_entity_limit(company.id, "nomenclature", db)
            nom3 = Nomenclature(
                company_id=company.id,
                code="BJLM-80H",
                name="Серво-уровнемер BJLM-80H",
                category_id=cat2.id,
                tag_number="BJLM-80H",
                manufacturer_id=mfr1.id,
            )
            db.add(nom3)
            await db.flush()

        # Contract
        con1 = (
            await db.execute(
                select(Contract).where(
                    Contract.company_id == company.id,
                    Contract.number == "Д-2024-001",
                )
            )
        ).scalar_one_or_none()
        if not con1:
            con1 = Contract(
                company_id=company.id,
                supplier_id=sup1.id,
                number="Д-2024-001",
                date_start=date(2024, 1, 1),
                date_end=date(2024, 12, 31),
            )
            db.add(con1)
            await db.flush()

        # Contract appendix
        app1 = (
            await db.execute(
                select(ContractAppendix).where(
                    ContractAppendix.contract_id == con1.id,
                    ContractAppendix.name == "Спецификация №1",
                )
            )
        ).scalar_one_or_none()
        if not app1:
            app1 = ContractAppendix(
                contract_id=con1.id,
                name="Спецификация №1",
            )
            db.add(app1)
            await db.flush()

        # Supplies
        for i, (nom, qty) in enumerate([(nom1, 5.0), (nom2, 3.0)]):
            supply = (
                await db.execute(
                    select(Supply).where(
                        Supply.company_id == company.id,
                        Supply.nomenclature_id == nom.id,
                        Supply.quantity == qty,
                    )
                )
            ).scalar_one_or_none()
            if not supply:
                supply = Supply(
                    company_id=company.id,
                    supplier_id=sup1.id,
                    nomenclature_id=nom.id,
                    quantity=qty,
                    production_date=date(2024, 6, 15),
                    calibration_date=date(2024, 7, 1),
                )
                db.add(supply)

        await db.commit()
        print("Демо-данные успешно созданы.")
        print("Логин: demo@ikamdocs.ru / Demo123!")
        print("Логин (user): user@demo.ikamdocs.ru / User123!")


if __name__ == "__main__":
    asyncio.run(seed())
