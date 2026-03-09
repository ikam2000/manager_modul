# -*- coding: utf-8 -*-
"""Аналитика: дашборд, отчёты, выгрузка, планирование."""

from datetime import date, datetime, timedelta
from typing import Tuple

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_trial_or_subscription, get_user_company_ids
from app.models.user import User, Role
from app.models.entity import (
    Category,
    SubCategory,
    Nomenclature,
    Supplier,
    Manufacturer,
    Supply,
    Contract,
)
from app.models.document import Document
from app.models.log import AuditLog

router = APIRouter()

PERIOD_PRESETS = {
    "today": (0, 0),
    "yesterday": (-1, -1),
    "last_7_days": (-6, 0),
    "this_week": (0, 0),  # Mon-Sun
    "last_week": (-7, -1),
    "this_month": (0, 0),
    "last_month": (-1, -1),
    "this_year": (0, 0),
    "last_year": (-1, -1),
}


def _period_dates(preset: str | None, date_from: date | None, date_to: date | None) -> Tuple[date, date]:
    """Вернуть (date_from, date_to) по пресету или кастомным датам."""
    today = date.today()
    if date_from and date_to:
        return date_from, date_to
    if preset == "today":
        return today, today
    if preset == "yesterday":
        d = today - timedelta(days=1)
        return d, d
    if preset == "last_7_days":
        return today - timedelta(days=6), today
    if preset == "this_week":
        # Понедельник = 0
        wd = today.weekday()
        start = today - timedelta(days=wd)
        return start, today
    if preset == "last_week":
        wd = today.weekday()
        end = today - timedelta(days=wd + 1)
        start = end - timedelta(days=6)
        return start, end
    if preset == "this_month":
        start = today.replace(day=1)
        return start, today
    if preset == "last_month":
        first = today.replace(day=1)
        end = first - timedelta(days=1)
        start = end.replace(day=1)
        return start, end
    if preset == "this_year":
        start = today.replace(month=1, day=1)
        return start, today
    if preset == "last_year":
        start = today.replace(year=today.year - 1, month=1, day=1)
        end = start.replace(month=12, day=31)
        return start, end
    return today - timedelta(days=30), today


def _prev_period(d_from: date, d_to: date) -> Tuple[date, date]:
    """Предыдущий период той же длины."""
    delta = (d_to - d_from).days + 1
    end_prev = d_from - timedelta(days=1)
    start_prev = end_prev - timedelta(days=delta - 1)
    return start_prev, end_prev


