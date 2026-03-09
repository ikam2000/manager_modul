# Результат унификации дизайна — Enterprise SaaS (Stripe/Vercel/Linear)

**Дата:** 2026-03-06

---

## 1. Созданные UI компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| **Container** | `Container.tsx` | max-width 1200px, margin auto, padding 32px |
| **Section** | `Section.tsx` | padding 120px 0, использует Container |
| **SectionHeader** | `SectionHeader.tsx` | label, title, description |
| **FeatureCard** | `FeatureCard.tsx` | border-radius 12px, padding 24px, white bg, border #e5e7eb, shadow-sm |
| **FeatureGrid** | `FeatureGrid.tsx` | 3 col desktop, 2 tablet, 1 mobile, gap 32px |
| **IntegrationCard** | `IntegrationCard.tsx` | logo, name, description |
| **IntegrationGrid** | `IntegrationGrid.tsx` | Grid интеграций (Shopify, WB, Ozon, Excel, CSV, API, ERP) |
| **SecurityCard** | `SecurityCard.tsx` | kicker, title, description — enterprise стиль |
| **CTASection** | `CTASection.tsx` | Секция с CTA-кнопками |
| **HeroSection** | `HeroSection.tsx` | Двухколоночный hero: headline + diagram |
| **DiagramBlock** | `DiagramBlock.tsx` | Обёртка для ArchitectureDiagram |
| **ArchitectureDiagram** | `ArchitectureDiagram.tsx` | Sources → IKAMDOCS CORE → Outputs |

---

## 2. Изменённые файлы

### Компоненты
- `src/components/marketing/Container.tsx` — **новый**
- `src/components/marketing/Section.tsx` — обновлён (padding 120px, Container)
- `src/components/marketing/SectionHeader.tsx` — обновлён (description)
- `src/components/marketing/FeatureCard.tsx` — обновлён (border #e5e7eb, shadow-sm)
- `src/components/marketing/FeatureGrid.tsx` — обновлён (3 col, gap 32px)
- `src/components/marketing/IntegrationCard.tsx` — **новый**
- `src/components/marketing/IntegrationGrid.tsx` — обновлён (IntegrationCard, icons)
- `src/components/marketing/SecurityCard.tsx` — обновлён (border #e5e7eb)
- `src/components/marketing/ArchitectureDiagram.tsx` — обновлён (compact prop)
- `src/components/marketing/DiagramBlock.tsx` — **новый**
- `src/components/marketing/CTASection.tsx` — обновлён (Container, btn-mk-*)
- `src/components/marketing/HeroSection.tsx` — переработан (Stripe-style, 2 колонки)
- `src/components/marketing/index.ts` — экспорты
- `src/components/marketing/marketing.css` — **новый** (btn-mk-primary, btn-mk-secondary, responsive)

### Страницы
- `src/pages/Home.tsx` — переработан (только marketing компоненты)
- `src/pages/Platform.tsx` — btn-mk-* классы
- `src/pages/Integrations.tsx` — IntegrationGrid с icon, btn-mk-*
- `src/pages/Security.tsx` — btn-mk-*
- `src/pages/ApiPage.tsx` — btn-mk-*
- `src/pages/UseCases.tsx` — btn-mk-*

### Конфиг и стили
- `src/shared/siteConfig.ts` — FOOTER_LINKS (product, company, legal)
- `src/components/Footer.tsx` — legal вместо docs
- `src/index.css` — import marketing.css

---

## 3. Формы — не сломаны

| Форма | Endpoint | Статус |
|-------|----------|--------|
| request-demo.html | POST /landing-form | ✅ Без изменений |
| request-security.html | POST /landing-form | ✅ Без изменений |
| request-presentation.html | POST /landing-form | ✅ Без изменений |
| request-cases.html | POST /landing-form | ✅ Без изменений |
| Home.tsx CaptureForm | POST /landing-form | ✅ Без изменений |

---

## 4. Endpoints — не изменены

- `POST /landing-form` — без изменений
- Routing — без изменений
- CTA ссылки — без изменений (/request-demo.html, /register, /platform и т.д.)

---

## 5. Дизайн-токены

- **Primary:** #0ea5e9
- **Dark:** #0f172a
- **Text:** #1e293b
- **Background:** #f8fafc
- **Border cards:** #e5e7eb
- **H1:** 56px, line-height 1.1
- **H2:** 40px
- **H3:** 24px
- **Body:** 16px
