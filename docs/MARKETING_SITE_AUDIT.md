# Аудит маркетингового сайта ikamdocs

**Область:** только публичные страницы (до входа в личный кабинет).  
**Дата:** 2026-03-06

---

## 1. СТРУКТУРА САЙТА

### 1.1 Два источника контента

| Источник | Как работает |
|----------|--------------|
| **Главная (/) ** | Nginx отдаёт статический `ikamdocs_v5_index.html`. React не используется. |
| **SPA React** | Для остальных путей: `try_files $uri $uri/ /index.html` → загрузка SPA. |
| **Статические HTML** | Отдельные файлы в `public/`: request-demo.html, architecture.html и др. |

### 1.2 Карта страниц маркетингового сайта

#### Статические HTML (из `public/`, в `dist/` после сборки)

| URL | Файл | Контекст |
|-----|------|----------|
| `/` | ikamdocs_v5_index.html | Главная (лендинг) |
| `/request-demo.html` | request-demo.html | Форма «Запросить демо» |
| `/request-security.html` | request-security.html | Форма «Описание безопасности» |
| `/request-presentation.html` | request-presentation.html | Форма «Тех. презентация» |
| `/request-cases.html` | request-cases.html | Форма «Примеры кейсов» |
| `/investor.html` | investor.html | Инвесторам |
| `/about.html` | about.html | О нас |
| `/architecture.html` | architecture.html | Архитектура |
| `/i/deck.html` | i/deck.html | — |
| `/presentations/*` | presentations/*.html | Презентации |

#### React-страницы (SPA)

| URL | Компонент | Контекст |
|-----|-----------|----------|
| `/pricing` | Pricing.tsx | Тарифы |
| `/platform` | Platform.tsx | Платформа |
| `/integrations` | Integrations.tsx | Интеграции |
| `/security` | Security.tsx | Безопасность |
| `/api` | ApiPage.tsx | API |
| `/use-cases` | UseCases.tsx | Сценарии использования |
| `/company` | Company.tsx | О компании |
| `/how-it-works` | HowItWorks.tsx | Как это работает |
| `/privacy` | Privacy.tsx | Политика конфиденциальности |
| `/agreement` | Agreement.tsx | Соглашение о персональных данных |
| `/login` | Login.tsx | Вход |
| `/register` | Register.tsx | Регистрация |
| `/forgot-password` | ForgotPassword.tsx | Восстановление пароля |
| `/reset-password` | ResetPassword.tsx | Сброс пароля |

#### Вне маркетинга (не трогать)

| URL | Описание |
|-----|----------|
| `/cabinet/*` | Личный кабинет (требует авторизацию) |
| `/scan/entity/:type/:id` | Просмотр сущности по QR (публичный) |
| `/scan/entity/:type/by-code/:code` | Просмотр по коду (публичный) |

---

## 2. LAYOUT И КОМПОНЕНТЫ

### 2.1 Layout

| Контекст | Layout | Header | Footer |
|----------|--------|--------|--------|
| **Главная (/)** | Встроен в ikamdocs_v5_index.html | shared/header.html (через layout.js) | shared/footer.html |
| **Статические формы** (request-*.html) | Встроен в страницу | shared/header.html | shared/footer.html |
| **React-страницы** | Layout.tsx | Header.tsx | Footer.tsx |
| **Личный кабинет** | Layout.tsx | CabinetHeader.tsx | — |

### 2.2 Конфиг навигации

- **React:** `src/shared/siteConfig.ts` → `NAV_LINKS`, `FOOTER_LINKS`
- **Статика:** `public/shared/header.html`, `public/shared/footer.html` — разметка вручную

---

## 3. ФОРМЫ ЗАЯВОК (маркетинг)

Все формы отправляют **POST** на endpoint **`/landing-form`**.

### 3.1 Список форм

| # | Страница | Файл | subject (в письме) |
|---|----------|------|---------------------|
| 1 | Запросить демо | request-demo.html | `Запрос на демо — ikamdocs` |
| 2 | Описание безопасности | request-security.html | `Запрос описания безопасности — ikamdocs` |
| 3 | Тех. презентация | request-presentation.html | `Запрос тех. презентации — ikamdocs` |
| 4 | Примеры кейсов | request-cases.html | `Запрос примеров кейсов — ikamdocs` |
| 5 | CaptureForm на главной | Home.tsx | `Заявка с главной страницы — ikamdocs` |

**Примечание:** Home.tsx отображается только в dev; в проде главная — `ikamdocs_v5_index.html` (статика) и CaptureForm на ней нет.

### 3.2 Схема тела запроса (все формы)

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

### 3.3 Endpoint и прокси

- **Backend:** `app/routers/public.py` → `POST /landing-form`
- **Nginx:** `location /landing-form` → proxy на 8000
- **Vite (dev):** `'/landing-form': { target: 'http://localhost:8000' }`

---

## 4. CTA-КНОПКИ

### 4.1 Header (статический и React)

| Кнопка | Ссылка |
|--------|--------|
| Запросить демо | `/request-demo.html` |

### 4.2 Главная (ikamdocs_v5_index.html)

| Кнопка | Ссылка |
|--------|--------|
| Запросить демо | /request-demo.html |
| Попробовать бесплатно | /register |
| Запросить примеры кейсов | /request-cases.html |
| Запросить описание безопасности | /request-security.html |
| Запросить условия | mailto |
| Обсудить внедрение | mailto |
| Запросить расчёт | mailto |

### 4.3 Секции главной

- Hero, Platform, Integrations, Security, Pricing, ROI, Final CTA — кнопки ведут на формы или /register.

---

## 5. ФАЙЛЫ МАРКЕТИНГОВОГО САЙТА

### 5.1 Основные

| Файл | Назначение |
|------|------------|
| `public/ikamdocs_v5_index.html` | Главная |
| `public/shared/header.html` | Шапка для статики |
| `public/shared/footer.html` | Подвал для статики |
| `public/shared/layout.js` | Подключение header/footer |
| `public/shared/form-masks.js` | Маска телефона |

### 5.2 Страницы форм

| Файл |
|------|
| `public/request-demo.html` |
| `public/request-security.html` |
| `public/request-presentation.html` |
| `public/request-cases.html` |

### 5.3 Прочие статические страницы

| Файл |
|------|
| `public/investor.html` |
| `public/about.html` |
| `public/architecture.html` |

### 5.4 React (маркетинг)

| Файл |
|------|
| `src/components/Header.tsx` |
| `src/components/Footer.tsx` |
| `src/components/Layout.tsx` |
| `src/shared/siteConfig.ts` |
| `src/pages/Home.tsx` |
| `src/pages/Pricing.tsx` |
| `src/pages/Platform.tsx` |
| `src/pages/Integrations.tsx` |
| `src/pages/Security.tsx` |
| `src/pages/ApiPage.tsx` |
| `src/pages/UseCases.tsx` |
| `src/pages/Company.tsx` |
| `src/pages/HowItWorks.tsx` |
| `src/pages/Privacy.tsx` |
| `src/pages/Agreement.tsx` |
| `src/pages/Login.tsx` |
| `src/pages/Register.tsx` |
| `src/pages/ForgotPassword.tsx` |
| `src/pages/ResetPassword.tsx` |

---

## 6. ROUTING (App.tsx)

```
/scan/entity/:type/by-code/:code  → QREntityByCodePage (публичный QR)
/scan/entity/:type/:id           → QREntityPage (публичный QR)
/ (Layout)
  ├── index           → Home
  ├── pricing         → Pricing
  ├── platform        → Platform
  ├── integrations    → Integrations
  ├── security        → Security
  ├── api             → ApiPage
  ├── use-cases       → UseCases
  ├── company         → Company
  ├── how-it-works    → HowItWorks
  ├── privacy         → Privacy
  ├── agreement       → Agreement
  ├── login           → Login
  ├── register        → Register
  ├── forgot-password → ForgotPassword
  ├── reset-password  → ResetPassword
  └── cabinet/*       → Cabinet (не маркетинг)
```

---

## 7. КРИТИЧНЫЕ ОГРАНИЧЕНИЯ

- Не менять URL страниц.
- Не менять endpoint форм: `POST /landing-form`.
- Не менять структуру JSON форм (subject, name, email, phone, company, message).
- CTA «Запросить демо» должен вести на страницу с формой.
- Сохранять SEO главной (title, description, canonical).
