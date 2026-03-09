import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'

export default function CabinetCategoryCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [nomenclature, setNomenclature] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!id || !token) return
    Promise.all([
      fetch(`/entities/categories/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/subcategories?category_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/nomenclature?category_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([r1, r2, r3]) => [
        r1.ok ? await r1.json() : null,
        r2.ok ? (await r2.json()).items : [],
        r3.ok ? (await r3.json()).items : [],
      ])
      .then(([cat, subcats, noms]) => {
        setItem(cat)
        setSubcategories(subcats || [])
        setNomenclature(noms || [])
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  const openEdit = () => {
    setEditName(item.name)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!id || !token) return
    const r = await fetch(`/entities/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName.trim() || undefined }),
    })
    if (r.ok) {
      setItem(await r.json())
      setEditOpen(false)
    } else {
      const d = await r.json().catch(() => ({}))
      alert(d.detail || 'Ошибка сохранения')
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Категория не найдена</p>

  return (
    <div>
      <Link to="/cabinet/entities?tab=categories" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку категорий
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{item.name}</h1>
        <button type="button" onClick={openEdit} style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Pencil size={16} /> Редактировать
        </button>
      </div>
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, maxWidth: 420, width: '100%' }}>
            <h3 style={{ marginBottom: 16 }}>Редактирование категории</h3>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Название</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={saveEdit} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 24, maxWidth: 600 }}>
        {subcategories.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Подкатегории</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {subcategories.map((s) => (
                <li key={s.id} style={{ marginBottom: 8 }}>
                  <Link to={`/cabinet/entities/subcategory/${s.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{s.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
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
      </div>
    </div>
  )
}
