# -*- coding: utf-8 -*-
"""Лог синхронизаций по API поставщиков (домен импорта). Дополняет import_jobs."""

from datetime import datetime
from sqlalchemy import ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SyncLog(Base):
    """Запись о синхронизации данных с API поставщика."""

    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    sync_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    rows_created: Mapped[int] = mapped_column(Integer, default=0)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0)
    rows_failed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)
