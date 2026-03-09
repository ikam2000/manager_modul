# -*- coding: utf-8 -*-
"""Per-company OAuth provider credentials (e.g. Shopify app per company)."""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CompanyProviderCredentials(Base):
    __tablename__ = "company_provider_credentials"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    provider: Mapped[str] = mapped_column(String(50))  # shopify, ...
    client_id: Mapped[str] = mapped_column(Text)
    client_secret: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("company_id", "provider", name="uq_company_provider"),)
