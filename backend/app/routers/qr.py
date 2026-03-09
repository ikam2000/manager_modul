# -*- coding: utf-8 -*-
"""QR-коды: генерация, страницы сущностей, конструктор этикеток."""

import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_trial_or_subscription, get_user_company_ids
from app.models.user import User
from app.models.entity import (
    Category,
    SubCategory,
    Supplier,
    Manufacturer,
    Nomenclature,
    Supply,
    Contract,
    ContractAppendix,
)
from app.models.document import Document

router = APIRouter()

ENTITY_TYPES = {
    "category": ("categories", Category),
    "subcategory": ("subcategories", SubCategory),
    "supplier": ("suppliers", Supplier),
    "manufacturer": ("manufacturers", Manufacturer),
    "nomenclature": ("nomenclature", Nomenclature),
    "supply": ("supplies", Supply),
    "contract": ("contracts", Contract),
    "contract_appendix": ("contract_appendices", ContractAppendix),
}


def _serialize_entity(entity, entity_type: str) -> dict:
    """Преобразовать ORM-объект в словарь для JSON."""
    d = {}
    for c in entity.__table__.columns:
        if c.name in ("is_deleted",):
            continue
        v = getattr(entity, c.name)
        if isinstance(v, (datetime, date)):
            d[c.name] = v.isoformat() if v else None
        else:
            d[c.name] = v
    return d


async def _fetch_entity_data(
    entity_type: str, entity_id: int, db: AsyncSession, company_ids: list[int] | None
) -> dict:
    """Получить данные сущности для JSON/HTML. company_ids=None для super_admin."""
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(404, f"Неизвестный тип сущности: {entity_type}")
    _, model = ENTITY_TYPES[entity_type]
    q = select(model).where(model.id == entity_id)
    if hasattr(model, "is_deleted"):
        q = q.where(model.is_deleted == False)
    if hasattr(model, "company_id") and company_ids is not None:
        q = q.where(model.company_id.in_(company_ids))
    result = await db.execute(q)
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(404, "Сущность не найдена")
    data = _serialize_entity(entity, entity_type)
    related = {}
    supplies_data = []

    if entity_type == "category":
        subcats_r = await db.execute(
            select(SubCategory).where(SubCategory.category_id == entity_id).order_by(SubCategory.name)
        )
        subcats = subcats_r.scalars().all()
        subcats_data = []
        for sc in subcats:
            noms_r = await db.execute(
                select(Nomenclature).where(
                    Nomenclature.subcategory_id == sc.id, Nomenclature.is_deleted == False
                ).order_by(Nomenclature.name)
            )
            noms = noms_r.scalars().all()
            subcats_data.append({
                "id": sc.id,
                "name": sc.name,
                "nomenclature": [{"id": n.id, "name": n.name, "code": n.code} for n in noms],
            })
        related["subcategories"] = subcats_data

    if entity_type == "subcategory":
        noms_r = await db.execute(
            select(Nomenclature).where(
                Nomenclature.subcategory_id == entity_id, Nomenclature.is_deleted == False
            ).order_by(Nomenclature.name)
        )
        noms = noms_r.scalars().all()
        related["nomenclature"] = [{"id": n.id, "name": n.name, "code": n.code} for n in noms]

    # Производитель для номенклатуры
    if entity_type == "nomenclature" and hasattr(entity, "manufacturer_id") and entity.manufacturer_id:
        r = await db.execute(select(Manufacturer).where(Manufacturer.id == entity.manufacturer_id))
        m = r.scalar_one_or_none()
        if m:
            related["manufacturer"] = {"id": m.id, "name": m.name, "address": m.address}

    # Поставки, поставщики, договоры для номенклатуры
    supplies_data = []
    if entity_type == "nomenclature":
        supplies_r = await db.execute(
            select(Supply, Supplier)
            .outerjoin(Supplier, Supply.supplier_id == Supplier.id)
            .where(Supply.nomenclature_id == entity_id, Supply.is_deleted == False)
            .order_by(Supply.created_at.desc())
        )
        for sup, supplier in supplies_r.all():
            contract = None
            if supplier:
                c_r = await db.execute(
                    select(Contract)
                    .where(Contract.supplier_id == supplier.id, Contract.is_deleted == False)
                    .limit(1)
                )
                contract = c_r.scalar_one_or_none()
            srow = {
                "id": sup.id,
                "quantity": sup.quantity,
                "production_date": sup.production_date.isoformat() if sup.production_date else None,
                "calibration_date": sup.calibration_date.isoformat() if sup.calibration_date else None,
                "supplier": {"id": supplier.id, "name": supplier.name, "phone": supplier.phone, "address": supplier.address} if supplier else None,
                "contract": {"id": contract.id, "number": contract.number, "date_start": contract.date_start.isoformat() if contract and contract.date_start else None, "date_end": contract.date_end.isoformat() if contract and contract.date_end else None} if contract else None,
            }
            supplies_data.append(srow)
        related["supplies"] = supplies_data

    entity_ids_to_fetch = [(entity_type, entity_id)]
    if entity_type == "nomenclature" and supplies_data:
        for srow in supplies_data:
            entity_ids_to_fetch.append(("supply", srow["id"]))
    if entity_type == "supply":
        if entity.supplier_id:
            r = await db.execute(select(Supplier).where(Supplier.id == entity.supplier_id))
            s = r.scalar_one_or_none()
            if s:
                related["supplier"] = {"id": s.id, "name": s.name, "phone": s.phone, "address": s.address}
                entity_ids_to_fetch.append(("supplier", entity.supplier_id))
        if entity.nomenclature_id:
            r = await db.execute(select(Nomenclature).where(Nomenclature.id == entity.nomenclature_id))
            n = r.scalar_one_or_none()
            if n:
                related["nomenclature"] = {"id": n.id, "name": n.name, "code": n.code}
                entity_ids_to_fetch.append(("nomenclature", entity.nomenclature_id))

    if entity_type == "contract" and entity.supplier_id:
        r = await db.execute(select(Supplier).where(Supplier.id == entity.supplier_id))
        s = r.scalar_one_or_none()
        if s:
            related["supplier"] = {"id": s.id, "name": s.name}

    doc_conditions = [
        (Document.entity_type == et) & (Document.entity_id == eid)
        for et, eid in entity_ids_to_fetch
    ]
    docs_q = select(Document).where(or_(*doc_conditions))
    if company_ids is not None:
        docs_q = docs_q.where(Document.company_id.in_(company_ids))
    docs_r = await db.execute(docs_q)
    documents = [
        {
            "id": d.id,
            "filename": d.filename,
            "mime_type": d.mime_type,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "entity_type": d.entity_type,
            "entity_id": d.entity_id,
        }
        for d in docs_r.scalars().all()
    ]
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "data": data,
        "related": related,
        "documents": documents,
    }


