# -*- coding: utf-8 -*-
"""OAuth-подключения к внешним сервисам (Shopify, Wildberries, Ozon и др.). Токены шифруются при хранении."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.security import decrypt_token, encrypt_token


class OAuthConnection(Base):
    __tablename__ = "oauth_connections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    provider: Mapped[str] = mapped_column(String(50))  # shopify, wildberries, ozon, ...
    access_token: Mapped[str] = mapped_column(Text)  # хранится зашифрованно при encryption_key
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # зашифрованно
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    store_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # Shopify: myshop.myshopify.com
    store_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # WB/Ozon: ID магазина
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # доп. данные JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_access_token(self) -> str:
        """Расшифрованный access_token (при encryption_key)."""
        return decrypt_token(self.access_token)

    def get_refresh_token(self) -> str | None:
        """Расшифрованный refresh_token."""
        return decrypt_token(self.refresh_token) if self.refresh_token else None

    def set_tokens(self, access_token: str, refresh_token: str | None = None) -> None:
        """Установить токены с шифрованием перед сохранением."""
        self.access_token = encrypt_token(access_token)
        if refresh_token is not None:
            self.refresh_token = encrypt_token(refresh_token)
