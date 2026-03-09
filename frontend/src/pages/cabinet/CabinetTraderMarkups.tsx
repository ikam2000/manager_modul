import { useState, useEffect } from 'react'
import { authFetchWithRetry } from '../../lib/authFetch'

interface SupplierMarkup {
  supplier_id: number
  supplier_name: string
  markup_percent: number
}

interface CategoryMarkup {
  category_id: number
  category_name: string
  markup_percent: number
}

interface PendingSupplier {
  supplier_id: string
  markup: string
}

interface MarkupHistoryItem {
  id: number
  action: string
  entity_type: string
  entity_id: number
  entity_name: string | null
  old_markup_percent: number | null
  new_markup_percent: number | null
  created_at: string | null
}

interface SampleItem {
  name: string
  purchase_price: number | null
  effective_markup_percent: number | null
  final_price: number | null
  supplier_name: string
  category_name: string
}

const actionLabels: Record<string, string> = { create: 'Добавлена', update: 'Изменена', delete: 'Удалена' }
const entityLabels: Record<string, string> = { supplier: 'Поставщик', category: 'Категория' }

export default function CabinetTraderMarkups() {
  const [supplierMarkups, setSupplierMarkups] = useState<SupplierMarkup[]>([])
  const [categoryMarkups, setCategoryMarkups] = useState<CategoryMarkup[]>([])
  const [history, setHistory] = useState<MarkupHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [selectedSupplierForCategories, setSelectedSupplierForCategories] = useState('')
  const [pendingSuppliers, setPendingSuppliers] = useState<PendingSupplier[]>([])
  const [newSupplierId, setNewSupplierId] = useState('')
  const [newSupplierMarkup, setNewSupplierMarkup] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newCategoryMarkup, setNewCategoryMarkup] = useState('')
  const [sampleItem, setSampleItem] = useState<SampleItem | null>(null)
  const [sampleCategoryItem, setSampleCategoryItem] = useState<SampleItem | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      authFetchWithRetry('/trader/markup/suppliers').then((r) => r.json()),
      authFetchWithRetry('/trader/markup/categories').then((r) => r.json()),
      authFetchWithRetry('/trader/markup/history').then((r) => r.json()),
    ])
      .then(([s, c, h]) => {
        setSupplierMarkups(s.items || [])
        setCategoryMarkups(c.items || [])
        setHistory(h.items || [])
      })
      .finally(() => setLoading(false))
  }

  function loadSample(supplierId?: string, categoryId?: string) {
    const params = new URLSearchParams()
    params.set('limit', '1')
    if (supplierId) params.set('supplier_id', supplierId)
    if (categoryId) params.set('category_id', categoryId)
    authFetchWithRetry(`/trader/nomenclature?${params}`)
      .then((r) => r.json())
      .then((d: { items: Array<{ name: string; purchase_price: number | null; effective_markup_percent: number | null; final_price: number | null; supplier_name: string; category_name: string }> }) => {
        const item = d.items?.[0]
        if (item) {
          const s: SampleItem = {
            name: item.name,
            purchase_price: item.purchase_price,
            effective_markup_percent: item.effective_markup_percent,
            final_price: item.final_price,
            supplier_name: item.supplier_name || '—',
            category_name: item.category_name || '—',
          }
          if (categoryId) setSampleCategoryItem(s)
          else setSampleItem(s)
        } else if (categoryId) setSampleCategoryItem(null)
        else setSampleItem(null)
      })
      .catch(() => { if (!categoryId) setSampleItem(null); else setSampleCategoryItem(null) })
  }

  useEffect(() => {
    load()
    loadSample()
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('access_token')
    if (t) {
      fetch('/entities/suppliers?limit=500', { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((s) => setSuppliers(s.items || []))
    }
  }, [])

  useEffect(() => {
    if (!selectedSupplierForCategories) {
      setCategories([])
      setSampleCategoryItem(null)
      return
    }
    setCategoriesLoading(true)
    authFetchWithRetry(`/trader/categories-by-supplier?supplier_id=${selectedSupplierForCategories}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []))
      .finally(() => setCategoriesLoading(false))
    loadSample(selectedSupplierForCategories)
  }, [selectedSupplierForCategories])

  useEffect(() => {
    if (newCategoryId) loadSample(selectedSupplierForCategories, newCategoryId)
  }, [newCategoryId])

  function addToPendingSuppliers() {
    if (!newSupplierId || !newSupplierMarkup) return
    const already = supplierMarkups.some((m) => m.supplier_id === parseInt(newSupplierId))
    const inPending = pendingSuppliers.some((p) => p.supplier_id === newSupplierId)
    if (already || inPending) return
    setPendingSuppliers((prev) => [...prev, { supplier_id: newSupplierId, markup: newSupplierMarkup }])
    setNewSupplierId('')
    setNewSupplierMarkup('')
  }

  function removePendingSupplier(idx: number) {
    setPendingSuppliers((prev) => prev.filter((_, i) => i !== idx))
  }

  async function applyPendingSuppliers() {
    if (pendingSuppliers.length === 0) return
    const items = pendingSuppliers.map((p) => ({ supplier_id: parseInt(p.supplier_id), markup_percent: parseFloat(p.markup) }))
    await authFetchWithRetry('/trader/markup/suppliers/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setPendingSuppliers([])
    load()
    loadSample()
  }

  async function addCategoryMarkup() {
    if (!newCategoryId || !newCategoryMarkup) return
    await authFetchWithRetry('/trader/markup/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: parseInt(newCategoryId), markup_percent: parseFloat(newCategoryMarkup) }),
    })
    setNewCategoryId('')
    setNewCategoryMarkup('')
    load()
    if (selectedSupplierForCategories) loadSample(selectedSupplierForCategories)
  }

  async function updateSupplierMarkup(supplierId: number, markup: number) {
    await authFetchWithRetry(`/trader/markup/suppliers/${supplierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markup_percent: markup }),
    })
    load()
    loadSample()
  }

  async function updateCategoryMarkup(categoryId: number, markup: number) {
    await authFetchWithRetry(`/trader/markup/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markup_percent: markup }),
    })
    load()
    if (selectedSupplierForCategories) loadSample(selectedSupplierForCategories)
  }

  async function deleteSupplierMarkup(supplierId: number) {
    if (!confirm('Удалить наценку?')) return
    await authFetchWithRetry(`/trader/markup/suppliers/${supplierId}`, { method: 'DELETE' })
    load()
    loadSample()
  }

  async function deleteCategoryMarkup(categoryId: number) {
    if (!confirm('Удалить наценку?')) return
    await authFetchWithRetry(`/trader/markup/categories/${categoryId}`, { method: 'DELETE' })
    load()
    if (selectedSupplierForCategories) loadSample(selectedSupplierForCategories)
  }

  const availableSuppliers = suppliers.filter(
    (s) =>
      !supplierMarkups.some((m) => m.supplier_id === s.id) &&
      !pendingSuppliers.some((p) => p.supplier_id === String(s.id))
  )
  const availableCategories = categories.filter((c) => !categoryMarkups.some((m) => m.category_id === c.id))

  if (loading && supplierMarkups.length === 0 && categoryMarkups.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  }

  const blockStyle = { padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }
  const inputStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }
  const btnStyle = { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }
  const btnSecStyle = { padding: '4px 10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Наценки</h1>

      {/* Поставщики — множественный выбор */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>По поставщикам</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
          Выберите поставщика и наценку, нажмите «Добавить в список». Можно добавить несколько перед применением.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={newSupplierId} onChange={(e) => setNewSupplierId(e.target.value)} style={{ ...inputStyle, minWidth: 200 }}>
            <option value="">Выбрать поставщика</option>
            {availableSuppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Наценка %"
            value={newSupplierMarkup}
            onChange={(e) => setNewSupplierMarkup(e.target.value)}
            style={{ ...inputStyle, width: 100 }}
          />
          <button onClick={addToPendingSuppliers} disabled={!newSupplierId || !newSupplierMarkup} style={btnStyle}>
            Добавить в список
          </button>
          {pendingSuppliers.length > 0 && (
            <button onClick={applyPendingSuppliers} style={{ ...btnStyle, background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              Применить все ({pendingSuppliers.length})
            </button>
          )}
        </div>
        {pendingSuppliers.length > 0 && (
          <div style={{ ...blockStyle, marginBottom: 12 }}>
            <strong>К добавлению:</strong>
            {pendingSuppliers.map((p, idx) => {
              const sup = suppliers.find((s) => String(s.id) === p.supplier_id)
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span>{sup?.name || p.supplier_id}</span>
                  <span>{p.markup}%</span>
                  <button onClick={() => removePendingSupplier(idx)} style={btnSecStyle}>Убрать</button>
                </div>
              )
            })}
          </div>
        )}
        {sampleItem && (
          <div style={blockStyle}>
            <strong>Пример влияния на товар:</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              {sampleItem.name} • {sampleItem.supplier_name} • {sampleItem.category_name}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>
              Закупочная: {sampleItem.purchase_price != null ? sampleItem.purchase_price.toLocaleString('ru-RU') : '—'} ₽
              {' → '}Наценка: {sampleItem.effective_markup_percent != null ? sampleItem.effective_markup_percent.toFixed(1) : '—'}%
              {' → '}<strong>Итоговая: {sampleItem.final_price != null ? sampleItem.final_price.toLocaleString('ru-RU') : '—'} ₽</strong>
            </p>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Поставщик</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Наценка %</th>
              <th style={{ padding: 10, width: 120 }} />
            </tr>
          </thead>
          <tbody>
            {supplierMarkups.map((m) => (
              <tr key={m.supplier_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 10 }}>{m.supplier_name}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>
                  <input
                    type="number"
                    defaultValue={m.markup_percent}
                    onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateSupplierMarkup(m.supplier_id, v) }}
                    style={{ width: 80, padding: 4, border: '1px solid var(--border)', borderRadius: 4, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => deleteSupplierMarkup(m.supplier_id)} style={btnSecStyle}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Категории — с выбором поставщика */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>По категориям</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
          Сначала выберите поставщика — подтянутся категории, в которых есть его номенклатура.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedSupplierForCategories}
            onChange={(e) => { setSelectedSupplierForCategories(e.target.value); setNewCategoryId('') }}
            style={{ ...inputStyle, minWidth: 200 }}
          >
            <option value="">Сначала выберите поставщика</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            disabled={!selectedSupplierForCategories || categoriesLoading}
            style={{ ...inputStyle, minWidth: 200 }}
          >
            <option value="">{categoriesLoading ? 'Загрузка...' : 'Выбрать категорию'}</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Наценка %"
            value={newCategoryMarkup}
            onChange={(e) => setNewCategoryMarkup(e.target.value)}
            style={{ ...inputStyle, width: 100 }}
          />
          <button
            onClick={addCategoryMarkup}
            disabled={!newCategoryId || !newCategoryMarkup}
            style={btnStyle}
          >
            Добавить
          </button>
        </div>
        {sampleCategoryItem && (
          <div style={blockStyle}>
            <strong>Пример влияния на товар:</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              {sampleCategoryItem.name} • {sampleCategoryItem.supplier_name} • {sampleCategoryItem.category_name}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>
              Закупочная: {sampleCategoryItem.purchase_price != null ? sampleCategoryItem.purchase_price.toLocaleString('ru-RU') : '—'} ₽
              {' → '}Наценка: {sampleCategoryItem.effective_markup_percent != null ? sampleCategoryItem.effective_markup_percent.toFixed(1) : '—'}%
              {' → '}<strong>Итоговая: {sampleCategoryItem.final_price != null ? sampleCategoryItem.final_price.toLocaleString('ru-RU') : '—'} ₽</strong>
            </p>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Категория</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Наценка %</th>
              <th style={{ padding: 10, width: 120 }} />
            </tr>
          </thead>
          <tbody>
            {categoryMarkups.map((m) => (
              <tr key={m.category_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 10 }}>{m.category_name}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>
                  <input
                    type="number"
                    defaultValue={m.markup_percent}
                    onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCategoryMarkup(m.category_id, v) }}
                    style={{ width: 80, padding: 4, border: '1px solid var(--border)', borderRadius: 4, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => deleteCategoryMarkup(m.category_id)} style={btnSecStyle}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* История */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>История произведённых наценок</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Дата</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Действие</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Тип</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Название</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Было %</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Стало %</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center' }}>История пуста</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 10, fontSize: 13 }}>{h.created_at ? new Date(h.created_at).toLocaleString('ru-RU') : '—'}</td>
                  <td style={{ padding: 10 }}>{actionLabels[h.action] ?? h.action}</td>
                  <td style={{ padding: 10 }}>{entityLabels[h.entity_type] ?? h.entity_type}</td>
                  <td style={{ padding: 10 }}>{h.entity_name ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{h.old_markup_percent != null ? h.old_markup_percent.toFixed(1) : '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{h.new_markup_percent != null ? h.new_markup_percent.toFixed(1) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
