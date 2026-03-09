# Enterprise SaaS редизайн — ikamdocs

**Дата:** 2026-03-07  
**База:** landing-design_new

---

## 1. Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `frontend/public/ikamdocs_v5_index.html` | Полное обновление до enterprise SaaS дизайна: Hero с архитектурой, Problem, Platform, Architecture, Integrations, Security, Сценарии, CaptureForm (POST /landing-form), CTA. Shared header/footer, light theme. |
| `frontend/src/components/marketing/marketing.css` | Enterprise design system: переменные, кнопки, карточки (.mk-feature-card, .mk-security-card и др.), responsive breakpoints |
| `frontend/src/components/marketing/ArchitectureDiagram.tsx` | Поток данных: ERP/Excel/Marketplace → IKAMDOCS (Catalog/Suppliers/Docs) → API/Analytics |
| `frontend/src/components/marketing/HeroSection.tsx` | Hero с архитектурной схемой в панели, метрики, kicker |
| `frontend/src/components/marketing/CTASection.tsx` | Поддержка secondaryHref для .html (request-cases.html и т.д.) — <a> вместо <Link> |
| `frontend/src/pages/Home.tsx` | HeroSection, ProblemBlock, Architecture block, расширенные секции, CaptureForm (POST /landing-form сохранён) |
| `frontend/src/pages/Platform.tsx` | 6 модулей, Architecture block, BANDS (ядро, документы, интеграции), CTASection |
| `frontend/src/pages/Integrations.tsx` | Marketplace / Data import / API интеграции, CTASection |
| `frontend/src/pages/Security.tsx` | Architecture diagram, 6 карточек (Tenant, RLS, Webhook и др.), CTASection |
| `frontend/src/pages/ApiPage.tsx` | REST API, Webhooks, Импорт — блоки с примерами кода, CTASection |
| `frontend/src/pages/UseCases.tsx` | 4 сценария (Проблема/Решение/Эффект), mk-use-case-card, responsive grid |

---

## 2. Созданные / обновлённые компоненты

| Компонент | Описание |
|-----------|----------|
| **Container** | max-width 1200px, padding 32px |
| **Section** | padding 120px, background: default/light/dark |
| **SectionHeader** | label (kicker), title, description |
| **FeatureCard** | icon, title, description, border-radius 20px, hover |
| **FeatureGrid** | grid 3/2/1 cols, gap 28px, responsive |
| **IntegrationCard** | logo, name, description |
| **IntegrationGrid** | сетка интеграций (shopify, wb, ozon, excel, csv, api, erp) |
| **SecurityCard** | kicker, title, description |
| **HeroSection** | headline, subheadline, CTA, stat-row (4 метрики), hero-panel с ArchitectureDiagram compact |
| **ArchitectureDiagram** | sources → IKAMDOCS core → outputs (compact/full) |
| **DiagramBlock** | обёртка для ArchitectureDiagram |
| **CTASection** | title, subtitle, primary/secondary кнопки, поддержка .html в secondaryHref |

---

## 3. Дизайн-система (marketing.css)

- **Цвета:** --mk-primary #0ea5e9, --mk-ink #0f172a, --mk-text #1e293b, --mk-muted #64748b
- **Кнопки:** btn-mk-primary (gradient), btn-mk-secondary (border)
- **Карточки:** mk-feature-card, mk-security-card, mk-integration-card, mk-band-card, mk-tier-card, mk-use-case-card — единый hover (translateY -4px, shadow)
- **Responsive:** 1024px (2 cols), 768px (1 col, hero stack), 480px (padding 16px)

---

## 4. Архитектурная схема

```
ERP / Excel    Marketplace    Supplier APIs
        ↓
    IKAMDOCS
Catalog | Suppliers | Docs | Supplies | QR | Mapping
        ↓
   API | Analytics | Exports
```

---

## 5. Формы и CTA (без изменений)

| Форма / CTA | Endpoint / URL |
|-------------|----------------|
| Home CaptureForm | POST /landing-form |
| Запросить демо | /request-demo.html |
| Запросить описание безопасности | /request-security.html |
| Запросить кейсы | /request-cases.html |
| Запросить презентацию | /request-presentation.html |
| Попробовать платформу | /register |

---

## 6. Routing (без изменений)

- /, /platform, /integrations, /security, /api, /use-cases, /pricing, /login, /register, /privacy, /agreement, /cabinet/*

---

## 7. Backend

Без изменений.
