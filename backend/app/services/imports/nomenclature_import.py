# -*- coding: utf-8 -*-
"""Сервис импорта номенклатуры. Используется воркером при наличии staging."""

import shutil
from pathlib import Path

import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.import_job import ImportJob


def _parse_delivery_date(s: str | None) -> date | None:
    if not s or not str(s).strip():
        return None
    s = str(s).strip()[:10]
    if len(s) < 10:
        return None
    try:
        if s[2] in (".", "-") and s[5] in (".", "-"):
            s = s.replace(".", "-")
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def run_nomenclature_import_from_staging(db: AsyncSession, payload: dict) -> None:
    """
    Выполнить импорт номенклатуры из staged-файлов.
    payload: job_id, company_id, triggered_by_user_id, column_mappings, category_id, subcategory_id,
             supplier_id, delivery_date, row_indices, staged_files: [{path, filename, mime}]
    """
    from app.routers.documents import _run_nomenclature_import_core

    job_id = payload.get("job_id")
    company_id = payload.get("company_id")
    triggered_by_user_id = payload.get("triggered_by_user_id")
    staging_path = get_settings().import_staging_path
    if not job_id or not company_id or not staging_path:
        return

    result = await db.execute(select(ImportJob).where(ImportJob.id == int(job_id)))
    job = result.scalar_one_or_none()
    if not job or job.company_id != int(company_id):
        return

    job.status = "running"
    await db.flush()

    staged = payload.get("staged_files") or []
    files_data: list[tuple[bytes, str, str]] = []
    job_dir = Path(staging_path) / str(job_id)
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
        job.status = "failed"
        job.error_message = "Не удалось прочитать файлы из staging"
        await db.commit()
        return

    try:
        mappings_raw = payload.get("column_mappings") or {}
        if isinstance(mappings_raw, str):
            mappings_raw = json.loads(mappings_raw) if mappings_raw else {}
        row_indices_raw = payload.get("row_indices") or "{}"
        if isinstance(row_indices_raw, str):
            try:
                row_indices_raw = json.loads(row_indices_raw) or {}
            except Exception:
                row_indices_raw = {}
        row_indices_by_file: dict[int, set[int]] = {}
        for k, v in row_indices_raw.items():
            fi = int(k) if isinstance(k, str) else k
            row_indices_by_file[fi] = set(int(i) for i in v) if isinstance(v, (list, tuple)) else {int(v)}

        category_id = payload.get("category_id")
        subcategory_id = payload.get("subcategory_id")
        supplier_id_val = payload.get("supplier_id")
        if supplier_id_val is not None:
            supplier_id_val = int(supplier_id_val)
        delivery_date_val = _parse_delivery_date(str(payload.get("delivery_date") or ""))

        await _run_nomenclature_import_core(
            db, job, int(company_id), triggered_by_user_id,
            files_data, mappings_raw, row_indices_by_file,
            category_id, subcategory_id, supplier_id_val, delivery_date_val,
        )
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]
        raise
    finally:
        if job_dir.exists():
            try:
                shutil.rmtree(job_dir)
            except Exception:
                pass
        await db.commit()
