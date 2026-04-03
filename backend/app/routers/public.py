# -*- coding: utf-8 -*-
"""Публичные страницы: главная, тарифы, о компании, политика конфиденциальности."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


class LandingFormRequest(BaseModel):
    subject: str
    name: str
    email: str
    phone: str = ""
    company: str = ""
    message: str = ""

    @field_validator("subject", "name", "email")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("Поле обязательно")
        return str(v).strip()

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        v = str(v).strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Некорректный email")
        return v


@router.post("/landing-form")
async def landing_form(data: LandingFormRequest):
    """Приём заявок с лендинга. Отправка на ikam2000@yandex.ru и zero@ikamdocs.ru."""
    from app.services.email import send_landing_form_email

    settings = get_settings()
    recipients = [e.strip() for e in settings.landing_recipients.split(",") if e.strip()]
    if not recipients:
        recipients = ["ikam2000@yandex.ru", "zero@ikamdocs.ru"]

    sent = 0
    for to in recipients:
        ok = await send_landing_form_email(
            to=to,
            subject=data.subject,
            name=data.name,
            email=data.email,
            phone=data.phone or "",
            company=data.company or "",
            message=data.message or "",
        )
        if ok:
            sent += 1

    if sent == 0 and recipients:
        logger.warning("Заявка с лендинга не отправлена (SMTP?)")
        raise HTTPException(status_code=500, detail="Не удалось отправить заявку. Попробуйте позже.")
    return {"ok": True, "message": "Заявка отправлена"}


@router.get("/features")
async def get_features():
    """Флаги возможностей UI (маркетплейсы OAuth, оплата ЮKassa). Без авторизации."""
    settings = get_settings()
    return {
        "marketplace_oauth": settings.feature_marketplace_oauth,
        "yookassa": settings.feature_yookassa,
    }


@router.get("/plans")
async def get_plans():
    """Список тарифов для отображения на лендинге."""
    # В реальности — из БД
    return [
        {
            "id": 1,
            "name": "Старт",
            "price_monthly": 1990,
            "price_yearly": 19900,
            "features": ["5 пользователей", "1 ГБ хранилища", "API"],
            "max_users": 5,
            "max_storage_mb": 1024,
        },
        {
            "id": 2,
            "name": "Бизнес",
            "price_monthly": 4990,
            "price_yearly": 49900,
            "features": ["20 пользователей", "10 ГБ хранилища", "API", "Приоритетная поддержка"],
            "max_users": 20,
            "max_storage_mb": 10240,
        },
        {
            "id": 3,
            "name": "Корпорация",
            "price_monthly": 19990,
            "price_yearly": 199900,
            "features": ["Безлимит пользователей", "100 ГБ", "API", "SLA", "Выделенный менеджер"],
            "max_users": 999,
            "max_storage_mb": 102400,
        },
    ]
