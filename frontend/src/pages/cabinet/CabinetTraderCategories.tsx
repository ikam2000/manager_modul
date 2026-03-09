import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetchWithRetry } from '../../lib/authFetch'

interface CategoryItem {
  id: number
  name: string
  product_count: number
}

export default function CabinetTraderCategories() {
  const [items, setItems] = useState<CategoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    authFetchWithRetry(`/trader/categories?${params}`)
      .then((r) => r.json())
      .then((d: { items: CategoryItem[]; total: number }) => {
        setItems(d.items)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [search])

  const cell = { padding: '10px 12px', borderBottom: '1px solid var(--border)' }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Категории</h1>
      <div style={{ marginBottom: 16 }}>
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
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>Показано {items.length} из {total}</p>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...cell, textAlign: 'left' }}>Категория</th>
                <th style={{ ...cell, textAlign: 'right' }}>Товаров</th>
                <th style={{ ...cell, width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>
                    <Link to={`/cabinet/entities/category/${r.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {r.name}
                    </Link>
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }}>{r.product_count}</td>
                  <td style={cell}>
                    <Link
                      to={`/cabinet/entities/category/${r.id}`}
                      style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}
                    >
                      Карточка
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p style={{ padding: 24, color: 'var(--text-secondary)' }}>Нет категорий</p>}
        </div>
      )}
    </div>
  )
}
