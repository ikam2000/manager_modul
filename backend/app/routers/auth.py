# -*- coding: utf-8 -*-
"""Авторизация: регистрация, вход, refresh, impersonate."""

import logging
import traceback
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, Company, UserCompany, Session, Role
from app.rate_limit import limiter
from app.models.subscription import Plan, Subscription
from app.dependencies import get_user_permissions
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    decode_token,
    hash_refresh_token,
)

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def _client_ip_and_agent(request: Request) -> tuple[str | None, str | None]:
    """Возвращает (ip_address, user_agent) из запроса."""
    try:
        ip = None
        if request.client:
            ip = getattr(request.client, "host", None)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip() or ip
        ua = request.headers.get("user-agent")
        if ua and len(ua) > 512:
            ua = ua[:512]
        return (ip, ua)
    except Exception:
        return (None, None)


@router.get("/inn-lookup")
async def auth_inn_lookup(
    inn: str = Query(..., min_length=10),
    db: AsyncSession = Depends(get_db),
):
    """Публичный поиск организации по ИНН (для формы регистрации, без auth)."""
    from app.services.inn_lookup import lookup_by_inn
    data = await lookup_by_inn(inn, db)
    if not data:
        return {"found": False, "data": None}
    return {"found": True, "data": data}


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v or "@" not in v:
            raise ValueError("Некорректный email")
        return v


def _validate_email(v: str) -> str:
    v = (v or "").strip().lower()
    if not v:
        raise ValueError("Укажите email")
    if "@" not in v or "." not in v.split("@")[-1]:
        raise ValueError("Некорректный формат email")
    return v


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str
    inn: str | None = None
    kpp: str | None = None
    ogrn: str | None = None
    legal_address: str | None = None
    address: str | None = None
    phone: str | None = None
    company_email: str | None = None  # email компании, чтобы не конфликтовать с полем email пользователя
    contact_person: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    payment_purpose: str | None = None
    company_type: str | None = None  # supplier | customer

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return _validate_email(v)

    @field_validator("inn")
    @classmethod
    def inn_valid(cls, v: str | None) -> str | None:
        if not v or not v.strip():
            return None
        clean = "".join(c for c in v.strip() if c.isdigit())
        if not clean:
            raise ValueError("ИНН должен содержать только цифры")
        if len(clean) not in (10, 12):
            raise ValueError("ИНН должен быть 10 или 12 цифр")
        return clean


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company_id: int | None = None
    impersonated: bool = False
    company_name: str | None = None
    company_type: str | None = None  # supplier | customer | trader
    avatar_url: str | None = None
    permissions: dict | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        return _validate_email(v)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_len(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Пароль должен быть не менее 8 символов")
        return v


@router.post("/login", response_model=TokenResponse, summary="Вход (получить JWT)")
@limiter.limit("10/minute")
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Аккаунт заблокирован")
    settings = get_settings()
    company_id = None
    role = user.role.value
    result_uc = await db.execute(
        select(UserCompany).where(UserCompany.user_id == user.id).limit(1)
    )
    uc = result_uc.scalar_one_or_none()
    if uc:
        company_id = uc.company_id
        # Трейдеры сохраняют роль trader в JWT; для остальных — роль из UserCompany
        if role != "trader":
            role = uc.role.value
    access = create_access_token(user.id, role, company_id)
    refresh = create_refresh_token(user.id)
    expires = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    ip_addr, user_agent = _client_ip_and_agent(request)
    session = Session(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh),
        expires_at=expires,
        ip_address=ip_addr,
        user_agent=user_agent,
    )
    db.add(session)
    try:
        await db.flush()
    except (OperationalError, ProgrammingError):
        await db.rollback()
        session = Session(
            user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh),
            expires_at=expires,
        )
        db.add(session)
        await db.flush()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=TokenResponse, summary="Регистрация")
