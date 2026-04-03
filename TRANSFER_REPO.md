# Передача репозитория (только ikamdocs)

Целевой пустой репозиторий: [https://github.com/ikam2000/manager_modul](https://github.com/ikam2000/manager_modul)

## Что сделано в коде

- **`FEATURE_MARKETPLACE_OAUTH`** — при `false` не подключается роутер OAuth маркетплейсов, скрыт таб «Подключения» в Интеграциях, отключена синхронизация trader → площадки.
- **`FEATURE_YOOKASSA`** — при `false` не подключаются `/payment/*`, webhook ЮKassa; в кабинете скрыты оплата и «Счета и оплаты».
- Публичный эндпоинт **`GET /features`** отдаёт JSON флагов для фронтенда (в nginx добавлен `location /features`).

Значения по умолчанию в `app/config.py`: **оба `true`** — чтобы не ломать текущий продакшен без новых переменных. Для передачи клиенту задайте в `.env` **`false`** (см. `transfer.env.example`).

## Первый push в пустой GitHub (с вашей машины)

Из каталога, где лежит только содержимое `ikamdocs` (не весь `flaskbot`):

```bash
cd /path/to/ikamdocs
git init
git branch -M main
git add .
git commit -m "Initial import: ikamdocs (marketplace/YooKassa optional via env)"
git remote add origin https://github.com/ikam2000/manager_modul.git
git push -u origin main
```

Если копируете из монорепозитория:

```bash
rsync -a --exclude node_modules --exclude venv --exclude .git \
  /path/to/flaskbot/ikamdocs/ /tmp/ikamdocs-export/
cd /tmp/ikamdocs-export
# затем git init и push как выше
```

Не коммитьте: `backend/.env`, `node_modules`, `venv`, `frontend/dist`, секреты.

## После клонирования у клиента

1. `cp transfer.env.example backend/.env` — заполнить `DATABASE_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, домены.
2. `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
3. Миграции БД (`migrate.sh`).
4. `cd frontend && npm ci && npm run build`
5. Настроить nginx и systemd по `deploy/DEPLOY_GUIDE.md`.

Документация для клиента: `docs/client-handover/`.
