#!/bin/bash
# Первичная настройка сервера Timeweb VPS (Ubuntu 22.04)
# Запуск: sudo bash deploy/setup-server.sh

set -e

echo "==> ikamdocs — настройка сервера"

# Зависимости
apt update && apt upgrade -y
apt install -y postgresql postgresql-contrib redis-server nginx \
  python3.11 python3.11-venv python3-pip \
  nodejs npm git certbot python3-certbot-nginx

# Пользователь и каталоги
id ikamdocs 2>/dev/null || useradd -m -s /bin/bash ikamdocs
mkdir -p /var/ikamdocs/{frontend/dist,backend,storage}
chown -R ikamdocs:ikamdocs /var/ikamdocs

# PostgreSQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='ikamdocs'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ikamdocs WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='ikamdocs'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ikamdocs OWNER ikamdocs;"

echo "==> Готово. Дальше:"
echo "  1. Загрузите проект в /var/ikamdocs/repo (git clone или scp)"
echo "  2. Настройте /var/ikamdocs/backend/.env"
echo "  3. Соберите фронт: cd frontend && npm ci && npm run build && cp -r dist/* /var/ikamdocs/frontend/dist/"
echo "  4. Backend: cd backend && python3.11 -m venv /var/ikamdocs/venv && source ../venv/bin/activate && pip install -r requirements.txt && alembic upgrade head"
echo "  5. Скопируйте nginx и service: cp deploy/nginx-ikamdocs.conf /etc/nginx/sites-available/ && cp deploy/ikamdocs.service /etc/systemd/system/"
echo "  6. systemctl enable ikamdocs && systemctl start ikamdocs"
echo "  7. certbot --nginx -d ikamdocs.ru -d www.ikamdocs.ru"
