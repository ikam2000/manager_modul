# -*- coding: utf-8 -*-
"""Лог запусков импорта и синхронизаций (домен импорта)."""

from datetime import datetime
from sqlalchemy import ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImportJob(Base):
    """Запись о запуске импорта/синхронизации: для истории и отладки."""

    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    triggered_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
