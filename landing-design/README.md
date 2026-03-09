# Страницы до личного кабинета — ikamdocs

Папка для дизайна и доработки всех публичных страниц (до входа в личный кабинет).

**Обновлено:** B2B SaaS дизайн (Stripe/Vercel/Linear). Все файлы синхронизированы с frontend.

## Структура

```
landing-design/
├── html/                    # Статические HTML-страницы
│   ├── index.html           # Главная (B2B SaaS design)
│   ├── request-demo.html
│   ├── request-security.html
│   ├── request-presentation.html
│   ├── request-cases.html
│   ├── investor.html
│   ├── about.html
│   ├── architecture.html
│   ├── shared/              # Общие шапка, подвал, скрипты
│   │   ├── header.html
│   │   ├── footer.html
│   │   ├── layout.js
│   │   └── form-masks.js
│   ├── images/
│   └── favicons/
├── react/                   # React-страницы (копия frontend/src)
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Platform.tsx
│   │   ├── Integrations.tsx
│   │   ├── Security.tsx
│   │   ├── ApiPage.tsx
│   │   ├── UseCases.tsx
│   │   ├── Pricing.tsx
│   │   └── ...
│   ├── components/
│   │   ├── marketing/       # Section, SectionHeader, FeatureCard, HeroSection, etc.
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── shared/
│   │   └── siteConfig.ts
│   └── contexts/
└── api/
    └── landing-form-schema.md
```

## Навигация (header)

Платформа, Интеграции, Безопасность, Сценарии, API, Тарифы, Войти, Запросить демо

## Footer

- **Продукт:** Платформа, Интеграции, Безопасность, API
- **Компания:** О платформе
- **Правовая информация:** Политика конфиденциальности

## CTA
| Кнопка | Ссылка |
|--------|--------|
| Запросить демо | /request-demo.html |
| Попробовать | /register |

## Формы заявок → API `/landing-form`

Все формы отправляют POST на **`/landing-form`** (backend FastAPI).

### Тело запроса (JSON)

```json
{
  "subject": "Заголовок заявки (обязательно)",
  "name": "Имя (обязательно)",
  "email": "email@example.com (обязательно)",
  "phone": "+7 (999) 000-00-00",
  "company": "Название компании",
  "message": "Комментарий"
}
```

### Примеры subject по страницам

| Страница | subject |
|----------|---------|
| request-demo.html | `Запрос на демо — ikamdocs` |
| request-security.html | `Запрос описания безопасности — ikamdocs` |
| request-presentation.html | (см. в файле) |
| request-cases.html | (см. в файле) |
| Главная (форма захвата) | `Заявка с главной страницы — ikamdocs` |

### Важно
- После успешной отправки: `window.history.replaceState(..., '?sent=1')` и скрытие формы
- При ошибке: показ сообщения, кнопка снова активна

## Как запустить превью

```bash
cd landing-design
npx serve html
# Открыть http://localhost:3000
```

Пути `/shared/`, `/images/`, `/favicons/` работают относительно корня `html/`.

## Интеграция обратно в проект

1. **HTML**:
   - `index.html` → скопировать как `frontend/public/ikamdocs_v5_index.html` (главная в проде)
   - остальные `*.html` → в `frontend/public/`
   - `shared/` → в `frontend/public/shared/`
   - `images/`, `favicons/` — при изменении скопировать в `frontend/public/`
2. **React**: изменения вносить в `frontend/src/pages/` и `frontend/src/components/`
3. После правок: `npm run build` в `frontend/`, затем деплой