@limiter.limit("5/minute")
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        ct = (data.company_type or "customer").strip().lower()
        if ct not in ("supplier", "customer", "trader"):
            ct = "customer"
        company = Company(
            name=data.company_name,
            inn=data.inn,
            kpp=data.kpp,
            ogrn=data.ogrn,
            legal_address=data.legal_address,
            address=data.address,
            phone=data.phone,
            email=data.company_email,
            contact_person=data.contact_person,
            bank_name=data.bank_name,
            bank_bik=data.bank_bik,
            bank_account=data.bank_account,
            bank_corr=data.bank_corr,
            payment_purpose=data.payment_purpose,
            company_type=ct,
        )
        db.add(company)
        await db.flush()
        user_role = Role.trader if ct == "trader" else Role.admin
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=user_role,
        )
        db.add(user)
        await db.flush()
        uc = UserCompany(user_id=user.id, company_id=company.id, role=user_role)
        db.add(uc)
        await db.flush()
        # Подписка: для trader — Trader Trial (14 дней, 3 поставщика, 50 товаров); для остальных — Демо
        if ct == "trader":
            trial_start = datetime.utcnow()
            trial_end = trial_start + timedelta(days=14)
            company.trial_start = trial_start
            company.trial_end = trial_end
            await db.flush()
            plan_r = await db.execute(select(Plan).where(Plan.name == "Trader Trial", Plan.plan_type == "trader", Plan.is_active == True).limit(1))
        else:
            plan_r = await db.execute(select(Plan).where(Plan.name == "Демо", Plan.is_active == True).limit(1))
        plan = plan_r.scalar_one_or_none()
        if plan:
            sub = Subscription(
                company_id=company.id,
                plan_id=plan.id,
                status="trial",
                expires_at=datetime.utcnow() + timedelta(days=14),
            )
            db.add(sub)
            await db.flush()
        refresh = create_refresh_token(user.id)
        ip_addr, user_agent = _client_ip_and_agent(request)
        session = Session(
            user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh),
            expires_at=datetime.utcnow()
            + timedelta(days=get_settings().refresh_token_expire_days),
            ip_address=ip_addr,
            user_agent=user_agent,
        )
        db.add(session)
        access = create_access_token(user.id, user_role.value, company.id)
        # Письмо о регистрации (от zero@ikamdocs.ru)
        try:
            from app.services.email import send_welcome_email
            await send_welcome_email(
                data.email, data.full_name, data.company_name, ct,
            )
        except Exception as mail_err:
            logger.warning("Не удалось отправить письмо о регистрации: %s", mail_err)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=get_settings().access_token_expire_minutes * 60,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Ошибка регистрации: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка сервера. Попробуйте позже.")


