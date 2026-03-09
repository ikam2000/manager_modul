# -*- coding: utf-8 -*-
"""Загрузка номенклатуры из frontend/docs (паспорта, сертификаты КИПиА JOYO и др.)."""

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
try:
    import app.compat  # noqa: F401
except ImportError:
    pass

from sqlalchemy import select
from app.database import init_db, close_db
from app.dependencies import check_entity_limit
from app.models.user import User, Company, UserCompany, Role
from app.models.entity import (
    Category,
    SubCategory,
    Supplier,
    Manufacturer,
    Nomenclature,
)


# Номенклатура из имён папок и файлов в docs
NOMENCLATURE_FROM_DOCS = [
    ("BJZT-IV", "Преобразователь BJZT-IV"),
    ("BJLM-80H", "Серво-уровнемер BJLM-80H"),
    ("BJCOM-IV", "Блок интерфейсный BJCOM-IV"),
    ("TM-80N", "Температурный модуль TM-80N"),
    ("КШО", "Шкаф обогревающий КШО"),
    ("КШО (обогреваемые шкафы)", "Шкафы обогревающие"),
    ("LB 0441.064.001", "Изделие LB 0441.064.001"),
    ("LE 5070.064.001", "Изделие LE 5070.064.001"),
    ("316L", "Материал 316L"),
    ("CF3M", "Материал CF3M"),
    ("Cast aluminum", "Материал Cast aluminum"),
    ("C220_HST", "Материал C220 HST"),
]


async def seed():
    await init_db()
    from app.database import AsyncSessionLocal

    docs_path = Path(__file__).resolve().parents[2] / "frontend" / "docs"
    if not docs_path.exists():
        print("Папка frontend/docs не найдена")
        return

    async with AsyncSessionLocal() as db:
        # Демо-компания (или создаём новую для тестов)
        company = (
            await db.execute(select(Company).where(Company.name == "ООО Демо-Компания").limit(1))
        ).scalar_one_or_none()
        if not company:
            company = (
                await db.execute(select(Company).limit(1))
            ).scalar_one_or_none()
        if not company:
            print("Создайте сначала компанию (seed_demo.py)")
            return

        # Категории для docs
        cat_kip = (
            await db.execute(
                select(Category).where(
                    Category.company_id == company.id,
                    Category.name == "КИПиА",
                )
            )
        ).scalar_one_or_none()
        if not cat_kip:
            cat_kip = Category(company_id=company.id, name="КИПиА")
            db.add(cat_kip)
            await db.flush()

        cat_cert = (
            await db.execute(
                select(Category).where(
                    Category.company_id == company.id,
                    Category.name == "Сертификация и метрология",
                )
            )
        ).scalar_one_or_none()
        if not cat_cert:
            cat_cert = Category(company_id=company.id, name="Сертификация и метрология")
            db.add(cat_cert)
            await db.flush()

        cat_materials = (
            await db.execute(
                select(Category).where(
                    Category.company_id == company.id,
                    Category.name == "Материалы",
                )
            )
        ).scalar_one_or_none()
        if not cat_materials:
            cat_materials = Category(company_id=company.id, name="Материалы")
            db.add(cat_materials)
            await db.flush()

        # Подкатегории
        sub_joyo = (
            await db.execute(
                select(SubCategory).where(
                    SubCategory.category_id == cat_kip.id,
                    SubCategory.name == "КИПиА JOYO",
                )
            )
        ).scalar_one_or_none()
        if not sub_joyo:
            sub_joyo = SubCategory(category_id=cat_kip.id, name="КИПиА JOYO")
            db.add(sub_joyo)
            await db.flush()

        sub_shkaf = (
            await db.execute(
                select(SubCategory).where(
                    SubCategory.category_id == cat_kip.id,
                    SubCategory.name == "Обогреваемые шкафы",
                )
            )
        ).scalar_one_or_none()
        if not sub_shkaf:
            sub_shkaf = SubCategory(category_id=cat_kip.id, name="Обогреваемые шкафы")
            db.add(sub_shkaf)
            await db.flush()

        sub_other = (
            await db.execute(
                select(SubCategory).where(
                    SubCategory.category_id == cat_kip.id,
                    SubCategory.name == "Прочее",
                )
            )
        ).scalar_one_or_none()
        if not sub_other:
            sub_other = SubCategory(category_id=cat_kip.id, name="Прочее")
            db.add(sub_other)
            await db.flush()

        # Производитель JOYO
        mfr_joyo = (
            await db.execute(
                select(Manufacturer).where(
                    Manufacturer.company_id == company.id,
                    Manufacturer.name == "JOYO",
                )
            )
        ).scalar_one_or_none()
        if not mfr_joyo:
            mfr_joyo = Manufacturer(company_id=company.id, name="JOYO", address="Китай")
            db.add(mfr_joyo)
            await db.flush()

        # Поставщик (из структуры docs - КИПиА JOYO)
        sup_joyo = (
            await db.execute(
                select(Supplier).where(
                    Supplier.company_id == company.id,
                    Supplier.name == "Поставщик КИПиА JOYO",
                )
            )
        ).scalar_one_or_none()
        if not sup_joyo:
            await check_entity_limit(company.id, "suppliers", db)
            sup_joyo = Supplier(
                company_id=company.id,
                name="Поставщик КИПиА JOYO",
                inn="",
            )
            db.add(sup_joyo)
            await db.flush()

        # Добавляем номенклатуру
        added = 0
        for code, name in NOMENCLATURE_FROM_DOCS:
            existing = (
                await db.execute(
                    select(Nomenclature).where(
                        Nomenclature.company_id == company.id,
                        Nomenclature.code == code,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                continue
            await check_entity_limit(company.id, "nomenclature", db)
            subcat = sub_joyo
            if "КШО" in code or "обогрева" in name.lower():
                subcat = sub_shkaf
            elif "материал" in name.lower() or code in ("316L", "CF3M", "Cast aluminum", "C220_HST"):
                subcat = (
                    await db.execute(
                        select(SubCategory).where(
                            SubCategory.category_id == cat_materials.id,
                            SubCategory.name == "Сертификаты материалов",
                        )
                    )
                ).scalar_one_or_none()
                if not subcat:
                    subcat = SubCategory(category_id=cat_materials.id, name="Сертификаты материалов")
                    db.add(subcat)
                    await db.flush()
            manufacturer_id = mfr_joyo.id if "JOYO" in name or code in ("BJZT-IV", "BJLM-80H", "BJCOM-IV", "TM-80N") else None
            nom = Nomenclature(
                company_id=company.id,
                code=code,
                name=name,
                category_id=subcat.category_id,
                subcategory_id=subcat.id,
                manufacturer_id=manufacturer_id,
            )
            db.add(nom)
            added += 1

        await db.commit()
        print(f"Добавлено номенклатуры: {added}")
        print("Производитель JOYO, поставщик и категории КИПиА, Сертификация, Материалы созданы.")


if __name__ == "__main__":
    asyncio.run(seed())
    asyncio.run(close_db())
