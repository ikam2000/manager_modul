import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetchWithRetry } from '../../lib/authFetch'

interface SupplierItem {
  id: number
  name: string
  phone: string | null
  address: string | null
  created_at: string | null
  product_count: number
}

export default function CabinetTraderSuppliers() {
  const [items, setItems] = useState<SupplierItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    authFetchWithRetry(`/trader/suppliers?${params}`)
      .then((r) => r.json())
      .then((d: { items: SupplierItem[]; total: number }) => {
        setItems(d.items)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [search, sortBy, sortOrder])

  const cell = { padding: '10px 12px', borderBottom: '1px solid var(--border)' }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Поставщики</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            minWidth: 200,
          }}
        />
        <select
          value={`${sortBy}_${sortOrder}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split('_')
            setSortBy(s)
            setSortOrder(o as 'asc' | 'desc')
          }}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="name_asc">По имени ↑</option>
          <option value="name_desc">По имени ↓</option>
          <option value="created_at_desc">По дате (сначала новые)</option>
          <option value="created_at_asc">По дате (сначала старые)</option>
        </select>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>Показано {items.length} из {total}</p>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...cell, textAlign: 'left' }}>Название</th>
                <th style={{ ...cell, textAlign: 'left' }}>Телефон</th>
                <th style={{ ...cell, textAlign: 'left' }}>Адрес</th>
                <th style={{ ...cell, textAlign: 'left' }}>Дата заведения</th>
                <th style={{ ...cell, textAlign: 'right' }}>Товаров</th>
                <th style={{ ...cell, width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>
                    <Link to={`/cabinet/entities/supplier/${r.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {r.name}
                    </Link>
                  </td>
                  <td style={cell}>{r.phone || '—'}</td>
                  <td style={cell}>{r.address || '—'}</td>
                  <td style={cell}>{r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{r.product_count}</td>
                  <td style={cell}>
                    <Link
                      to={`/cabinet/entities/supplier/${r.id}`}
                      style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}
                    >
                      Карточка
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p style={{ padding: 24, color: 'var(--text-secondary)' }}>Нет поставщиков</p>}
        </div>
      )}
    </div>
  )
}
