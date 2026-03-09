# Аудит маркетингового сайта ikamdocs

**Дата:** 2026-03-06  
**Цель:** Подготовка к редизайну B2B SaaS без нарушения существующих URL, форм и endpoints.

---

## 1. СТРУКТУРА САЙТА

Сайт использует **гибридную модель**:

| Что | Как работает |
|-----|--------------|
| **Главная (/)**

 | Nginx отдаёт статический `ikamdocs_v5_index.html`. React НЕ используется. |
| **Остальные маршруты** | SPA React (index.html → try_files /index.html) |
| **Статические HTML** | request-demo.html, request-security.html и др. — отдельные файлы с shared header/footer |

---

## 2. LAYOUT

| Компонент | Файл | Контекст |
|-----------|------|----------|
| **Layout (React)** | `src/components/Layout.tsx` | Обёртка для SPA: Header или CabinetHeader, Outlet, Footer |
| **Layout (статический)** | `public/shared/layout.js` | Загружает header.html и footer.html в `#shared-header`, `#shared-footer` |

**Важно:** Главная (/) использует статический layout (layout.js), React Layout не применяется.

---

## 3. HEADER

| Версия | Файл | Где используется |
|--------|------|-------------------|
| **React Header** | `src/components/Header.tsx` | Страницы SPA: /pricing, /company, /login и т.д. |
| **Статический header** | `public/shared/header.html` | Главная (ikamdocs_v5_index.html), request-demo.html и др. |

**React Header** (siteConfig NAV_LINKS):
- Как это работает, Тарифы, Архитектура, ROI, Кейсы, Безопасность, Войти
- CTA «Запросить демо» → **mailto** (НЕ форма)

**Статический header**:
- Те же пункты навигации
- CTA «Запросить демо» → **/request-demo.html**

---

## 4. FOOTER

| Версия | Файл | Содержимое |
|--------|------|------------|
| **React Footer** | `src/components/Footer.tsx` | FOOTER_LINKS из siteConfig |
| **Статический footer** | `public/shared/footer.html` | Продукт, Компания, Документы |

---

## 5. HERO

| Где | Файл | Текущий заголовок |
|-----|------|-------------------|
| **Главная (prod)** | `public/ikamdocs_v5_index.html` | «Единое ядро для номенклатуры и маркировки» |
| **React Home** | `src/pages/Home.tsx` | «Управляйте номенклатурой и маркировкой в одной системе» |

React Home отображается только в dev (в проде / отдаёт статику).

---

## 6. СУЩЕСТВУЮЩИЕ СТРАНИЦЫ

### React (SPA)

| URL | Компонент | Описание |
|-----|-----------|----------|
| `/` | **N/A** | Nginx отдаёт ikamdocs_v5_index.html |
| `/pricing` | Pricing.tsx | Тарифы |
| `/company` | Company.tsx | О компании |
| `/how-it-works` | HowItWorks.tsx | Как это работает |
| `/privacy` | Privacy.tsx | Политика конфиденциальности |
| `/agreement` | Agreement.tsx | Соглашение о персональных данных |
| `/login` | Login.tsx | Вход |
| `/register` | Register.tsx | Регистрация |
| `/forgot-password` | ForgotPassword.tsx | Восстановление пароля |
| `/reset-password` | ResetPassword.tsx | Сброс пароля |
| `/cabinet/*` | Cabinet.tsx | Личный кабинет |

### Статические HTML

