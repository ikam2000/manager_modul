import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Upload, RefreshCw, Search, X } from 'lucide-react'
import { authFetchWithRetry } from '../../lib/authFetch'

const TRADER_FIELDS = [
  { v: 'supplier_sku', lbl: 'Артикул поставщика' },
  { v: 'code', lbl: 'Внутр. артикул' },
  { v: 'barcode', lbl: 'Баркод' },
  { v: 'name', lbl: 'Наименование' },
  { v: 'brand', lbl: 'Бренд' },
  { v: 'category_raw', lbl: 'Категория' },
  { v: 'unit', lbl: 'Единица' },
  { v: 'pack_size', lbl: 'Размер упаковки' },
  { v: 'moq', lbl: 'MOQ' },
  { v: 'purchase_price', lbl: 'Цена' },
  { v: 'price_currency', lbl: 'Валюта' },
  { v: 'stock', lbl: 'Остаток' },
  { v: 'expiry_date', lbl: 'Срок годности' },
  { v: 'days_to_expiry', lbl: 'Дней до годности' },
]

function normalizeExtraKey(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase() || 'field'
}

export default function CabinetTraderImport() {
  const [searchParams] = useSearchParams()
  const supplierFromUrl = searchParams.get('supplier_id')

  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'add_new' | 'update_by_barcode'>('add_new')
  const [mappings, setMappings] = useState<Record<string, { mapTo: string }>>({})
  const [supplierId, setSupplierId] = useState(supplierFromUrl || '')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; message: string; limit_reached?: boolean; limit_message?: string; subscription_url?: string } | null>(null)
  const [resultPopupOpen, setResultPopupOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [apiSuppliers, setApiSuppliers] = useState<{ id: number; name: string }[]>([])
  const [importSource, setImportSource] = useState<'file' | 'api'>('file')
  const [fetchApiLoading, setFetchApiLoading] = useState(false)
  const [fetchApiResult, setFetchApiResult] = useState<{ created: number; updated: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recognizeLoading, setRecognizeLoading] = useState(false)
  const [preview, setPreview] = useState<{
    headers: Record<number, string>
    preview_rows: Record<number, string>[]
    suggested_mappings: Record<string, string>
  } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('access_token')
    if (t) {
      Promise.all([
        authFetchWithRetry('/trader/suppliers?limit=500').then((r) => r.json()).then((d) => d.items || []).catch(() => []),
        authFetchWithRetry('/trader/categories?limit=500').then((r) => r.json()).then((d) => d.items || []).catch(() => []),
      ]).then(([sItems, cItems]) => {
        setSuppliers(sItems)
        setCategories(cItems)
        const withApi = (sItems || []).filter((s: { id: number; name: string; import_source?: string }) =>
          s.import_source === 'api' || s.import_source === 'oauth'
        )
        setApiSuppliers(withApi)
      })
    }
  }, [])

  useEffect(() => {
    if (!supplierId) {
      setMappings({})
      return
    }
    authFetchWithRetry(`/entities/suppliers/${supplierId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((sup) => {
        const cfg = sup?.extra_fields?.import_config
        const saved = cfg?.column_mappings
        if (saved && typeof saved === 'object') {
          const m: Record<string, { mapTo: string }> = {}
          Object.entries(saved).forEach(([k, v]) => {
            const mapTo = (v as { mapTo?: string })?.mapTo
            if (mapTo) m[String(k)] = { mapTo }
          })
          setMappings(m)
        } else {
          setMappings({})
        }
      })
      .catch(() => setMappings({}))
  }, [supplierId])

  async function runRecognize() {
    if (!file) {
      alert('Сначала выберите файл')
      return
    }
    setRecognizeLoading(true)
    setPreview(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('files', file)
      const r = await authFetchWithRetry('/trader/import/preview', { method: 'POST', body: form })
      const data = await r.json()
      if (r.ok && data.headers) {
        setPreview(data)
        // Применить предложенное сопоставление
        const suggested = data.suggested_mappings || {}
        const newMappings: Record<string, { mapTo: string }> = {}
        Object.entries(suggested).forEach(([idx, mapTo]) => {
          if (mapTo && typeof mapTo === 'string') newMappings[idx] = { mapTo }
        })
        setMappings(newMappings)
      } else {
        alert(data.detail || 'Не удалось распознать файл')
      }
    } catch (err) {
      alert('Ошибка распознавания: ' + String(err))
    } finally {
      setRecognizeLoading(false)
    }
  }

  function clearPreview() {
    setPreview(null)
    setFile(null)
    setMappings({})
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      alert('Выберите файл Excel или CSV')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('files', file)
      form.append('column_mappings', JSON.stringify({ 0: mappings }))
      form.append('mode', mode)
      if (supplierId) form.append('supplier_id', supplierId)
      if (categoryId) form.append('category_id', categoryId)
      const r = await authFetchWithRetry('/trader/import', {
        method: 'POST',
        body: form,
      })
      const data = await r.json()
      setResult(data)
      setResultPopupOpen(true)
    } catch (err) {
      setResult({ created: 0, updated: 0, message: String(err) })
      setResultPopupOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function closeResultPopupAndReset() {
    setResultPopupOpen(false)
    setResult(null)
    clearPreview()
    window.dispatchEvent(new CustomEvent('ikamdocs:trader-import-done'))
  }

  const runFetchApi = async (sid: number) => {
    setFetchApiLoading(true)
    setFetchApiResult(null)
    try {
      const r = await authFetchWithRetry(`/trader/suppliers/${sid}/fetch-api`, { method: 'POST' })
      const data = await r.json()
      setFetchApiResult(r.ok ? { created: data.created || 0, updated: data.updated || 0 } : { created: 0, updated: 0 })
      if (!r.ok) alert(data.detail || 'Ошибка выкачки')
    } catch {
      setFetchApiResult({ created: 0, updated: 0 })
      alert('Ошибка выкачки')
    } finally {
      setFetchApiLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Импорт</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setImportSource('file')}
          style={{
            padding: '10px 20px',
            background: importSource === 'file' ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: importSource === 'file' ? '#fff' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Upload size={18} /> Из файла (Excel/CSV)
        </button>
        <button
          type="button"
          onClick={() => setImportSource('api')}
          style={{
            padding: '10px 20px',
            background: importSource === 'api' ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: importSource === 'api' ? '#fff' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={18} /> По API / OAuth
        </button>
      </div>

      {importSource === 'api' && (
        <div style={{ maxWidth: 560, marginBottom: 32, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Выкачать по API / OAuth</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Выберите поставщика с настроенным импортом по API или OAuth. Настройка — в <Link to="/cabinet/trader/suppliers" style={{ color: 'var(--accent)' }}>карточке поставщика</Link>.
          </p>
          {apiSuppliers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Нет поставщиков с API/OAuth. Добавьте поставщика и настройте источник импорта «API» или «OAuth» в карточке.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiSuppliers.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Link to={`/cabinet/entities/supplier/${s.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{s.name}</Link>
                  <button
                    type="button"
                    onClick={() => runFetchApi(s.id)}
                    disabled={fetchApiLoading}
                    style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: fetchApiLoading ? 'not-allowed' : 'pointer', fontSize: 13 }}
                  >
                    {fetchApiLoading ? 'Выкачка…' : 'Запустить выкачку'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {fetchApiResult && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.15)', borderRadius: 8, fontSize: 13 }}>
              Создано: {fetchApiResult.created}, обновлено: {fetchApiResult.updated}
            </div>
          )}
        </div>
      )}

      {importSource === 'file' && (
      <>
      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 24, padding: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 12 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Поставщик</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', width: '100%', maxWidth: 340, fontSize: 14 }}
          >
            <option value="">— не выбран —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
            Выберите поставщика — при наличии сохранённого шаблона импорта он применится автоматически. Шаблон настраивается в <Link to="/cabinet/trader/suppliers" style={{ color: 'var(--accent)' }}>карточке поставщика</Link>.
          </p>
        </div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Файл (Excel или CSV)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setFile(f)
                if (!f) setPreview(null)
              }}
              style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, width: '100%' }}
            />
          </div>
          <button
            type="button"
            onClick={runRecognize}
            disabled={!file || recognizeLoading}
            style={{
              padding: '10px 20px',
              background: file && !recognizeLoading ? 'var(--accent)' : 'var(--surface)',
              color: file && !recognizeLoading ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: file && !recognizeLoading ? 'pointer' : 'not-allowed',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={18} />
            {recognizeLoading ? 'Распознавание…' : 'Распознать'}
          </button>
          {preview && (
            <button type="button" onClick={clearPreview} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
              Выбрать другой файл
            </button>
          )}
        </div>

        {preview && (
          <div style={{ marginBottom: 24, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Превью файла</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              {Object.keys(preview.suggested_mappings || {}).length > 0
                ? `Автосопоставление: ${Object.entries(preview.suggested_mappings || {}).map(([i, f]) => `${preview.headers[Number(i)] || 'кол.' + i} → ${TRADER_FIELDS.find(x => x.v === f)?.lbl || f}`).join(', ')}`
                : 'Сопоставьте колонки вручную ниже'}
            </p>
            <div style={{ overflowX: 'auto', maxHeight: 220, border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {Object.entries(preview.headers || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([idx, name]) => (
                      <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', whiteSpace: 'nowrap' }}>
                        Колонка {idx}: {name}
                        {preview.suggested_mappings?.[idx] && (
                          <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 6 }}>
                            → {TRADER_FIELDS.find(f => f.v === preview.suggested_mappings![idx])?.lbl || preview.suggested_mappings![idx]}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(preview.preview_rows || []).map((row, ri) => (
                    <tr key={ri}>
                      {Object.keys(preview.headers || {}).sort((a, b) => Number(a) - Number(b)).map((idx) => (
                        <td key={idx} style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
                          {(row as Record<number, string>)[Number(idx)] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Режим</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'add_new' | 'update_by_barcode')}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="add_new">Добавить новые</option>
            <option value="update_by_barcode">Обновить по баркоду</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            Сопоставление колонок {preview ? `(${Object.keys(preview.headers).length} колонок в файле)` : '(после распознавания)'}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {((preview?.headers && Object.keys(preview.headers).length > 0)
              ? Object.keys(preview.headers).map(Number).sort((a, b) => a - b)
              : [0, 1, 2, 3, 4, 5]).map((idx) => {
                const mapping = mappings[String(idx)]?.mapTo || ''
                const isCreate = mapping === '__create__'
                const extraKeys = new Set<string>()
                Object.values(mappings).forEach((m) => {
                  const mt = m?.mapTo || ''
                  if (mt.startsWith('extra:')) extraKeys.add(mt)
                })
                return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-word', minWidth: 0 }}>
                  {preview?.headers?.[idx] ? `Колонка ${idx}: ${preview.headers[idx]}` : `Колонка ${idx}`}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={isCreate ? '__create__' : mapping || ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__create__') {
                      setMappings((m) => ({ ...m, [String(idx)]: { mapTo: '__create__' } }))
                    } else {
                      setMappings((m) => ({ ...m, [String(idx)]: { mapTo: v } }))
                    }
                  }}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', width: '100%', maxWidth: 200 }}
                >
                  <option value="">— не импортировать —</option>
                  {TRADER_FIELDS.map((f) => (
                    <option key={f.v} value={f.v}>{f.lbl}</option>
                  ))}
                  {[...extraKeys].map((ek) => (
                    <option key={ek} value={ek}>Доп.: {ek.replace('extra:', '')}</option>
                  ))}
                  <option value="__create__">— создать поле —</option>
                </select>
                {isCreate && (
                  <input
                    type="text"
                    placeholder="Ключ поля (лат.)"
                    autoFocus
                    onBlur={(e) => {
                      const k = normalizeExtraKey(e.target.value)
                      if (k) setMappings((m) => ({ ...m, [String(idx)]: { mapTo: `extra:${k}` } }))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const k = normalizeExtraKey((e.target as HTMLInputElement).value)
                        if (k) setMappings((m) => ({ ...m, [String(idx)]: { mapTo: `extra:${k}` } }))
                      }
                    }}
                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', width: 140 }}
                  />
                )}
                </div>
              </div>
            )})}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Категория (опц.)</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', width: '100%' }}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          {loading ? 'Импорт...' : 'Импортировать'}
        </button>
      </form>

      {resultPopupOpen && result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.target === e.currentTarget && closeResultPopupAndReset()}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Импорт завершён</h3>
              <button
                type="button"
                onClick={closeResultPopupAndReset}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={24} />
              </button>
            </div>
            <p style={{ marginBottom: 16, fontSize: 15 }}>Создано: <strong>{result.created}</strong>, обновлено: <strong>{result.updated}</strong></p>
            {result.limit_reached && result.limit_message && (
              <div style={{ padding: 12, background: 'var(--warning)', color: 'var(--text)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>{result.limit_message}</div>
                {result.subscription_url && (
                  <Link to={result.subscription_url} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Оформить подписку</Link>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <Link
                to="/cabinet/trader/entities?refresh=1"
                onClick={closeResultPopupAndReset}
                style={{ padding: '10px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: 14 }}
              >
                Перейти к товарам
              </Link>
              <button
                type="button"
                onClick={closeResultPopupAndReset}
                style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}
              >
                Импортировать ещё
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
