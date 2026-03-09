#!/usr/bin/env python3
"""Добавить колонки avatar_url, logo_url и реквизитов. Запуск: python scripts/add_profile_columns.py"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    from sqlalchemy import text
    from app import database

    await database.init_db()
    async with database.AsyncSessionLocal() as db:
        cols_to_add = [
            ("users", "avatar_url", "VARCHAR(512)"),
            ("companies", "logo_url", "VARCHAR(512)"),
            ("companies", "ogrn", "VARCHAR(15)"),
            ("companies", "bank_name", "VARCHAR(255)"),
            ("companies", "bank_bik", "VARCHAR(9)"),
            ("companies", "bank_account", "VARCHAR(20)"),
            ("companies", "bank_corr", "VARCHAR(20)"),
            ("companies", "payment_purpose", "VARCHAR(1024)"),
        ]
        for table, col, typ in cols_to_add:
            try:
                await db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typ}"))
                print(f"Added {table}.{col}")
            except Exception as e:
                err = str(e).lower()
                if "duplicate column" in err or "already exists" in err or "exist" in err:
                    print(f"  {table}.{col} already exists")
                else:
                    print(f"  {table}.{col}: {e}")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
