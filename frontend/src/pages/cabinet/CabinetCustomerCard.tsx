import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'

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
  { key: 'delivery_address', label: 'Адрес отгрузки' },
  { key: 'supply_address', label: 'Адрес поставки' },
  { key: 'bank_name', label: 'Банк' },
  { key: 'bank_bik', label: 'БИК' },
  { key: 'bank_account', label: 'Расчётный счёт' },
  { key: 'bank_corr', label: 'Корр. счёт' },
]

export default function CabinetCustomerCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [innLookupLoading, setInnLookupLoading] = useState(false)
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!id || !token) return
    fetch(`/entities/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Заказчик не найден</p>

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
    const r = await fetch(`/entities/customers/${id}`, {
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
      <Link to="/cabinet/entities?tab=customers" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку заказчиков
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{item.name}</h1>
        <button type="button" onClick={openEdit} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Pencil size={16} /> Редактировать
        </button>
      </div>
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Реквизиты заказчика</h3>
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
      <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Реквизиты</h3>
        <dl style={{ margin: 0, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          {REQUISITE_FIELDS.filter((f) => item[f.key]).map((f) => (
            <div key={f.key} style={{ gridColumn: ['legal_address', 'address', 'delivery_address', 'supply_address'].includes(f.key) ? '1 / -1' : 'auto' }}>
              <dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{f.label}</dt>
              <dd style={{ margin: 0 }}>{item[f.key]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
