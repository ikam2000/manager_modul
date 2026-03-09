# -*- coding: utf-8 -*-
"""Request ID и структурированное логирование запросов."""

import json
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Контекстная переменная для request_id (доступна в любом коде во время обработки запроса)
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    """Текущий request_id в контексте запроса."""
    return request_id_ctx.get()


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Генерирует или принимает X-Request-ID, кладёт в state и контекст, отдаёт в ответе."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid
        token = request_id_ctx.set(rid)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = rid
            return response
        finally:
            request_id_ctx.reset(token)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Логирует каждый запрос: request_id, method, path, status, duration_ms (структурированно)."""

    def __init__(self, app, logger_name: str = "uvicorn.access", log_format: str = "text"):
        super().__init__(app)
        self._log = logging.getLogger(logger_name)
        self._log_format = log_format

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        method = request.method
        path = request.url.path
        rid = get_request_id() or "-"
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        if self._log_format == "json":
            payload = {
                "request_id": rid, "method": method, "path": path,
                "status": response.status_code, "duration_ms": duration_ms,
            }
            self._log.info("%s", json.dumps(payload, ensure_ascii=False))
        else:
            self._log.info(
                "request_id=%s method=%s path=%s status=%s duration_ms=%s",
                rid, method, path, response.status_code, duration_ms,
            )
        return response


class RequestIdLoggingFilter(logging.Filter):
    """Добавляет request_id к каждой записи лога, если он задан в контексте."""

    def filter(self, record: logging.LogRecord) -> bool:
        rid = get_request_id()
        record.request_id = rid if rid is not None else "-"
        return True


class SecretMaskingFilter(logging.Filter):
    """Маскирует секреты (токены, пароли, ключи) в логах."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            from app.utils.log_sanitizer import mask_secrets
            msg = record.getMessage()
            if msg:
                record.msg = mask_secrets(msg)
                record.args = ()
        except Exception:
            pass
        return True
