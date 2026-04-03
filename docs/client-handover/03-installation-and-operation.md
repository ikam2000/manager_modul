# 3. Инструкция по установке и эксплуатации

Продукт: **ikamdocs** (backend: `ikamdocs/backend`, frontend: `ikamdocs/frontend`). Пути ниже приведены относительно корня репозитория.

**Исключение из инструкции:** настройка синхронизации с внешними торговыми площадками не описывается.

---

## 3.1. Системные требования (клиент)

| Компонент | Требование |
|-----------|------------|
| Браузер | Актуальные версии Chromium, Firefox, Safari, Edge (ES-модули, современный JS) |
| Сеть | HTTPS в продакшене (рекомендуется) |

Отдельного десктоп-клиента не требуется.

---

## 3.2. Требования к серверу и БД

### Сервер приложения

| Параметр | Минимум (малый контур) | Рекомендация |
|----------|------------------------|--------------|
| ОС | Linux (Ubuntu 22.04 LTS, Debian 12 и аналоги) | То же |
| CPU | 2 vCPU | 4 vCPU при росте нагрузки |
| RAM | 4 GB | 8 GB |
| Диск | 20 GB SSD + место под файлы документов | Увеличить `STORAGE_PATH` по мере роста |
| Python | 3.10+ (проверено на 3.12) | 3.12 |
| Node.js | 18+ (только для сборки frontend) | 20 LTS |

### База данных

| Параметр | Значение |
|----------|----------|
| СУБД | **PostgreSQL** 14+ |
| Кодировка | UTF-8 |
| Пользователь | Выделенный пользователь БД с правами на схему приложения |

### Дополнительно

| Сервис | Назначение |
|--------|------------|
| **Redis** | Кэш, сессии (см. `REDIS_URL` в `.env`) |
| **Nginx** | Reverse proxy, TLS, раздача статики `frontend/dist` |
| **Certbot** (опционально) | Сертификаты Let's Encrypt |

---

## 3.3. Порядок установки

