import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authFetchWithRetry } from '../../lib/authFetch'
import { Filter, Settings, ChevronLeft, ChevronRight } from 'lucide-react'

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  supplier_sku: 120,
  code: 100,
  barcode: 100,
  name: 220,
  brand: 100,
  category_name: 120,
  supplier_name: 120,
  unit: 50,
  pack_size: 90,
  moq: 60,
  purchase_price: 90,
  price_currency: 60,
  effective_markup_percent: 80,
  final_price: 90,
  stock: 70,
  expiry_date: 100,
  days_to_expiry: 100,
  updated_at: 90,
}

interface TraderItem {
  id: number
  name: string
  code: string | null
  barcode: string | null
  supplier_sku: string | null
  brand: string | null
  category_name: string
  supplier_name: string
  unit: string | null
  pack_size: string | null
  moq: number | null
  purchase_price: number | null
  price_currency: string | null
  markup_percent: number | null
  effective_markup_percent: number | null
  final_price: number | null
  stock: number | null
  expiry_date: string | null
  days_to_expiry: number | null
  updated_at: string | null
  extra_fields?: Record<string, string | number | null>
}

const BASE_COLUMNS = [
  { key: 'supplier_sku', label: 'Артикул поставщика', align: 'left' as const },
  { key: 'code', label: 'Внутр. артикул', align: 'left' as const },
  { key: 'barcode', label: 'Баркод', align: 'left' as const },
  { key: 'name', label: 'Наименование', align: 'left' as const },
  { key: 'brand', label: 'Бренд', align: 'left' as const },
  { key: 'category_name', label: 'Категория', align: 'left' as const },
  { key: 'supplier_name', label: 'Поставщик', align: 'left' as const },
  { key: 'unit', label: 'Ед.', align: 'left' as const },
  { key: 'pack_size', label: 'Упаковка', align: 'left' as const },
  { key: 'moq', label: 'MOQ', align: 'right' as const },
  { key: 'purchase_price', label: 'Цена', align: 'right' as const },
  { key: 'price_currency', label: 'Валюта', align: 'left' as const },
  { key: 'effective_markup_percent', label: 'Наценка %', align: 'right' as const },
  { key: 'final_price', label: 'Итоговая', align: 'right' as const },
  { key: 'stock', label: 'Остаток', align: 'right' as const },
  { key: 'expiry_date', label: 'Срок годности', align: 'left' as const },
  { key: 'days_to_expiry', label: 'Дней до годности', align: 'right' as const },
  { key: 'updated_at', label: 'Обновлено', align: 'left' as const },
]

const PAGE_SIZES = [20, 50, 100, 500, 1000] as const

const SORTABLE_COLUMNS = new Set(['name', 'code', 'barcode', 'purchase_price', 'stock', 'expiry_date', 'supplier_sku', 'brand', 'updated_at'])

