# -*- coding: utf-8 -*-
"""Платежи: ЮKassa (карта, СБП), выставление счёта для юрлиц."""

from datetime import datetime, date, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_trial_or_subscription, get_user_company_id
from app.models.user import User, UserCompany, Company
from app.rate_limit import limiter
from app.models.subscription import Plan, Subscription, Invoice

router = APIRouter()


def _seller_requisites(settings) -> dict:
    """Реквизиты продавца (ИП Каменев) для счёта."""
    return {
        "name": settings.invoice_seller_name,
        "address": settings.invoice_seller_address,
        "inn": settings.invoice_seller_inn,
        "ogrn": settings.invoice_seller_ogrn,
        "bank_account": settings.invoice_seller_bank_account,
        "bank_name": settings.invoice_seller_bank_name,
        "bank_inn": settings.invoice_seller_bank_inn,
        "bank_bik": settings.invoice_seller_bank_bik,
        "bank_corr": settings.invoice_seller_bank_corr,
        "bank_address": settings.invoice_seller_bank_address,
    }


@router.get("/plans")
async def list_plans(
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Список тарифов. Для трейдера — только планы plan_type='trader'."""
    from app.models.user import Company
    company_id = await get_user_company_id(user, db)
    is_trader = False
    if company_id:
        c = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
        is_trader = c and getattr(c, "company_type", None) == "trader"
    q = select(Plan).where(Plan.is_active == True)
    if is_trader:
        q = q.where(Plan.plan_type == "trader")
    else:
        q = q.where(or_(Plan.plan_type.is_(None), Plan.plan_type != "trader"))
    q = q.order_by(Plan.price_monthly)
    result = await db.execute(q)
    plans = result.scalars().all()
    return {
        "plans": [
            {
                "id": p.id,
                "name": p.name,
                "price_monthly": p.price_monthly,
                "price_yearly": p.price_yearly,
                "max_users": p.max_users,
                "max_storage_mb": p.max_storage_mb,
                "max_nomenclature": getattr(p, "max_nomenclature", None),
                "max_suppliers": getattr(p, "max_suppliers", None),
                "max_nomenclature_per_supplier": getattr(p, "max_nomenclature_per_supplier", None),
                "plan_type": getattr(p, "plan_type", None),
                "features": p.features,
                "limits_note": (
                    f"До {getattr(p, 'max_suppliers', 3)} поставщиков, до {getattr(p, 'max_nomenclature_per_supplier', 50)} товаров по каждому поставщику. Остальной функционал без ограничений."
                    if getattr(p, "plan_type", None) == "trader" else None
                ),
            }
            for p in plans
        ]
    }


class CreatePaymentRequest(BaseModel):
    plan_id: int
    period: str = "monthly"  # monthly | yearly
    return_success_url: str | None = None
    return_cancel_url: str | None = None


@router.post("/create")
async def create_payment(
    data: CreatePaymentRequest,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Создание платежа через ЮKassa (карта, СБП)."""
    settings = get_settings()
    if not settings.yookassa_shop_id or not settings.yookassa_secret_key:
        raise HTTPException(status_code=503, detail="Платежи временно недоступны")
    plan = await db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(404, "Тариф не найден")
    amount = plan.price_yearly if data.period == "yearly" else plan.price_monthly
    if amount <= 0:
        raise HTTPException(400, "Тариф бесплатный")
    company_id = await get_user_company_id(user, db)
    if not company_id:
        raise HTTPException(400, "Привяжитесь к компании")
    return_url = data.return_success_url or settings.yookassa_return_url
    amount_rub = f"{amount / 100:.2f}"
    desc = f"Подписка {plan.name} ({data.period})"
    try:
        from yookassa import Payment, Configuration
        Configuration.configure(settings.yookassa_shop_id.strip(), settings.yookassa_secret_key.strip())
        payload = {
            "amount": {"value": amount_rub, "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": return_url.strip(),
            },
            "capture": True,
            "description": desc,
            "metadata": {
                "company_id": str(company_id),
                "plan_id": str(plan.id),
                "period": str(data.period),
                "user_id": str(user.id),
            },
        }
        # Чек 54-ФЗ — обязателен для ЮKassa
        user_email = getattr(user, "email", None) or "noreply@ikamdocs.ru"
        payload["receipt"] = {
            "customer": {"email": user_email},
            "items": [
                {
                    "description": desc[:128],
                    "quantity": 1.0,
                    "amount": {"value": amount_rub, "currency": "RUB"},
                    "vat_code": 1,
                    "payment_mode": "full_prepayment",
                    "payment_subject": "service",
                }
            ],
        }
        payment = Payment.create(payload)
        pid = payment.id
        confirmation_url = payment.confirmation.confirmation_url if payment.confirmation else ""
        inv = Invoice(
            company_id=company_id,
            plan_id=plan.id,
            amount=amount,
            status="pending",
            invoice_number=pid,
        )
        db.add(inv)
        await db.commit()
        return {"status": "pending", "confirmation_url": confirmation_url, "payment_id": pid}
    except ImportError:
        raise HTTPException(503, "Модуль yookassa не установлен")
    except Exception as e:
        detail = str(e)
        if hasattr(e, "response") and hasattr(e.response, "text") and e.response.text:
            try:
                import json
                err_body = json.loads(e.response.text)
                if isinstance(err_body, dict) and err_body.get("description"):
                    detail = err_body["description"]
                elif isinstance(err_body, dict) and err_body.get("message"):
                    detail = err_body["message"]
            except Exception:
                detail = e.response.text[:500] if len(e.response.text) > 500 else e.response.text
        raise HTTPException(502 if "400" in detail or "401" in detail else 500, detail)


@router.get("/return")
async def payment_return(request: Request):
    """Страница после успешной оплаты."""
    return {"message": "Оплата прошла успешно", "params": dict(request.query_params)}


# IP ЮKassa для верификации webhook (официальный whitelist)
YOOKASSA_WEBHOOK_NETWORKS = [
    "77.75.156.35/32",
    "77.75.156.11/32",
    "77.75.154.128/25",
    "77.75.153.0/25",
    "185.71.77.0/27",
    "185.71.76.0/27",
]


def _is_yookassa_ip(client_host: str | None, x_forwarded: str | None) -> bool:
    """Проверка, что запрос от IP ЮKassa."""
    ip_str = (x_forwarded or "").split(",")[0].strip() if x_forwarded else (client_host or "")
    if not ip_str:
        return False
    try:
        import ipaddress
        ip_obj = ipaddress.ip_address(ip_str.split("%")[0])  # strip ipv6 zone
        for net_str in YOOKASSA_WEBHOOK_NETWORKS:
            if ip_obj in ipaddress.ip_network(net_str):
                return True
    except ValueError:
        pass
    return False


@router.post("/webhook")
@limiter.limit("100/minute")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Вебхук от ЮKassa о статусе платежа. Проверка IP и верификация через API."""
    # 1. Проверка IP (рекомендация ЮKassa)
    settings = get_settings()
    if not settings.yookassa_webhook_skip_ip_check:
        client = getattr(request, "client", None)
        client_host = client.host if client else None
        forwarded = request.headers.get("x-forwarded-for")
        if not _is_yookassa_ip(client_host, forwarded):
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "forbidden"}, status_code=403)

    try:
        body = await request.json()
        obj = body.get("object") or {}
        if isinstance(obj, dict):
            created = obj.get("created_at")
            if created and settings.yookassa_webhook_max_age_seconds > 0:
                try:
                    from datetime import timezone
                    ts_str = str(created).replace("Z", "+00:00")
                    ts = datetime.fromisoformat(ts_str)
                    now = datetime.now(timezone.utc)
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    if (now - ts).total_seconds() > settings.yookassa_webhook_max_age_seconds:
                        return {"ok": True}
                except Exception:
                    pass
        event = body.get("event") or body.get("type")
        pid = obj.get("id") or obj.get("payment_id") if isinstance(obj, dict) else None
        status = obj.get("status") if isinstance(obj, dict) else None

        if event == "payment.succeeded" and status == "succeeded" and pid:
            # 2. Верификация через API — запрос статуса платежа у ЮKassa
            if settings.yookassa_shop_id and settings.yookassa_secret_key:
                try:
                    from yookassa import Payment, Configuration
                    Configuration.configure(settings.yookassa_shop_id.strip(), settings.yookassa_secret_key.strip())
                    payment = Payment.find_one(str(pid))
                    if payment and getattr(payment, "status", None) != "succeeded":
                        return {"ok": True}  # не применяем — статус не совпадает
                except Exception:
                    pass

            inv = (await db.execute(select(Invoice).where(Invoice.invoice_number == str(pid)))).scalar_one_or_none()
            meta = (obj.get("metadata") or {}) if isinstance(obj, dict) else {}
            if inv:
                if inv.status == "paid":
                    return {"ok": True}
                inv.status = "paid"
                inv.paid_at = datetime.utcnow()
                period = meta.get("period", "monthly")
                delta = timedelta(days=365) if period == "yearly" else timedelta(days=30)
                sub = (await db.execute(select(Subscription).where(Subscription.company_id == inv.company_id).order_by(Subscription.created_at.desc()).limit(1))).scalar_one_or_none()
                if sub:
                    sub.plan_id = inv.plan_id
                    sub.status = "active"
                    sub.expires_at = datetime.utcnow() + delta
                    sub.yookassa_payment_id = str(pid)
                else:
                    db.add(Subscription(company_id=inv.company_id, plan_id=inv.plan_id, status="active", expires_at=datetime.utcnow() + delta, yookassa_payment_id=str(pid)))
            await db.commit()
    except Exception:
        pass
    return {"ok": True}


class CreateInvoiceRequest(BaseModel):
    plan_id: int
    period: str = "monthly"


@router.post("/invoice")
async def create_invoice(
    data: CreateInvoiceRequest,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Выставить счёт для юрлица. Реквизиты берутся из компании."""
    plan = await db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(404, "Тариф не найден")
    amount = plan.price_yearly if data.period == "yearly" else plan.price_monthly
    if amount <= 0:
        raise HTTPException(400, "Тариф бесплатный")
    uc = (await db.execute(select(UserCompany).where(UserCompany.user_id == user.id).limit(1))).scalar_one_or_none()
    if not uc:
        raise HTTPException(400, "Нет компании")
    company = await db.get(Company, uc.company_id)
    if not company or not company.inn:
        raise HTTPException(400, "Заполните реквизиты компании (ИНН) в настройках")
    inv_num = f"INV-{company.id}-{int(datetime.utcnow().timestamp())}"
    period_start = date.today()
    period_end = period_start + (timedelta(days=365) if data.period == "yearly" else timedelta(days=30))
    inv = Invoice(
        company_id=company.id,
        plan_id=plan.id,
        amount=amount,
        status="draft",
        invoice_number=inv_num,
        period_start=period_start,
        period_end=period_end,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    settings = get_settings()
    return {
        "invoice_id": inv.id,
        "invoice_number": inv_num,
        "amount": amount,
        "amount_rub": amount / 100,
        "status": "draft",
        "period_start": str(period_start),
        "period_end": str(period_end),
        "buyer": {
            "name": company.name,
            "inn": company.inn,
            "kpp": company.kpp or "",
            "legal_address": company.legal_address or "",
        },
        "seller": _seller_requisites(settings),
    }


def _build_invoice_pdf(inv: Invoice, company: Company, plan: Plan, seller: dict) -> bytes:
    """Сборка PDF счёта. DejaVuSans — надёжная поддержка кириллицы."""
    from pathlib import Path
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # DejaVu Sans — полная поддержка кириллицы (backend/fonts/)
    font_dir = Path(__file__).resolve().parents[2] / "fonts"
    deja_path = font_dir / "DejaVuSans.ttf"
    if "InvoiceDejaVu" not in pdfmetrics.getRegisteredFontNames() and deja_path.exists():
        pdfmetrics.registerFont(TTFont("InvoiceDejaVu", str(deja_path)))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm)
    styles = getSampleStyleSheet()
    font = "InvoiceDejaVu" if "InvoiceDejaVu" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    style_n = ParagraphStyle("Normal", parent=styles["Normal"], fontName=font, fontSize=10)
    style_h = ParagraphStyle("Head", parent=styles["Heading1"], fontName=font, fontSize=14)

    def _s(s):
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") if s else ""

    story = []
    story.append(Paragraph("СЧЁТ НА ОПЛАТУ", style_h))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(f"№ {_s(inv.invoice_number)} от {inv.created_at.strftime('%d.%m.%Y') if inv.created_at else ''}", style_n))
    story.append(Spacer(1, 4 * mm))

    # Без <b> — DejaVu один вариант, избегаем fallback на Helvetica-Bold
    story.append(Paragraph("Исполнитель:", style_h))
    story.append(Paragraph(_s(seller.get("name")), style_n))
    story.append(Paragraph(f"ИНН {_s(seller.get('inn'))} ОГРНИП {_s(seller.get('ogrn'))}", style_n))
    story.append(Paragraph(_s(seller.get("address")), style_n))
    story.append(Paragraph(f"Р/с {_s(seller.get('bank_account'))}", style_n))
    story.append(Paragraph(f"Банк: {_s(seller.get('bank_name'))}, БИК {_s(seller.get('bank_bik'))}, к/с {_s(seller.get('bank_corr'))}", style_n))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("Заказчик:", style_h))
    story.append(Paragraph(_s(company.name), style_n))
    story.append(Paragraph(f"ИНН {_s(company.inn)}" + (f" КПП {_s(company.kpp)}" if company.kpp else ""), style_n))
    addr = company.legal_address or getattr(company, "address", None)
    if addr:
        story.append(Paragraph(_s(addr), style_n))
    if getattr(company, "bank_account", None):
        story.append(Paragraph(f"Р/с {_s(company.bank_account)}", style_n))
    if getattr(company, "bank_name", None):
        story.append(Paragraph(f"Банк: {_s(company.bank_name)}" + (f", БИК {_s(getattr(company, 'bank_bik', ''))}" if getattr(company, "bank_bik", None) else ""), style_n))
    story.append(Spacer(1, 6 * mm))

    # Таблица
    amount_rub = inv.amount / 100
    data = [
        ["№", "Наименование", "Кол-во", "Цена", "Сумма"],
        ["1", f"Подписка {_s(plan.name)}", "1", f"{amount_rub:.2f} ₽", f"{amount_rub:.2f} ₽"],
    ]
    t = Table(data, colWidths=[15 * mm, 70 * mm, 20 * mm, 35 * mm, 35 * mm])
    t.setStyle(TableStyle(
        [
            ("FONT", (0, 0), (-1, -1), font, 10),
            ("BACKGROUND", (0, 0), (-1, 0), (0.9, 0.9, 0.9)),
            ("GRID", (0, 0), (-1, -1), 0.5, (0.5, 0.5, 0.5)),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ]
    ))
    story.append(t)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(f"Итого к оплате: {amount_rub:.2f} ₽", style_h))
    if inv.period_start and inv.period_end:
        story.append(Paragraph(f"Период оказания услуг: {inv.period_start.strftime('%d.%m.%Y')} — {inv.period_end.strftime('%d.%m.%Y')}", style_n))

    doc.build(story)
    return buf.getvalue()


@router.get("/invoice/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    user: User = Depends(require_trial_or_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Скачать счёт в PDF."""
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Счёт не найден")
    uc = (await db.execute(select(UserCompany).where(UserCompany.user_id == user.id))).scalars().all()
    company_ids = [u.company_id for u in uc]
    if inv.company_id not in company_ids:
        raise HTTPException(403, "Нет доступа к счёту")
    company = await db.get(Company, inv.company_id)
    plan = await db.get(Plan, inv.plan_id)
    if not company or not plan:
        raise HTTPException(404, "Данные счёта не найдены")
    settings = get_settings()
    seller = _seller_requisites(settings)
    try:
        pdf_bytes = _build_invoice_pdf(inv, company, plan, seller)
    except Exception as e:
        raise HTTPException(500, f"Ошибка генерации PDF: {e}")
    # ASCII filename — заголовки HTTP допускают только latin-1
    num = str(inv.invoice_number or inv.id).replace(" ", "_")
    safe_name = f"invoice_{num}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )
