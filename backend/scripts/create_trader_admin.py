#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Создать тестового трейдер-админа для входа и проверки роли.
Запуск: cd backend && python scripts/create_trader_admin.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import init_db
from app.models.user import User, UserCompany, Company, Role
from app.models.subscription import Plan, Subscription
from app.security import hash_password


async def main():
    await init_db()
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        # Проверяем, есть ли уже trader
        r = await db.execute(select(User).where(User.email == "trader@ikamdocs.ru"))
        existing = r.scalar_one_or_none()
        if existing:
            print("Трейдер уже существует: trader@ikamdocs.ru")
            print("Пароль: TraderTest123!")
            return

        # Ищем или создаём план
        plan_r = await db.execute(select(Plan).limit(1))
        plan = plan_r.scalar_one_or_none()
        if not plan:
            print("Ошибка: нет планов в БД. Создайте план вручную.")
            return

        # Создаём компанию-трейдер
        company_r = await db.execute(
            select(Company).where(Company.company_type == "trader", Company.name == "Тест Трейдер")
        )
        company = company_r.scalar_one_or_none()
        if not company:
            company = Company(
                name="Тест Трейдер",
                company_type="trader",
                is_active=True,
                plan_id=plan.id,
            )
            db.add(company)
            await db.flush()
            print("Создана компания: Тест Трейдер (company_type=trader)")

        # Создаём пользователя-трейдера
        user = User(
            email="trader@ikamdocs.ru",
            hashed_password=hash_password("TraderTest123!"),
            full_name="Тестовый Трейдер",
            role=Role.trader,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        # Связываем с компанией
        db.add(UserCompany(user_id=user.id, company_id=company.id, role=Role.admin))
        await db.flush()

        # Подписка для компании
        sub_r = await db.execute(
            select(Subscription).where(Subscription.company_id == company.id).limit(1)
        )
        if not sub_r.scalar_one_or_none():
            from datetime import datetime, timedelta
            db.add(Subscription(
                company_id=company.id,
                plan_id=plan.id,
                status="active",
                expires_at=datetime.utcnow() + timedelta(days=365),
            ))

        await db.commit()
        print("")
        print("Создан тестовый трейдер-админ:")
        print("  Email:    trader@ikamdocs.ru")
        print("  Пароль:   TraderTest123!")
        print("  Компания: Тест Трейдер (company_type=trader)")
        print("")
        print("Войдите под этим пользователем для проверки/тестирования роли Трейдер.")


if __name__ == "__main__":
    asyncio.run(main())
