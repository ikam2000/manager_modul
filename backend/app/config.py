# -*- coding: utf-8 -*-
"""Конфигурация приложения. Соответствие 152-ФЗ, GDPR."""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    debug: bool = False
    app_name: str = "ikamdocs"
    allowed_origins: str = "https://ikamdocs.ru"
    base_url: str = "https://ikamdocs.ru"  # URL для OAuth callback, redirect_uri

    # Database (PostgreSQL на российском сервере; для локальной разработки — SQLite)
    database_url: str = "sqlite+aiosqlite:///./ikamdocs.db"

    # JWT
    secret_key: str = "change-me-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # OpenAI (опционально)
    openai_api_key: str = ""

    # DaData (поиск по ИНН)
    dadata_api_key: str = ""
    dadata_secret: str = ""

    # Функциональные флаги. По умолчанию true — совместимость с существующим продакшеном.
    # Для поставки без маркетплейсов/ЮKassa: false (см. transfer.env.example).
    feature_marketplace_oauth: bool = True
    feature_yookassa: bool = True

    # ЮKassa
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_return_url: str = "https://ikamdocs.ru/cabinet/payment/return"
    yookassa_webhook_skip_ip_check: bool = False
    yookassa_webhook_max_age_seconds: int = 600  # reject если событие старше 10 мин (replay protection)

    # Реквизиты продавца для счёта (ИП Каменев)
    invoice_seller_name: str = "ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ КАМЕНЕВ ИГОРЬ АЛЕКСАНДРОВИЧ"
    invoice_seller_address: str = "143032, РОССИЯ, МОСКОВСКАЯ ОБЛ, Г ОДИНЦОВО, П. ГОРКИ-10, П ГОРКИ-10, Д 23, КВ 92"
    invoice_seller_inn: str = "525805081047"
    invoice_seller_ogrn: str = "325508100294111"
    invoice_seller_bank_account: str = "40802810400008346301"
    invoice_seller_bank_name: str = "АО «ТБанк»"
    invoice_seller_bank_inn: str = "7710140679"
    invoice_seller_bank_bik: str = "044525974"
    invoice_seller_bank_corr: str = "30101810145250000974"
    invoice_seller_bank_address: str = "127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26"

    # OAuth интеграции (Shopify, Wildberries, Ozon — при наличии credentials провайдер доступен)
    shopify_client_id: str = ""
    shopify_client_secret: str = ""
    wildberries_client_id: str = ""
    wildberries_client_secret: str = ""
    ozon_client_id: str = ""
    ozon_client_secret: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Email (SMTP): письма от zero@ikamdocs.ru
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    email_from: str = "zero@ikamdocs.ru"
    email_from_name: str = "ikamdocs"
    # Заявки с лендинга уходят на оба адреса
    landing_recipients: str = "ikam2000@yandex.ru,zero@ikamdocs.ru"

    # CRON: автоматическая выкачка по API поставщиков
    supplier_api_cron_enabled: bool = True
    supplier_api_cron_interval_minutes: int = 60
    # Если True — CRON кладёт задачи в Redis, выполняет воркер (scripts/run_worker.py). Иначе — inline.
    use_worker_queue: bool = False
    # Путь для staging загруженных файлов перед отправкой в worker (импорты).
    # Если не задан — тяжёлые импорты выполняются inline в API.
    import_staging_path: Path | None = None
    # При True и import_staging_path — импорты номенклатуры/trader идут в worker, API возвращает 202
    use_worker_for_imports: bool = False

    # Storage (документы; по умолчанию — локальная папка backend/storage)
    storage_path: Path = Path(__file__).resolve().parents[1] / "storage"
    encryption_key: str = ""  # base64, 32 bytes для AES-256
    max_upload_size_mb: int = 50
    max_import_rows: int = 100_000  # лимит строк Excel/CSV при импорте

    # Логирование: json — структурированный JSON для Loki/ELK; text — обычный формат
    log_format: str = "text"

    @property
    def origins_list(self) -> list[str]:
        return [x.strip() for x in self.allowed_origins.split(",") if x.strip()]

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
