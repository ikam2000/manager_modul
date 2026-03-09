# -*- coding: utf-8 -*-
"""Webhooks для push-уведомлений при изменениях сущностей."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(String(512))  # endpoint для POST
    events: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # ["nomenclature.created", "supply.updated", ...]
    secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # для HMAC подписи
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
