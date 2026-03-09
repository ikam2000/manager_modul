import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HeroSection,
  Section,
  SectionHeader,
  FeatureCard,
  FeatureGrid,
  IntegrationGrid,
  SecurityCard,
  ArchitectureDiagram,
  CTASection,
} from '../components/marketing'
import { Database, Users, FileText, QrCode, Plug, BarChart3, Building2, ShieldCheck, Layers3, Workflow } from 'lucide-react'

const PROBLEM_ITEMS = [
  { title: 'Excel каталоги', description: 'SKU, атрибуты, спецификации и статусы живут в разных файлах и быстро расходятся.' },
  { title: 'Разрозненные поставщики', description: 'Каждый поставщик присылает данные в своём формате: Excel, PDF, API, письма.' },
  { title: 'Ошибки синхронизации', description: 'Маркетплейсы, ERP и операционные системы получают разные версии товарных данных.' },
  { title: 'Нет контроля изменений', description: 'Сложно понять, кто изменил карточку товара, договор или параметры поставки.' },
]

const PLATFORM_ITEMS = [
  { icon: <Database size={24} style={{ color: '#0ea5e9' }} />, title: 'Каталог номенклатуры', description: 'Справочник SKU, категории, подкатегории, атрибуты, версии, спецификации и товарные номера.' },
  { icon: <Users size={24} style={{ color: '#0ea5e9' }} />, title: 'Поставщики и производители', description: 'Реквизиты, ИНН, DaData, связи с клиентами и производителями, договоры и приложения.' },
  { icon: <FileText size={24} style={{ color: '#0ea5e9' }} />, title: 'Документы и OCR', description: 'PDF, JPG, PNG и Excel, распознавание, импорт номенклатуры и поставок, публичный просмотр.' },
  { icon: <QrCode size={24} style={{ color: '#0ea5e9' }} />, title: 'QR-маркировка', description: 'Генерация QR, печать, поиск по коду и публичные страницы сущностей.' },
  { icon: <Plug size={24} style={{ color: '#0ea5e9' }} />, title: 'Интеграции и webhooks', description: 'Shopify, Wildberries, Ozon, Excel, CSV, REST API, OAuth и push-события.' },
  { icon: <BarChart3 size={24} style={{ color: '#0ea5e9' }} />, title: 'Trader-аналитика', description: 'Наценки, dashboard, отчёты, категории и номенклатура с фильтрами и синхронизацией.' },
]

const INTEGRATIONS = [
  { name: 'Shopify', description: 'Синхронизация цен и остатков по SKU', icon: 'shopify' as const },
  { name: 'Wildberries', description: 'wb_nm_id, остатки, сценарии трейдера', icon: 'wb' as const },
  { name: 'Ozon', description: 'offer_id, остатки и обновление данных', icon: 'ozon' as const },
  { name: 'Excel', description: 'Импорт, экспорт и шаблоны поставок', icon: 'excel' as const },
  { name: 'CSV', description: 'Массовая загрузка и preview-мэппинг', icon: 'csv' as const },
  { name: 'REST API', description: 'X-Api-Key, CRUD по сущностям и интеграциям', icon: 'api' as const },
  { name: 'ERP / 1С', description: 'Готовый сценарий двусторонней синхронизации', icon: 'erp' as const },
]

const SECURITY_ITEMS = [
  { kicker: 'Изоляция', title: 'Tenant isolation', description: 'Разделение данных по компаниям на уровне бизнес-логики и БД.' },
  { kicker: 'База данных', title: 'PostgreSQL RLS', description: 'Row-level security для suppliers, documents, api_keys и интеграционных данных.' },
  { kicker: 'Интеграции', title: 'Encrypted integrations', description: 'OAuth-токены и API-ключи маркетплейсов хранятся в зашифрованном виде.' },
  { kicker: 'Контроль', title: 'Webhook security', description: 'Replay protection, идемпотентность, проверка подписи и событий.' },
  { kicker: 'Аудит', title: 'Audit log', description: 'Фиксация изменений по поставщикам, интеграциям, impersonation и критичным действиям.' },
  { kicker: 'API', title: 'Rate limiting', description: 'Ограничение частоты запросов и контроль доступа по scope и сроку действия ключей.' },
]

