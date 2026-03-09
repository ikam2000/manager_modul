# Результат редизайна маркетингового сайта ikamdocs

**Дата:** 2026-03-06

---

## 1. Изменённые файлы

### Главная страница (статическая)
- `frontend/public/ikamdocs_v5_index.html` — Hero, Problem, Platform, Integrations, Security, Use Cases, Architecture, Final CTA, SEO
  - Problem: «Почему управление номенклатурой ломается» (карточки: Excel каталоги, Разрозненные поставщики, Ошибки синхронизации, Нет контроля изменений)
  - Hero CTA: «Запросить демо» + «Попробовать»
  - Интеграции (chips): Shopify, Wildberries, Ozon, Excel, CSV, API, ERP
  - Use Cases: Производство, Дистрибуция, Marketplace sellers, Retail

### Shared (статические страницы)
- `frontend/public/shared/header.html` — русские названия: Платформа, Интеграции, Безопасность, Сценарии
- `frontend/public/shared/footer.html` — русские названия в блоке «Продукт»

### React — конфиг и layout
- `frontend/src/shared/siteConfig.ts` — NAV_LINKS, FOOTER_LINKS с русскими названиями
- `frontend/src/index.css` — переменные маркетинговой дизайн-системы, мобильная вёрстка .mk-feature-grid

### React — маркетинговые страницы
- `frontend/src/pages/Platform.tsx` — Section, SectionHeader, FeatureGrid, FeatureCard
- `frontend/src/pages/Integrations.tsx` — IntegrationGrid, секции: Маркетплейсы, Работа с данными, Автоматизация
- `frontend/src/pages/Security.tsx` — ArchitectureDiagram, SecurityCard
- `frontend/src/pages/ApiPage.tsx` — REST API, Webhooks, Data import
- `frontend/src/pages/UseCases.tsx` — секции с problem/solution/benefit

### React — компоненты
- `frontend/src/components/marketing/FeatureGrid.tsx` — добавлен className для responsive
- `frontend/src/components/marketing/IntegrationGrid.tsx` — удалён неиспользуемый import
- `frontend/src/components/marketing/SecurityCard.tsx` — удалён неиспользуемый import

---

## 2. Новые компоненты дизайн-системы

| Компонент | Описание |
|-----------|----------|
| `Section` | Контейнер секции с max-width 1200px, padding 32px |
| `SectionHeader` | Заголовок, подзаголовок, label |
| `FeatureCard` | Карточка с иконкой, заголовком, описанием |
| `FeatureGrid` | Сетка карточек (responsive: 1 колонка на ≤768px) |
| `IntegrationGrid` | Сетка интеграций (Shopify, WB, Ozon и др.) |
| `SecurityCard` | Карточка безопасности с kicker |
| `ArchitectureDiagram` | Sources → IKAMDOCS CORE → API/Analytics/Exports |
| `CTASection` | Секция с CTA-кнопками |
| `HeroSection` | Hero с заголовком и CTA |

---

## 3. Страницы

| URL | Описание |
|-----|----------|
| `/` | Главная (ikamdocs_v5_index.html) |
| `/platform` | Платформа: 6 модулей (Каталог, Поставщики, Документы, QR, Интеграции, Аналитика) |
| `/integrations` | Интеграции: Маркетплейсы, Данные, Автоматизация |
| `/security` | Безопасность: Архитектура + 6 карточек |
| `/api` | API: REST, Webhooks, Импорт данных |
| `/use-cases` | Сценарии: Производство, Дистрибуция, Marketplace, Retail |

---

## 4. Формы — проверено

| Форма | Endpoint | Статус |
|-------|----------|--------|
| request-demo.html | POST /landing-form | Без изменений |
| request-security.html | POST /landing-form | Без изменений |
| request-presentation.html | POST /landing-form | Без изменений |
| request-cases.html | POST /landing-form | Без изменений |
| Home.tsx CaptureForm | POST /landing-form | Без изменений |

---

## 5. Endpoints — не изменены

- `POST /landing-form` — без изменений
- Backend, nginx, API — без изменений

---

## 6. Header и Footer (русские названия)

**Header:** Платформа, Интеграции, Безопасность, Сценарии, API, Тарифы, Как это работает, Архитектура, ROI, Кейсы, Инвесторам, Войти, Запросить демо

**Footer:** Платформа, Интеграции, Безопасность, API, Сценарии, Тарифы, Как это работает

---

## 7. Мобильная вёрстка

- Breakpoints: 1200, 768, 480
- FeatureGrid: 1 колонка на ≤768px
- Header: burger menu на ≤767px
- Главная: stack layout на mobile (уже было в ikamdocs_v5_index.html)

---

## 8. SEO

- Главная: meta title, description, canonical сохранены
- React-страницы: document.title в useEffect

---

## 9. URL — сохранены

- /, /pricing, /login, /register
- /request-demo.html, /request-security.html, /request-cases.html, /request-presentation.html
- /architecture.html, /investor.html, /about.html
- /platform, /integrations, /security, /api, /use-cases

---

## 10. CTA-кнопки

- «Запросить демо» → `/request-demo.html`
- «Попробовать» → `/register`
- «Запросить примеры кейсов» → `/request-cases.html`
- «Запросить описание безопасности» → `/request-security.html`
- «Подробнее о платформе» → `/platform`
- «Все интеграции» → `/integrations`
- «Архитектура» → `/architecture.html`