@router.post("/refresh", response_model=TokenResponse, summary="Обновление токена")
@limiter.limit("30/minute")
async def refresh(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Токен не предоставлен")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Недействительный refresh token")
    user_id = int(payload["sub"])
    token_hash = hash_refresh_token(credentials.credentials)
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token_hash == token_hash,
            Session.expires_at > datetime.utcnow(),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Сессия истекла")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    result_uc = await db.execute(
        select(UserCompany).where(UserCompany.user_id == user.id).limit(1)
    )
    uc = result_uc.scalar_one_or_none()
    company_id = uc.company_id if uc else None
    role = uc.role.value if uc else user.role.value
    access = create_access_token(user.id, role, company_id)
    new_refresh = create_refresh_token(user.id)
    session.refresh_token_hash = hash_refresh_token(new_refresh)
    session.expires_at = datetime.utcnow() + timedelta(
        days=get_settings().refresh_token_expire_days
    )
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=get_settings().access_token_expire_minutes * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Выход (отзыв refresh-сессии)")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    """Отзывает текущую refresh-сессию. Передайте refresh_token в Bearer. После вызова токен невалиден."""
    if not credentials:
        return
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "refresh":
        return
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        return
    token_hash = hash_refresh_token(credentials.credentials)
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token_hash == token_hash,
        )
    )
    session = result.scalar_one_or_none()
    if session:
        await db.delete(session)
        await db.commit()
    return


@router.get("/me", response_model=UserResponse, summary="Профиль текущего пользователя")
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not credentials:
            raise HTTPException(status_code=401, detail="Требуется авторизация")
        payload = decode_token(credentials.credentials)
        if not payload or payload.get("type") == "refresh":
            raise HTTPException(status_code=401, detail="Недействительный токен")
        try:
            user_id = int(payload["sub"])
        except (ValueError, TypeError, KeyError):
            raise HTTPException(status_code=401, detail="Недействительный токен")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        await db.refresh(user)
        company_id = payload.get("company_id")
        company_name = None
        cid = None
        row = None
        try:
            result_uc = await db.execute(
                select(UserCompany, Company).join(Company, UserCompany.company_id == Company.id).where(
                    UserCompany.user_id == user.id
                ).limit(1)
            )
            row = result_uc.first()
            company_type_val = None
            if row:
                company_name = str(row[1].name) if row[1] and getattr(row[1], "name", None) else None
                cid = int(row[0].company_id) if row[0] else None
                company_type_val = getattr(row[1], "company_type", None) if row[1] else None
        except Exception as e:
            logger.warning("auth/me company fetch failed for user_id=%s: %s", user_id, e)
        try:
            if company_id is not None and company_id:
                cid = int(company_id)
        except (ValueError, TypeError):
            pass
        try:
            perms = await get_user_permissions(user, cid, db)
            perms = dict(perms) if perms else {}
        except Exception as e:
            logger.exception("get_user_permissions failed for user_id=%s: %s", user_id, e)
            perms = {"can_delete_entities": False, "can_delete_documents": False}
        has_avatar = bool(getattr(user, "avatar_url", None))
        role_val = payload.get("role")
        if not isinstance(role_val, str):
            try:
                role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
            except Exception:
                role_val = "user"
        return UserResponse(
            id=int(user.id),
            email=str(user.email or ""),
            full_name=str(user.full_name or ""),
            role=str(role_val),
            company_id=cid,
            company_name=company_name,
            company_type=company_type_val,
            avatar_url="/api/cabinet/avatar" if has_avatar else None,
            permissions=perms,
            impersonated=bool(payload.get("impersonated")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("auth/me failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    if data.full_name is not None:
        user.full_name = data.full_name
    await db.commit()
    await db.refresh(user)
    cid = payload.get("company_id")
    result_uc = await db.execute(
        select(UserCompany, Company)
        .join(Company, UserCompany.company_id == Company.id)
        .where(UserCompany.user_id == user.id)
        .limit(1)
    )
    row = result_uc.first()
    company_name = row[1].name if row else None
    company_type_val = getattr(row[1], "company_type", None) if row and row[1] else None
    if not cid and row:
        cid = row[0].company_id
    perms = await get_user_permissions(user, cid, db)
    has_avatar = bool(getattr(user, "avatar_url", None))
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=payload.get("role", user.role.value),
        company_id=cid,
        company_name=company_name,
        company_type=company_type_val,
        avatar_url="/api/cabinet/avatar" if has_avatar else None,
        permissions=perms,
        impersonated=bool(payload.get("impersonated")),
    )


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Запрос восстановления пароля: отправляет письмо со ссылкой."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Всегда возвращаем успех (не раскрываем, зарегистрирован ли email)
    if not user or not user.is_active:
        return {"message": "Если email зарегистрирован, на него отправлена ссылка для сброса пароля"}
    try:
        from app.services.email import send_password_reset_email
        token = create_password_reset_token(user.id, user.email)
        base = get_settings().base_url
        reset_link = f"{base}/reset-password?token={token}"
        await send_password_reset_email(user.email, reset_link)
    except Exception as e:
        logger.warning("Не удалось отправить письмо для сброса пароля: %s", e)
    return {"message": "Если email зарегистрирован, на него отправлена ссылка для сброса пароля"}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Сброс пароля по токену из письма."""
    payload = decode_token(data.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Недействительная или просроченная ссылка")
    try:
        user_id = int(payload["sub"])
        email = payload.get("email") or ""
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=400, detail="Недействительная ссылка")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.email != email or not user.is_active:
        raise HTTPException(status_code=400, detail="Пользователь не найден")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Пароль изменён. Теперь войдите с новым паролем."}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Новый пароль должен быть не менее 8 символов")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Пароль изменён"}