1. **Скопировать** каталоги `backend/`, `frontend/`, `deploy/` на сервер (например `/var/ikamdocs/`).
2. **Установить системные пакеты:** `python3`, `python3-venv`, `postgresql`, `nginx`, `git`; при сборке на сервере — `nodejs`, `npm`.
3. **Создать БД и пользователя** PostgreSQL (отдельный пароль).
4. **Backend:**
   ```bash
   cd /var/ikamdocs/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
5. **Миграции БД** — см. раздел 3.4 и скрипт `backend/migrate.sh`.
6. **Frontend:**
   ```bash
   cd /var/ikamdocs/frontend
   npm ci
   npm run build
   ```
   Результат: каталог `frontend/dist/` (статика SPA + `index.html`).
7. **Каталог хранения файлов:**
   ```bash
   mkdir -p /var/ikamdocs/storage
   ```
8. **Nginx:** разместить конфиг по образцу `deploy/nginx-ikamdocs.conf`, скорректировать `server_name`, пути к SSL и `root` к `dist`. Проверить проксирование на порт ASGI (по умолчанию 8000).
9. **Systemd:** использовать юниты из `deploy/` (например `ikamdocs.service`, при наличии — worker) — см. `deploy/DEPLOY_GUIDE.md`.

Подробный пошаговый сценарий для типового VPS: **`deploy/DEPLOY_GUIDE.md`**.

---

## 3.4. Порядок первичной настройки

1. **Файл окружения backend:**
   ```bash
   cd /var/ikamdocs/backend
   cp .env.example .env
   nano .env
   ```
2. **Обязательно задать:**
   - `DATABASE_URL` — строка подключения asyncpg, например  
     `postgresql+asyncpg://USER:PASSWORD@localhost:5432/ikamdocs`
   - `SECRET_KEY` — длинная случайная строка (например `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - `ALLOWED_ORIGINS` — URL фронтенда через запятую (с протоколом)
   - `STORAGE_PATH` — путь к каталогу файлов
   - `ENCRYPTION_KEY` — ключ для шифрования чувствительных данных в БД (формат см. комментарии в `.env.example`)
   - `REDIS_URL` — если Redis используется
3. **Почта (регистрация, сброс пароля, уведомления):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` и при необходимости `LANDING_RECIPIENTS`.
4. **Платежи (если нужны):** `YOOKASSA_*` по документации провайдера.
5. **Поиск по ИНН контрагентов (опционально):** `DADATA_API_KEY`, `DADATA_SECRET` — при использовании сервиса DaData.
6. **Применить миграции** (см. `backend/migrate.sh`):
   ```bash
   cd /var/ikamdocs/backend
   sudo -u postgres ./migrate.sh
   ```
   Либо задать `DATABASE_URL` и выполнить от имени пользователя с доступом к БД.
7. **Инициализация таблиц** (если используется путь через приложение): по инструкции в `DEPLOY_GUIDE.md` — вызов `init_db` при первом запуске.
8. **Создать первого супер-администратора** — скрипт или SQL по внутренней процедуре проекта (см. `DEPLOY_GUIDE.md`, раздел про супер-админа).

Переменные, относящиеся к внешним торговым площадкам, в рамках настоящей поставки **не** требуются.

---

## 3.5. Запуск

- **Ручной запуск API (отладка):**
  ```bash
  cd /var/ikamdocs/backend
  source venv/bin/activate
  uvicorn app.main:app --host 127.0.0.1 --port 8000
  ```
- **Продакшен:** сервис systemd (`ikamdocs` / `ikamdocs-api` — имя зависит от установленного unit-файла):
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable ikamdocs
  sudo systemctl start ikamdocs
  sudo systemctl status ikamdocs
  ```
- **Проверка:** `curl -s http://127.0.0.1:8000/health` (или эндпоинт здоровья, объявленный в `app/main.py`).

После изменения `.env` — перезапуск сервиса backend.

---

## 3.6. Резервное копирование

| Объект | Частота | Метод |
|--------|---------|--------|
| **База PostgreSQL** | Ежедневно минимум | `pg_dump`, хранение вне сервера |
| **Файлы документов** | Вместе с политикой RPO | Копирование каталога `STORAGE_PATH` (rsync, snapshot диска) |
| **Конфигурация** | При изменениях | Резервные копии `/etc/nginx/`, unit-файлов systemd, **зашифрованная** копия `.env` (без хранения в Git) |

Перед обновлением версии — обязательный снимок БД и каталога хранения.

---

## 3.7. Обновление версии

1. Остановить worker (если есть): `systemctl stop ikamdocs-worker`.
2. Сделать **бэкап БД** и **файлов** storage.
3. Обновить код из репозитория (git pull / rsync).
4. Backend: `source venv/bin/activate && pip install -r requirements.txt`.
5. Применить **новые миграции** (`migrate.sh` или добавленные SQL в порядке репозитория).
6. Frontend: `npm ci && npm run build`, убедиться что `dist/` обновлён.
7. Перезапуск: `systemctl restart ikamdocs` (и worker).
8. Проверить `/health`, вход в кабинет, критичные сценарии.

Автоматизированный сценарий: `deploy/deploy.sh` (сборка + при необходимости `rsync` на сервер — см. комментарии в скрипте).

---

## 3.8. Базовая диагностика ошибок

| Симптом | Действия |
|---------|----------|
| 502 / нет ответа сайта | `systemctl status nginx`, `systemctl status ikamdocs`, `journalctl -u ikamdocs -n 100` |
| Ошибки API 5xx | Логи Uvicorn/systemd, наличие свободного места на диске, доступность PostgreSQL и Redis |
| Не проходит вход | Проверить `ALLOWED_ORIGINS`, время на сервере, валидность JWT `SECRET_KEY` (не менять без сброса сессий) |
| Документы не сохраняются | Права на `STORAGE_PATH`, переменная `STORAGE_PATH` в `.env` |
| Письма не уходят | SMTP-параметры, файрвол, логи приложения |
| Ошибки после миграции | Сверить порядок применённых файлов в `schema_migrations`, логи PostgreSQL |

**Интерактивная документация API:** после запуска backend — `https://<ваш-домен>/docs` (Swagger UI), если не отключено в конфигурации.

**Метрики:** при включённом Prometheus — эндпоинт метрик (см. `app/main.py`).

---

*Детали конкретной инфраструктуры заказчика (домены, IP, пароли) в документ не включаются — передаются по отдельной процедуре.*
