import { useState, useEffect } from 'react'

interface AuditItem {
  id: number
  entity_type: string
  entity_id: number
  action: string
  change: string
  created_at: string | null
}

interface AuditResponse {
  items: AuditItem[]
  total: number
}

export default function CabinetAuditLog() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/analytics/audit-log?limit=50&offset=0', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Журнал аудита</h1>
          <p className="ds-lead">
            История изменений: поставщики, интеграции и другие действия в системе.
          </p>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Последние события</div>
          </div>
          <div className="ds-cardBody">
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', padding: 24 }}>Загрузка...</p>
            ) : (
              <div className="ds-tableWrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Действие</th>
                      <th>Тип</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : '—'}
                          </td>
                          <td>{item.change}</td>
                          <td>{item.entity_type}</td>
                          <td>{item.entity_id}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>
                          Нет записей в журнале аудита
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {total > 0 && (
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                Всего записей: {total}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
