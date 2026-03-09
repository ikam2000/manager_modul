# -*- coding: utf-8 -*-
"""Обработчики задач из очереди воркера."""

import logging
from typing import Any

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.services.supplier_api_fetch import fetch_supplier_api

logger = logging.getLogger(__name__)


async def run_task(payload: dict[str, Any]) -> None:
    """Выполнить задачу по payload[\"type\"]."""
    task_type = payload.get("type")
    if not task_type:
        logger.warning("worker task missing type: %s", payload)
        return
    if task_type == "supplier_api_fetch":
        await _handle_supplier_api_fetch(payload)
    elif task_type == "nomenclature_import":
        await _handle_nomenclature_import(payload)
    elif task_type == "trader_import_excel":
        await _handle_trader_import_excel(payload)
    else:
        logger.warning("worker unknown task type: %s", task_type)


async def _handle_supplier_api_fetch(payload: dict[str, Any]) -> None:
    supplier_id = payload.get("supplier_id")
    company_id = payload.get("company_id")
    if supplier_id is None or company_id is None:
        logger.warning("supplier_api_fetch missing supplier_id or company_id: %s", payload)
        return
    try:
        async with AsyncSessionLocal() as db:
            result = await fetch_supplier_api(db, int(supplier_id), int(company_id))
        if result.get("error"):
            logger.warning("worker supplier_api_fetch supplier_id=%s: %s", supplier_id, result["error"])
        else:
            logger.info(
                "worker supplier_api_fetch supplier_id=%s: created=%s updated=%s",
                supplier_id, result.get("created", 0), result.get("updated", 0),
            )
    except Exception as e:
        logger.exception("worker supplier_api_fetch supplier_id=%s failed: %s", supplier_id, e)


async def _handle_nomenclature_import(payload: dict[str, Any]) -> None:
    """Импорт номенклатуры из staged файлов. Требует import_staging_path и staged_file_paths в payload."""
    job_id = payload.get("job_id")
    staging_path = get_settings().import_staging_path
    if not staging_path or not job_id:
        logger.warning("nomenclature_import: требуется job_id и import_staging_path; payload=%s", payload)
        return
    try:
        from app.services.imports.nomenclature_import import run_nomenclature_import_from_staging
        async with AsyncSessionLocal() as db:
            await run_nomenclature_import_from_staging(db, payload)
    except Exception as e:
        logger.exception("worker nomenclature_import job_id=%s failed: %s", job_id, e)


async def _handle_trader_import_excel(payload: dict[str, Any]) -> None:
    """Импорт trader Excel из staged файлов."""
    job_id = payload.get("job_id")
    staging_path = get_settings().import_staging_path
    if not staging_path:
        logger.warning("trader_import_excel: требуется import_staging_path; payload=%s", payload)
        return
    try:
        from app.services.imports.trader_excel_import import run_trader_excel_import_from_staging
        async with AsyncSessionLocal() as db:
            await run_trader_excel_import_from_staging(db, payload)
    except Exception as e:
        logger.exception("worker trader_import_excel job_id=%s failed: %s", job_id, e)
