# -*- coding: utf-8 -*-
"""Сервис импорта trader Excel. Используется воркером при наличии staging."""

import json
import shutil
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.routers.trader import _run_trader_excel_import_core


async def run_trader_excel_import_from_staging(db: AsyncSession, payload: dict) -> None:
    """
    Выполнить импорт trader Excel из staged-файлов.
    payload: company_id, column_mappings, mode, supplier_id, category_id,
             staged_files: [{path, filename, mime}]
    """
    company_id = payload.get("company_id")
    staging_path = get_settings().import_staging_path
    job_id = payload.get("job_id")  # опционально, для пути к файлам

    if not company_id or not staging_path:
        return

    staged = payload.get("staged_files") or []
    files_data: list[tuple[bytes, str, str]] = []
    job_dir = Path(staging_path) / str(job_id or "trader")
    try:
        for f in staged:
            rel = f.get("path") or f.get("rel_path")
            filename = f.get("filename") or "file"
            mime = f.get("mime") or "application/octet-stream"
            if rel:
                full = job_dir / rel
            else:
                full = job_dir / filename
            if full.exists():
                content = full.read_bytes()
                files_data.append((content, filename, mime))
    except Exception:
        await db.commit()
        return

    try:
        mappings = payload.get("column_mappings") or {}
        if isinstance(mappings, str):
            mappings = json.loads(mappings) if mappings else {}
        mode = payload.get("mode", "add_new")
        if mode not in ("add_new", "update_by_barcode"):
            mode = "add_new"
        supplier_id = payload.get("supplier_id")
        if supplier_id is not None:
            supplier_id = int(supplier_id)
        category_id = payload.get("category_id")
        if category_id is not None:
            category_id = int(category_id)

        await _run_trader_excel_import_core(
            db, int(company_id), files_data, mappings, mode, supplier_id, category_id,
        )
    finally:
        if job_dir.exists():
            try:
                shutil.rmtree(job_dir)
            except Exception:
                pass
        await db.commit()
