# -*- coding: utf-8 -*-
"""CRON: автоматическая выкачка по API поставщиков."""

import logging
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.entity import Supplier
from app.services.supplier_api_fetch import fetch_supplier_api
from app.worker.queue import enqueue

logger = logging.getLogger(__name__)


async def run_supplier_api_fetch_all() -> None:
    """
    Обходит всех поставщиков с import_source=api и запускает выкачку.
    Если use_worker_queue=True — кладёт задачи в очередь, иначе выполняет в процессе.
    """
    settings = get_settings()
    if not getattr(settings, "supplier_api_cron_enabled", True):
        return
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            select(Supplier).where(Supplier.is_deleted == False)
        )
        suppliers = r.scalars().all()
    api_suppliers = [
        s for s in suppliers
        if (s.extra_fields or {}).get("import_config", {}).get("import_source") in ("api", "oauth")
    ]
    if not api_suppliers:
        return
    if getattr(settings, "use_worker_queue", False):
        for sup in api_suppliers:
            ok = await enqueue({"type": "supplier_api_fetch", "supplier_id": sup.id, "company_id": sup.company_id})
            if ok:
                logger.info("Enqueued supplier_api_fetch supplier_id=%s", sup.id)
        return
    for sup in api_suppliers:
        try:
            async with AsyncSessionLocal() as db:
                result = await fetch_supplier_api(db, sup.id, sup.company_id)
            if result.get("error"):
                logger.warning("Supplier API fetch supplier_id=%s: %s", sup.id, result["error"])
            else:
                logger.info(
                    "Supplier API fetch supplier_id=%s: created=%s updated=%s",
                    sup.id, result.get("created", 0), result.get("updated", 0),
                )
        except Exception as e:
            logger.exception("Supplier API fetch supplier_id=%s failed: %s", sup.id, e)
