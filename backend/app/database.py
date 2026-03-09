# -*- coding: utf-8 -*-
"""Подключение к PostgreSQL (российский сервер)."""

import app.compat  # noqa: F401 — патч SQLAlchemy для Python 3.14
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = None
AsyncSessionLocal = None


async def init_db():
    global engine, AsyncSessionLocal
    settings = get_settings()
    is_sqlite = "sqlite" in settings.database_url
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=not is_sqlite,
    )
    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    from app import models  # noqa: F401 - регистрация моделей
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    global engine
    if engine:
        await engine.dispose()


async def set_rls_tenant_ids(session: AsyncSession, company_ids: list[int] | None) -> None:
    """
    Установить app.tenant_ids для RLS (PostgreSQL). Если RLS включён — фильтрует по company_id.
    company_ids=None или [] — супер-админ, доступ ко всем tenant.
    Вызывать в начале обработки запроса после получения company_ids пользователя.
    """
    settings = get_settings()
    if "sqlite" in settings.database_url:
        return
    val = "*" if not company_ids else ",".join(str(x) for x in company_ids)
    await session.execute(text("SELECT set_config('app.tenant_ids', :v, true)"), {"v": val})


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
