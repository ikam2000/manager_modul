# Развёртывание ikamdocs на Timeweb VPS

Пошаговая инструкция для деплоя на VPS Timeweb (Ubuntu 22.04).

## 1. Подготовка VPS в Timeweb

1. Создайте VPS в [панели Timeweb](https://timeweb.cloud) — Ubuntu 22.04, от 2 GB RAM.
2. Подключитесь по SSH: `ssh root@ваш_ip`
3. Обновите систему: `apt update && apt upgrade -y`

## 2. Установка зависимостей

```bash
# PostgreSQL
apt install -y postgresql postgresql-contrib

# Redis
apt install -y redis-server

# Nginx
apt install -y nginx

# Python 3.11, Node.js 20, Git
apt install -y python3.11 python3.11-venv python3-pip nodejs npm git
# или Node через nvm для актуальной версии
```

## 3. База данных PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER ikamdocs WITH PASSWORD 'ваш_надёжный_пароль';"
sudo -u postgres psql -c "CREATE DATABASE ikamdocs OWNER ikamdocs;"
```

## 4. Создание пользователя и структура каталогов

```bash
useradd -m -s /bin/bash ikamdocs
mkdir -p /var/ikamdocs/{frontend,backend,storage}
chown -R ikamdocs:ikamdocs /var/ikamdocs
```

## 5. Загрузка проекта

```bash
cd /var/ikamdocs
sudo -u ikamdocs git clone https://github.com/ваш_repo/ikamdocs.git repo
# или загрузите архив и распакуйте

# Структура:
# /var/ikamdocs/repo — репозиторий
# Симлинки или копирование:
cp -r repo/frontend/dist /var/ikamdocs/frontend/  # после сборки
cp -r repo/backend/* /var/ikamdocs/backend/
```

## 6. Сборка фронтенда (на сервере или локально)

**На сервере:**
```bash
cd /var/ikamdocs/repo/frontend
npm ci
npm run build
cp -r dist/* /var/ikamdocs/frontend/dist/
```

**Локально (рекомендуется):**
```bash
cd ikamdocs/frontend
npm run build
scp -r dist/* user@server:/var/ikamdocs/frontend/dist/
```

## 7. Backend — Python и виртуальное окружение

```bash
cd /var/ikamdocs/backend
python3.11 -m venv /var/ikamdocs/venv
source /var/ikamdocs/venv/bin/activate
pip install -r requirements.txt
```

## 8. Конфигурация .env

Создайте `/var/ikamdocs/backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://ikamdocs:ваш_пароль@localhost:5432/ikamdocs
SECRET_KEY=сгенерируйте_секретный_ключ_минимум_32_символа
DEBUG=false
ALLOWED_ORIGINS=https://ikamdocs.ru,https://www.ikamdocs.ru
STORAGE_PATH=/var/ikamdocs/storage
REDIS_URL=redis://localhost:6379/0

# ЮKassa (если используете)
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=https://ikamdocs.ru/cabinet/payment/return
```

Сгенерировать SECRET_KEY: `python3 -c "import secrets; print(secrets.token_hex(32))"`

## 9. Миграции БД

```bash
cd /var/ikamdocs/backend
source /var/ikamdocs/venv/bin/activate
alembic upgrade head
# При необходимости: python -m app.scripts.seed_demo  # демо-данные
```

## 10. Systemd-сервис

```bash
cp /var/ikamdocs/repo/deploy/ikamdocs.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ikamdocs
systemctl start ikamdocs
systemctl status ikamdocs
```

## 11. Nginx

```bash
cp /var/ikamdocs/repo/deploy/nginx-ikamdocs.conf /etc/nginx/sites-available/ikamdocs
ln -sf /etc/nginx/sites-available/ikamdocs /etc/nginx/sites-enabled/
# Удалить default при необходимости: rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 12. SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ikamdocs.ru -d www.ikamdocs.ru
```

После этого certbot обновит конфиг Nginx и добавит SSL.

## 13. Домен

В панели управления доменом (где зарегистрирован ikamdocs.ru) создайте A-запись:
- `@` и `www` → IP вашего VPS

## 14. Проверка

- https://ikamdocs.ru — главная
- https://ikamdocs.ru/login — вход
- https://ikamdocs.ru/health — проверка API (если проксировать)

## Быстрый деплой после изменений

```bash
# На локальной машине
cd ikamdocs
./deploy/deploy.sh

# Или вручную
cd frontend && npm run build
rsync -avz frontend/dist/ user@server:/var/ikamdocs/frontend/dist/
ssh user@server "cd /var/ikamdocs/backend && git pull && source /var/ikamdocs/venv/bin/activate && pip install -r requirements.txt && alembic upgrade head"
ssh user@server "sudo systemctl restart ikamdocs"
```

## Структура на сервере

```
/var/ikamdocs/
├── frontend/dist/     # Собранный фронтенд (статика)
├── backend/           # Python-код
├── venv/              # Виртуальное окружение
├── storage/           # Загруженные документы
└── repo/              # Клон репозитория (опционально)
```

## Troubleshooting

- **502 Bad Gateway** — проверьте `systemctl status ikamdocs`, логи: `journalctl -u ikamdocs -f`
- **База не подключается** — проверьте DATABASE_URL, что PostgreSQL слушает localhost
- **Документы не загружаются** — права на /var/ikamdocs/storage: `chown -R ikamdocs:ikamdocs`