const USE_CASES = [
  { icon: <Building2 size={22} style={{ color: '#0ea5e9' }} />, title: 'Производство', description: 'Единый каталог продукции, спецификации, QR-маркировка и пакетное создание поставок.' },
  { icon: <Layers3 size={22} style={{ color: '#0ea5e9' }} />, title: 'Дистрибуция', description: 'Поставщики, договоры, приложения, документы и контроль движений по поставкам.' },
  { icon: <Workflow size={22} style={{ color: '#0ea5e9' }} />, title: 'Marketplace sellers', description: 'Синхронизация Shopify, WB и Ozon с единым слоем товарных данных.' },
  { icon: <ShieldCheck size={22} style={{ color: '#0ea5e9' }} />, title: 'Enterprise-контур', description: 'RLS, API-ключи, impersonation, webhooks, аудит и интеграционный слой под ERP.' },
]

const TIERS = [
  { title: 'Starter', subtitle: 'Для команд, которые выходят из Excel.', points: ['Каталог товаров и категории', 'Загрузка документов и QR', 'Базовые роли и кабинет'] },
  { title: 'Business', subtitle: 'Для компаний с интеграциями и поставщиками.', points: ['API и webhooks', 'Поставщики, договоры, поставки', 'Интеграции маркетплейсов и импорт'] },
  { title: 'Enterprise', subtitle: 'Для крупного бизнеса и сложной архитектуры.', points: ['RLS и tenant isolation', 'Индивидуальные сценарии интеграций', 'SLA, расширенная безопасность, аудит'] },
]

function ProblemBlock() {
  return (
    <Section background="default">
      <SectionHeader
        label="Проблема"
        title="Почему управление товарными данными ломается"
        description="Разрозненные источники данных создают ручную работу, ошибки в интеграциях и потери на операционном уровне."
      />
      <FeatureGrid columns={4}>
        {PROBLEM_ITEMS.map((item) => (
          <div key={item.title} className="mk-band-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{item.title}</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: '#64748b' }}>{item.description}</div>
          </div>
        ))}
      </FeatureGrid>
    </Section>
  )
}

function CaptureForm() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/landing-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Заявка с главной страницы — ikamdocs',
          name: 'Клиент с главной',
          email: email.trim(),
          phone: phone.trim() || '',
          company: '',
          message: '',
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) setSent(true)
      else setError((data.detail && (Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail)) || 'Ошибка отправки')
    } catch {
      setError('Ошибка отправки. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Section background="default">
      <div className="mk-split-band">
        <div className="mk-band-card" style={{ padding: 32 }}>
          <div className="mk-kicker" style={{ marginBottom: 18 }}>Как внедряется платформа</div>
          <h3 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 16 }}>Внедрение без разрыва текущих процессов</h3>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: '#64748b' }}>
            Сначала мы собираем структуру каталога, источники документов, формат интеграций и роли доступа. Затем настраиваем импорт, QR-контур, API и сценарии синхронизации.
          </p>
          <ul className="mk-list">
            <li>Аудит данных, поставщиков и существующих каталогов</li>
            <li>Импорт номенклатуры, документов и поставок</li>
            <li>Подключение маркетплейсов, API-ключей и webhooks</li>
            <li>Запуск личного кабинета, ролей и процессов поддержки</li>
          </ul>
        </div>
        <div className="mk-band-card" style={{ padding: 32 }}>
          <SectionHeader title="Оставьте заявку" description="Менеджер свяжется с вами, покажет платформу и подберёт сценарий внедрения под ваш контур." />
          {sent ? (
            <div style={{ padding: 24, background: 'rgba(34,197,94,0.1)', borderRadius: 14, color: '#15803d', fontSize: 16 }}>Заявка отправлена. Мы свяжемся с вами в ближайшее время.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ padding: 16, marginBottom: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 14, color: '#dc2626', fontSize: 14 }}>{error}</div>}
              <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '16px 18px', marginBottom: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, fontSize: 16 }} />
              <input type="tel" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '16px 18px', marginBottom: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, fontSize: 16 }} />
              <button type="submit" className="btn-mk-primary" disabled={loading} style={{ width: '100%' }}>{loading ? 'Отправка...' : 'Отправить заявку'}</button>
            </form>
          )}
          <p style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>Нажимая кнопку, вы соглашаетесь с <Link to="/privacy" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>политикой конфиденциальности</Link>.</p>
        </div>
      </div>
    </Section>
  )
}

