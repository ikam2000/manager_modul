import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, FileText, BarChart3, Plus, Printer } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface RecentEvent {
  sku: string
  change: string
  status: string
  channel: string
  created_at?: string
}

interface DashboardData {
  summary?: Record<string, number>
  recent_events?: RecentEvent[]
}

const SYNC_CHANNEL_IDS = ['ozon', 'wb', 'shopify'] as const
const SYNC_CHANNEL_LABELS: Record<string, string> = { ozon: 'Ozon', wb: 'WB', shopify: 'Shopify', erp: 'ERP' }

function statusClass(s: string): string {
  const lower = (s || '').toLowerCase()
  if (lower === 'ok' || lower === 'синхр.') return 'cabinet-status-ok'
  if (lower.includes('проверка') || lower.includes('review')) return 'cabinet-status-review'
  return 'cabinet-status-sync'
}

export default function CabinetHome() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [oauthConnections, setOauthConnections] = useState<Array<{ provider: string }>>([])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/analytics/dashboard?period_preset=last_7_days&compare=false', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/integrations/oauth', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d) => setOauthConnections(d.connections || []))
      .catch(() => setOauthConnections([]))
  }, [])

  const connectedProviders = new Set(oauthConnections.map((c) => c.provider?.toLowerCase()).filter(Boolean))
  const syncChannels = [
    ...SYNC_CHANNEL_IDS.map((id) => ({ id, label: SYNC_CHANNEL_LABELS[id], pct: connectedProviders.has(id) ? 100 : 0 })),
    { id: 'erp', label: 'ERP', pct: 0 },
  ]

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Пользователь'
  const summary = data?.summary ?? {}
  const recentEvents = data?.recent_events ?? []
  const activeSku = summary.nomenclature ?? 0
  const documentsCount = summary.documents ?? 0

  return (
    <div className="ds-page cabinet-dashboard">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Добро пожаловать, {displayName}</h1>
          <p className="ds-lead">
            Панель управления каталогом, версиями SKU, документами и синхронизацией с каналами.
          </p>
        </div>
      </div>

      <div className="cabinet-dashboard-top">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Центр управления каталогом</div>
          </div>
          <div className="ds-cardBody">
            <p className="cabinet-dashboard-desc">
              Управляйте каталогом, версиями, статусами комплаенса и публикационной поверхностью.
            </p>
            <div className="cabinet-stat-grid">
              <div className="cabinet-stat">
                <strong>{activeSku.toLocaleString('ru-RU')}</strong>
                <span>активных SKU</span>
              </div>
              <div className="cabinet-stat">
                <strong>{documentsCount.toLocaleString('ru-RU')}</strong>
                <span>обновлённых документов</span>
              </div>
              <div className="cabinet-stat">
                <strong>—</strong>
                <span>среднее время обработки diff</span>
              </div>
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Состояние синхронизации</div>
          </div>
          <div className="ds-cardBody">
            <div className="cabinet-pipeline">
              {syncChannels.map((ch) => (
                <div key={ch.id} className="cabinet-pipeline-row">
                  <span className="cabinet-pill">{ch.label}</span>
                  <div className="cabinet-bar">
                    <span style={{ width: `${ch.pct}%` }} />
                  </div>
                  <span>{ch.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cabinet-dashboard-grid">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Последние события</div>
          </div>
          <div className="ds-cardBody">
            <div className="cabinet-events-wrap">
              <table className="ds-table cabinet-events-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Изменение</th>
                    <th>Статус</th>
                    <th>Канал</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.length > 0 ? (
                    recentEvents.map((ev, i) => (
                      <tr key={i}>
                        <td>{ev.sku}</td>
                        <td>{ev.change}</td>
                        <td>
                          <span className={statusClass(ev.status)}>{ev.status}</span>
                        </td>
                        <td>{ev.channel}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>
                        Нет событий за выбранный период
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Задержка projection</div>
          </div>
          <div className="ds-cardBody">
            <div className="cabinet-spark">
              <div className="cabinet-spark-grid" />
              <svg viewBox="0 0 300 170" preserveAspectRatio="none">
                <path
                  d="M0 138C20 128 42 122 60 106C78 90 94 88 112 74C130 60 147 72 166 50C184 30 203 42 220 34C240 24 262 8 300 16"
                  stroke="url(#cabinet-spark-grad)"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="cabinet-spark-grad" x1="0" y1="0" x2="300" y2="0">
                    <stop stopColor="#79A8FF" />
                    <stop offset="1" stopColor="#67E8F9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="cabinet-spark-desc">
              Политика синхронизации обновляет downstream-каналы без прямого доступа к мастер-данным.
            </p>
          </div>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Быстрый доступ</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-autofill cabinet-quick-access">
              <Link to="/cabinet/entities" className="ds-navCard">
                <div className="ds-navCardIcon cabinet-quick-icon"><Package size={24} strokeWidth={2} /></div>
                <div className="ds-navCardLabel">Каталог</div>
              </Link>
              <Link to="/cabinet/documents" className="ds-navCard">
                <div className="ds-navCardIcon cabinet-quick-icon"><FileText size={24} strokeWidth={2} /></div>
                <div className="ds-navCardLabel">Документы</div>
              </Link>
              <Link to="/cabinet/analytics" className="ds-navCard">
                <div className="ds-navCardIcon cabinet-quick-icon"><BarChart3 size={24} strokeWidth={2} /></div>
                <div className="ds-navCardLabel">Аналитика</div>
              </Link>
              <Link to="/cabinet/qr-create" className="ds-navCard">
                <div className="ds-navCardIcon cabinet-quick-icon"><Plus size={24} strokeWidth={2} /></div>
                <div className="ds-navCardLabel">Создать QR-код</div>
              </Link>
              <Link to="/cabinet/qr" className="ds-navCard">
                <div className="ds-navCardIcon cabinet-quick-icon"><Printer size={24} strokeWidth={2} /></div>
                <div className="ds-navCardLabel">Печать QR</div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
