# -*- coding: utf-8 -*-
"""Тарифы, подписки, счета."""

from __future__ import annotations

from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    price_monthly: Mapped[int] = mapped_column(Integer, default=0)  # копейки
    price_yearly: Mapped[int] = mapped_column(Integer, default=0)
    features: Mapped[str | None] = mapped_column(String(1024), nullable=True)  # JSON или текст
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    max_storage_mb: Mapped[int] = mapped_column(Integer, default=1024)
    max_nomenclature: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_suppliers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_nomenclature_per_supplier: Mapped[int | None] = mapped_column(Integer, nullable=True)  # для трейдера: макс. товаров по одному поставщику
    max_manufacturers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_customers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    plan_type: Mapped[str | None] = mapped_column(String(20), nullable=True, default="standard")  # standard | trader
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, cancelled, trial
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    yookassa_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"))
    amount: Mapped[int] = mapped_column(Integer)  # копейки
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, sent, paid
    invoice_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
