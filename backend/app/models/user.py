# -*- coding: utf-8 -*-
"""Пользователи, компании, сессии."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class Role(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"  # клиент-админ
    user = "user"  # представитель клиента
    trader = "trader"  # трейдер (zero-stock, поставщики, площадки)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[Role] = mapped_column(
        default=Role.user
    )  # для системных: super_admin
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    # Супер-админ может входить под пользователем
    impersonated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    company_links: Mapped[list["UserCompany"]] = relationship(back_populates="user")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    inn: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    kpp: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    ogrn: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    legal_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_bik: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_corr: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    payment_purpose: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # supplier | customer
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("plans.id"), nullable=True)
    default_markup_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trial_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # для трейдера
    trial_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)   # для трейдера

    user_links: Mapped[list["UserCompany"]] = relationship(back_populates="company")


class UserCompany(Base):
    __tablename__ = "user_companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[Role] = mapped_column(default=Role.user)  # admin или user
    can_impersonate: Mapped[bool] = mapped_column(Boolean, default=False)  # админ входит под юзерами
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="company_links")
    company: Mapped["Company"] = relationship(back_populates="user_links")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    refresh_token_hash: Mapped[str] = mapped_column(String(255), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 max
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
