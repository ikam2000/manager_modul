# -*- coding: utf-8 -*-
"""Очередь задач в Redis (список, BLPOP/RPUSH)."""

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

QUEUE_KEY = "ikamdocs:task_queue"
DEFAULT_TIMEOUT = 5


async def enqueue(payload: dict[str, Any]) -> bool:
    """Добавить задачу в очередь. payload: {type, ...kwargs}."""
    try:
        import redis.asyncio as redis
        settings = get_settings()
        r = redis.from_url(settings.redis_url)
        await r.rpush(QUEUE_KEY, json.dumps(payload))
        await r.aclose()
        return True
    except Exception as e:
        logger.warning("worker queue enqueue failed: %s", e)
        return False


async def dequeue(timeout_sec: int = DEFAULT_TIMEOUT) -> dict[str, Any] | None:
    """Забрать задачу из очереди (BLPOP). Возвращает payload или None."""
    try:
        import redis.asyncio as redis
        settings = get_settings()
        r = redis.from_url(settings.redis_url)
        result = await r.blpop(QUEUE_KEY, timeout=timeout_sec)
        await r.aclose()
        if not result:
            return None
        _, raw = result
        return json.loads(raw)
    except Exception as e:
        logger.warning("worker queue dequeue failed: %s", e)
        return None
