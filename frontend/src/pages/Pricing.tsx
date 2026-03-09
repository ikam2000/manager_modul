import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Container } from '../components/marketing/Container'
import { useTheme } from '../contexts/ThemeContext'
import { formHref } from '../shared/formHref'

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Для команд, которые выходят из Excel.',
    points: ['Каталог товаров и категории', 'Загрузка документов и QR', 'Базовые роли и кабинет'],
    featured: false,
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'Для компаний с интеграциями и поставщиками.',
    points: ['API и webhooks', 'Поставщики, договоры, поставки', 'Интеграции маркетплейсов и импорт'],
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Для крупного бизнеса и сложной архитектуры.',
    points: ['RLS и tenant isolation', 'Индивидуальные сценарии интеграций', 'SLA, расширенная безопасность, аудит'],
    featured: false,
  },
]

type Plan = { id: number; name: string; price_monthly: number; price_yearly?: number; features?: string[] }
async function fetchPlans(): Promise<Plan[]> {
  const r = await fetch('/plans')
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
}

export default function Pricing() {
  const { theme } = useTheme()
  useEffect(() => { document.title = 'Тарифы — ikamdocs' }, [])
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ['plans'], queryFn: fetchPlans, retry: false })

  const getPlanPrice = (planName: string) => {
    if (!Array.isArray(plans) || !plans.length) return null
    const p = plans.find((x: { name: string }) => x.name.toLowerCase().includes(planName.toLowerCase()))
    return p
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      <section style={{ padding: '80px 0 48px' }}>
        <Container>
          <div style={{ textAlign: 'center', marginBottom: 56, maxWidth: 720, margin: '0 auto 56px' }}>
            <div
              className="pricing-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                borderRadius: 999,
                color: 'var(--text-secondary)',
                background: 'var(--accent-muted)',
                border: '1px solid var(--border)',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              Тарифы
            </div>
            <h1
              style={{
                fontSize: 'clamp(30px, 4.5vw, 48px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                marginBottom: 16,
                color: 'var(--text)',
              }}
            >
              Модель подключения под объём данных и требования
            </h1>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}
            >
              Уровни зрелости внедрения — от базового ядра до enterprise-контура. Тарифы формируются под ваши задачи: объём каталога, количество поставщиков, интеграции и SLA.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
              marginBottom: 48,
            }}
          >
            {TIERS.map((tier) => {
              const plan = getPlanPrice(tier.name)
              return (
                <div
                  key={tier.id}
                  className={`pricing-tier-card ${tier.featured ? 'featured' : ''}`}
                  style={{
                    border: tier.featured ? '1px solid rgba(121,168,255,0.3)' : '1px solid var(--border)',
                    borderRadius: 24,
                    padding: 28,
                    background: 'var(--surface)',
                    boxShadow: tier.featured ? '0 0 0 1px rgba(121,168,255,0.1)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>{tier.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>
                    {tier.subtitle}
                  </p>
                  {plan && (
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
                        {(plan.price_monthly / 100).toLocaleString('ru-RU')} ₽
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}> / мес</span>
                      {plan.price_yearly && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                          Годовая оплата: {(plan.price_yearly / 100).toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </div>
                  )}
                  <ul
                    className="pricing-tier-list"
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 24px 0',
                      flex: 1,
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    {tier.points.map((point) => (
                      <li
                        key={point}
                        className="pricing-tier-point"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          color: 'var(--text-secondary)',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          className="pricing-tier-bullet"
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: 'var(--accent)',
                            marginTop: 7,
                            flexShrink: 0,
                          }}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={formHref('/request-demo.html', theme)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 18px',
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 14,
                      textDecoration: 'none',
                      width: '100%',
                      ...(tier.featured
                        ? {
                            background: 'linear-gradient(135deg, rgba(121,168,255,0.95), rgba(103,232,249,0.95))',
                            color: '#06101f',
                            border: '1px solid transparent',
                            boxShadow: '0 16px 40px rgba(103,232,249,0.18)',
                          }
                        : {
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                          }),
                    }}
                  >
                    Запросить
                  </a>
                </div>
              )
            })}
          </div>

          {isLoading && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Загрузка тарифов с сервера...</p>
          )}
          {isError && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
              Тарифы формируются индивидуально под ваши задачи. Свяжитесь с нами для расчёта.
            </p>
          )}

          <div
            className="pricing-includes-block"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 40,
              marginBottom: 48,
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
              Что входит в платформу
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                color: 'var(--text-secondary)',
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <div>Единый каталог SKU и категорий</div>
              <div>Поставщики, договоры и поставки</div>
              <div>Документы, OCR и compliance</div>
              <div>QR-маркировка и traceability</div>
              <div>API, webhooks, маркетплейсы</div>
              <div>Личный кабинет и роли</div>
            </div>
          </div>

          <div className="pricing-cta-wrap" style={{ textAlign: 'center', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <a
              href={formHref('/request-demo.html', theme)}
              className="btn-mk-primary"
              style={{ minWidth: 180 }}
            >
              Запросить демо
            </a>
            <Link to="/platform" className="btn-mk-secondary" style={{ minWidth: 180 }}>
              Платформа →
            </Link>
          </div>
        </Container>
      </section>
    </div>
  )
}