@router.get("/dashboard")
async def analytics_dashboard(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    period_preset: str | None = Query("last_7_days", description="today,yesterday,last_7_days,this_week,last_week,this_month,last_month,this_year,last_year"),
    date_from: str | None = Query(None, description="Начало периода YYYY-MM-DD (переопределяет пресет)"),
    date_to: str | None = Query(None, description="Конец периода YYYY-MM-DD"),
    compare: bool = Query(True, description="Сравнение с предыдущим периодом"),
):
    """Капитанский мостик: сводка, поставки, объёмы, сравнение периодов."""
    company_ids = await get_user_company_ids(user, db)

    d_from_val = date.fromisoformat(date_from) if date_from else None
    d_to_val = date.fromisoformat(date_to) if date_to else None
    d_from, d_to = _period_dates(period_preset, d_from_val, d_to_val)
    dt_from = datetime.combine(d_from, datetime.min.time())
    dt_to = datetime.combine(d_to, datetime.max.time())

    prev_from, prev_to = _prev_period(d_from, d_to)
    dt_prev_from = datetime.combine(prev_from, datetime.min.time())
    dt_prev_to = datetime.combine(prev_to, datetime.max.time())

    def company_filter(q, model, id_col="company_id"):
        if company_ids is None:
            return q
        col = getattr(model, id_col, None)
        if col is not None:
            return q.where(col.in_(company_ids))
        return q

    # Сводка: количество сущностей (без удалённых)
    models = [
        (Category, "categories"),
        (SubCategory, "subcategories"),
        (Nomenclature, "nomenclature", "is_deleted"),
        (Supplier, "suppliers", "is_deleted"),
        (Manufacturer, "manufacturers", "is_deleted"),
        (Supply, "supplies", "is_deleted"),
        (Contract, "contracts", "is_deleted"),
    ]
    summary = {}
    for row in models:
        model, key = row[0], row[1]
        q = select(func.count()).select_from(model)
        if company_ids is not None:
            if hasattr(model, "company_id"):
                q = q.where(model.company_id.in_(company_ids))
            elif model == SubCategory:
                q = q.join(Category, SubCategory.category_id == Category.id).where(Category.company_id.in_(company_ids))
        if len(row) > 2 and hasattr(model, row[2]):
            q = q.where(getattr(model, row[2]) == False)
        total = (await db.execute(q)).scalar() or 0
        summary[key] = total

    # Документы
    doc_q = select(func.count()).select_from(Document)
    if company_ids is not None:
        doc_q = doc_q.where(Document.company_id.in_(company_ids))
    summary["documents"] = (await db.execute(doc_q)).scalar() or 0

    # Поставки по месяцам (SQLite: strftime, PostgreSQL: date_trunc)
    supplies_by_month = []
    try:
        from app.config import get_settings
        is_sqlite = "sqlite" in get_settings().database_url
        if is_sqlite:
            month_expr = func.strftime("%Y-%m", Supply.created_at)
        else:
            month_expr = func.date_trunc("month", Supply.created_at)
        supply_month_q = (
            select(
                month_expr.label("month"),
                func.count(Supply.id).label("count"),
                func.coalesce(func.sum(Supply.quantity), 0).label("total_qty"),
            )
            .where(Supply.is_deleted == False)
        )
        if company_ids is not None:
            supply_month_q = supply_month_q.where(Supply.company_id.in_(company_ids))
        supply_month_q = supply_month_q.group_by(month_expr).order_by(month_expr.desc()).limit(12)
        rows = (await db.execute(supply_month_q)).all()
        supplies_by_month = [
            {"month": str(r.month)[:7] if r.month else "", "count": r.count, "total_qty": float(r.total_qty or 0)}
            for r in reversed(rows)
        ]
    except Exception:
        pass

    # Top поставщиков по количеству поставок (с объёмом товаров)
    top_suppliers_q = (
        select(
            Supplier.id,
            Supplier.name,
            func.count(Supply.id).label("supply_count"),
            func.coalesce(func.sum(Supply.quantity), 0).label("total_qty"),
        )
        .outerjoin(Supply, and_(Supply.supplier_id == Supplier.id, Supply.is_deleted == False))
        .where(Supplier.is_deleted == False)
    )
    if company_ids is not None:
        top_suppliers_q = top_suppliers_q.where(Supplier.company_id.in_(company_ids))
    top_suppliers_q = top_suppliers_q.group_by(Supplier.id, Supplier.name).order_by(func.count(Supply.id).desc()).limit(10)
    top_suppliers = [
        {"id": r.id, "name": r.name, "supply_count": r.supply_count, "total_qty": int(float(r.total_qty or 0))}
        for r in (await db.execute(top_suppliers_q)).all()
    ]

    # Top номенклатуры по поставкам
    top_nomenclature_q = (
        select(
            Nomenclature.id,
            Nomenclature.name,
            func.count(Supply.id).label("supply_count"),
            func.coalesce(func.sum(Supply.quantity), 0).label("total_qty"),
        )
        .outerjoin(Supply, and_(Supply.nomenclature_id == Nomenclature.id, Supply.is_deleted == False))
        .where(Nomenclature.is_deleted == False)
    )
    if company_ids is not None:
        top_nomenclature_q = top_nomenclature_q.where(Nomenclature.company_id.in_(company_ids))
    top_nomenclature_q = top_nomenclature_q.group_by(Nomenclature.id, Nomenclature.name).order_by(func.count(Supply.id).desc()).limit(10)
    top_nomenclature = [
        {"id": r.id, "name": r.name, "supply_count": r.supply_count, "total_qty": int(float(r.total_qty or 0))}
        for r in (await db.execute(top_nomenclature_q)).all()
    ]

    # Документы по типам сущностей
    docs_by_type_q = select(Document.entity_type, func.count(Document.id).label("cnt")).group_by(Document.entity_type)
    if company_ids is not None:
        docs_by_type_q = docs_by_type_q.where(Document.company_id.in_(company_ids))
    docs_by_type = [{"entity_type": r.entity_type, "count": r.cnt} for r in (await db.execute(docs_by_type_q)).all()]

    # Top поставок (последние)
    top_supplies_list = []
    try:
        sup_q = (
            select(Supply.id.label("supply_id"), Nomenclature.name.label("nom_name"))
            .outerjoin(Nomenclature, Supply.nomenclature_id == Nomenclature.id)
            .where(Supply.is_deleted == False)
            .order_by(Supply.created_at.desc())
            .limit(5)
        )
        sup_q = company_filter(sup_q, Supply)
        for r in (await db.execute(sup_q)).all():
            name = r.nom_name if r.nom_name else f"Поставка #{r.supply_id}"
            top_supplies_list.append({"id": r.supply_id, "name": name})
    except Exception:
        pass

    # Top документов (последние)
    top_documents_list = []
    try:
        doc_q = (
            select(Document.id.label("doc_id"), Document.filename.label("doc_filename"))
            .order_by(Document.created_at.desc())
            .limit(5)
        )
        if company_ids is not None:
            doc_q = doc_q.where(Document.company_id.in_(company_ids))
        for r in (await db.execute(doc_q)).all():
            top_documents_list.append({"id": r.doc_id, "name": r.doc_filename or f"Документ #{r.doc_id}"})
    except Exception:
        pass

    # Новые сущности за период
    new_in_period = {}
    for model, key in [(Nomenclature, "nomenclature"), (Category, "categories"), (Supplier, "suppliers"), (Manufacturer, "manufacturers")]:
        q = select(func.count()).select_from(model).where(model.created_at >= dt_from, model.created_at <= dt_to)
        if hasattr(model, "is_deleted"):
            q = q.where(model.is_deleted == False)
        q = company_filter(q, model)
        new_in_period[key] = (await db.execute(q)).scalar() or 0
    # SubCategory — через Category
    sc_q = select(func.count()).select_from(SubCategory).join(Category, SubCategory.category_id == Category.id).where(
        SubCategory.created_at >= dt_from, SubCategory.created_at <= dt_to
    )
    if company_ids is not None:
        sc_q = sc_q.where(Category.company_id.in_(company_ids))
    new_in_period["subcategories"] = (await db.execute(sc_q)).scalar() or 0

    # Поставки за период (кол-во, объём шт)
    supply_period_q = select(
        func.count(Supply.id).label("count"),
        func.coalesce(func.sum(Supply.quantity), 0).label("total_qty"),
    ).where(Supply.is_deleted == False, Supply.created_at >= dt_from, Supply.created_at <= dt_to)
    supply_period_q = company_filter(supply_period_q, Supply)
    sp_row = (await db.execute(supply_period_q)).one_or_none()
    supplies_in_period = {"count": sp_row.count or 0, "total_qty": float(sp_row.total_qty or 0)}

    # Объём в деньгах (quantity * nomenclature.price)
    try:
        vol_q = select(func.coalesce(func.sum(Supply.quantity * func.coalesce(Nomenclature.price, 0)), 0)).select_from(
            Supply.join(Nomenclature, Supply.nomenclature_id == Nomenclature.id)
        ).where(Supply.is_deleted == False, Supply.created_at >= dt_from, Supply.created_at <= dt_to)
        vol_q = company_filter(vol_q, Supply)
        vol = float((await db.execute(vol_q)).scalar() or 0)
    except Exception:
        vol = 0.0
    supplies_in_period["total_money"] = vol

    # Поставки по категориям за период
    supplies_by_category = []
    try:
        cat_q = (
            select(Category.name, func.count(Supply.id).label("cnt"), func.coalesce(func.sum(Supply.quantity), 0).label("qty"))
            .select_from(Supply)
            .join(Nomenclature, Supply.nomenclature_id == Nomenclature.id)
            .join(Category, Nomenclature.category_id == Category.id)
            .where(Supply.is_deleted == False, Supply.created_at >= dt_from, Supply.created_at <= dt_to)
        )
        cat_q = company_filter(cat_q, Supply)
        cat_q = cat_q.group_by(Category.id, Category.name)
        supplies_by_category = [{"name": r.name, "count": r.cnt, "quantity": float(r.qty or 0)} for r in (await db.execute(cat_q)).all()]
    except Exception:
        pass

    # Сравнение с предыдущим периодом
    compare_data = {}
    if compare:
        prev_supply_q = select(
            func.count(Supply.id).label("count"),
            func.coalesce(func.sum(Supply.quantity), 0).label("total_qty"),
        ).where(Supply.is_deleted == False, Supply.created_at >= dt_prev_from, Supply.created_at <= dt_prev_to)
        prev_supply_q = company_filter(prev_supply_q, Supply)
        prev_sp = (await db.execute(prev_supply_q)).one_or_none()
        compare_data["supplies_prev"] = {"count": prev_sp.count or 0, "total_qty": float(prev_sp.total_qty or 0)}
        compare_data["period"] = {"from": d_from.isoformat(), "to": d_to.isoformat(), "prev_from": prev_from.isoformat(), "prev_to": prev_to.isoformat()}

    # Поставки по категориям (всего, для блока «география»)
    supplies_by_category_all = []
    try:
        cat_all_q = (
            select(Category.name, func.count(Supply.id).label("cnt"), func.coalesce(func.sum(Supply.quantity), 0).label("qty"))
            .select_from(Supply)
            .join(Nomenclature, Supply.nomenclature_id == Nomenclature.id)
            .join(Category, Nomenclature.category_id == Category.id)
            .where(Supply.is_deleted == False)
        )
        cat_all_q = company_filter(cat_all_q, Supply)
        cat_all_q = cat_all_q.group_by(Category.id, Category.name)
        supplies_by_category_all = [{"name": r.name, "count": r.cnt, "quantity": int(float(r.qty or 0))} for r in (await db.execute(cat_all_q)).all()]
    except Exception:
        pass

    # Последние события: AuditLog + недавние номенклатура, документы, поставки
    recent_events = []
    events_raw: list[tuple[datetime, str, str, str, str]] = []  # (created_at, sku, change, status, channel)

    # 1. AuditLog
    try:
        audit_q = (
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(20)
        )
        if company_ids is not None:
            audit_q = audit_q.where(AuditLog.company_id.in_(company_ids))
        for row in (await db.execute(audit_q)).scalars().all():
            al = row
            sku = str(al.entity_id)
            change = ""
            status = "OK"
            channel = "Система"
            if al.entity_type == "supplier":
                name = (al.new_value or al.old_value or {}).get("name", f"Поставщик #{al.entity_id}")
                sku = name
                if al.action == "create":
                    change = f"Создан поставщик {name}"
                elif al.action == "update":
                    change = f"Обновлён поставщик {name}"
                elif al.action == "delete":
                    change = f"Удалён поставщик {name}"
                channel = "Поставщики"
            elif al.entity_type == "oauth_connection":
                prov = (al.old_value or {}).get("provider", "unknown")
                change = f"Отключена интеграция {prov}"
                channel = "Интеграции"
            else:
                change = f"{al.action} {al.entity_type} #{al.entity_id}"
            events_raw.append((al.created_at, sku, change, status, channel))
    except Exception:
        pass

    # 2. Недавняя номенклатура
    try:
        nom_q = (
            select(Nomenclature.id, Nomenclature.code, Nomenclature.name, Nomenclature.created_at)
            .where(Nomenclature.is_deleted == False)
            .order_by(Nomenclature.created_at.desc())
            .limit(5)
        )
        nom_q = company_filter(nom_q, Nomenclature)
        for r in (await db.execute(nom_q)).all():
            sku = r.code or r.name or f"NOM-{r.id}"
            events_raw.append((r.created_at, sku, "Добавлена номенклатура", "OK", "Каталог"))
    except Exception:
        pass

    # 3. Недавние документы
    try:
        doc_q = (
            select(Document.id, Document.filename, Document.created_at)
            .order_by(Document.created_at.desc())
            .limit(5)
        )
        if company_ids is not None:
            doc_q = doc_q.where(Document.company_id.in_(company_ids))
        for r in (await db.execute(doc_q)).all():
            sku = r.filename or f"Документ #{r.id}"
            events_raw.append((r.created_at, sku, "Загружен документ", "OK", "Документы"))
    except Exception:
        pass

    # 4. Недавние поставки
    try:
        sup_q = (
            select(Supply.id, Supply.created_at, Nomenclature.code, Nomenclature.name)
            .outerjoin(Nomenclature, Supply.nomenclature_id == Nomenclature.id)
            .where(Supply.is_deleted == False)
            .order_by(Supply.created_at.desc())
            .limit(5)
        )
        sup_q = company_filter(sup_q, Supply)
        for r in (await db.execute(sup_q)).all():
            sku = r.code or r.name or f"Поставка #{r.id}"
            events_raw.append((r.created_at, sku, "Создана поставка", "OK", "Поставки"))
    except Exception:
        pass

    # Сортировка по дате и ограничение
    events_raw.sort(key=lambda x: x[0], reverse=True)
    for created_at, sku, change, status, channel in events_raw[:15]:
        recent_events.append({
            "sku": sku,
            "change": change,
            "status": status,
            "channel": channel,
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        })

    return {
        "summary": summary,
        "supplies_by_month": supplies_by_month,
        "top_suppliers": top_suppliers,
        "top_nomenclature": top_nomenclature,
        "top_supplies": top_supplies_list,
        "top_documents": top_documents_list,
        "documents_by_entity_type": docs_by_type,
        "period": {"from": d_from.isoformat(), "to": d_to.isoformat()},
        "new_in_period": new_in_period,
        "supplies_in_period": supplies_in_period,
        "supplies_by_category": supplies_by_category,
        "supplies_by_category_all": supplies_by_category_all,
        "compare": compare_data,
        "recent_events": recent_events,
    }


