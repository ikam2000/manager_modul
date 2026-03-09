# Этап 1 — Аудит маркетингового сайта (вывод)

## Список страниц

### Статические HTML
| URL | Файл |
|-----|------|
| / | ikamdocs_v5_index.html |
| /request-demo.html | request-demo.html |
| /request-security.html | request-security.html |
| /request-presentation.html | request-presentation.html |
| /request-cases.html | request-cases.html |
| /investor.html | investor.html |
| /about.html | about.html |
| /architecture.html | architecture.html |
| /i/deck.html | i/deck.html |
| /presentations/* | presentations/*.html |

### React SPA
| URL | Компонент |
|-----|-----------|
| /pricing | Pricing.tsx |
| /platform | Platform.tsx |
| /integrations | Integrations.tsx |
| /security | Security.tsx |
| /api | ApiPage.tsx |
| /use-cases | UseCases.tsx |
| /company | Company.tsx |
| /how-it-works | HowItWorks.tsx |
| /privacy | Privacy.tsx |
| /agreement | Agreement.tsx |
| /login | Login.tsx |
| /register | Register.tsx |
| /forgot-password | ForgotPassword.tsx |
| /reset-password | ResetPassword.tsx |

## Список форм
| # | Страница | Endpoint | subject |
|---|----------|----------|--------|
| 1 | request-demo.html | POST /landing-form | Запрос на демо — ikamdocs |
| 2 | request-security.html | POST /landing-form | Запрос описания безопасности — ikamdocs |
| 3 | request-presentation.html | POST /landing-form | Запрос тех. презентации — ikamdocs |
| 4 | request-cases.html | POST /landing-form | Запрос примеров кейсов — ikamdocs |
| 5 | Home.tsx CaptureForm | POST /landing-form | Заявка с главной страницы — ikamdocs |

## Endpoints форм
- **POST /landing-form** — единственный endpoint для всех форм заявок

## Список CTA
| Кнопка | Ссылка |
|--------|--------|
| Запросить демо | /request-demo.html |
| Попробовать / Попробовать бесплатно | /register |
| Запросить примеры кейсов | /request-cases.html |
| Запросить описание безопасности | /request-security.html |
| Запросить условия | mailto |
| Обсудить внедрение | mailto |
| Запросить расчёт | mailto |

## Файлы для изменения
- public/ikamdocs_v5_index.html
- public/shared/header.html
- public/shared/footer.html
- src/components/Header.tsx
- src/components/Footer.tsx
- src/shared/siteConfig.ts
- src/pages/Platform.tsx
- src/pages/Integrations.tsx
- src/pages/Security.tsx
- src/pages/ApiPage.tsx
- src/pages/UseCases.tsx
- src/pages/Home.tsx
- src/pages/Pricing.tsx
- src/index.css
- **новые:** src/components/marketing/* (дизайн-система)
