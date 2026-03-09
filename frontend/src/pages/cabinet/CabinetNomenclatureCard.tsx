import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Upload, FileText, Download, Plus, Trash2, Ban } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

function AddCustomField({ onAdd }: { onAdd: (name: string, value: string) => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <input
        placeholder="Название поля"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ flex: 1, maxWidth: 140, padding: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
      />
      <input
        placeholder="Значение"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: 2, padding: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
      />
      <button
        type="button"
        onClick={() => {
          onAdd(name, value)
          setName('')
          setValue('')
        }}
        disabled={!name.trim()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.6 }}
      >
        <Plus size={16} /> Добавить
      </button>
    </div>
  )
}

const CURRENCIES = [
  { value: '', label: '—' },
  { value: 'RUB', label: 'RUB (₽)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'GBP', label: 'GBP (£)' },
]

export default function CabinetNomenclatureCard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const fromTrader = location.state?.from === 'trader/entities' || user?.role === 'trader' || user?.company_type === 'trader'
  const backTo = fromTrader ? '/cabinet/trader/entities' : '/cabinet/entities'
  const canDeleteEntities = user?.permissions?.can_delete_entities ?? false
  const canDeleteDocs = user?.permissions?.can_delete_documents ?? false
  const [item, setItem] = useState<any>(null)
  const [manufacturer, setManufacturer] = useState<any>(null)
  const [category, setCategory] = useState<any>(null)
  const [subcategory, setSubcategory] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [edit, setEdit] = useState<Record<string, any>>({})
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!id || !token) return
    Promise.all([
      fetch(`/entities/nomenclature/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/documents?entity_type=nomenclature&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([r1, r2]) => {
        const nom = r1.ok ? await r1.json() : null
        const docs = r2.ok ? (await r2.json()).items : []
        return [nom, docs]
      })
      .then(async ([nom, docs]) => {
        setItem(nom)
        setDocuments(docs || [])
        if (nom?.manufacturer_id) {
          fetch(`/entities/manufacturers/${nom.manufacturer_id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.ok ? r.json() : null)
            .then(setManufacturer)
        } else setManufacturer(null)
        if (nom?.category_id) {
          fetch(`/entities/categories/${nom.category_id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.ok ? r.json() : null)
            .then(setCategory)
        } else setCategory(null)
        if (nom?.subcategory_id) {
          fetch(`/entities/subcategories/${nom.subcategory_id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.ok ? r.json() : null)
            .then((sub) => {
              setSubcategory(sub)
              if (sub?.category_id && !nom.category_id) {
                fetch(`/entities/categories/${sub.category_id}`, { headers: { Authorization: `Bearer ${token}` } })
                  .then((r) => r.ok ? r.json() : null)
                  .then(setCategory)
              }
            })
        } else setSubcategory(null)
        if (nom?.id) {
          fetch(`/entities/supplies?nomenclature_id=${nom.id}&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.ok ? r.json() : { items: [] })
            .then((d) => {
              const seen = new Set<number>()
              const list: { id: number; name: string }[] = []
              for (const s of (d.items || [])) {
                if (s.supplier_id && s.supplier_name && !seen.has(s.supplier_id)) {
                  seen.add(s.supplier_id)
                  list.push({ id: s.supplier_id, name: s.supplier_name })
                }
              }
              setSuppliers(list)
            })
        } else setSuppliers([])
        if (nom) {
          setEdit({
            code: nom.code,
            name: nom.name,
            price: nom.price,
            purchase_price: nom.purchase_price,
            price_currency: nom.price_currency ?? '',
            tag_number: nom.tag_number,
            package_number: nom.package_number,
            specification: nom.specification,
            question_sheet_no: nom.question_sheet_no,
            extra_fields: nom.extra_fields || {},
          })
        }
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !token || !item) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      code: edit.code,
      name: edit.name,
      price: edit.price != null && edit.price !== '' ? parseFloat(String(edit.price)) : null,
      purchase_price: edit.purchase_price != null && edit.purchase_price !== '' ? parseFloat(String(edit.purchase_price)) : null,
      price_currency: edit.price_currency && String(edit.price_currency).trim() ? String(edit.price_currency).trim() : null,
      tag_number: edit.tag_number,
      package_number: edit.package_number,
      specification: edit.specification,
      question_sheet_no: edit.question_sheet_no,
      extra_fields: edit.extra_fields || {},
    }
    try {
      const r = await fetch(`/entities/nomenclature/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const updated = await r.json()
        setItem(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || !token) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('entity_type', 'nomenclature')
    fd.append('entity_id', id)
    try {
      const r = await fetch('/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (r.ok) {
        const d = await r.json()
        setDocuments((prev) => [{ ...d, filename: d.filename || file.name }, ...prev])
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading || !item) {
    return (
      <div>
        <Link to={backTo} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 16 }}>
          <ArrowLeft size={18} /> Назад к списку
        </Link>
        <p style={{ color: 'var(--text-secondary)' }}>{loading ? 'Загрузка...' : 'Номенклатура не найдена'}</p>
      </div>
    )
  }

  return (
    <div>
      <Link to={backTo} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> Назад к списку
      </Link>

      <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Карточка номенклатуры</h1>
          {canDeleteEntities && !item.is_deleted && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Отключить номенклатуру?')) return
                  const r = await fetch(`/entities/nomenclature/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ is_deleted: true }),
                  })
                  if (r.ok) { setItem((p: any) => ({ ...p, is_deleted: true })) }
                  else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(234,179,8,0.2)', color: 'var(--warning)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                <Ban size={18} /> Отключить
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Удалить номенклатуру безвозвратно?')) return
                  const r = await fetch(`/entities/nomenclature/${id}?soft=false`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (r.ok) navigate(backTo)
                  else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(239,68,68,0.2)', color: 'var(--error)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                <Trash2 size={18} /> Удалить
              </button>
            </div>
          )}
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Код</label>
              <input
                value={edit.code ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, code: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Наименование</label>
              <input
                value={edit.name ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Цена</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={edit.price ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, price: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                placeholder="0.00"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Закупочная цена</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={edit.purchase_price ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, purchase_price: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                placeholder="0.00"
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Отображается в разделе Товары</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Валюта</label>
              <select
                value={edit.price_currency ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, price_currency: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value || 'empty'} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Таговый №</label>
              <input
                value={edit.tag_number ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, tag_number: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Номер грузового места</label>
              <input
                value={edit.package_number ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, package_number: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Спецификация</label>
              <textarea
                value={edit.specification ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, specification: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>№ опросного листа</label>
              <input
                value={edit.question_sheet_no ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, question_sheet_no: e.target.value }))}
                style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              />
            </div>
            {manufacturer && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Производитель</label>
                <Link to={`/cabinet/entities/manufacturer/${manufacturer.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{manufacturer.name}</Link>
              </div>
            )}
            {(category || subcategory) && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Категория</label>
                <span>
                  {category && <Link to={`/cabinet/entities/category/${category.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{category.name}</Link>}
                  {category && subcategory && ' › '}
                  {subcategory && <Link to={`/cabinet/entities/subcategory/${subcategory.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{subcategory.name}</Link>}
                </span>
              </div>
            )}
            {suppliers.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-secondary)' }}>Поставщики</label>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {suppliers.map((s) => (
                    <Link key={s.id} to={`/cabinet/entities?tab=nomenclature&supplier=${s.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{s.name}</Link>
                  ))}
                </span>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <h4 style={{ fontSize: '0.9375rem', marginBottom: 12, color: 'var(--text-secondary)' }}>Дополнительные поля</h4>
              {(() => {
                const fieldLabels: Record<string, string> = {
                  manufacturer: 'Производитель', quantity: 'Количество', country_of_origin: 'Страна происхождения',
                  length_cm: 'Длина, см', width_cm: 'Ширина, см', height_cm: 'Высота, см',
                  net_weight_unit: 'Вес нетто за ед.', total_net_weight: 'Вес нетто итого', total_gross_weight: 'Вес брутто итого',
                  shipping_number: 'Номер отгружаемого', storage_conditions: 'Условия хранения', packaging_type: 'Тип упаковки',
                  price_without_vat: 'Цена без НДС', price_with_vat: 'Цена с НДС',
                }
                const stdKeys = ['shipping_number', 'storage_conditions', 'packaging_type', 'length_cm', 'width_cm', 'height_cm', 'net_weight_unit', 'total_net_weight', 'total_gross_weight', 'price_without_vat', 'price_with_vat']
                const customKeys = Object.keys(edit.extra_fields || {}).filter((k) => !stdKeys.includes(k))
                const allKeys = [...stdKeys, ...customKeys]
                return allKeys.map((key) => {
                const label = fieldLabels[key] || key
                const value = edit.extra_fields?.[key] ?? ''
                return (
                <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input
                    value={label}
                    readOnly
                    style={{ flex: 1, maxWidth: 140, padding: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
                  />
                  <input
                    value={String(value)}
                    onChange={(e) => setEdit((p) => ({
                      ...p,
                      extra_fields: { ...(p.extra_fields || {}), [key]: e.target.value },
                    }))}
                    style={{ flex: 2, padding: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...(edit.extra_fields || {}) }
                      delete next[key]
                      setEdit((p) => ({ ...p, extra_fields: next }))
                    }}
                    style={{ padding: 6, background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, color: 'var(--error)', cursor: 'pointer' }}
                    title="Удалить поле"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
                })
              })()}
              <AddCustomField
                onAdd={(name, value) => {
                  if (!name.trim()) return
                  setEdit((p) => ({
                    ...p,
                    extra_fields: { ...(p.extra_fields || {}), [name.trim()]: value },
                  }))
                }}
              />
            </div>

            <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              <Save size={18} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} />
          Сопроводительная документация (паспорта, сертификаты и т.д.)
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16 }}>PDF, изображения, Word (.doc, .docx), Excel (.xls, .xlsx)</p>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 8, cursor: uploading ? 'wait' : 'pointer', marginBottom: 16 }}>
          <Upload size={18} />
          {uploading ? 'Загрузка...' : 'Загрузить файл'}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {documents.map((doc: any) => {
            const ext = (doc.filename || '').split('.').pop()?.toLowerCase()
            const isWordOrExcel = ['doc', 'docx', 'xls', 'xlsx'].includes(ext || '')
            const publicUrl = `${window.location.origin}/documents/public/${doc.id}?entity_type=nomenclature&entity_id=${id}`
            const viewUrl = isWordOrExcel
              ? `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`
              : null
            return (
            <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <FileText size={18} />
              <span style={{ flex: 1 }}>{doc.filename}</span>
              {canDeleteDocs && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Удалить документ?')) return
                    const r = await fetch(`/documents/${doc.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                    if (r.ok) setDocuments((prev) => prev.filter((d: any) => d.id !== doc.id))
                    else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}
                  title="Удалить"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (viewUrl) {
                    window.open(viewUrl, '_blank')
                  } else {
                    fetch(`/documents/${doc.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
                      .then((r) => r.blob())
                      .then((blob) => window.open(URL.createObjectURL(blob), '_blank'))
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4, marginRight: 8 }}
                title="Просмотр"
              >
                Просмотр
              </button>
              <button
                type="button"
                onClick={async () => {
                  const r = await fetch(`/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
                  const blob = await r.blob()
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = doc.filename || 'document'
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}
                title="Скачать"
              >
                <Download size={18} />
              </button>
            </li>
            )
          })}
          {documents.length === 0 && <li style={{ color: 'var(--text-secondary)', padding: 12 }}>Нет загруженных документов</li>}
        </ul>
      </div>
    </div>
  )
}
