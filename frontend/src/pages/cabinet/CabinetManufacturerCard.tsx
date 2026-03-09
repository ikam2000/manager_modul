import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download, FileText, Pencil } from 'lucide-react'

const REQUISITE_FIELDS = [
  { key: 'name', label: 'Название', required: true },
  { key: 'inn', label: 'ИНН' },
  { key: 'kpp', label: 'КПП' },
  { key: 'ogrn', label: 'ОГРН' },
  { key: 'legal_address', label: 'Юридический адрес' },
  { key: 'address', label: 'Фактический адрес' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email' },
  { key: 'contact_person', label: 'Контактное лицо' },
  { key: 'bank_name', label: 'Банк' },
  { key: 'bank_bik', label: 'БИК' },
  { key: 'bank_account', label: 'Расчётный счёт' },
  { key: 'bank_corr', label: 'Корр. счёт' },
  { key: 'delivery_address', label: 'Адрес отгрузки' },
  { key: 'supply_address', label: 'Адрес поставки' },
]

export default function CabinetManufacturerCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [nomenclature, setNomenclature] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [innLookupLoading, setInnLookupLoading] = useState(false)
  const token = localStorage.getItem('access_token')

  const loadDocuments = () => {
    if (!id || !token) return
    fetch(`/documents?entity_type=manufacturer&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setDocuments(d.items || []))
  }

  useEffect(() => {
    if (!id || !token) return
    Promise.all([
      fetch(`/entities/manufacturers/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/nomenclature?manufacturer_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/documents?entity_type=manufacturer&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([r1, r2, r3]) => [
        r1.ok ? await r1.json() : null,
        r2.ok ? (await r2.json()).items : [],
        r3.ok ? (await r3.json()).items : [],
      ])
      .then(([mfr, noms, docs]) => {
        setItem(mfr)
        setNomenclature(noms || [])
        setDocuments(docs || [])
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Производитель не найден</p>

  const openEdit = () => {
    const vals: Record<string, string> = {}
    REQUISITE_FIELDS.forEach((f) => { vals[f.key] = (item[f.key] as string) ?? '' })
    setEditValues(vals)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!id || !token) return
    const body: Record<string, string | undefined> = {}
    REQUISITE_FIELDS.forEach((f) => {
      const v = editValues[f.key]?.trim()
      body[f.key] = v || undefined
    })
    const r = await fetch(`/entities/manufacturers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setItem(await r.json())
      setEditOpen(false)
    } else {
      const d = await r.json().catch(() => ({}))
      alert(d.detail || 'Ошибка сохранения')
    }
  }

  return (
    <div>
      <Link to="/cabinet/entities?tab=manufacturers" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку производителей
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{item.name}</h1>
        <button type="button" onClick={openEdit} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Pencil size={16} /> Редактировать реквизиты
        </button>
      </div>
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Реквизиты компании</h3>
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(14,165,233,0.08)', borderRadius: 8, border: '1px solid var(--accent)' }}>
              <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск по ИНН</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="10 или 12 цифр" value={editValues.inn ?? ''} onChange={(e) => setEditValues((v) => ({ ...v, inn: e.target.value }))} inputMode="numeric" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                <button
                  type="button"
                  disabled={innLookupLoading}
                  onClick={async () => {
                    const raw = (editValues.inn || '').replace(/\D/g, '')
                    if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return }
                    if (!token) return
                    setInnLookupLoading(true)
                    try {
                      const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${token}` } })
                      const j = await r.json().catch(() => ({}))
                      if (j.found && j.data) {
                        const d = j.data
                        setEditValues((v) => ({ ...v, name: d.name || v.name, inn: d.inn || raw, kpp: d.kpp || '', ogrn: d.ogrn || '', legal_address: d.legal_address || '', address: d.address || d.legal_address || '', phone: d.phone || '', email: d.email || '', contact_person: d.contact_person || '', bank_name: d.bank_name || '', bank_bik: d.bank_bik || '', bank_account: d.bank_account || '', bank_corr: d.bank_corr || '' }))
                      } else { alert('Организация не найдена по ИНН') }
                    } finally { setInnLookupLoading(false) }
                  }}
                  style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: innLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {innLookupLoading ? '…' : 'Найти'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              {REQUISITE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{f.label}{f.required ? ' *' : ''}</label>
                  <input value={editValues[f.key] ?? ''} onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={saveEdit} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Реквизиты</h3>
          <dl style={{ margin: 0, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            {REQUISITE_FIELDS.filter((f) => item[f.key]).map((f) => (
              <div key={f.key} style={{ gridColumn: ['legal_address', 'address', 'delivery_address', 'supply_address'].includes(f.key) ? '1 / -1' : 'auto' }}>
                <dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{f.label}</dt>
                <dd style={{ margin: 0 }}>{item[f.key]}</dd>
              </div>
            ))}
            {!REQUISITE_FIELDS.some((f) => item[f.key]) && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Реквизиты не заполнены</p>}
          </dl>
        </section>
        {nomenclature.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Номенклатура</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {nomenclature.slice(0, 30).map((n) => (
                <li key={n.id} style={{ marginBottom: 8 }}>
                  <Link to={`/cabinet/entities/nomenclature/${n.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    {n.code ? `${n.code} — ` : ''}{n.name}
                  </Link>
                </li>
              ))}
              {nomenclature.length > 30 && <li style={{ fontSize: 12, color: 'var(--text-secondary)' }}>… и ещё {nomenclature.length - 30}</li>}
            </ul>
          </section>
        )}
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Документы</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Загрузить файл (PDF, Word, JPEG, PNG)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !id || !token || uploading) return
                setUploading(true)
                try {
                  const fd = new FormData()
                  fd.append('files', file)
                  fd.append('entity_type', 'manufacturer')
                  fd.append('entity_id', id)
                  const r = await fetch('/documents/upload-batch', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                  if (r.ok) loadDocuments()
                  else alert((await r.json().catch(() => ({}))).detail || 'Ошибка загрузки')
                } finally { setUploading(false); e.target.value = '' }
              }}
              disabled={uploading}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
            />
            {uploading && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Загрузка...</span>}
          </div>
          {documents.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {documents.map((d) => (
                <li key={d.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{d.filename}</span>
                  <a href={`${window.location.origin}/documents/public/${d.id}?entity_type=manufacturer&entity_id=${id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', padding: 4 }} title="Просмотр"><ExternalLink size={14} /></a>
                  <button type="button" onClick={async () => { const r = await fetch(`/documents/${d.id}/download`, { headers: { Authorization: `Bearer ${token}` } }); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = d.filename || 'document'; a.click(); URL.revokeObjectURL(a.href) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 4, cursor: 'pointer' }} title="Скачать"><Download size={14} /></button>
                </li>
              ))}
            </ul>
          ) : !uploading && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Нет загруженных документов</p>}
        </section>
      </div>
    </div>
  )
}
