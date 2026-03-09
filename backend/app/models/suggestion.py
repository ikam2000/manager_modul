# -*- coding: utf-8 -*-
"""Предложения по улучшению: создание, статусы (получено, на рассмотрении, благодарность)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Suggestion(Base):
    __tablename__ = "suggestions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="received")  # received, considering, thanked, implemented, declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SuggestionUpdate(Base):
    __tablename__ = "suggestion_updates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    suggestion_id: Mapped[int] = mapped_column(ForeignKey("suggestions.id"))
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)  # "Получено", "На рассмотрении", "Благодарим!", и т.д.
    status_before: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    status_after: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
