# -*- coding: utf-8 -*-
"""Точка входа FastAPI. Главные маршруты и middleware."""

from pathlib import Path

import app.compat  # noqa: F401 — патч SQLAlchemy для Python 3.14

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.rate_limit import limiter
from app.database import init_db, close_db
from app.middleware.observability import RequestIdMiddleware, RequestLoggingMiddleware
from app.routers import auth, public, cabinet, admin, api_integration, qr, analytics, payment, entities, documents, oauth_integrations, trader


_APP_START_MONOTONIC: float | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _APP_START_MONOTONIC
    import time
    import logging
    from app.middleware.observability import SecretMaskingFilter
    _APP_START_MONOTONIC = time.monotonic()
    for h in logging.root.handlers:
        h.addFilter(SecretMaskingFilter())
    await init_db()
    scheduler = AsyncIOScheduler()
    from app.config import get_settings
    from app.tasks.supplier_api_cron import run_supplier_api_fetch_all
    settings = get_settings()
    if getattr(settings, "supplier_api_cron_enabled", True):
        interval = getattr(settings, "supplier_api_cron_interval_minutes", 60)
        scheduler.add_job(run_supplier_api_fetch_all, "interval", minutes=interval, id="supplier_api_fetch")
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown()
    await close_db()


OPENAPI_TAGS = [
    {"name": "auth", "description": "Авторизация: регистрация, вход, refresh, профиль. JWT Bearer токен."},
    {"name": "public", "description": "Публичные эндпоинты без авторизации (тарифы, планы)."},
    {"name": "cabinet", "description": "Личный кабинет: пользователи, компания, аватар, API-ключи, webhooks, билеты."},
    {"name": "entities", "description": "Сущности: категории, подкатегории, номенклатура, поставщики, производители, поставки, договоры."},
    {"name": "documents", "description": "Документы: загрузка, распознавание (OCR), импорт номенклатуры и поставок."},
    {"name": "admin", "description": "Администрирование (требуется роль admin/super_admin)."},
    {"name": "api", "description": "**Интеграция 1С/ERP/CRM**: REST API с X-Api-Key. CRUD сущностей (номенклатура, поставщики и др.)."},
    {"name": "qr", "description": "QR-маркировка: получение данных по коду, просмотр, печать этикеток."},
    {"name": "analytics", "description": "Аналитика: дашборд, отчёты."},
    {"name": "payment", "description": "Оплата: тарифы, создание платежа, счета, webhook ЮKassa."},
]

app = FastAPI(
    title="ikamdocs API",
    description="""
Сервис управления документами и номенклатурой с QR-кодами.

## Аутентификация

- **JWT Bearer** — для эндпоинтов личного кабинета, сущностей, документов. Получите токен через `/auth/login` или `/auth/register`. Заголовок: `Authorization: Bearer <access_token>`.
- **X-Api-Key** — для интеграции 1С/ERP/CRM. Создайте ключ в Личный кабинет → Интеграции → REST API. Заголовок: `X-Api-Key: <ваш_ключ>`.

## Интеграция (API)

Базовый URL для внешней интеграции: `https://ikamdocs.ru/api/v1/integrate`. Сущности: nomenclature, category, subcategory, supplier, manufacturer, supply, contract, contract_appendix.
""",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=OPENAPI_TAGS,
    redoc_url=None,
    docs_url="/docs",
    servers=[{"url": "https://ikamdocs.ru", "description": "Production"}],
)