@router.get("/audit-log")
async def analytics_audit_log(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Журнал аудита: список записей AuditLog с пагинацией."""
    company_ids = await get_user_company_ids(user, db)
    q = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if company_ids is not None:
        q = q.where(AuditLog.company_id.in_(company_ids))
    rows = (await db.execute(q)).scalars().all()
    count_q = select(func.count()).select_from(AuditLog)
    if company_ids is not None:
        count_q = count_q.where(AuditLog.company_id.in_(company_ids))
    total = (await db.execute(count_q)).scalar() or 0
    items = []
    for al in rows:
        change = ""
        if al.entity_type == "supplier":
            name = (al.new_value or al.old_value or {}).get("name", f"Поставщик #{al.entity_id}")
            if al.action == "create":
                change = f"Создан поставщик {name}"
            elif al.action == "update":
                change = f"Обновлён поставщик {name}"
            elif al.action == "delete":
                change = f"Удалён поставщик {name}"
        elif al.entity_type == "oauth_connection":
            prov = (al.old_value or {}).get("provider", "unknown")
            change = f"Отключена интеграция {prov}"
        else:
            change = f"{al.action} {al.entity_type} #{al.entity_id}"
        items.append({
            "id": al.id,
            "action": al.action,
            "entity_type": al.entity_type,
            "entity_id": al.entity_id,
            "change": change,
            "created_at": al.created_at.isoformat() if al.created_at else None,
        })
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/reports")
async def analytics_reports(
    user: User = Depends(require_trial_or_subscription),
    report_type: str | None = Query(None),
):
    """Список отчётов и выгрузка."""
    return {"reports": []}
