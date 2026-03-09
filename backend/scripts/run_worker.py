#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Воркер очереди задач (Redis). Запуск: python scripts/run_worker.py или systemd."""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.compat  # noqa: F401

from app.database import init_db, close_db
from app.worker.queue import dequeue
from app.worker.handlers import run_task

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    await init_db()
    logger.info("Worker started, polling queue...")
    try:
        while True:
            payload = await dequeue(timeout_sec=5)
            if payload:
                await run_task(payload)
            await asyncio.sleep(0)
    except asyncio.CancelledError:
        logger.info("Worker cancelled")
    finally:
        await close_db()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
