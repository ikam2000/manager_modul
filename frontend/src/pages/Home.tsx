import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { formHref } from '../shared/formHref'
import { HomeHero } from '../components/home/HomeHero'
import { HomeArchitectureBoard } from '../components/home/HomeArchitectureBoard'
import { HomeDataMap } from '../components/home/HomeDataMap'
import { HomeCabinetShowcase } from '../components/home/HomeCabinetShowcase'
import { HomeProductPages } from '../components/home/HomeProductPages'
import { Building2, Layers3, Workflow, ShieldCheck } from 'lucide-react'

const PROBLEM_ITEMS = [
  { title: 'Excel-каталоги', description: 'SKU, атрибуты, спецификации и статусы живут в разных файлах и быстро расходятся.' },
  { title: 'Разрозненные поставщики', description: 'Каждый поставщик присылает данные в своём формате: Excel, PDF, API, письма.' },
  { title: 'Ошибки синхронизации', description: 'Маркетплейсы, ERP и другие системы получают разные версии товарных данных.' },
  { title: 'Нет контроля изменений', description: 'Сложно понять, кто изменил карточку товара, договор или параметры поставки.' },
]

const USE_CASES = [
  { icon: <Building2 size={22} style={{ color: '#0ea5e9' }} />, title: 'Производство', description: 'Единый каталог продукции, спецификации, QR-маркировка и пакетное создание поставок.' },
  { icon: <Layers3 size={22} style={{ color: '#0ea5e9' }} />, title: 'Дистрибуция', description: 'Поставщики, договоры, приложения, документы и контроль движений по поставкам.' },
  { icon: <Workflow size={22} style={{ color: '#0ea5e9' }} />, title: 'Продавцы маркетплейсов', description: 'Синхронизация Shopify, WB и Ozon с единым слоем товарных данных.' },
  { icon: <ShieldCheck size={22} style={{ color: '#0ea5e9' }} />, title: 'Enterprise-контур', description: 'RLS, API-ключи, impersonation, webhooks и аудит как часть продукта.' },
]

const TIERS = [
  { title: 'Starter', subtitle: 'Для команд, которые выходят из Excel.', points: ['Каталог товаров и категории', 'Загрузка документов и QR', 'Базовые роли и кабинет'], featured: false },
  { title: 'Business', subtitle: 'Для компаний с интеграциями и поставщиками.', points: ['API и webhooks', 'Поставщики, договоры, поставки', 'Интеграции маркетплейсов и импорт'], featured: true },
  { title: 'Enterprise', subtitle: 'Для крупного бизнеса и сложной архитектуры.', points: ['RLS и tenant isolation', 'Индивидуальные сценарии интеграций', 'SLA, расширенная безопасность, аудит'], featured: false },
]

