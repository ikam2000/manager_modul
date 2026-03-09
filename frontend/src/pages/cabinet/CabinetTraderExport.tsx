import { useState, useEffect } from 'react'
import { authFetchWithRetry } from '../../lib/authFetch'

export default function CabinetTraderExport() {
  const [supplierId, setSupplierId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [inStock, setInStock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    const t = localStorage.getItem('access_token')
    if (t) {
      Promise.all([
        fetch('/entities/suppliers?limit=500', { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.ok ? r.json() : { items: [] }),
        fetch('/entities/categories?limit=500', { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.ok ? r.json() : { items: [] }),
      ]).then(([s, c]) => {
        setSuppliers(s.items || [])
        setCategories(c.items || [])
      })
    }
  }, [])

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (supplierId) params.set('supplier_id', supplierId)
      if (categoryId) params.set('category_id', categoryId)
      if (inStock) params.set('in_stock', 'true')
      const r = await authFetchWithRetry(`/trader/export?${params.toString()}`)
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'trader_export.xlsx'
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Выгрузка Excel</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
        Экспорт товаров с расчётом наценки. Колонки: баркод, наименование, категория, поставщик, закупочная цена, наценка %, итоговая цена, остаток, срок годности.
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', minWidth: 180 }}
        >
          <option value="">Все поставщики</option>
          {suppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', minWidth: 180 }}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          Только в наличии
        </label>
      </div>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{ padding: '12px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
      >
        {loading ? 'Выгрузка...' : 'Скачать Excel'}
      </button>
    </div>
  )
}
