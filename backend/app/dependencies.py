# -*- coding: utf-8 -*-
"""Зависимости FastAPI: получение текущего пользователя, проверка прав."""

import logging
from typing import Annotated

logger = logging.getLogger(__name__)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, func

from app.database import get_db, AsyncSessionLocal
from app.models.user import User, UserCompany, Company, Role
from app.models.subscription import Subscription, Plan
from app.models.entity import Supplier, Manufacturer, Customer, Nomenclature
from app.models.user_permissions import UserCompanyPermissions, PERMISSION_KEYS
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def _utcnow():
    from datetime import datetime
    return datetime.utcnow()


async def _has_active_subscription(company_id: int, db: AsyncSession) -> bool:
    """Есть ли активная оплаченная подписка (status=active и не истекла)."""
    now = _utcnow()
    r = await db.execute(
        select(Subscription)
        .where(Subscription.company_id == company_id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = r.scalar_one_or_none()
    if not sub:
        return False
    if sub.expires_at is None:
        return True
    return sub.expires_at > now


async def check_trial_or_subscription(company_id: int, db: AsyncSession) -> None:
    """
    Единая проверка trial/подписки для любой компании (трейдер и основной проект).
    Если trial истёк и нет активной подписки — 403.
    """
    now = _utcnow()
    r = await db.execute(select(Company).where(Company.id == company_id))
    company = r.scalar_one_or_none()
    if not company:
        return
    is_trader = getattr(company, "company_type", None) == "trader"

    if is_trader:
        trial_end = getattr(company, "trial_end", None)
        if not trial_end:
            return
        if now <= trial_end:
            return
        if await _has_active_subscription(company_id, db):
            return
        logger.warning("trial_expired company_id=%s (trader)", company_id)
        raise HTTPException(
            status_code=403,
            detail="Тестовый период истёк. Оформите подписку для продолжения работы.",
        )

    # Основной проект: подписка по Subscription (trial или active + expires_at)
    sub_r = await db.execute(
        select(Subscription)
        .where(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = sub_r.scalar_one_or_none()
    if not sub:
        return
    if sub.status == "active" and (sub.expires_at is None or sub.expires_at > now):
        return
    if sub.status == "trial" and sub.expires_at and sub.expires_at > now:
        return
    # trial истёк или подписка неактивна
    if await _has_active_subscription(company_id, db):
        return
    logger.warning("trial_expired company_id=%s (main)", company_id)
    raise HTTPException(
        status_code=403,
        detail="Пробный период истёк. Оформите подписку для продолжения работы.",
    )


async def check_trader_trial_or_paid(company_id: int, db: AsyncSession) -> None:
    """Для обратной совместимости: вызывает единую проверку trial/подписки."""
    await check_trial_or_subscription(company_id, db)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    from app.database import set_rls_tenant_ids
    company_ids = await get_user_company_ids(user, db)
    await set_rls_tenant_ids(db, company_ids)
    return user


async def get_user_permissions(
    user: User, company_id: int | None, db: AsyncSession
) -> dict:
    """Права пользователя: admin/super_admin/trader имеют все в своей компании, иначе из user_company_permissions."""
    if user.role in (Role.admin, Role.super_admin, Role.trader):
        return {
            "can_delete_entities": True,
            "can_delete_documents": True,
        }
    if not company_id:
        return {"can_delete_entities": False, "can_delete_documents": False}
    try:
        r = await db.execute(
            select(UserCompanyPermissions)
            .where(
                UserCompanyPermissions.user_id == user.id,
                UserCompanyPermissions.company_id == company_id,
            )
        )
        row = r.scalar_one_or_none()
        if not row or not row.permissions:
            return {"can_delete_entities": False, "can_delete_documents": False}
        return {
            "can_delete_entities": bool(row.permissions.get("can_delete_entities")),
            "can_delete_documents": bool(row.permissions.get("can_delete_documents")),
        }
    except Exception:
        return {"can_delete_entities": False, "can_delete_documents": False}


async def get_user_company_ids(
    user: User,
    db: AsyncSession,
) -> list[int] | None:
    """Список ID компаний пользователя. None = супер-админ (без фильтра)."""
    if user.role == Role.super_admin:
        return None
    result = await db.execute(
        select(UserCompany.company_id).where(UserCompany.user_id == user.id).order_by(UserCompany.company_id.asc())
    )
    ids = [r[0] for r in result.all()]
    return ids if ids else []


async def get_user_company_id(user: User, db: AsyncSession) -> int | None:
    """Первая компания пользователя для создания сущностей."""
    if user.role == Role.super_admin:
        return None  # супер-админ передаёт company_id в запросе
    ids = await get_user_company_ids(user, db)
    return ids[0] if ids else None


async def require_trial_or_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Текущий пользователь + проверка trial/подписки для его компании.
    Используется в entities и других роутах основного проекта (не только кабинет).
    """
    company_id = await get_user_company_id(user, db)
    if company_id is not None:
        await check_trial_or_subscription(company_id, db)
    return user


async def require_can_delete_entities(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Требует право удаления/отключения сущностей."""
    company_ids = await get_user_company_ids(user, db)
    cid = company_ids[0] if company_ids else None
    perms = await get_user_permissions(user, cid, db)
    if not perms.get("can_delete_entities"):
        raise HTTPException(status_code=403, detail="Нет права удалять или отключать номенклатуру")
    return user


async def require_can_delete_documents(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Требует право удаления документов."""
    company_ids = await get_user_company_ids(user, db)
    cid = company_ids[0] if company_ids else None
    perms = await get_user_permissions(user, cid, db)
    if not perms.get("can_delete_documents"):
        raise HTTPException(status_code=403, detail="Нет права удалять документы")
    return user


async def get_current_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Доступ для admin, super_admin, trader (кабинет). Проверяет trial/подписку для основной компании."""
    if user.role not in (Role.admin, Role.super_admin, Role.trader):
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    company_id = await get_user_company_id(user, db)
    if company_id is not None:
        await check_trial_or_subscription(company_id, db)
    return user


async def get_current_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.super_admin:
        raise HTTPException(status_code=403, detail="Требуются права супер-администратора")
    return user


async def get_current_trader(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> User:
    """Только трейдер или пользователь компании типа trader."""
    if user.role == Role.trader:
        return user
    r = await db.execute(
        select(Company.company_type).join(UserCompany, UserCompany.company_id == Company.id).where(UserCompany.user_id == user.id).limit(1)
    )
    row = r.first()
    if row and row[0] == "trader":
        return user
    raise HTTPException(status_code=403, detail="Доступ только для роли Трейдер")


async def get_demo_limits(
    company_id: int,
    db: AsyncSession,
) -> dict[str, int | None] | None:
    """
    Лимиты плана для компании. None = без лимитов (супер-админ или план без ограничений).
    Возвращает: {max_nomenclature, max_suppliers, max_nomenclature_per_supplier, max_manufacturers, max_customers}
    """
    result = await db.execute(
        select(Plan)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(
            Subscription.company_id == company_id,
            Subscription.status.in_(("active", "trial")),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    row = result.first()
    if not row:
        return None
    plan = row[0]
    return {
        "max_nomenclature": getattr(plan, "max_nomenclature", None),
        "max_suppliers": getattr(plan, "max_suppliers", None),
        "max_nomenclature_per_supplier": getattr(plan, "max_nomenclature_per_supplier", None),
        "max_manufacturers": getattr(plan, "max_manufacturers", None),
        "max_customers": getattr(plan, "max_customers", None),
    }


async def check_nomenclature_per_supplier_limit(
    company_id: int,
    supplier_id: int,
    db: AsyncSession,
    current_count_override: int | None = None,
) -> None:
    """
    Проверяет лимит «товаров по одному поставщику» (для трейдера — 50).
    Если supplier_id не задан или лимит в плане не задан — не проверяем.
    current_count_override: если задан, используем это число вместо запроса в БД (для импорта в цикле).
    """
    if not supplier_id:
        return
    limits = await get_demo_limits(company_id, db)
    if not limits:
        return
    max_per_supplier = limits.get("max_nomenclature_per_supplier")
    if max_per_supplier is None:
        return
    if current_count_override is not None:
        count = current_count_override
    else:
        q = (
            select(func.count())
            .select_from(Nomenclature)
            .where(
                Nomenclature.company_id == company_id,
                Nomenclature.supplier_id == supplier_id,
                Nomenclature.is_deleted == False,
            )
        )
        count = (await db.execute(q)).scalar() or 0
    if count >= max_per_supplier:
        logger.warning("limit_exceeded company_id=%s supplier_id=%s count=%s max_per_supplier=%s", company_id, supplier_id, count, max_per_supplier)
        raise HTTPException(
            status_code=403,
            detail=f"Достигнут лимит: не более {max_per_supplier} товаров по одному поставщику. Оформите подписку для расширения.",
        )


async def check_entity_limit(
    company_id: int,
    entity_type: str,
    db: AsyncSession,
) -> None:
    """
    Проверяет лимит плана перед созданием сущности.
    entity_type: "nomenclature" | "suppliers" | "manufacturers" | "customers"
    """
    limits = await get_demo_limits(company_id, db)
    if not limits:
        return
    key = {"nomenclature": "max_nomenclature", "suppliers": "max_suppliers", "manufacturers": "max_manufacturers", "customers": "max_customers"}.get(entity_type)
    if not key:
        return
    max_val = limits.get(key)
    if max_val is None:
        return
    model_map = {"nomenclature": Nomenclature, "suppliers": Supplier, "manufacturers": Manufacturer, "customers": Customer}
    model = model_map.get(entity_type)
    if not model:
        return
    is_deleted_col = getattr(model, "is_deleted", None)
    q = select(func.count()).select_from(model).where(model.company_id == company_id)
    if is_deleted_col is not None:
        q = q.where(is_deleted_col == False)
    count = (await db.execute(q)).scalar() or 0
    if count >= max_val:
        logger.warning("limit_exceeded company_id=%s entity_type=%s count=%s max=%s", company_id, entity_type, count, max_val)
        labels = {"nomenclature": "номенклатуры", "suppliers": "поставщиков", "manufacturers": "производителей", "customers": "заказчиков"}
        raise HTTPException(
            status_code=403,
            detail=f"Достигнут лимит демо-режима: {max_val} {labels.get(entity_type, entity_type)}. Оформите подписку для расширения.",
        )
