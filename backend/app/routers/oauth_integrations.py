# -*- coding: utf-8 -*-
"""OAuth-подключения к Shopify, Wildberries, Ozon и др."""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import urllib.parse
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_trial_or_subscription, get_user_company_id
from app.models.company_provider_credentials import CompanyProviderCredentials
from app.models.oauth_connection import OAuthConnection
from app.models.user import User
from app.security import encrypt_token

logger = logging.getLogger(__name__)
router = APIRouter()

# Конфиг провайдеров: auth_url_template, token_url_template, scopes, нужен ли shop/extra
OAUTH_PROVIDERS = {
    "shopify": {
        "name": "Shopify",
        "auth_url": "https://{shop}/admin/oauth/authorize",
        "token_url": "https://{shop}/admin/oauth/access_token",
        "scopes": "read_products,read_inventory,write_products",
        "needs_shop": True,
    },
    "wildberries": {
        "name": "Wildberries",
        "auth_url": "https://seller.wildberries.ru/oauth/authorize",
        "token_url": "https://seller.wildberries.ru/oauth/token",
        "scopes": "",
        "needs_shop": False,
        "supports_api_key": True,
    },
    "ozon": {
        "name": "Ozon Seller",
        "auth_url": "https://www.ozon.ru/performance/seller-api/auth",
        "token_url": "https://www.ozon.ru/performance/seller-api/auth/token",
        "scopes": "",
        "needs_shop": False,
        "supports_api_key": True,
    },
}


def _get_provider_config(provider: str) -> dict:
    cfg = OAUTH_PROVIDERS.get(provider)
    if not cfg:
        raise HTTPException(404, f"Провайдер {provider} не найден")
    return cfg


def _get_provider_credentials(provider: str) -> tuple[str, str]:
    s = get_settings()
    if provider == "shopify":
        return s.shopify_client_id or "", s.shopify_client_secret or ""
    if provider == "wildberries":
        return s.wildberries_client_id or "", s.wildberries_client_secret or ""
    if provider == "ozon":
        return s.ozon_client_id or "", s.ozon_client_secret or ""
    return "", ""


async def _get_provider_credentials_for_company(
    provider: str, company_id: int | None, db: AsyncSession
) -> tuple[str, str]:
    """Get credentials: first from company_provider_credentials, then from env settings."""
    if company_id:
        r = await db.execute(
            select(CompanyProviderCredentials).where(
                CompanyProviderCredentials.company_id == company_id,
                CompanyProviderCredentials.provider == provider,
            )
        )
        creds = r.scalar_one_or_none()
        if creds and creds.client_id and creds.client_secret:
            return creds.client_id, creds.client_secret
    return _get_provider_credentials(provider)


