import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Package, QrCode, Truck, Users, Globe } from 'lucide-react'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'last_7_days', label: 'Последние 7 дней' },
  { value: 'this_week', label: 'Эта неделя' },
  { value: 'last_week', label: 'Прошлая неделя' },
  { value: 'this_month', label: 'Этот месяц' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'this_year', label: 'Этот год' },
  { value: 'last_year', label: 'Прошлый год' },
]

const SUMMARY_LABELS: Record<string, string> = {
  nomenclature: 'Номенклатура',
  suppliers: 'Поставщики',
  manufacturers: 'Производители',
  supplies: 'Поставки',
  contracts: 'Договоры',
  categories: 'Категории',
  subcategories: 'Подкатегории',
  documents: 'Документы',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  nomenclature: 'Номенклатура',
  supplier: 'Поставщик',
  manufacturer: 'Производитель',
  contract: 'Договор',
  supply: 'Поставка',
}

const CHART_COLORS = [
  '#0ea5e9', '#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899',
  '#38bdf8', '#84cc16', '#a855f7', '#eab308',
]

const MONTH_LABELS: Record<string, string> = {
  '01': 'Янв', '02': 'Фев', '03': 'Март', '04': 'Апр', '05': 'Май', '06': 'Июн',
  '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

export default function CabinetAnalytics() {
  const [data, setData] = useState<{
    summary: Record<string, number>
    supplies_by_month: Array<{ month: string; count: number; total_qty: number }>
    top_suppliers: Array<{ id: number; name: string; supply_count: number; total_qty?: number }>
    top_nomenclature?: Array<{ id: number; name: string; supply_count: number; total_qty?: number }>
    top_supplies?: Array<{ id: number; name: string }>
    top_documents?: Array<{ id: number; name: string }>
    documents_by_entity_type: Array<{ entity_type: string; count: number }>
    period?: { from: string; to: string }
    new_in_period?: Record<string, number>
    supplies_in_period?: { count: number; total_qty: number; total_money?: number }
    supplies_by_category?: Array<{ name: string; count: number; quantity: number }>
    supplies_by_category_all?: Array<{ name: string; count: number; quantity: number }>
    compare?: { supplies_prev?: { count: number; total_qty: number }; period?: { prev_from: string; prev_to: string } }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodPreset, setPeriodPreset] = useState('last_7_days')
  const [compareEnabled, setCompareEnabled] = useState(true)
  const [dynamicsTab, setDynamicsTab] = useState<'count' | 'qty'>('count')
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!token) return
    const params = new URLSearchParams({ period_preset: periodPreset, compare: String(compareEnabled) })
    fetch(`/analytics/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [token, periodPreset, compareEnabled])

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  }

  if (!data) {
    return (
      <div>
        <h1 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>Аналитика</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Не удалось загрузить данные.</p>
      </div>
    )
  }

  const { summary, supplies_by_month, top_suppliers, top_nomenclature, top_supplies, top_documents, documents_by_entity_type, period, supplies_in_period, supplies_by_category, supplies_by_category_all, compare } = data
  const pieData = (documents_by_entity_type || []).map((d, i) => ({
    name: ENTITY_TYPE_LABELS[d.entity_type] || d.entity_type,
    value: d.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.value > 0)

  const suppliesPct = compare?.supplies_prev ? pctChange(supplies_in_period?.count ?? 0, compare.supplies_prev.count) : null
  const nomenclaturePct = compare?.supplies_prev ? pctChange(supplies_in_period?.total_qty ?? 0, compare.supplies_prev.total_qty) : null

  const dynamicsData = supplies_by_month.map((r) => {
    const mm = (r.month || '').split('-')[1] || ''
    return { ...r, label: MONTH_LABELS[mm] || r.month }
  })

  const geoData = (supplies_by_category_all || supplies_by_category || []).slice(0, 6)
  const geoMax = Math.max(...geoData.map((x) => x.count), 1)

  const statusItems = [
    { key: 'nomenclature', label: 'Номенклатура', count: summary.nomenclature ?? 0, color: '#22c55e', topItems: (top_nomenclature || []).slice(0, 3), linkBase: '/cabinet/entities/nomenclature/', linkById: true },
    { key: 'suppliers', label: 'Поставщики', count: summary.suppliers ?? 0, color: '#8b5cf6', topItems: (top_suppliers || []).slice(0, 3), linkBase: '/cabinet/entities/supplier/', linkById: true },
    { key: 'supplies', label: 'Поставки', count: summary.supplies ?? 0, color: '#0ea5e9', topItems: (top_supplies || []).slice(0, 3), linkBase: '/cabinet/entities/supply/', linkById: true },
    { key: 'documents', label: 'Документы', count: summary.documents ?? 0, color: '#f59e0b', topItems: (top_documents || []).slice(0, 3), linkBase: '/cabinet/documents', linkById: false },
  ].filter((s) => s.count > 0)
  const statusTotal = statusItems.reduce((a, s) => a + s.count, 0) || 1

  return (
    <div className="analytics-page" style={{ minWidth: 0 }}>
      <h1 style={{ marginBottom: 8, fontSize: '1.5rem', fontWeight: 600 }}>Аналитика</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9375rem' }}>
        Сводка по сущностям, динамика поставок, топы.
      </p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13 }}>Период:</label>
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} />
          <span>Сравнение с предыдущим периодом</span>
        </label>
        {period && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {period.from} — {period.to}
          </span>
        )}
      </div>

      {/* KPI карточки */}
      <section style={{ marginBottom: 32 }}>
        <div className="analytics-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <div className="analytics-kpi" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{(summary?.nomenclature ?? 0).toLocaleString('ru')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Всего товаров</div>
              {nomenclaturePct != null && (
                <div style={{ fontSize: 12, marginTop: 4, color: nomenclaturePct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {nomenclaturePct >= 0 ? '↑' : '↓'} {Math.abs(nomenclaturePct)}% за период
                </div>
              )}
            </div>
          </div>
          <div className="analytics-kpi" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={22} color="var(--success)" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{(supplies_in_period?.total_qty ?? 0).toLocaleString('ru')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Объём товаров (шт.)</div>
              {nomenclaturePct != null && (
                <div style={{ fontSize: 12, marginTop: 4, color: nomenclaturePct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {nomenclaturePct >= 0 ? '↑' : '↓'} {Math.abs(nomenclaturePct)}% за период
                </div>
              )}
            </div>
          </div>
          <div className="analytics-kpi" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{(supplies_in_period?.count ?? summary?.supplies ?? 0).toLocaleString('ru')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Поставок</div>
              {suppliesPct != null && (
                <div style={{ fontSize: 12, marginTop: 4, color: suppliesPct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {suppliesPct >= 0 ? '↑' : '↓'} {Math.abs(suppliesPct)}% за период
                </div>
              )}
            </div>
          </div>
          <div className="analytics-kpi" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{(summary?.suppliers ?? 0).toLocaleString('ru')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Активных поставщиков</div>
            </div>
          </div>
        </div>
      </section>

      {/* Динамика + Топ товаров */}
      <div className="analytics-dynamics-grid" style={{ marginBottom: 32 }}>
        {supplies_by_month.length > 0 && (
          <section className="analytics-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Динамика поставок</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setDynamicsTab('count')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: dynamicsTab === 'count' ? 'var(--accent)' : 'var(--surface-hover)',
                    color: dynamicsTab === 'count' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Поставки
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsTab('qty')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: dynamicsTab === 'qty' ? 'var(--accent)' : 'var(--surface-hover)',
                    color: dynamicsTab === 'qty' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Товары
                </button>
              </div>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart
                  data={dynamicsData}
                  layout="vertical"
                  margin={{ top: 4, right: 50, left: 36, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="dynamicsGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-soft)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={36} stroke="var(--text-secondary)" fontSize={12} tick={{ fill: 'var(--text)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)' }}
                    formatter={(value) => [dynamicsTab === 'count' ? (value ?? 0) : ((value ?? 0)).toLocaleString('ru'), dynamicsTab === 'count' ? 'Поставок' : 'Шт.']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.month || ''}
                  />
                  <Bar
                    dataKey={dynamicsTab === 'count' ? 'count' : 'total_qty'}
                    fill="url(#dynamicsGrad)"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              {dynamicsData.map((r) => (
                <span key={r.month}>
                  {r.label}: {(dynamicsTab === 'count' ? r.count : r.total_qty ?? 0).toLocaleString('ru')}
                </span>
              ))}
            </div>
          </section>
        )}

        {top_nomenclature && top_nomenclature.length > 0 && (
          <section className="analytics-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Топ товаров по поставкам
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top_nomenclature.slice(0, 5).map((n, i) => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--accent-muted)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/cabinet/entities/nomenclature/${n.id}`}
                      style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}
                    >
                      {(n.name || '—').length > 35 ? `${n.name.slice(0, 35)}...` : n.name}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {n.supply_count} поставок • {(n.total_qty ?? 0).toLocaleString('ru')} шт.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* География (по категориям) + Топ поставщиков */}
      <div className="analytics-geo-grid" style={{ marginBottom: 32 }}>
        {geoData.length > 0 && (
          <section className="analytics-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} /> Поставки по категориям
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {geoData.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Globe size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>{c.name}</div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 6,
                        background: 'var(--surface-hover)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(c.count / geoMax) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--accent), var(--accent-soft))',
                          borderRadius: 6,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{c.count.toLocaleString('ru')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {top_suppliers.length > 0 && (
          <section className="analytics-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Топ поставщиков
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top_suppliers.slice(0, 5).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(139,92,246,0.15)',
                      color: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/cabinet/entities/supplier/${s.id}`}
                      style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}
                    >
                      {(s.name || '—').length > 30 ? `${s.name.slice(0, 30)}...` : s.name}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.supply_count} поставок{s.total_qty != null ? ` • ${s.total_qty.toLocaleString('ru')} товаров` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Статусы (сводка по типам) с топ сущностей */}
      {statusItems.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            Состав сводки
          </h3>
          <div className="analytics-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {statusItems.map((s) => (
              <div
                key={s.key}
                className="analytics-card"
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: `${s.color}20`,
                    color: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    margin: '0 auto 10px',
                  }}
                >
                  {s.count}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: s.topItems?.length ? 10 : 0 }}>
                  {Math.round((s.count / statusTotal) * 100)}%
                </div>
                {s.topItems && s.topItems.length > 0 && s.linkBase && (
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Топ:</div>
                    {s.topItems.map((item: { id: number; name: string }) => (
                      <Link
                        key={item.id}
                        to={s.linkById ? `${s.linkBase}${item.id}` : s.linkBase}
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 2,
                        }}
                      >
                        {(item.name || '—').length > 20 ? `${item.name.slice(0, 20)}…` : item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Сводка ссылки */}
      <section style={{ marginBottom: 32, overflow: 'hidden', width: '100%' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>Сводка</h2>
        <div className="analytics-summary-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(summary).length}, minmax(0, 1fr))`, gap: 12, width: '100%' }}>
          {Object.entries(summary).map(([key, count]) => {
            const tab = ['nomenclature', 'suppliers', 'manufacturers', 'supplies', 'categories', 'subcategories'].includes(key)
              ? `/cabinet/entities?tab=${key}`
              : key === 'contracts'
              ? '/cabinet/documents?tab=contracts'
              : key === 'documents'
              ? '/cabinet/documents'
              : '/cabinet/entities'
            return (
              <Link
                key={key}
                to={tab}
                className="analytics-summary-link"
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{SUMMARY_LABELS[key] || key}</div>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="analytics-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, marginBottom: 32 }}>
      {supplies_by_category && supplies_by_category.length > 0 && (
        <section className="analytics-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>Поставки по категориям за период</h2>
          <div style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
            <ResponsiveContainer width="100%" height={Math.max(200, supplies_by_category.length * 44)}>
              <BarChart
                data={supplies_by_category}
                layout="vertical"
                margin={{ top: 8, right: 60, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v?.toLocaleString('ru')} />
                <YAxis type="category" dataKey="name" width={140} stroke="var(--text-secondary)" fontSize={12} tick={{ fill: 'var(--text)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)' }} formatter={(v) => [((v ?? 0) as number).toLocaleString('ru'), 'Поставок']} />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 8, 8, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {pieData.length > 0 && (
        <section className="analytics-card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            Документы по типам сущностей
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <defs>
                  {pieData.map((_, i) => (
                    <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS[(i + 1) % CHART_COLORS.length]} stopOpacity={0.85} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={`url(#pieGrad${i})`} stroke="var(--surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)' }}
                  formatter={(value) => {
                    const v = typeof value === 'number' ? value : 0
                    const total = pieData.reduce((a, d) => a + d.value, 0)
                    const pct = total > 0 ? Math.round((v / total) * 100) : 0
                    return [`${v} (${pct}%)`, 'Документов']
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: 'var(--text)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      </div>
    </div>
  )
}
