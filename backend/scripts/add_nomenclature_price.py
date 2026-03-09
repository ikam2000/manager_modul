#!/usr/bin/env python3
"""Добавить колонку price в таблицу nomenclature. Запуск: python scripts/add_nomenclature_price.py"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    from sqlalchemy import text
    from app import database

    await database.init_db()
    async with database.AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE nomenclature ADD COLUMN price REAL"))
            await db.commit()
            print("Added nomenclature.price")
        except Exception as e:
            err = str(e).lower()
            if "duplicate column" in err or "already exists" in err or "exist" in err:
                print("nomenclature.price already exists")
            else:
                print(f"Error: {e}")
                await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
