import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type SessionItem = {
  id: number
  user_id: number
  user_email: string
  user_full_name: string | null
  ip_address: string | null
  user_agent: string | null
  region: string | null
  created_at: string | null
  expires_at: string | null
}

export default function CabinetSessions() {
  const { user } = useAuth()
  const [items, setItems] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'super_admin') return
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/admin/sessions?limit=200', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user?.role])

  if (user?.role !== 'super_admin') {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Доступ только для супер-администратора.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Сессии авторизаций</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: 14 }}>
        IP, регион и устройство пользователей при входе в систему.
      </p>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div
          style={{
            overflow: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Пользователь</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>IP</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Регион</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Устройство</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Дата входа</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Нет записей о сессиях
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 500 }}>{s.user_full_name || s.user_email}</span>
                      {s.user_full_name && <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}>{s.user_email}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{s.ip_address || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{s.region || '—'}</td>
                    <td style={{ padding: '12px 16px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.user_agent || ''}>
                      {s.user_agent || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString('ru') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
