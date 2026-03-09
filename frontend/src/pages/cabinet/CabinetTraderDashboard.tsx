import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Package, FolderTree, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react'
import { authFetchWithRetry } from '../../lib/authFetch'

interface DashboardData {
  suppliers_count: number
  products_count: number
  categories_count: number
  api_suppliers_count: number
  sync_platforms: Array<{ provider: string; store: string }>
  total_sales: number
  profit: number
  margin: number
  turnover_days: number
  by_supplier: Array<{ supplier_id: number; supplier_name: string; product_count: number }>
  by_category: Array<{ category_id: number; category_name: string; product_count: number }>
}

export default function CabinetTraderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetchWithRetry('/trader/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
        Загрузка...
      </div>
    )
  }

  const kpis = [
    { label: 'Поставщики', value: data?.suppliers_count ?? 0, suffix: '', icon: <Building2 size={20} />, to: '/cabinet/trader/suppliers' },
    { label: 'Товары', value: data?.products_count ?? 0, suffix: '', icon: <Package size={20} />, to: '/cabinet/trader/entities' },
    { label: 'Категории', value: data?.categories_count ?? 0, suffix: '', icon: <FolderTree size={20} />, to: '/cabinet/trader/categories' },
    { label: 'API/OAuth выкачка', value: data?.api_suppliers_count ?? 0, suffix: ' поставщ.', icon: <RefreshCw size={20} />, to: '' },
    { label: 'Выручка', value: data?.total_sales ?? 0, suffix: ' ₽', icon: <TrendingUp size={20} />, to: '' },
    { label: 'Прибыль', value: data?.profit ?? 0, suffix: ' ₽', icon: <BarChart3 size={20} />, to: '' },
    { label: 'Маржинальность', value: data?.margin ?? 0, suffix: '%', icon: <BarChart3 size={20} />, to: '' },
    { label: 'Оборачиваемость', value: data?.turnover_days ?? 0, suffix: ' дн.', icon: <TrendingUp size={20} />, to: '' },
  ]

  const maxBySupplier = Math.max(...(data?.by_supplier?.map((x) => x.product_count) || [1]), 1)
  const maxByCategory = Math.max(...(data?.by_category?.map((x) => x.product_count) || [1]), 1)

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Дашборд трейдера</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {kpis.map((k) => {
          const cardStyle = {
            padding: 20,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
          }
          const content = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)' }}>
                {k.icon || null}
                <span style={{ fontSize: 12 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {Number(k.value).toLocaleString('ru-RU')}{k.suffix}
              </div>
            </>
          )
          return k.to ? (
            <Link key={k.label} to={k.to} style={cardStyle}>
              {content}
            </Link>
          ) : (
            <div key={k.label} style={cardStyle}>
              {content}
            </div>
          )
        })}
      </div>

      {((data?.sync_platforms?.length ?? 0) > 0) && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Подключённые площадки</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(data?.sync_platforms || []).map((p) => (
              <span
                key={`${p.provider}-${p.store}`}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  borderRadius: 8,
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}
              >
                {p.provider} {p.store !== '—' && <span style={{ color: 'var(--text-muted)' }}>({p.store})</span>}
              </span>
            ))}
          </div>
          <Link to="/cabinet/integrations" style={{ fontSize: 13, color: 'var(--accent)', marginTop: 8, display: 'inline-block' }}>
            Настроить интеграции →
          </Link>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, marginBottom: 32 }}>
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Товаров по поставщикам</h2>
          {(data?.by_supplier?.length ?? 0) > 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              {(data?.by_supplier || []).map((s) => (
                <div key={s.supplier_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <Link to={`/cabinet/entities/supplier/${s.supplier_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {s.supplier_name}
                    </Link>
                    <span>{s.product_count}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(s.product_count / maxBySupplier) * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Нет данных</p>
          )}
        </section>
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Товаров по категориям</h2>
          {(data?.by_category?.length ?? 0) > 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              {(data?.by_category || []).map((c) => (
                <div key={c.category_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <Link to={`/cabinet/trader/entities?category=${c.category_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {c.category_name}
                    </Link>
                    <span>{c.product_count}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(c.product_count / maxByCategory) * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Нет данных</p>
          )}
        </section>
      </div>

      {(data?.total_sales === 0 && data?.profit === 0) && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Выручка и прибыль будут отображаться после подключения данных о продажах.
        </p>
      )}
    </div>
  )
}
