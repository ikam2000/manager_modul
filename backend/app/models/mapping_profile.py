# -*- coding: utf-8 -*-
"""Профиль маппинга колонок (домен импорта). Сохраняет настройки для повторного использования."""

from datetime import datetime
from sqlalchemy import ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MappingProfile(Base):
    """Сохранённый профиль маппинга колонок Excel/Word при импорте."""

    __tablename__ = "mapping_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    profile_type: Mapped[str] = mapped_column(Text, nullable=False, default="nomenclature", index=True)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