function ProblemBlock() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Проблема</div>
            <h2 className="section-title">Почему управление товарными данными ломается</h2>
          </div>
          <p>Разрозненные источники данных создают ручную работу, ошибки в интеграциях и потери на операционном уровне.</p>
        </div>
        <div className="grid-4">
          {PROBLEM_ITEMS.map((item) => (
            <div key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCasesBlock() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Сценарии</div>
            <h2 className="section-title">Производство, дистрибуция и интеграционные команды</h2>
          </div>
          <p>Платформа подходит для реальных сценариев: от производства до продаж на маркетплейсах.</p>
        </div>
        <div className="grid-4">
          {USE_CASES.map((item) => (
            <div key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link to="/use-cases" className="btn btn-primary">Сценарии использования</Link>
        </div>
      </div>
    </section>
  )
}

function PricingBlock() {
  const { theme } = useTheme()
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Тарифы</div>
            <h2 className="section-title">Модель подключения под объём данных и требования</h2>
          </div>
          <p>Уровни зрелости внедрения — от базового ядра до enterprise-контура.</p>
        </div>
        <div className="grid-3">
          {TIERS.map((tier) => (
            <div key={tier.title} className={`tier-card ${tier.featured ? 'featured' : ''}`}>
              <h3>{tier.title}</h3>
              <p style={{ color: 'var(--muted)', margin: '12px 0 18px' }}>{tier.subtitle}</p>
              <ul className="feature-list">
                {tier.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <a className={`btn ${tier.featured ? 'btn-primary' : 'btn-secondary'}`} href={formHref('/request-demo.html', theme)} style={{ marginTop: 20, width: '100%', display: 'block', textAlign: 'center' }}>
                Запросить
              </a>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/pricing" className="btn btn-secondary">Подробнее о тарифах</Link>
        </div>
      </div>
    </section>
  )
}

function formatPhoneRu(value: string): string {
  const d = value.replace(/\D/g, '').replace(/^[78]/, '')
  const m = d.match(/(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/)
  if (!m) return ''
  let out = '+7'
  if (m[1]) out += ' (' + m[1]
  if (m[2]) out += ') ' + m[2]
  if (m[3]) out += '-' + m[3]
  if (m[4]) out += '-' + m[4]
  return out
}

function maskEmail(value: string): string {
  return value.replace(/[^\w@.\-+]/g, '')
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
          email: maskEmail(email).trim(),
          phone: formatPhoneRu(phone).replace(/\D/g, '').length >= 10 ? formatPhoneRu(phone) : phone.trim(),
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
    <section className="section" id="contact">
      <div className="container split-form">
        <div className="card">
          <div className="kicker">Как внедряется платформа</div>
          <h2 style={{ fontSize: 28, marginTop: 18 }}>Внедрение без разрыва текущих процессов</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
            Сначала собираем структуру каталога, источники документов, формат интеграций и роли доступа. Затем настраиваем импорт, QR-контур, API и сценарии синхронизации.
          </p>
          <ul className="feature-list" style={{ marginTop: 18 }}>
            <li>Аудит данных, поставщиков и существующих каталогов</li>
            <li>Импорт номенклатуры, документов и поставок</li>
            <li>Подключение маркетплейсов, API-ключей и webhooks</li>
            <li>Запуск личного кабинета, ролей и процессов поддержки</li>
          </ul>
        </div>
        <div className="card">
          <div className="kicker">Оставьте заявку</div>
          <h2 style={{ fontSize: 24, marginTop: 18 }}>Менеджер свяжется с вами</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Покажем платформу и подберём сценарий внедрения под ваш контур.</p>
          {sent ? (
            <div className="form-msg success">Заявка отправлена. Мы свяжемся с вами в ближайшее время.</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'block' }}>
              {error && <div className="form-msg error">{error}</div>}
              <div className="form-group">
                <label htmlFor="capEmail">Email *</label>
                <input type="email" id="capEmail" required placeholder="example@company.ru" value={email} onChange={(e) => setEmail(maskEmail(e.target.value))} inputMode="email" />
              </div>
              <div className="form-group">
                <label htmlFor="capPhone">Телефон</label>
                <input type="tel" id="capPhone" placeholder="+7 (999) 000-00-00" value={phone} onChange={(e) => setPhone(formatPhoneRu(e.target.value))} inputMode="tel" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </form>
          )}
          <p className="form-privacy">Нажимая кнопку, вы соглашаетесь с <Link to="/privacy">политикой конфиденциальности</Link>.</p>
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  const { theme } = useTheme()
  return (
    <section className="section">
      <div className="container">
        <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
          <div className="kicker">Финальный CTA</div>
          <h2 className="section-title" style={{ maxWidth: 860, margin: '18px auto 16px' }}>
            Соберите номенклатуру, поставщиков, документы и интеграции в одной платформе
          </h2>
          <p style={{ color: 'var(--muted)', margin: '0 auto 28px', maxWidth: 760, lineHeight: 1.7 }}>
            Запросите демонстрацию ikamdocs и покажите команде, как должен выглядеть единый слой данных под ваши процессы.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary" href={formHref('/request-demo.html', theme)}>Запросить демо</a>
            <Link to="/register" className="btn btn-secondary">Попробовать платформу</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div style={{ background: 'transparent' }}>
      <HomeHero />
      <ProblemBlock />
      <HomeCabinetShowcase />
      <HomeArchitectureBoard />
      <HomeDataMap />
      <HomeProductPages />
      <UseCasesBlock />
      <PricingBlock />
      <CaptureForm />
      <FinalCTA />
    </div>
  )
}