@router.get("/entity/{entity_type}/by-code/{code}")
async def qr_entity_by_code(
    entity_type: str,
    code: str,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Получить сущность по коду (для QR по коду номенклатуры)."""
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and not company_ids:
        raise HTTPException(403, "Нет доступа к компании")
    if entity_type not in ("nomenclature", "supply"):
        raise HTTPException(404, "Поиск по коду только для номенклатуры")
    if entity_type == "nomenclature":
        q = select(Nomenclature).where(
            Nomenclature.code == code,
            Nomenclature.is_deleted == False,
        )
        if company_ids is not None:
            q = q.where(Nomenclature.company_id.in_(company_ids))
        result = await db.execute(q.limit(1))
        entity = result.scalar_one_or_none()
    else:
        entity = None
    if not entity:
        raise HTTPException(404, "Сущность не найдена")
    data = await _fetch_entity_data(entity_type, entity.id, db, company_ids)
    body = json.dumps(data, ensure_ascii=False)
    return Response(content=body, media_type="application/json; charset=utf-8")


@router.get("/entity/{entity_type}/{entity_id}")
async def qr_entity_json(
    entity_type: str,
    entity_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """JSON-данные сущности для SPA."""
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and not company_ids:
        raise HTTPException(403, "Нет доступа к компании")
    data = await _fetch_entity_data(entity_type, entity_id, db, company_ids)
    body = json.dumps(data, ensure_ascii=False)
    return Response(content=body, media_type="application/json; charset=utf-8")


def _build_qr_html_page(data: dict) -> HTMLResponse:
    """Собрать HTML-страницу с данными сущности."""
    from html import escape
    t = data.get("entity_type", "")
    d = data.get("data", {})
    rel = data.get("related", {})
    docs = data.get("documents", [])
    base = data.get("entity_id", 0)
    entity_id = data.get("entity_id", 0)

    def esc(s):
        return escape(str(s)) if s is not None and s != "" else "—"

    rows = []
    for k, v in d.items():
        if k in ("id", "company_id", "is_deleted"):
            continue
        if v is None or v == "":
            continue
        label = k.replace("_", " ")
        rows.append(f'<tr><td style="color:#888;padding:6px 12px">{label}</td><td style="padding:6px 12px">{esc(v)}</td></tr>')

    supplies_html = ""
    if "supplies" in rel and rel["supplies"]:
        for s in rel["supplies"]:
            sp = s.get("supplier") or {}
            c = s.get("contract") or {}
            phone_part = f" ({esc(sp.get('phone'))})" if sp.get("phone") else ""
            supplies_html += f"""
            <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px">
              <strong>Поставка #{s.get('id','')}</strong> — кол-во: {esc(s.get('quantity'))}
              <br>Дата изготовления: {esc(s.get('production_date'))} | Поверка: {esc(s.get('calibration_date'))}
              <br>Поставщик: {esc(sp.get('name'))}{phone_part}
              <br>Договор: {esc(c.get('number'))} ({esc(c.get('date_start'))} — {esc(c.get('date_end'))})
            </div>"""

    related_html = ""
    for k, v in rel.items():
        if k == "supplies":
            continue
        if isinstance(v, dict):
            vid = v.get("id")
            if vid:
                vlabel = esc(v.get("name") or v.get("code") or v.get("number"))
                related_html += f'<a href="/qr/view/{k}/{vid}" style="display:inline-block;margin:4px;padding:8px 12px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none">{vlabel}</a>'

    docs_html = ""
    for doc in docs:
        url = f"/documents/public/{doc['id']}?entity_type={t}&entity_id={entity_id}"
        docs_html += f'''
        <a href="{url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.05);border-radius:8px;color:#fff;text-decoration:none;margin-bottom:8px">
          <span>📄</span> {esc(doc.get('filename'))}
          <span style="margin-left:auto">⬇ Скачать</span>
        </a>'''

    title = esc(d.get("name") or d.get("number") or d.get("code") or f"#{entity_id}")
    type_labels = {"nomenclature":"Номенклатура","supplier":"Поставщик","manufacturer":"Производитель","supply":"Поставка","contract":"Договор","category":"Категория","subcategory":"Подкатегория"}
    type_label = type_labels.get(t, t)

    sections = []
    sections.append(f'<table>{"".join(rows)}</table>')
    if supplies_html:
        sections.append(f'<h3 style="margin-top:20px;font-size:0.9rem">Поставки</h3>{supplies_html}')
    if related_html:
        sections.append(f'<h3 style="margin-top:20px;font-size:0.9rem">Связанные</h3><div style="margin-top:8px">{related_html}</div>')

    html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title} — ikamdocs</title>
  <style>
    *{{box-sizing:border-box}}
    body{{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#0f172a;color:#e2e8f0;min-height:100vh}}
    h1{{font-size:1.25rem;margin:0 0 16px}}
    table{{width:100%;border-collapse:collapse}}
    .card{{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:20px}}
    .badge{{font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">{type_label}</div>
    <h1>{title}</h1>
    {"".join(sections)}
  </div>
  {f'<div class="card"><h3 style="margin:0 0 12px">📎 Документы</h3>{docs_html}</div>' if docs_html else ''}
  <p style="font-size:0.75rem;color:#64748b;margin-top:24px">ikamdocs © 2026</p>
</body>
</html>'''
    return HTMLResponse(html)


@router.get("/view/{entity_type}/{entity_id}", response_class=HTMLResponse)
async def qr_entity_html(
    entity_type: str,
    entity_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """HTML-страница сущности (при сканировании QR на API)."""
    company_ids = await get_user_company_ids(user, db)
    if company_ids is not None and not company_ids:
        raise HTTPException(403, "Нет доступа к компании")
    data = await _fetch_entity_data(entity_type, entity_id, db, company_ids)
    return _build_qr_html_page(data)


@router.get("/print/layouts")
async def qr_print_layouts(
    user: User = Depends(require_trial_or_subscription),
):
    """Конструктор этикеток: шаблоны, размеры листа."""
    return {
        "paper_sizes": ["A4", "A5", "A6", "100x50", "50x30"],
        "entities": list(ENTITY_TYPES.keys()),
    }
