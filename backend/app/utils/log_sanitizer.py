# -*- coding: utf-8 -*-
"""Маскирование секретов в логах. Защита от утечки токенов, паролей, ключей."""

import re
from typing import Any

# Паттерны для маскирования (не матчим всё подряд, только известные ключи)
_SECRET_KEYS = (
    "password", "secret", "token", "api_key", "apikey", "authorization",
    "bearer", "refresh_token", "access_token", "x-api-key",
    "client_secret", "encryption_key", "secret_key",
)

# Регулярки для значений после ключей (например password=xxx или "password": "xxx")
_PATTERN_KEY_EQUALS = re.compile(
    r"(" + "|".join(_SECRET_KEYS) + r")[\s=:]+[\"']?([^\"'\s,}\]]+)[\"']?",
    re.IGNORECASE,
)

# Bearer xxx или Authorization: Bearer xxx
_PATTERN_BEARER = re.compile(r"(bearer\s+)([a-zA-Z0-9_\-\.]+)", re.IGNORECASE)

# ikam_xxx — формат API-ключей
_PATTERN_API_KEY = re.compile(r"(ikam_)([a-zA-Z0-9_\-]+)")

# Общий placeholder
_MASK = "***"


def mask_secrets(text: str | None) -> str:
    """
    Замаскировать секреты в строке. Строка не None.
    """
    if not text:
        return ""
    out = str(text)
    # Bearer token
    out = _PATTERN_BEARER.sub(r"\g<1>" + _MASK, out)
    # API key ikam_xxx
    out = _PATTERN_API_KEY.sub(r"\g<1>" + _MASK, out)
    # key=value
    out = _PATTERN_KEY_EQUALS.sub(lambda m: m.group(1) + "=" + _MASK, out)
    return out


def mask_dict(d: dict | None, keys_to_mask: tuple[str, ...] | None = None) -> dict:
    """Создать копию словаря с замаскированными значениями для указанных ключей."""
    if d is None:
        return {}
    keys = keys_to_mask or _SECRET_KEYS
    result = {}
    for k, v in d.items():
        if any(kk in k.lower() for kk in keys):
            result[k] = _MASK
        elif isinstance(v, dict):
            result[k] = mask_dict(v, keys)
        else:
            result[k] = v
    return result
