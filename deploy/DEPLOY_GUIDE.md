# Пошаговый деплой ikamdocs на Timeweb

**Сервер:** 195.133.25.37  
**Домен:** ikamdocs.ru  
**SSH:** `ssh root@195.133.25.37`

---

## Кратко (если уже загрузили проект)

```bash
ssh root@195.133.25.37
cd /var/ikamdocs && bash deploy/deploy.sh
# Настроить .env, затем:
systemctl restart ikamdocs-api
certbot --nginx -d ikamdocs.ru -d www.ikamdocs.ru
```

---

## Шаг 0. Подготовка на локальном Mac

### 0.1. Сборка фронтенда локально (проще, чем на сервере)

```bash
cd ~/Downloads/flaskbot/ikamdocs/frontend
npm install
npm run build
```

В папке `frontend/dist` появится собранный сайт.

### 0.2. Подготовка файлов для загрузки

Убедитесь, что собраны:
- `ikamdocs/backend/` — весь каталог
- `ikamdocs/frontend/dist/` — собранный фронтенд
- `ikamdocs/deploy/` — скрипты и конфиги

---

## Шаг 1. Подключение к серверу

```bash
ssh root@195.133.25.37
```

Введите root-пароль.

---

## Шаг 2. Обновление системы и установка пакетов

```bash
apt update && apt upgrade -y

# Python, Node, PostgreSQL, Nginx, Certbot
apt install -y python3 python3-pip python3-venv \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  nodejs npm \
  git
```

---

## Шаг 3. Загрузка проекта на сервер

### Вариант A: через rsync (с вашего Mac)

В **новом терминале на Mac** (не на сервере):

```bash
cd ~/Downloads/flaskbot
rsync -avz --exclude 'node_modules' --exclude 'venv' --exclude '__pycache__' \
  ikamdocs/ root@195.133.25.37:/var/ikamdocs/
```

Пароль root — по запросу.

### Вариант B: через git (если проект в репозитории)

На сервере:

```bash
cd /var
git clone https://github.com/YOUR_USER/ikamdocs.git
# или ваш URL репозитория
```

### Вариант C: через scp

```bash
cd ~/Downloads/flaskbot
scp -r ikamdocs root@195.133.25.37:/var/
```

---

## Шаг 4. PostgreSQL

На сервере:

```bash
# Создать пользователя и базу
sudo -u postgres psql -c "CREATE USER ikamdocs WITH PASSWORD 'ВЫБЕРИТЕ_НАДЁЖНЫЙ_ПАРОЛЬ';"
sudo -u postgres psql -c "CREATE DATABASE ikamdocs OWNER ikamdocs;"
```

Запомните пароль для `DATABASE_URL`.

---

## Шаг 5. Frontend

### Если не собирали локально — собрать на сервере:

```bash
cd /var/ikamdocs/frontend
npm install
npm run build
```

### Если собрали локально — dist уже в проекте.

Проверьте, что есть `/var/ikamdocs/frontend/dist/index.html`.

---

## Шаг 6. Backend: Python, venv, зависимости

```bash
cd /var/ikamdocs/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

На Linux Pillow обычно ставится. Если нужны QR и OCR — раскомментируйте в `requirements.txt`:
`pillow pytesseract pdf2image qrcode[pil]` и переустановите.

---

## Шаг 7. Настройка .env

```bash
cd /var/ikamdocs/backend
cp .env.example .env
nano .env
```

Заполните:

```env
# Замените YOUR_DB_PASSWORD на пароль из шага 4
DATABASE_URL=postgresql+asyncpg://ikamdocs:YOUR_DB_PASSWORD@localhost:5432/ikamdocs

# Сгенерируйте: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=ваша_случайная_строка_32_символа

ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# ЮKassa (пока можно оставить пустым)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=https://ikamdocs.ru/cabinet/payment/return

# App
DEBUG=false
ALLOWED_ORIGINS=https://ikamdocs.ru,https://www.ikamdocs.ru

STORAGE_PATH=/var/ikamdocs/storage
```

Создайте каталог для документов:

```bash
mkdir -p /var/ikamdocs/storage
```

---

## Шаг 8. Первый запуск backend (создание таблиц)

```bash
cd /var/ikamdocs/backend
source venv/bin/activate
python3 -c "
import asyncio
from app.database import init_db
asyncio.run(init_db())
print('Таблицы созданы')
"
```

Затем проверьте, что API стартует:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

В другом терминале (или с Mac): `curl http://195.133.25.37:8000/health` — не сработает, т.к. слушаем только localhost. На сервере: `curl http://127.0.0.1:8000/health` — должно вернуть `{"status":"ok"}`.

Остановите uvicorn (Ctrl+C).

---

## Шаг 9. Systemd — автозапуск API

```bash
nano /etc/systemd/system/ikamdocs-api.service
```

Вставьте:

```ini
[Unit]
Description=ikamdocs API
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/var/ikamdocs/backend
ExecStart=/var/ikamdocs/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
EnvironmentFile=/var/ikamdocs/backend/.env

[Install]
WantedBy=multi-user.target
```

Запуск и автозагрузка:

```bash
systemctl daemon-reload
systemctl enable ikamdocs-api
systemctl start ikamdocs-api
systemctl status ikamdocs-api
```

---

## Шаг 10. Nginx — сначала только HTTP

```bash
cp /var/ikamdocs/deploy/nginx-ikamdocs-http.conf /etc/nginx/sites-available/ikamdocs
ln -sf /etc/nginx/sites-available/ikamdocs /etc/nginx/sites-enabled/
# Удалить default, если мешает
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Проверьте в браузере: `http://ikamdocs.ru` (или `http://195.133.25.37`).

---

## Шаг 11. SSL (Let's Encrypt)

```bash
certbot --nginx -d ikamdocs.ru -d www.ikamdocs.ru
```

Укажите email, примите условия. Certbot автоматически обновит конфиг Nginx и добавит HTTPS.

Проверьте: `https://ikamdocs.ru`

---

## Шаг 12. Создание первого супер-админа (опционально)

```bash
cd /var/ikamdocs/backend
source venv/bin/activate
python3 << 'EOF'
import asyncio
from app.database import init_db, AsyncSessionLocal
from app.models.user import User, Role
from app.security import hash_password
from sqlalchemy import select

async def create_super_admin():
    await init_db()
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.email == "admin@ikamdocs.ru"))
        if r.scalar_one_or_none():
            print("Супер-админ уже существует")
            return
        user = User(
            email="admin@ikamdocs.ru",
            hashed_password=hash_password("СменитеПароль123!"),
            full_name="Супер Админ",
            role=Role.super_admin,
        )
        db.add(user)
        await db.commit()
        print("Создан: admin@ikamdocs.ru / СменитеПароль123!")

asyncio.run(create_super_admin())
EOF
```

Сразу смените пароль в личном кабинете.

---

## Готово

- Сайт: https://ikamdocs.ru  
- API: https://ikamdocs.ru/api/  
- Здоровье: https://ikamdocs.ru/health  

---

## Полезные команды

| Действие              | Команда |
|-----------------------|---------|
| Логи API              | `journalctl -u ikamdocs-api -f` |
| Перезапуск API        | `systemctl restart ikamdocs-api` |
| Обновить код          | `rsync` или `git pull`, затем `systemctl restart ikamdocs-api` |
| Обновить frontend     | `cd frontend && npm run build` |
