import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CabinetContractCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [supplier, setSupplier] = useState<any>(null)
  const [supplies, setSupplies] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!id || !token) return
    fetch(`/entities/contracts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(async (c) => {
        setItem(c)
        if (!c) return
        const [sr, spl, docs] = await Promise.all([
          c.supplier_id ? fetch(`/entities/suppliers/${c.supplier_id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null) : null,
          c.supplier_id ? fetch(`/entities/supplies?supplier_id=${c.supplier_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (x) => x.ok ? (await x.json()).items : []) : Promise.resolve([]),
          fetch(`/documents?entity_type=contract&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (x) => x.ok ? (await x.json()).items : []),
        ])
        setSupplier(sr)
        setSupplies(spl || [])
        setDocuments(docs || [])
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Договор не найден</p>

  return (
    <div>
      <Link to="/cabinet/documents?tab=contracts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку договоров
      </Link>
      <h1 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>{item.number || `Договор #${item.id}`}</h1>
      <div style={{ display: 'grid', gap: 24, maxWidth: 600 }}>
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Сведения</h3>
          <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
            {item.date_start && item.date_end && (
              <div><dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Срок</dt><dd style={{ margin: 0 }}>{item.date_start} — {item.date_end}</dd></div>
            )}
          </dl>
        </section>
        {supplier && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Поставщик (продавец)</h3>
            <Link to={`/cabinet/entities/supplier/${supplier.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 15 }}>{supplier.name}</Link>
          </section>
        )}
        {supplies.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Поставки поставщика</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {supplies.slice(0, 20).map((s) => (
                <li key={s.id} style={{ marginBottom: 8 }}>
                  <Link to={`/cabinet/entities/supply/${s.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    Поставка #{s.id} — {s.quantity} {s.production_date && `(${s.production_date})`}
                  </Link>
                </li>
              ))}
              {supplies.length > 20 && <li style={{ fontSize: 12, color: 'var(--text-secondary)' }}>… и ещё {supplies.length - 20}</li>}
            </ul>
          </section>
        )}
        {documents.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Документы</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {documents.map((d) => (
                <li key={d.id} style={{ marginBottom: 4, fontSize: 13 }}>{d.filename}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
