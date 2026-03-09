#!/usr/bin/env python3
"""Создать таблицу saved_qr_codes. Запуск: python scripts/add_saved_qr_codes.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

async def main():
    from app import database
    await database.init_db()
    print("Таблица saved_qr_codes создана (через create_all)")

if __name__ == "__main__":
    asyncio.run(main())
