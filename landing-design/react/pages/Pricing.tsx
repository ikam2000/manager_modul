import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Section, SectionHeader } from '../components/marketing'

async function fetchPlans() {
  const r = await fetch('/plans')
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
}

export default function Pricing() {
  useEffect(() => { document.title = 'Тарифы — ikamdocs' }, [])
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ['plans'], queryFn: fetchPlans, retry: false })

  return (
    <div style={{ background: '#f8fafc' }}>
      <Section background="light">
        <SectionHeader
          label="Pricing"
          title="Тарифы"
          description="Оплата картой, СБП — для физлиц. Счёт для юрлиц — через регистрацию компании."
        />
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Загрузка тарифов...</div>
        ) : isError || !plans?.length ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Тарифы формируются индивидуально под ваши задачи.</p>
            <a href="/request-demo.html" className="btn-mk-primary">Запросить условия</a>
            <Link to="/register" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Попробовать</Link>
          </div>
        ) : (
          <div className="mk-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {plans.map((plan: { id: number; name: string; price_monthly: number; price_yearly: number; features: string[] }) => (
              <div
                key={plan.id}
                className="mk-feature-card"
                style={{
                  padding: 24,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>{plan.name}</h3>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>
                    {(plan.price_monthly / 100).toLocaleString('ru-RU')} ₽
                  </span>
                  <span style={{ color: '#64748b', fontSize: 16 }}> / мес</span>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                  Годовая оплата: {(plan.price_yearly / 100).toLocaleString('ru-RU')} ₽
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                  {plan.features.map((f: string) => (
                    <li key={f} style={{ padding: '6px 0', color: '#64748b', fontSize: 14 }}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="btn-mk-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                  Выбрать тариф
                </Link>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Запросить демо</a>
          <Link to="/platform" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Платформа →</Link>
        </div>
      </Section>
    </div>
  )
}
