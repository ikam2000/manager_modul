/**
 * Общий конфиг сайта: навигация, footer, аналитика.
 * Используется в React-компонентах Header, Footer и в статических HTML (shared/).
 */

/** Базовый URL сайта — менять при деплое (например https://ikamdocs.ru) */
export const SITE_URL = 'https://ikamdocs.ru'

export const SITE = {
  name: 'ikamdocs',
  tagline: 'Enterprise-платформа данных: каталог, поставщики, документы, QR и интеграции с маркетплейсами.',
  copyright: '© 2026 ikamdocs. Все права защищены.',
  supportEmail: 'ikam2000@yandex.ru',
  /** SEO: описание для поисковиков (155–160 символов) */
  metaDescription: 'ikamdocs — B2B SaaS для управления номенклатурой, QR‑маркировкой и документооборотом. Единый каталог SKU, интеграция с 1С и ERP. Попробуйте бесплатно.',
  /** SEO: ключевые фразы */
  metaKeywords: 'номенклатура, маркировка, QR-коды, Честный знак, каталог товаров, документооборот, 1С, ERP, B2B SaaS, управление SKU',
} as const

export const NAV_LINKS = [
  { href: '/platform', label: 'Платформа' },
  { href: '/integrations', label: 'Интеграции' },
  { href: '/security', label: 'Безопасность' },
  { href: '/use-cases', label: 'Сценарии' },
  { href: '/api', label: 'API' },
  { href: '/pricing', label: 'Тарифы' },
  { href: '/login', label: 'Войти' },
] as const

export const FOOTER_LINKS = {
  product: [
    { href: '/platform', label: 'Платформа' },
    { href: '/integrations', label: 'Интеграции' },
    { href: '/security', label: 'Безопасность' },
    { href: '/api', label: 'API' },
    { href: '/pricing', label: 'Тарифы' },
  ],
  company: [
    { href: '/about.html', label: 'О платформе' },
  ],
  legal: [
    { href: '/privacy', label: 'Политика конфиденциальности' },
  ],
  support: { href: 'mailto:ikam2000@yandex.ru', label: 'Поддержка' },
} as const

/** Скрипты аналитики — добавлять сюда. */
export const ANALYTICS_SCRIPTS: Array<{ src: string } | { inline: string }> = []
