# -*- coding: utf-8 -*-
"""Права пользователей по разделам."""

from sqlalchemy import ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

PERMISSION_KEYS = frozenset({"can_delete_entities", "can_delete_documents"})


class UserCompanyPermissions(Base):
    """Права пользователя в компании (удаление, отключение и т.д.)."""

    __tablename__ = "user_company_permissions"
    __table_args__ = (UniqueConstraint("user_id", "company_id", name="uq_user_company_permissions"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    permissions: Mapped[dict] = mapped_column(JSON, default=dict)
