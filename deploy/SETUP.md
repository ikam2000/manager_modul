# Развёртывание ikamdocs на Timeweb

## Сервер

- **IP:** 195.133.25.37
- **Домен:** ikamdocs.ru
- **Подключение:** `ssh root@195.133.25.37`

## DNS (Timeweb)

A-запись для ikamdocs.ru → 195.133.25.37 уже настроена (подтверждено скриншотами).

## SSL

В панели Timeweb для домена ikamdocs.ru отображается кнопка «Купить сертификат». Рекомендуется:

1. **Бесплатный Let's Encrypt** — если на сервере установлен certbot:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d ikamdocs.ru -d www.ikamdocs.ru
   ```

2. **Платный сертификат Timeweb** — приобрести в панели и активировать для домена.

Без SSL домен по HTTPS недоступен. HTTP может работать, если Nginx слушает порт 80.

## Порты

- 80, 443 — веб (открыты по умолчанию)
- Закрытые: 587, 389, 2525, 465, 53413, 25, 3389

## Установка на сервере

```bash
# 1. Клонировать / загрузить проект
cd /var
git clone <repo> ikamdocs
# или scp/rsync

# 2. PostgreSQL
apt install postgresql postgresql-contrib
sudo -u postgres createuser ikamdocs -P
sudo -u postgres createdb -O ikamdocs ikamdocs

# 3. Python, venv
cd /var/ikamdocs/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. .env
cp .env.example .env
nano .env  # DATABASE_URL, SECRET_KEY, YOOKASSA_* и т.д.

# 5. Миграции (Alembic или создание таблиц)
# uv run app.main — при первом запуске создаст таблицы через Base.metadata.create_all

# 6. Systemd для API
# Создать /etc/systemd/system/ikamdocs-api.service
```

## systemd unit

```ini
[Unit]
Description=ikamdocs API
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/var/ikamdocs/backend
ExecStart=/var/ikamdocs/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
EnvironmentFile=/var/ikamdocs/backend/.env

[Install]
WantedBy=multi-user.target
```

## Frontend

```bash
cd /var/ikamdocs/frontend
npm install
npm run build
# dist/ → /var/ikamdocs/frontend/dist
```

## Nginx

Скопировать `deploy/nginx-ikamdocs.conf` в `/etc/nginx/sites-available/ikamdocs`, включить, перезапустить nginx.
