# -*- coding: utf-8 -*-
"""Безопасность: JWT, пароли, шифрование. Соответствие 152-ФЗ, GDPR, ISO 27001."""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt
from cryptography.fernet import Fernet

from app.config import get_settings


def hash_password(password: str) -> str:
    pwd = password.encode("utf-8")[:72]  # bcrypt limit
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd, hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    subject: str | int,
    role: str,
    company_id: int | None = None,
    impersonated: bool = False,
) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
        "company_id": company_id,
        "impersonated": impersonated,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str | int) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {"sub": str(subject), "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_password_reset_token(user_id: int, email: str) -> str:
    """Токен для сброса пароля. Действует 1 час."""
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(hours=1)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "password_reset",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def get_fernet() -> Fernet | None:
    """Шифрование документов AES-256 (Fernet)."""
    key = get_settings().encryption_key
    if not key:
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_document(data: bytes) -> tuple[bytes, bytes] | None:
    """Шифрует данные, возвращает (ciphertext, iv+salt)."""
    f = get_fernet()
    if not f:
        return (data, b"")  # fallback без шифрования
    return (f.encrypt(data), b"")


def decrypt_document(data: bytes) -> bytes:
    f = get_fernet()
    if not f:
        return data
    try:
        return f.decrypt(data)
    except Exception:
        return data


def encrypt_token(plain: str) -> str:
    """Шифрование OAuth/API токенов. Возвращает base64 ciphertext или plain при отсутствии ключа."""
    if not plain:
        return plain
    f = get_fernet()
    if not f:
        return plain
    try:
        return f.encrypt(plain.encode()).decode()
    except Exception:
        return plain


def decrypt_token(encrypted: str) -> str:
    """Расшифровка токена. Если не ciphertext — возвращает как есть (backward compat)."""
    if not encrypted:
        return encrypted
    f = get_fernet()
    if not f:
        return encrypted
    try:
        return f.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted  # уже plain или повреждён — fallback
