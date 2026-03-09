# Диагностика: почему изменения главной не выходят на прод

**Дата:** 2026-03-07  
**Проблема:** Центрирование текста в блоках и анимированный блок HomeCabinetShowcase не видны на production после деплоя.

---

## Суть проблемы

В чате (cursor_ikamdocs.md) описано:
- Изменения вносятся в React Home (`src/pages/Home.tsx`, `HomeCabinetShowcase`, стили)
- Деплой проходит успешно
- На проде изменений не видно

**Гипотеза:** Главная страница `/` на проде отдаёт **не тот файл** — либо старый `ikamdocs_v5_index.html`, либо кэшированную версию.

---

## Текущая архитектура (по репозиторию)

| Что | Файл | Роль |
|-----|------|------|
| **Nginx (репо)** | `deploy/nginx-ikamdocs.conf` | `location = /` → `try_files /index.html` (React SPA) |
| **React Home** | `src/pages/Home.tsx` | Hero, HomeCabinetShowcase, Problem, Architecture, DataMap, UseCases, Pricing, CaptureForm, FinalCTA |
| **Сборка** | `frontend/dist/` | Vite собирает index.html + JS/CSS в dist |
| **Статика** | `public/ikamdocs_v5_index.html` | Копируется в dist, доступна по `/ikamdocs_v5_index.html` |

**Ожидаемое поведение:** При запросе `https://ikamdocs.ru/` nginx отдаёт `dist/index.html` → загружается React → рендерится Home с HomeCabinetShowcase.

---

## Возможные причины

### 1. На сервере другой nginx-конфиг

Деплой копирует конфиг в `/etc/nginx/sites-available/ikamdocs`, но:
- Активным может быть другой файл (default, ikamdocs.ru, conf.d/...)
- Certbot мог создать отдельный конфиг (`ikamdocs-le-ssl.conf` и т.п.), который переопределяет наш

**Проверка на сервере:**
```bash
ssh root@195.133.25.37

# Что реально включено
ls -la /etc/nginx/sites-enabled/

# Какой конфиг обрабатывает ikamdocs.ru
grep -r "server_name.*ikamdocs" /etc/nginx/

# Что отдаётся для location = /
grep -A5 "location = /" /etc/nginx/sites-enabled/*
```

Если в активном конфиге есть `ikamdocs_v5_index.html` или `try_files /ikamdocs_v5_index.html` — это причина.

---

### 2. Конфиг не применяется при деплое

Скрипт делает:
```bash
sudo cp /tmp/nginx-ikamdocs.conf /etc/nginx/sites-available/ikamdocs
sudo nginx -t && sudo systemctl reload nginx
```

Если `sites-enabled` содержит симлинк на **другой** файл (не ikamdocs), то копирование в `sites-available/ikamdocs` не изменит активную конфигурацию.

**Проверка:**
```bash
# Куда указывает симлинк
readlink -f /etc/nginx/sites-enabled/ikamdocs
# или
ls -la /etc/nginx/sites-enabled/
```

---

### 3. Кэширование

- **Браузер:** Жёсткое обновление Ctrl+Shift+R (Cmd+Shift+R на Mac)
- **CDN/Cloudflare:** Если используется — сбросить кэш в панели
- **Nginx:** В конфиге уже стоит `Cache-Control: no-cache` для `/`, но проверить, что это именно тот конфиг, который обслуживает запросы

---

### 4. Документация устарела

`docs/SITE_AUDIT.md`, `MARKETING_SITE_AUDIT.md` и др. до сих пор пишут:
> `location = /` → `ikamdocs_v5_index.html`

В репозитории `nginx-ikamdocs.conf` уже обновлён на `try_files /index.html`. Документация не синхронизирована с фактической конфигурацией.

---

## Рекомендуемые действия

### Шаг 1. Проверить, что отдаёт прод

```bash
curl -sI https://ikamdocs.ru/ | head -20
curl -s https://ikamdocs.ru/ | head -80
```

- Если в HTML есть `<div id="root">` и `<script type="module" src="/assets/` — отдаётся React (index.html).
- Если есть `shared-header`, `layout.js`, структура ikamdocs_v5 — отдаётся статика (ikamdocs_v5_index.html).

### Шаг 2. Проверить nginx на сервере

```bash
ssh root@195.133.25.37 "grep -A3 'location = /' /etc/nginx/sites-enabled/* 2>/dev/null || grep -A3 'location = /' /etc/nginx/conf.d/* 2>/dev/null"
```

### Шаг 3. Если на сервере всё ещё ikamdocs_v5_index.html

Привести конфиг в соответствие с репо:

```bash
# На сервере — убедиться, что используется наш конфиг
sudo cp /tmp/nginx-ikamdocs.conf /etc/nginx/sites-available/ikamdocs
sudo ln -sf /etc/nginx/sites-available/ikamdocs /etc/nginx/sites-enabled/ikamdocs
sudo nginx -t && sudo systemctl reload nginx
```

Или вручную в активном конфиге заменить:
```nginx
# Было (если так):
location = / {
    try_files /ikamdocs_v5_index.html =404;
}

# Должно быть:
location = / {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    try_files /index.html =404;
}
```

### Шаг 4. Обновить документацию

Привести SITE_AUDIT.md и связанные файлы в соответствие с тем, что главная — React (index.html), а не ikamdocs_v5_index.html.

---

## Быстрая проверка после деплоя

```bash
# Локально — что в dist
ls -la ikamdocs/frontend/dist/index.html
grep -o 'HomeCabinetShowcase\|cabinet-showcase' ikamdocs/frontend/dist/assets/*.js | head -3

# На сервере — тот же ли index.html
ssh root@195.133.25.37 "grep -l 'root' /var/ikamdocs/frontend/dist/index.html && head -50 /var/ikamdocs/frontend/dist/index.html"
```

Если в dist есть HomeCabinetShowcase, но на сайте его нет — проблема в nginx или кэше.
