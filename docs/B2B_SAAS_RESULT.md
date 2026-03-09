# Результат — ikamdocs как B2B SaaS продукт

**Дата:** 2026-03-06

---

## 1. Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `src/shared/siteConfig.ts` | NAV_LINKS (7 пунктов), FOOTER_LINKS (Продукт, Компания: О платформе, Правовая: Политика) |
| `src/components/Footer.tsx` | Заголовок «Правовая информация» |
| `src/pages/Home.tsx` | Hero subheadline, Problem title, блоки Сценарии и Тарифы |
| `src/pages/Integrations.tsx` | Marketplace / Импорт данных / API интеграции |
| `src/pages/UseCases.tsx` | «Marketplace продавцы» |
| `src/pages/Pricing.tsx` | Marketing Section, fallback при ошибке API |
| `public/shared/header.html` | Меню: Платформа, Интеграции, Безопасность, Сценарии, API, Тарифы, Войти, Запросить демо |
| `public/shared/footer.html` | Продукт, Компания (О платформе), Правовая информация |
| `public/ikamdocs_v5_index.html` | Hero subheadline, Problem title |

---

## 2. UI компоненты (reusable)

| Компонент | Описание |
|-----------|----------|
| Section | padding 120px, Container |
| SectionHeader | label, title, description |
| FeatureCard | border-radius 12px, padding 24px, #e5e7eb |
| FeatureGrid | 3 col desktop, 2 tablet, 1 mobile |
| IntegrationCard | logo, name, description |
| CTASection | CTA кнопки |
| HeroSection | headline, subheadline, CTA |
| DiagramBlock | Architecture diagram |
| Container | max-width 1200px, padding 32px |

---

## 3. Страницы

| URL | Описание |
|-----|----------|
| `/` | Hero, Проблема, Платформа, Интеграции, Безопасность, Сценарии, Тарифы, CTA |
| `/platform` | 6 модулей |
| `/integrations` | Marketplace, Импорт данных, API интеграции |
| `/security` | Architecture + 6 карточек |
| `/api` | REST API, Webhooks, Импорт, Automation |
| `/use-cases` | Производство, Дистрибуция, Marketplace продавцы, Retail |
| `/pricing` | Тарифы (API или fallback) |

---

## 4. Меню (русский)

**Header:** Платформа, Интеграции, Безопасность, Сценарии, API, Тарифы, Войти, Запросить демо

**Footer:**
- Продукт: Платформа, Интеграции, Безопасность, API
- Компания: О платформе
- Правовая информация: Политика конфиденциальности

---

## 5. Формы — проверено

| Форма | Endpoint | Статус |
|-------|----------|--------|
| request-demo.html | POST /landing-form | ✅ |
| request-security.html | POST /landing-form | ✅ |
| request-presentation.html | POST /landing-form | ✅ |
| request-cases.html | POST /landing-form | ✅ |
| Home CaptureForm | POST /landing-form | ✅ |

---

## 6. Endpoints — не изменены

- POST /landing-form
- Routing
- CTA ссылки (/request-demo.html, /register, /platform и т.д.)
