# ikamdocs.ru — Сервис управления документами и номенклатурой

Комплексная платформа для учёта номенклатуры, документов и поставок с QR-кодами, интеграцией с 1С/ERP/CRM и аналитикой.

## Технологический стек

- **Backend:** FastAPI, SQLAlchemy 2.0, PostgreSQL, Redis
- **Frontend:** React + TypeScript + Vite
- **Безопасность:** JWT, шифрование (AES-256), соответствие 152-ФЗ, GDPR, ISO 27001
- **Платежи:** ЮKassa (карта, СБП)
- **Хранение:** Российский сервер Timeweb

## Структура проекта

```
ikamdocs/
├── backend/          # FastAPI API
├── frontend/         # React SPA
├── deploy/           # Конфиги для Timeweb
└── docs/             # Документация API
```

## Быстрый старт

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Роли

- **Супер-админ** — полный доступ, вход под пользователями
- **Админ (клиент)** — управление своей компанией и пользователями
- **Пользователь** — работа с данными в рамках ролей

## Ссылки

- Домен: https://ikamdocs.ru
- Сервер: 195.133.25.37 (Timeweb)
