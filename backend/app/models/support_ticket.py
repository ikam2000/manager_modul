# -*- coding: utf-8 -*-
"""Тикеты поддержки: создание, ответы, история."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="open")  # open, in_progress, resolved, closed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TicketReply(Base):
    __tablename__ = "ticket_replies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id"))
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)  # None = системное
    body: Mapped[str] = mapped_column(Text)
    is_staff: Mapped[bool] = mapped_column(default=False)  # ответ от поддержки
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
