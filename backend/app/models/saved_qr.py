# -*- coding: utf-8 -*-
"""Сохранённые QR-коды пользователей."""

from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SavedQrCode(Base):
    """QR-код, сгенерированный пользователем и сохранённый для скачивания."""

    __tablename__ = "saved_qr_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int] = mapped_column()
    name: Mapped[str] = mapped_column(String(512))
    qr_url: Mapped[str] = mapped_column(String(1024))
    file_path: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