export default function Home() {
  return (
    <div style={{ background: '#f8fafc' }}>
      <HeroSection
        headline="Платформа управления номенклатурой, поставщиками и интеграциями бизнеса"
        subheadline="ikamdocs — единое ядро данных для каталога товаров, поставщиков, документов, QR-маркировки и синхронизации с маркетплейсами, ERP и внешними системами."
        primaryLabel="Запросить демо"
        primaryHref="/request-demo.html"
        secondaryLabel="Попробовать платформу"
      />

      <ProblemBlock />

      <Section background="light">
        <SectionHeader label="Платформа" title="Единая система для данных, документов и операционных сценариев" description="Под капотом ikamdocs уже есть каталог, поставщики, производители, поставки, договоры, OCR, QR-контур, webhooks, API и трейдерский модуль аналитики." />
        <FeatureGrid columns={3}>{PLATFORM_ITEMS.map((m) => <FeatureCard key={m.title} icon={m.icon} title={m.title} description={m.description} />)}</FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Запросить демо</a>
          <Link to="/platform" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Смотреть платформу →</Link>
        </div>
      </Section>

      <Section background="default">
        <SectionHeader label="Архитектура" title="ikamdocs работает как центральный слой данных" description="Платформа соединяет источники данных, внутренний каталог и выходные контуры для аналитики, API, экспорта и сценариев синхронизации." />
        <ArchitectureDiagram />
      </Section>

      <Section background="light">
        <SectionHeader label="Интеграции" title="Подключение к маркетплейсам, файлам и внешним системам" description="Система уже поддерживает Shopify, Wildberries, Ozon, Excel, CSV, REST API, API-ключи, OAuth и webhooks." />
        <IntegrationGrid items={INTEGRATIONS} />
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Обсудить интеграции</a>
          <Link to="/integrations" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Все возможности →</Link>
        </div>
      </Section>

      <Section background="default">
        <SectionHeader label="Безопасность" title="Архитектура под B2B и enterprise-сценарии" description="Tenant isolation, PostgreSQL RLS, защита webhook, шифрование интеграций и управление доступом — часть продуктовой модели, а не маркетинговый слой." />
        <FeatureGrid columns={3}>{SECURITY_ITEMS.map((item) => <SecurityCard key={item.title} kicker={item.kicker} title={item.title} description={item.description} />)}</FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <a href="/request-security.html" className="btn-mk-primary">Запросить описание безопасности</a>
          <Link to="/security" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Подробнее →</Link>
        </div>
      </Section>

      <Section background="light">
        <SectionHeader label="Сценарии" title="Подходит для производства, дистрибуции и интеграционных команд" description="Сайт должен продавать решение, поэтому на главной мы показываем реальные сценарии использования платформы." />
        <FeatureGrid columns={4}>{USE_CASES.map((m) => <FeatureCard key={m.title} icon={m.icon} title={m.title} description={m.description} />)}</FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <Link to="/use-cases" className="btn-mk-primary">Сценарии использования</Link>
        </div>
      </Section>

      <Section background="default">
        <SectionHeader label="Тарифы" title="Модель подключения под объём данных и требования к интеграциям" description="На сайте не продаются абстрактные пакеты. Мы показываем уровни зрелости внедрения — от базового ядра до enterprise-контура." />
        <FeatureGrid columns={3}>
          {TIERS.map((tier) => (
            <div key={tier.title} className="mk-tier-card" style={{ padding: 28 }}>
              <div className="mk-kicker" style={{ marginBottom: 16 }}>{tier.title}</div>
              <div style={{ fontSize: 17, lineHeight: 1.65, color: '#64748b', marginBottom: 14 }}>{tier.subtitle}</div>
              <ul className="mk-list">{tier.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/pricing" className="btn-mk-primary">Посмотреть тарифы</Link>
        </div>
      </Section>

      <CaptureForm />

      <CTASection
        title="Соберите номенклатуру, поставщиков, документы и интеграции в одной платформе"
        subtitle="Запросите демонстрацию ikamdocs и покажите команде, как должен выглядеть единый слой данных под ваши процессы."
        primaryLabel="Запросить демо"
        primaryHref="/request-demo.html"
        secondaryLabel="Попробовать платформу"
        secondaryHref="/register"
      />
    </div>
  )
}
