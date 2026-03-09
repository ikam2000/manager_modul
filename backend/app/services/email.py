# -*- coding: utf-8 -*-
"""Отправка писем через SMTP. Отправитель: zero@ikamdocs.ru."""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

# Общий HTML-шаблон писем ikamdocs: бренд, подчёркивание ссылок, акцент #0ea5e9
EMAIL_WRAPPER = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{subject}</title>
  <style>
    body {{ margin:0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 0; }}
    .wrap {{ max-width: 600px; margin: 0 auto; padding: 32px 24px; }}
    .brand {{ font-size: 22px; font-weight: 700; color: #0ea5e9; letter-spacing: -0.02em; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0ea5e9; }}
    .content {{ background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    a {{ color: #0ea5e9; text-decoration: underline; text-underline-offset: 3px; }}
    a:hover {{ color: #0284c7; }}
    .footer {{ margin-top: 24px; font-size: 14px; color: #64748b; }}
    .footer strong {{ color: #0ea5e9; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">ikamdocs</div>
    <div class="content">{body}</div>
    <div class="footer">
      <strong>ikamdocs</strong> — управление номенклатурой и маркировкой
    </div>
  </div>
</body>
</html>"""


async def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> bool:
    """Отправить письмо. При ошибке SMTP пишет в лог и возвращает False."""
    from app.config import get_settings

    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_user:
        logger.warning("SMTP не настроен (smtp_host/smtp_user пусты). Письмо не отправлено: %s -> %s", subject, to)
        return False

    try:
        import aiosmtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.email_from_name} <{settings.email_from}>"
        msg["To"] = to

        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        if body_html:
            msg.attach(MIMEText(body_html, "html", "utf-8"))

        # use_tls=True только для порта 465 (implicit TLS); для 587 — STARTTLS по умолчанию
        use_tls = settings.smtp_port == 465
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            use_tls=use_tls,
        )
        logger.info("Письмо отправлено: %s -> %s", subject, to)
        return True
    except Exception as e:
        logger.exception("Ошибка отправки письма %s -> %s: %s", subject, to, e)
        return False


def _wrap_html(body: str, subject: str = "ikamdocs") -> str:
    """Оборачивает контент в брендированный шаблон."""
    return EMAIL_WRAPPER.format(subject=subject, body=body)


async def send_welcome_email(to: str, full_name: str, company_name: str, company_type: str) -> bool:
    """Письмо после регистрации: логин, пароль напоминание, ссылка на вход."""
    base = "https://ikamdocs.ru"
    text = f"""Здравствуйте, {full_name}!

Вы зарегистрировались в ikamdocs как {company_type} (компания: {company_name}).

Для входа используйте ваш email и пароль, который вы указали при регистрации.

Войти: {base}/login

Если вы забыли пароль, перейдите по ссылке «Забыли пароль?» на странице входа.

—
С уважением,
команда ikamdocs
"""
    body_html = f"""<p>Здравствуйте, <strong>{full_name}</strong>!</p>
<p>Вы зарегистрировались в ikamdocs как {company_type} (компания: {company_name}).</p>
<p>Для входа используйте ваш email и пароль, указанный при регистрации.</p>
<p><a href="{base}/login">Войти в личный кабинет</a></p>
<p>Если вы забыли пароль, используйте <a href="{base}/login">«Забыли пароль?»</a> на странице входа.</p>
<p>—<br>С уважением,<br>команда <strong>ikamdocs</strong></p>"""
    html = _wrap_html(body_html, "Регистрация в ikamdocs")
    return await send_email(to, "Регистрация в ikamdocs", text, html)


async def send_password_reset_email(to: str, reset_link: str) -> bool:
    """Письмо со ссылкой для сброса пароля."""
    text = f"""Здравствуйте!

Вы запросили восстановление пароля в ikamdocs.

Перейдите по ссылке для сброса пароля (действует 1 час):

{reset_link}

Если вы не запрашивали сброс пароля, проигнорируйте это письмо.

—
команда ikamdocs
"""
    body_html = f"""<p>Здравствуйте!</p>
<p>Вы запросили восстановление пароля в <strong>ikamdocs</strong>.</p>
<p><a href="{reset_link}">Сбросить пароль</a></p>
<p style="color:#64748b;font-size:14px;">Ссылка действует 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
<p>—<br>команда ikamdocs</p>"""
    html = _wrap_html(body_html, "Восстановление пароля")
    return await send_email(to, "Восстановление пароля ikamdocs", text, html)


async def send_landing_form_email(
    to: str,
    subject: str,
    name: str,
    email: str,
    phone: str = "",
    company: str = "",
    message: str = "",
) -> bool:
    """Отправить заявку с лендинга на указанный email (ikam2000, zero@ikamdocs)."""
    rows = [
        ("Имя", name),
        ("Email", f'<a href="mailto:{email}">{email}</a>'),
    ]
    if phone:
        rows.append(("Телефон", phone))
    if company:
        rows.append(("Компания", company))
    if message:
        rows.append(("Комментарий", message.replace("\n", "<br>")))

    table = "".join(f'<tr><td style="padding:8px 12px 8px 0;color:#64748b;font-weight:500;">{k}:</td><td>{v}</td></tr>' for k, v in rows)
    body_html = f"""<p style="margin-top:0;">Новая заявка с сайта ikamdocs.ru</p>
<table style="border-collapse:collapse;">{table}</table>
<p style="margin-top:20px;font-size:14px;color:#64748b;">Ответьте на email клиента или перезвоните.</p>"""
    html = _wrap_html(body_html, subject)

    text = f"Заявка: {subject}\n\nИмя: {name}\nEmail: {email}\n"
    if phone:
        text += f"Телефон: {phone}\n"
    if company:
        text += f"Компания: {company}\n"
    if message:
        text += f"Комментарий: {message}\n"

    return await send_email(to, subject, text, html)