settings = get_settings()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(RequestLoggingMiddleware, log_format=settings.log_format)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры (rate limit применяется в самих роутерах)
app.include_router(public.router, prefix="", tags=["public"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(cabinet.router, prefix="/cabinet", tags=["cabinet"])
if settings.feature_marketplace_oauth:
    app.include_router(oauth_integrations.router, prefix="/cabinet", tags=["cabinet"])
app.include_router(entities.router, prefix="/entities", tags=["entities"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(api_integration.router, prefix="/api/v1/integrate", tags=["api"])
app.include_router(qr.router, prefix="/qr", tags=["qr"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
if settings.feature_yookassa:
    app.include_router(payment.router, prefix="/payment", tags=["payment"])
app.include_router(trader.router, prefix="/trader", tags=["trader"])
if settings.feature_yookassa:
    app.add_api_route(
        "/yookassa_webhook",
        payment.yookassa_webhook,
        methods=["POST"],
        tags=["payment"],
    )


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
        servers=app.servers,
    )
    comp = schema.setdefault("components", {})
    schemes = comp.setdefault("securitySchemes", {})
    schemes["HTTPBearer"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT из /auth/login или /auth/register. Заголовок: Authorization: Bearer <token>",
    }
    schemes["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "X-Api-Key",
        "description": "API-ключ из Личный кабинет → Интеграции → REST API. Для интеграции 1С/ERP/CRM.",
    }
    for path, path_item in schema.get("paths", {}).items():
        if "/api/v1/integrate" in path:
            for method, op in path_item.items():
                if method in ("get", "post", "put", "patch", "delete") and isinstance(op, dict):
                    op["security"] = [{"ApiKeyAuth": []}]
    schema["externalDocs"] = {
        "url": "https://ikamdocs.ru",
        "description": "Сайт ikamdocs — документация по интеграции в разделе Интеграции",
    }
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/health")
async def health():
    """Liveness: сервис запущен."""
    import time
    uptime_sec = int(time.monotonic() - _APP_START_MONOTONIC) if _APP_START_MONOTONIC else 0
    return {"status": "ok", "service": "ikamdocs", "uptime_sec": uptime_sec}


_uptime_gauge = None


@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus-метрики для мониторинга."""
    global _uptime_gauge
    try:
        from prometheus_client import REGISTRY, generate_latest, CONTENT_TYPE_LATEST, Gauge
        from fastapi.responses import Response
        import time
        if _uptime_gauge is None:
            _uptime_gauge = Gauge("ikamdocs_uptime_seconds", "Uptime in seconds")
        if _APP_START_MONOTONIC is not None:
            _uptime_gauge.set(int(time.monotonic() - _APP_START_MONOTONIC))
        return Response(content=generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        import time
        uptime = int(time.monotonic() - _APP_START_MONOTONIC) if _APP_START_MONOTONIC else 0
        return Response(
            content=f"# ikamdocs fallback metrics\nikamdocs_uptime_seconds {uptime}\n",
            media_type="text/plain; charset=utf-8",
        )


@app.get("/health/ready")
async def health_ready():
    """Readiness: БД (и при наличии Redis) доступны."""
    from app.database import AsyncSessionLocal
    from sqlalchemy import text
    checks = {"database": False, "redis": None}
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        return JSONResponse(
            content={"status": "unhealthy", "checks": checks, "error": str(e)},
            status_code=503,
        )
    try:
        import redis.asyncio as redis_async
        r = redis_async.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = True
    except Exception as e:
        checks["redis"] = False
        if "redis" in settings.redis_url and "localhost" in settings.redis_url:
            pass
        else:
            return JSONResponse(
                content={"status": "unhealthy", "checks": checks, "error": f"redis: {e}"},
                status_code=503,
            )
    return {"status": "ok", "service": "ikamdocs", "checks": checks}


_StaticDocsDir = Path(__file__).resolve().parents[1] / "static_docs"
if _StaticDocsDir.exists():
    app.mount("/static_docs", StaticFiles(directory=str(_StaticDocsDir)), name="static_docs")

REDOC_HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <title>ikamdocs API - ReDoc</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="https://ikamdocs.ru/openapi.json"></redoc>
  <script src="/static_docs/redoc.standalone.js"></script>
</body>
</html>"""


@app.get("/redoc", include_in_schema=False)
async def redoc_html() -> HTMLResponse:
    """ReDoc с самохостингом JS — не зависит от CDN."""
    return HTMLResponse(REDOC_HTML)
