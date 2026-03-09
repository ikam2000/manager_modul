import { Link } from 'react-router-dom'
import { ArchitectureDiagram } from './ArchitectureDiagram'

interface HeroSectionProps {
  label?: string
  headline: string
  subheadline?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export function HeroSection({
  label = 'Платформа данных для бизнеса',
  headline,
  subheadline,
  primaryLabel = 'Запросить демо',
  primaryHref = '/request-demo.html',
  secondaryLabel = 'Попробовать платформу',
  secondaryHref = '/register',
}: HeroSectionProps) {
  return (
    <section className="mk-hero" style={{ padding: '128px 0 104px', background: '#f8fafc' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 56, alignItems: 'center', maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div>
          <div className="mk-kicker" style={{ marginBottom: 22 }}>{label}</div>
          <h1 style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.02, marginBottom: 22, color: '#0f172a' }}>{headline}</h1>
          {subheadline && <p style={{ fontSize: 19, lineHeight: 1.72, color: '#64748b', marginBottom: 32, maxWidth: 620 }}>{subheadline}</p>}
          <div className="mk-hero-cta" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 30 }}>
            <a href={primaryHref} className="btn-mk-primary">{primaryLabel}</a>
            <Link to={secondaryHref} className="btn-mk-secondary">{secondaryLabel}</Link>
          </div>
          <div className="mk-stat-row">
            {[
              ['Каталог и SKU', 'Единый слой данных для товаров, категорий, атрибутов и версий'],
              ['Поставщики и договоры', 'Реквизиты, связи, DaData, поставки и приложения'],
              ['Документы и OCR', 'Загрузка, распознавание, импорт номенклатуры и поставок'],
              ['Интеграции и API', 'Shopify, WB, Ozon, CSV, webhooks и REST API'],
            ].map(([title, description]) => (
              <div key={title} className="mk-metric-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: '#64748b' }}>{description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mk-hero-panel" style={{ padding: 26 }}>
          <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff', marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                ['Каталог', 'SKU, категории, атрибуты'],
                ['Поставщики', 'ИНН, договоры, реквизиты'],
                ['Документы', 'PDF, JPG, PNG, Excel'],
              ].map(([title, desc]) => (
                <div key={title} style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.55, color: '#64748b' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <ArchitectureDiagram compact />
        </div>
      </div>
    </section>
  )
}
