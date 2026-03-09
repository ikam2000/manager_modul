# -*- coding: utf-8 -*-
"""Вложения к тикетам и предложениям (до 10 МБ)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TicketAttachment(Base):
    """Файл, прикреплённый к тикету или ответу."""

    __tablename__ = "ticket_attachments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id"))
    reply_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ticket_replies.id"), nullable=True)
    storage_path: Mapped[str] = mapped_column(String(512))
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SuggestionAttachment(Base):
    """Файл, прикреплённый к предложению или обновлению."""

    __tablename__ = "suggestion_attachments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    suggestion_id: Mapped[int] = mapped_column(ForeignKey("suggestions.id"))
    update_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suggestion_updates.id"), nullable=True)
    storage_path: Mapped[str] = mapped_column(String(512))
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