export default function CabinetTraderEntities() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<TraderItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [supplierId, setSupplierId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [inStock, setInStock] = useState<boolean | ''>('')
  const [search, setSearch] = useState('')
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [limit, setLimit] = useState<number>(20)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BASE_COLUMNS.map((c) => [c.key, true]))
  )
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => ({ ...DEFAULT_COL_WIDTHS }))
  const resizeRef = useRef<{ key: string; startX: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const handleResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { key, startX: e.clientX }
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current
      if (!r) return
      const delta = e.clientX - r.startX
      r.startX = e.clientX
      setColWidths((prev) => {
        const curr = prev[r.key] ?? DEFAULT_COL_WIDTHS[r.key] ?? 100
        const next = Math.max(40, Math.min(500, curr + delta))
        return { ...prev, [r.key]: next }
      })
    }
    const onUp = () => {
      resizeRef.current = null
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const extraCols = Array.from(
    new Set(items.flatMap((i) => Object.keys(i.extra_fields || {})))
  ).sort()

  const allColumns = [
    ...BASE_COLUMNS,
    ...extraCols.map((k) => ({ key: `extra:${k}`, label: k, align: 'left' as const })),
  ]

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  function load(cacheBust = false) {
    setLoading(true)
    const params = new URLSearchParams()
    if (supplierId) params.set('supplier_id', supplierId)
    if (categoryId) params.set('category_id', categoryId)
    if (inStock === true) params.set('in_stock', 'true')
    if (search) params.set('search', search)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    if (cacheBust) params.set('_', String(Date.now()))
    authFetchWithRetry(`/trader/nomenclature?${params.toString()}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.detail || `HTTP ${r.status}`) })
        return r.json()
      })
      .then((d: { items?: TraderItem[]; total?: number }) => {
        setItems(Array.isArray(d?.items) ? d.items : [])
        setTotalCount(typeof d?.total === 'number' ? d.total : 0)
      })
      .catch(() => {
        setItems([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const needRefresh = searchParams.get('refresh') === '1'
    if (needRefresh) {
      setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('refresh'); return next }, { replace: true })
      load(true)
    } else {
      load()
    }
  }, [supplierId, categoryId, inStock, search, limit, offset, sortBy, sortOrder])

  useEffect(() => {
    const onImportDone = () => load(true)
    window.addEventListener('ikamdocs:trader-import-done', onImportDone)
    return () => window.removeEventListener('ikamdocs:trader-import-done', onImportDone)
  }, [supplierId, categoryId, inStock, search, limit, offset, sortBy, sortOrder])

  useEffect(() => {
    Promise.all([
      authFetchWithRetry('/trader/suppliers?limit=500').then((r) => r.json()).then((d) => d.items || []).catch(() => []),
      authFetchWithRetry('/trader/categories?limit=500').then((r) => r.json()).then((d) => d.items || []).catch(() => []),
    ]).then(([sItems, cItems]) => {
      setSuppliers(sItems || [])
      setCategories(cItems || [])
    })
  }, [])


  function goPage(delta: number) {
    const newOffset = Math.max(0, Math.min(offset + delta * limit, totalCount - 1))
    setOffset(Math.floor(newOffset / limit) * limit)
  }

  async function handleExport() {
    const params = new URLSearchParams()
    if (supplierId) params.set('supplier_id', supplierId)
    if (categoryId) params.set('category_id', categoryId)
    if (inStock === true) params.set('in_stock', 'true')
    const r = await authFetchWithRetry(`/trader/export?${params.toString()}`)
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'trader_export.xlsx'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function getCellValue(r: TraderItem, col: { key: string }) {
    if (col.key.startsWith('extra:')) {
      const k = col.key.slice(6)
      const v = r.extra_fields?.[k]
      if (v == null) return '—'
      return typeof v === 'number' ? Number(v).toLocaleString('ru-RU') : String(v)
    }
    const val = (r as unknown as Record<string, unknown>)[col.key]
    if (val == null) return '—'
    if (col.key === 'name') return val
    if (col.key === 'purchase_price' || col.key === 'final_price' || col.key === 'stock' || col.key === 'moq') return Number(val).toLocaleString('ru-RU')
    if (col.key === 'effective_markup_percent') return Number(val).toFixed(1)
    if (col.key === 'days_to_expiry') return Number(val).toLocaleString('ru-RU')
    if (col.key === 'updated_at' && typeof val === 'string') return new Date(val).toLocaleDateString('ru-RU')
    return String(val)
  }

  const displayedCols = allColumns.filter((c) => visibleColumns[c.key] !== false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Товары</h1>
        <button
          onClick={handleExport}
          className="btn-v2"
          style={{ fontSize: 14 }}
        >
          Выгрузка Excel
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
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
            minWidth: 180,
          }}
        />
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            minWidth: 160,
          }}
        >
          <option value="">Все поставщики</option>
          {suppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            minWidth: 160,
          }}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inStock === true}
            onChange={(e) => setInStock(e.target.checked ? true : '')}
          />
          Только в наличии
        </label>
      </div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Всего: {totalCount}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setFilterPanelOpen((v) => !v)}
                style={{
                  padding: 6,
                  background: filterPanelOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                title="Фильтр"
              >
                <Filter size={18} />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                style={{
                  padding: 6,
                  background: settingsOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                title="Настройки столбцов"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
          {filterPanelOpen && (
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Фильтры заданы выше (поиск, поставщик, категория, в наличии)</div>
            </div>
          )}
          {settingsOpen && (
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Отображаемые столбцы</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allColumns.map((c) => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={visibleColumns[c.key] !== false}
                      onChange={(e) => setVisibleColumns((v) => ({ ...v, [c.key]: e.target.checked }))}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <style>{`
            .products-table { table-layout: fixed; }
            .products-table thead tr { background: rgba(255,255,255,0.1); }
            .products-table tbody tr:hover { background: rgba(255,255,255,0.06); }
            .products-table th:hover, .products-table td:hover { background: rgba(255,255,255,0.03); }
            .products-table th { position: relative; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .products-table td { overflow: hidden; text-overflow: ellipsis; }
            .products-table .col-resizer {
              position: absolute;
              right: 0;
              top: 0;
              bottom: 0;
              width: 6px;
              cursor: col-resize;
              background: transparent;
            }
            .products-table .col-resizer:hover { background: var(--accent); opacity: 0.3; }
            .products-table th.sortable { cursor: pointer; user-select: none; }
          `}</style>
          <div style={{ overflowX: 'auto' }}>
          <table className="products-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: displayedCols.reduce((s, c) => s + (colWidths[c.key] ?? DEFAULT_COL_WIDTHS[c.key] ?? 100), 0) }}>
            <colgroup>
              {displayedCols.map((col) => (
                <col key={col.key} style={{ width: colWidths[col.key] ?? DEFAULT_COL_WIDTHS[col.key] ?? 100 }} />
              ))}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {displayedCols.map((col) => {
                  const isSortable = SORTABLE_COLUMNS.has(col.key)
                  const isActive = sortBy === col.key
                  const handleHeaderClick = () => {
                    if (!isSortable) return
                    if (col.key === sortBy) {
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                    } else {
                      setSortBy(col.key)
                      setSortOrder('asc')
                    }
                    setOffset(0)
                  }
                  return (
                    <th
                      key={col.key}
                      className={isSortable ? 'sortable' : ''}
                      style={{ padding: '10px 8px', textAlign: col.align }}
                      onClick={isSortable ? handleHeaderClick : undefined}
                    >
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {col.label}
                        {isSortable && isActive && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                      </span>
                      <div
                        className="col-resizer"
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(col.key, e) }}
                        role="separator"
                        aria-orientation="vertical"
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {displayedCols.map((col) => (
                    <td key={col.key} style={{ padding: '10px 8px', textAlign: col.align }}>
                      {col.key === 'name' ? (
                        <Link to={`/cabinet/entities/nomenclature/${r.id}`} state={{ from: 'trader/entities' }} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {r.name}
                        </Link>
                      ) : (
                        String(getCellValue(r, col))
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p style={{ padding: 24, color: 'var(--text-secondary)' }}>Нет данных</p>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>На странице:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setOffset(0)
                }}
                style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value={Math.max(totalCount || 0, 10000)}>Все</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => goPage(-1)}
                disabled={offset === 0}
                style={{
                  padding: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: offset === 0 ? 'var(--text-muted)' : 'var(--text)',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goPage(1)}
                disabled={offset + limit >= totalCount}
                style={{
                  padding: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: offset + limit >= totalCount ? 'var(--text-muted)' : 'var(--text)',
                  cursor: offset + limit >= totalCount ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