| URL | Файл |
|-----|------|
| `/` | ikamdocs_v5_index.html |
| `/request-demo.html` | request-demo.html |
| `/request-security.html` | request-security.html |
| `/request-presentation.html` | request-presentation.html |
| `/request-cases.html` | request-cases.html |
| `/investor.html` | investor.html |
| `/about.html` | about.html |
| `/architecture.html` | architecture.html |
| `/i/deck.html` | i/deck.html |
| `/presentations/*` | presentations/*.html |

---

## 7. ФОРМЫ ЗАЯВОК

| Форма | Расположение | Endpoint | Метод |
|-------|--------------|----------|-------|
| **Заявка с главной** | Home.tsx CaptureForm | `/landing-form` | POST |
| **Запросить демо** | request-demo.html | `/landing-form` | POST |
| **Описание безопасности** | request-security.html | `/landing-form` | POST |
| **Запросить презентацию** | request-presentation.html | `/landing-form` | POST |
| **Примеры кейсов** | request-cases.html | `/landing-form` | POST |

**Схема тела запроса (все формы):**
```json
{
  "subject": "string (обязательно)",
  "name": "string (обязательно)",
  "email": "string (обязательно)",
  "phone": "string",
  "company": "string",
  "message": "string"
}
```

**Backend:** `app/routers/public.py` → `POST /landing-form`  
**Nginx:** `location /landing-form` → proxy на 8000  
**Vite proxy:** `/landing-form` → localhost:8000

---

## 8. CTA КНОПКИ

### Главная (ikamdocs_v5_index.html)

| Кнопка | Ссылка | Связь с формой |
|--------|--------|----------------|
| Запросить демо | /request-demo.html | ✅ Страница с формой |
| Попробовать бесплатно | /register | Регистрация |
| Запросить примеры кейсов | /request-cases.html | ✅ Страница с формой |
| Запросить описание безопасности | /request-security.html | ✅ Страница с формой |
| Запросить условия | mailto | — |
| Обсудить внедрение | mailto | — |
| Запросить расчёт | mailto | — |

### React Header (Header.tsx)

| Кнопка | Ссылка | Связь с формой |
|--------|--------|----------------|
| Запросить демо | mailto:ikam2000@yandex.ru | ❌ Не форма |

### React Home (если используется)

| Кнопка | Ссылка | Связь с формой |
|--------|--------|----------------|
| Запросить демо | mailto | ❌ |
| Попробовать бесплатно | /register | Регистрация |
| CaptureForm | Встроенная форма | ✅ POST /landing-form |
| Начать внедрение | /register | Регистрация |

---

## 9. ENDPOINTS ФОРМ

| Endpoint | Метод | Не менять |
|----------|-------|-----------|
| `/landing-form` | POST | ✅ Да |

Формы **не** используют `/api/contact` — только `/landing-form`.

---

## 10. ROUTING

**App.tsx:**
```
/scan/entity/:type/by-code/:code  → QREntityByCodePage
/scan/entity/:type/:id            → QREntityPage
/ (Layout)
  ├── index        → Home
  ├── pricing      → Pricing
  ├── company      → Company
  ├── how-it-works → HowItWorks
  ├── privacy      → Privacy
  ├── agreement    → Agreement
  ├── login        → Login
  ├── register     → Register
  ├── forgot-password → ForgotPassword
  ├── reset-password  → ResetPassword
  └── cabinet/*    → Cabinet
```

**Nginx (критично для /):**
- `location = /` → `ikamdocs_v5_index.html`

---

## 11. ФАЙЛЫ, КОТОРЫЕ НУЖНО ИЗМЕНИТЬ

### Для редизайна главной и новых страниц

| Файл | Назначение |
|------|------------|
| `public/ikamdocs_v5_index.html` | Главная (prod) — hero, блоки, CTA |
| `public/shared/header.html` | Header для статических страниц |
| `public/shared/footer.html` | Footer для статических страниц |
| `src/components/Header.tsx` | Header для React-страниц |
| `src/components/Footer.tsx` | Footer для React-страниц |
| `src/shared/siteConfig.ts` | NAV_LINKS, FOOTER_LINKS, SITE |
| `src/pages/Home.tsx` | React-версия главной (dev, резерв) |
| `src/pages/Pricing.tsx` | Тарифы |
| `src/App.tsx` | Маршруты (добавление /platform, /integrations и т.д.) |
| `src/index.css` | Глобальные стили |

### Страницы форм (не менять endpoint)

| Файл | Endpoint |
|------|----------|
| `public/request-demo.html` | POST /landing-form |
| `public/request-security.html` | POST /landing-form |
| `public/request-presentation.html` | POST /landing-form |
| `public/request-cases.html` | POST /landing-form |
| `src/pages/Home.tsx` (CaptureForm) | POST /landing-form |

---

## 12. SEO ГЛАВНОЙ

**Файл:** `public/ikamdocs_v5_index.html`

| Элемент | Текущее значение |
|---------|-----------------|
| title | ikamdocs — Управление номенклатурой, QR‑маркировкой и документооборотом \| B2B SaaS |
| meta description | ikamdocs — B2B SaaS для управления номенклатурой, QR‑маркировкой... |
| meta keywords | номенклатура, маркировка, QR-коды, Честный знак... |
| canonical | https://ikamdocs.ru/ |
| og:* | Настроены |
| schema.org | Organization, SoftwareApplication |

**Не менять** без необходимости — SEO критично.

---

## 13. БЕЗОПАСНЫЙ ПЛАН ИЗМЕНЕНИЙ

### Этап 1. Аудит ✅
- Выполнен.

### Этап 2. Добавление страниц (без удаления старых)
- Добавить роуты: `/platform`, `/integrations`, `/security`, `/api`, `/use-cases`
- Создать компоненты-страницы.
- В header/footer добавлять новые ссылки **рядом** со старыми.

### Этап 3. Редизайн главной
- Обновить блоки в `ikamdocs_v5_index.html` (или перейти на React Home + изменить nginx).
- Сохранить CTA-ссылки: `/request-demo.html`, `/register`.
- Сохранить meta title/description или улучшить без потери ключевых слов.

### Этап 4. Формы
- **Не менять** endpoint `/landing-form`.
- **Не менять** структуру JSON (subject, name, email, phone, company, message).
- При редизайне страниц форм — сохранять fetch('/landing-form', { method: 'POST', ... }).

### Этап 5. Header/Footer
- Добавлять пункты Platform, Integrations, Security, API, Use cases, Pricing.
- «Запросить демо» оставить как ссылку на `/request-demo.html` (статический header) или заменить mailto на `/request-demo.html` (React Header).

### Этап 6. Компоненты
- Вынести Hero, PlatformSection, IntegrationGrid и т.д. в переиспользуемые компоненты.
- Использовать их и в статическом HTML (если остаётся), и в React.

### Риски
1. **Главная на статике vs React:** Сейчас / = статика. Консолидация в React упростит поддержку, но потребует смены nginx (`location = /` → `try_files /index.html`).
2. **Header рассинхрон:** Два header (React и static) — нужно синхронизировать ссылки при изменениях.

---

## 14. ИТОГОВЫЕ Чек-листы

### Не ломать
- [ ] URL: `/`, `/pricing`, `/login`, `/register`, `/request-demo.html`, `/request-security.html`, `/request-cases.html`, `/request-presentation.html`, `/architecture.html`, `/investor.html`, `/about.html`
- [ ] Endpoint: `POST /landing-form`
- [ ] CTA «Запросить демо» → страница с формой или mailto
- [ ] SEO главной: title, description, canonical
- [ ] Backend, API, nginx

### Можно менять
- Стили, типографика, отступы
- Тексты блоков (Hero, Problem, Platform и т.д.)
- Добавление новых страниц и роутов
- Структура компонентов
