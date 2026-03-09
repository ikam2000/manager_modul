import { useState, useEffect } from 'react'

export default function CabinetNotifications() {
  const [items, setItems] = useState<Array<{ id: number; title: string; body: string; created_at: string; read: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Уведомления</h1>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Нет уведомлений.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '1rem 1.5rem',
                background: n.read ? 'var(--surface)' : 'rgba(14,165,233,0.08)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{n.body}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>{n.created_at}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
