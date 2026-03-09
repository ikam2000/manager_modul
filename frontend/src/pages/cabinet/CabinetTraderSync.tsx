import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetchWithRetry } from '../../lib/authFetch'

type SyncResult = { synced: number; errors: string[]; message: string } | null

const PLATFORMS = [
  { id: 'shopify', label: 'Shopify', path: '/trader/sync/shopify', desc: 'Цены и остатки по баркоду (SKU)' },
  { id: 'wildberries', label: 'Wildberries', path: '/trader/sync/wildberries', desc: 'Требуется wb_nm_id в доп. полях товара' },
  { id: 'ozon', label: 'Ozon', path: '/trader/sync/ozon', desc: 'offer_id = баркод или ozon_offer_id' },
] as const

export default function CabinetTraderSync() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SyncResult>>({})

  async function handleSync(platformId: string, path: string) {
    setLoading(platformId)
    setResults((r) => ({ ...r, [platformId]: null }))
    try {
      const r = await authFetchWithRetry(path, { method: 'POST' })
      const data = await r.json()
      if (r.ok) {
        setResults((prev) => ({ ...prev, [platformId]: { ...data, synced: data.synced ?? data.updated ?? 0 } }))
      } else {
        setResults((prev) => ({
          ...prev,
          [platformId]: {
            synced: 0,
            errors: [data.detail || 'Ошибка синхронизации'],
            message: data.detail || 'Ошибка',
          },
        }))
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [platformId]: {
          synced: 0,
          errors: [String(err)],
          message: 'Ошибка синхронизации',
        },
      }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Синхронизация с площадками</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        Выгрузка цен и остатков на подключённые маркетплейсы.         Подключение — в{' '}
        <Link to="/cabinet/integrations" style={{ color: 'var(--accent)' }}>
          Интеграциях
        </Link>
        . Сопоставление поставщиков с площадками — в карточке поставщика.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {PLATFORMS.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{p.label}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{p.desc}</p>
              </div>
              <button
                onClick={() => handleSync(p.id, p.path)}
                disabled={!!loading}
                style={{
                  padding: '10px 20px',
                  background: loading === p.id ? 'var(--text-muted)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                {loading === p.id ? 'Синхронизация…' : 'Синхронизировать'}
              </button>
            </div>
            {results[p.id] != null && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                <p style={{ margin: 0 }}>{results[p.id]!.message}</p>
                {results[p.id]!.errors && results[p.id]!.errors.length > 0 && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, color: 'var(--text-muted)' }}>
                    {results[p.id]!.errors!.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
