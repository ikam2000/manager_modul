# -*- coding: utf-8 -*-
"""Супер-админ: пользователи, компании, аналитика, вход под пользователем."""

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_super_admin, get_current_admin
from app.models.user import User, UserCompany, Role, Session
from app.security import hash_password

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    company_id: int | None = None


class UpdateUserRequest(BaseModel):
    is_active: bool | None = None
    role: str | None = None


class UpdatePermissionsRequest(BaseModel):
    permissions: dict


@router.get("/users")
async def list_all_users(
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Список всех пользователей (только супер-админ)."""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    return {
        "items": [
            {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value, "is_active": u.is_active}
            for u in users
        ]
    }


@router.post("/users")
async def create_user(
    data: CreateUserRequest,
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Создать пользователя."""
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Пароль минимум 8 символов")
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже занят")
    company_id = data.company_id
    if not company_id:
        uc = await db.execute(select(UserCompany).where(UserCompany.user_id == admin.id).limit(1))
        row = uc.scalar_one_or_none()
        if row:
            company_id = row.company_id
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=Role.user,
    )
    db.add(user)
    await db.flush()
    if company_id:
        db.add(UserCompany(user_id=user.id, company_id=company_id, role=Role.user))
    await db.commit()
    return {"id": user.id, "email": user.email}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    data: UpdateUserRequest,
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить пользователя (отключить/включить, роль)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.role.value == "super_admin":
        raise HTTPException(status_code=403, detail="Нельзя изменить супер-админа")
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None and data.role in ("user", "admin"):
        user.role = Role(data.role)
    await db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.role.value == "super_admin":
        raise HTTPException(status_code=403, detail="Нельзя удалить супер-админа")
    await db.delete(user)
    await db.commit()
    return {"ok": True}


@router.patch("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: int,
    data: UpdatePermissionsRequest,
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить доступы пользователя к разделам (заглушка)."""
    return {"ok": True}


@router.get("/sessions")
async def list_sessions(
    admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
    user_id: int | None = Query(None, description="Фильтр по пользователю"),
    limit: int = Query(200, le=500),
):
    """Список сессий авторизаций (IP, регион, устройство). Только супер-админ."""
    q = (
        select(Session, User.email, User.full_name)
        .join(User, Session.user_id == User.id)
        .order_by(Session.created_at.desc())
        .limit(limit)
    )
    if user_id is not None:
        q = q.where(Session.user_id == user_id)
    result = await db.execute(q)
    rows = result.all()
    return {
        "items": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "user_email": email,
                "user_full_name": full_name,
                "ip_address": getattr(s, "ip_address", None),
                "user_agent": getattr(s, "user_agent", None),
                "region": getattr(s, "region", None),
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            }
            for s, email, full_name in rows
        ]
    }


def _client_ip(request: Request) -> str:
    """IP клиента из заголовков или соединения."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return getattr(request.client, "host", "") or ""
    return ""


@router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    reason: str = Body(None, embed=True),
):
    """Войти под указанным пользователем. Супер-админ — под любым, админ — под своими."""
    from app.security import create_access_token
    from app.config import get_settings

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    if not target.is_active:
        raise HTTPException(400, "Пользователь деактивирован")
    if admin.role != Role.super_admin:
        admin_uc = await db.execute(
            select(UserCompany).where(UserCompany.user_id == admin.id)
        )
        admin_links = admin_uc.scalars().all()
        can_impersonate = any(getattr(uc, "can_impersonate", False) for uc in admin_links)
        if not can_impersonate:
            raise HTTPException(403, "Нет права входить под пользователями")
        target_uc = await db.execute(
            select(UserCompany).where(UserCompany.user_id == target.id)
        )
        target_links = target_uc.scalars().all()
        admin_companies = {uc.company_id for uc in admin_links}
        target_companies = {uc.company_id for uc in target_links}
        if not (admin_companies & target_companies):
            raise HTTPException(403, "Пользователь из другой компании")
    uc = await db.execute(
        select(UserCompany).where(UserCompany.user_id == target.id).limit(1)
    )
    link = uc.scalar_one_or_none()
    company_id = link.company_id if link else None
    role = link.role.value if link else target.role.value

    from app.services.audit import write_audit
    await write_audit(
        db,
        company_id=company_id,
        user_id=admin.id,
        action="impersonate",
        entity_type="user",
        entity_id=target.id,
        new_value={
            "admin_id": admin.id,
            "admin_email": admin.email,
            "target_email": target.email,
            "target_id": target.id,
            "reason": (reason or "").strip() or None,
            "admin_ip": _client_ip(request),
        },
    )

    access = create_access_token(
        target.id, role, company_id, impersonated=True
    )
    settings = get_settings()
    return {
        "access_token": access,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
        "impersonated_user_id": target.id,
        "impersonated_user_email": target.email,
    }
