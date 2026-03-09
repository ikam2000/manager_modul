# -*- coding: utf-8 -*-
"""Документы: загрузка, шифрование, векторизация."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


# Полиморфная связь — document может быть привязан к разным сущностям
ENTITY_TYPES = [
    "nomenclature",
    "supply",
    "supplier",
    "manufacturer",
    "contract",
    "contract_appendix",
]


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    entity_type: Mapped[str] = mapped_column(String(50))  # nomenclature, supply, ...
    entity_id: Mapped[int] = mapped_column()
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    storage_path: Mapped[str] = mapped_column(String(512))  # зашифрованный на диске
    file_size: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class DocumentVector(Base):
    """Векторное представление для семантического поиска (pgvector)."""

    __tablename__ = "document_vectors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"))
    # embedding: vector(1536) — добавляется через raw SQL / alembic
    chunk_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
