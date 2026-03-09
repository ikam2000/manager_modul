import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'

export default function CabinetSubcategoryCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [category, setCategory] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [nomenclature, setNomenclature] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (token) {
      fetch('/entities/categories?limit=500', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : { items: [] })
        .then((d) => setCategories(d.items || []))
    }
  }, [token])

  useEffect(() => {
    if (!id || !token) return
    fetch(`/entities/subcategories/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(async (sub) => {
        setItem(sub)
        if (!sub) return
        const [cr, nr] = await Promise.all([
          fetch(`/entities/categories/${sub.category_id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null),
          fetch(`/entities/nomenclature?subcategory_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (x) => x.ok ? (await x.json()).items : []),
        ])
        setCategory(cr)
        setNomenclature(nr || [])
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  const openEdit = () => {
    setEditName(item.name)
    setEditCategoryId(String(item.category_id))
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!id || !token) return
    const body: Record<string, unknown> = { name: editName.trim() || undefined }
    if (editCategoryId) body.category_id = Number(editCategoryId)
    const r = await fetch(`/entities/subcategories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      const updated = await r.json()
      setItem(updated)
      if (updated.category_id !== item.category_id) {
        const cr = await fetch(`/entities/categories/${updated.category_id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null)
        setCategory(cr)
      }
      setEditOpen(false)
    } else {
      const d = await r.json().catch(() => ({}))
      alert(d.detail || 'Ошибка сохранения')
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Подкатегория не найдена</p>

  return (
    <div>
      <Link to="/cabinet/entities?tab=subcategories" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку подкатегорий
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
            <h3 style={{ marginBottom: 16 }}>Редактирование подкатегории</h3>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Название</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Категория</label>
              <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={saveEdit} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 24, maxWidth: 600 }}>
        {category && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Категория</h3>
            <Link to={`/cabinet/entities/category/${category.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 15 }}>{category.name}</Link>
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