def _encode_state(company_id: int) -> str:
    """Подписанный state для защиты от CSRF."""
    payload = {"company_id": company_id, "nonce": secrets.token_urlsafe(16)}
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(
        get_settings().secret_key.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{raw}.{sig}"


def _decode_state(state: str) -> int | None:
    try:
        parts = state.split(".")
        if len(parts) != 2:
            return None
        raw, sig = parts
        pad = 4 - len(raw) % 4
        if pad != 4:
            raw += "=" * pad
        payload = json.loads(base64.urlsafe_b64decode(raw).decode())
        expected = hmac.new(
            get_settings().secret_key.encode(),
            parts[0].encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return int(payload.get("company_id", 0))
    except Exception:
        return None


class ApiKeyConnect(BaseModel):
    client_id: str | None = None
    api_key: str = ""


class OAuthCredentialsBody(BaseModel):
    client_id: str = ""
    client_secret: str = ""


@router.post("/integrations/oauth/{provider}/credentials")
async def save_oauth_credentials(
    provider: str,
    data: OAuthCredentialsBody = Body(...),
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Save Shopify app credentials for the company. Only for provider=shopify."""
    if provider != "shopify":
        raise HTTPException(400, "Сохранение credentials поддерживается только для Shopify")
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(403, "Нет компании")
    client_id = (data.client_id or "").strip()
    client_secret = (data.client_secret or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(400, "Укажите client_id и client_secret")
    existing = (
        await db.execute(
            select(CompanyProviderCredentials).where(
                CompanyProviderCredentials.company_id == company_id,
                CompanyProviderCredentials.provider == provider,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.client_id = client_id
        existing.client_secret = client_secret
        existing.updated_at = datetime.utcnow()
    else:
        creds = CompanyProviderCredentials(
            company_id=company_id,
            provider=provider,
            client_id=client_id,
            client_secret=client_secret,
        )
        db.add(creds)
    await db.commit()
    return {"ok": True, "message": "Учётные данные сохранены"}


@router.get("/integrations/oauth/{provider}/test")
async def test_oauth_connection(
    provider: str,
    shop: str | None = Query(None, description="Для Shopify: store.myshopify.com"),
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Test OAuth connection. Returns {ok: bool, message: str}."""
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(403, "Нет компании")
    if provider == "shopify":
        if not shop:
            return {"ok": False, "message": "Укажите shop (например: mystore.myshopify.com)"}
        shop = shop.strip().lower().replace("https://", "").replace("http://", "").rstrip("/")
        if not shop.endswith(".myshopify.com"):
            shop = f"{shop}.myshopify.com" if "." not in shop else shop
        conn = (
            await db.execute(
                select(OAuthConnection).where(
                    OAuthConnection.company_id == company_id,
                    OAuthConnection.provider == provider,
                    OAuthConnection.store_url == shop,
                )
            )
        ).scalar_one_or_none()
        if conn and conn.access_token:
            try:
                token = conn.get_access_token()
                async with httpx.AsyncClient() as client:
                    r = await client.get(
                        f"https://{shop}/admin/api/2024-01/shop.json",
                        headers={"X-Shopify-Access-Token": token},
                    )
                if r.status_code == 200:
                    return {"ok": True, "message": "Подключение успешно"}
                return {"ok": False, "message": f"Shopify API: {r.status_code}"}
            except Exception as e:
                return {"ok": False, "message": str(e)}
        client_id, _ = await _get_provider_credentials_for_company(provider, company_id, db)
        if client_id:
            return {"ok": False, "message": "Учётные данные настроены. Выполните OAuth-подключение для проверки."}
        return {"ok": False, "message": "Учётные данные не настроены"}
    if provider == "ozon":
        conn = (
            await db.execute(
                select(OAuthConnection).where(
                    OAuthConnection.company_id == company_id,
                    OAuthConnection.provider == provider,
                )
            )
        ).scalar_one_or_none()
        if conn and conn.access_token and conn.store_id:
            try:
                token = conn.get_access_token()
                async with httpx.AsyncClient() as client:
                    r = await client.get(
                        "https://api-seller.ozon.ru/v1/warehouse/list",
                        headers={"Client-Id": conn.store_id, "Api-Key": token},
                    )
                if r.status_code == 200:
                    return {"ok": True, "message": "Подключение успешно"}
                return {"ok": False, "message": f"Ozon API: {r.status_code} {r.text[:100]}"}
            except Exception as e:
                return {"ok": False, "message": str(e)}
        return {"ok": False, "message": "Подключите Ozon (Client-Id и API-ключ)"}
    if provider == "wildberries":
        conn = (
            await db.execute(
                select(OAuthConnection).where(
                    OAuthConnection.company_id == company_id,
                    OAuthConnection.provider == provider,
                )
            )
        ).scalar_one_or_none()
        if conn and conn.access_token:
            try:
                token = conn.get_access_token()
                async with httpx.AsyncClient() as client:
                    r = await client.get(
                        "https://marketplace-api.wildberries.ru/api/v1/supplies",
                        headers={"Authorization": token},
                    )
                if r.status_code in (200, 403):
                    return {"ok": True, "message": "Подключение успешно"}
                return {"ok": False, "message": f"WB API: {r.status_code}"}
            except Exception as e:
                return {"ok": False, "message": str(e)}
        return {"ok": False, "message": "Подключите Wildberries (API-ключ)"}
    return {"ok": False, "message": "Тест не поддерживается"}


@router.post("/integrations/oauth/{provider}/api-key")
async def connect_api_key(
    provider: str,
    data: ApiKeyConnect = Body(...),
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Подключение Ozon/WB по API-ключу (без OAuth). Ozon: client_id + api_key. WB: api_key."""
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(403, "Нет компании")
    if provider not in ("ozon", "wildberries"):
        raise HTTPException(400, "API-ключ поддерживается только для Ozon и Wildberries")
    api_key = (data.api_key or "").strip()
    if not api_key:
        raise HTTPException(400, "Укажите API-ключ")
    if provider == "ozon":
        client_id = (data.client_id or "").strip()
        if not client_id:
            raise HTTPException(400, "Укажите Client-Id Ozon")
    else:
        client_id = ""
    existing = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.company_id == company_id,
                OAuthConnection.provider == provider,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.set_tokens(api_key)
        existing.store_id = client_id or None
        existing.updated_at = datetime.utcnow()
        await db.commit()
    else:
        conn = OAuthConnection(
            company_id=company_id,
            provider=provider,
            access_token=encrypt_token(api_key),
            store_id=client_id or None,
        )
        db.add(conn)
        await db.commit()
    return {"ok": True, "message": "Подключено"}


@router.get("/integrations/oauth/providers")
async def list_oauth_providers(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Список OAuth-провайдеров. configured=True если credentials настроены и можно подключать."""
    s = get_settings()
    base = s.base_url.rstrip("/")
    company_id = await get_user_company_id(user, db)
    items = []
    for key, cfg in OAUTH_PROVIDERS.items():
        client_id, client_secret = _get_provider_credentials(key)
        has_env = bool(client_id and client_secret)
        has_company = False
        if key == "shopify" and company_id:
            creds = (
                await db.execute(
                    select(CompanyProviderCredentials).where(
                        CompanyProviderCredentials.company_id == company_id,
                        CompanyProviderCredentials.provider == key,
                    )
                )
            ).scalar_one_or_none()
            has_company = bool(creds and creds.client_id and creds.client_secret)
        configured = has_env or has_company or cfg.get("supports_api_key", False)
        instr = {
            "shopify": "Создайте приложение в Shopify Partners (partners.shopify.com) → App setup → Client ID и Client secret. Укажите Redirect URL: {base}/api/cabinet/integrations/oauth/shopify/callback",
            "wildberries": "Личный кабинет WB → Настройки → Доступ к API → Сгенерировать токен (Stat API или Content API). Вставьте ключ в поле API-ключ.",
            "ozon": "Настройки продавца Ozon → Seller API → Ключи API. Client-Id и Api-Key — вставьте в поля ниже.",
        }.get(key, "")
        items.append({
            "id": key,
            "name": cfg["name"],
            "needs_shop": cfg.get("needs_shop", False),
            "help_slug": key,
            "configured": configured,
            "supports_api_key": cfg.get("supports_api_key", False),
            "supports_credentials_form": key == "shopify",
            "instructions": instr.format(base=s.base_url.rstrip("/")) if instr else "",
        })
    return {"providers": items, "callback_base": f"{base}/api/cabinet/integrations/oauth"}


@router.get("/integrations/oauth")
async def list_oauth_connections(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Список OAuth-подключений компании."""
    company_id = await get_user_company_id(user, db)
    if not company_id:
        return {"connections": []}
    r = await db.execute(
        select(OAuthConnection)
        .where(OAuthConnection.company_id == company_id)
        .order_by(OAuthConnection.updated_at.desc())
    )
    conns = r.scalars().all()
    return {
        "connections": [
            {
                "provider": c.provider,
                "store_url": c.store_url,
                "store_id": c.store_id,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in conns
        ]
    }


@router.get("/integrations/oauth/{provider}/init")
async def oauth_init(
    provider: str,
    shop: str | None = Query(None, description="Для Shopify: store.myshopify.com"),
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Начать OAuth. Возвращает redirect_url для перехода.
    Для Shopify обязателен shop=store.myshopify.com.
    """
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(400, "Нет компании")
    cfg = _get_provider_config(provider)
    client_id, _ = await _get_provider_credentials_for_company(provider, company_id, db)
    if not client_id:
        raise HTTPException(503, f"Провайдер {provider} не настроен")
    base = get_settings().base_url.rstrip("/")
    callback_url = f"{base}/api/cabinet/integrations/oauth/{provider}/callback"
    state = _encode_state(company_id)
    if provider == "shopify":
        if not shop:
            raise HTTPException(400, "Укажите shop (например: mystore.myshopify.com)")
        shop = shop.strip().lower().replace("https://", "").replace("http://", "").rstrip("/")
        if not shop.endswith(".myshopify.com"):
            shop = f"{shop}.myshopify.com" if "." not in shop else shop
        auth_url = cfg["auth_url"].format(shop=shop)
        params = {
            "client_id": client_id,
            "scope": cfg["scopes"],
            "redirect_uri": callback_url,
            "state": state,
        }
    elif provider == "wildberries":
        auth_url = cfg["auth_url"]
        params = {
            "client_id": client_id,
            "redirect_uri": callback_url,
            "state": state,
        }
    elif provider == "ozon":
        auth_url = cfg["auth_url"]
        params = {
            "client_id": client_id,
            "redirect_uri": callback_url,
            "state": state,
        }
    else:
        raise HTTPException(400, f"Провайдер {provider} не поддерживает OAuth init")
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return {"redirect_url": url, "state": state}


@router.get("/integrations/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    shop: str | None = Query(None),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth callback — сюда перенаправляет провайдер после авторизации.
    Публичный endpoint (без Bearer).
    """
    base = get_settings().base_url.rstrip("/")
    redirect_back = f"{base}/cabinet/integrations"
    if error:
        logger.warning("OAuth callback error: %s", error)
        return RedirectResponse(url=f"{redirect_back}?oauth_error={error}")
    if not code or not state:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=missing_params")
    company_id = _decode_state(state)
    if not company_id:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=invalid_state")
    cfg = _get_provider_config(provider)
    client_id, client_secret = await _get_provider_credentials_for_company(provider, company_id, db)
    if not client_id or not client_secret:
        return RedirectResponse(url=f"{redirect_back}?oauth_error=config")
    token_url = cfg["token_url"]
    callback_url = f"{base}/api/cabinet/integrations/oauth/{provider}/callback"
    if provider == "shopify":
        if not shop:
            return RedirectResponse(url=f"{redirect_back}?oauth_error=missing_shop")
        shop = shop.strip().lower()
        token_url = token_url.format(shop=shop)
        async with httpx.AsyncClient() as client:
            r = await client.post(
                token_url,
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                },
            )
        if r.status_code != 200:
            logger.error("Shopify token exchange failed: status=%s", r.status_code)
            return RedirectResponse(url=f"{redirect_back}?oauth_error=token_exchange")
        data = r.json()
        access_token = data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{redirect_back}?oauth_error=no_token")
        # Upsert connection
        existing = (
            await db.execute(
                select(OAuthConnection).where(
                    OAuthConnection.company_id == company_id,
                    OAuthConnection.provider == provider,
                    OAuthConnection.store_url == shop,
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.set_tokens(access_token)
            existing.updated_at = datetime.utcnow()
            await db.commit()
        else:
            conn = OAuthConnection(
                company_id=company_id,
                provider=provider,
                access_token=encrypt_token(access_token),
                store_url=shop,
            )
            db.add(conn)
            await db.commit()
        return RedirectResponse(url=f"{redirect_back}?oauth=shopify&status=connected")
    # Wildberries, Ozon — заглушка, реализовать по их спецификации
    return RedirectResponse(url=f"{redirect_back}?oauth_error=not_implemented")


@router.delete("/integrations/oauth/{provider}")
async def oauth_disconnect(
    provider: str,
    store: str | None = Query(None, description="Для Shopify: store.myshopify.com"),
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Отключить OAuth-подключение."""
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(403, "Нет компании")
    q = select(OAuthConnection).where(
        OAuthConnection.company_id == company_id,
        OAuthConnection.provider == provider,
    )
    if store:
        q = q.where(OAuthConnection.store_url == store.strip().lower())
    r = await db.execute(q)
    conn = r.scalar_one_or_none()
    if conn:
        from app.services.audit import write_audit
        await write_audit(db, company_id=company_id, user_id=user.id, action="delete", entity_type="oauth_connection", entity_id=conn.id, old_value={"provider": provider})
        await db.delete(conn)
        await db.commit()
    return {"ok": True}
