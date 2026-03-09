# -*- coding: utf-8 -*-
"""Сервис журнала аудита. Логирование критичных действий."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log import AuditLog


async def write_audit(
    db: AsyncSession,
    *,
    company_id: int | None,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    """Записать запись в audit_log. action: create, update, delete, restore."""
    log = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(log)
