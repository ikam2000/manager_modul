import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download, FileText, Trash2 } from 'lucide-react'

interface SupplyItem {
  nomenclature_id?: number
  quantity?: number
  name?: string
}

export default function CabinetSupplyCard() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  const [supplier, setSupplier] = useState<any>(null)
  const [nomMap, setNomMap] = useState<Record<number, { code?: string; name: string }>>({})
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('access_token')

  const items = (item?.extra_fields?.items || []) as SupplyItem[]
  const hasMultiItems = items.length > 0

  const loadDocuments = () => {
    if (!id || !token) return
    fetch(`/documents?entity_type=supply&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setDocuments(d.items || []))
  }

  useEffect(() => {
    if (!id || !token) return
    fetch(`/entities/supplies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(async (sup) => {
        setItem(sup)
        if (!sup) return
        const ids = new Set<number>()
        if (sup.nomenclature_id) ids.add(sup.nomenclature_id)
        for (const it of sup.extra_fields?.items || []) {
          if (it?.nomenclature_id) ids.add(it.nomenclature_id)
        }
        const [sr, docsRes, ...nomResults] = await Promise.all([
          sup.supplier_id ? fetch(`/entities/suppliers/${sup.supplier_id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null) : null,
          fetch(`/documents?entity_type=supply&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : { items: [] }),
          ...Array.from(ids).map((nid) =>
            fetch(`/entities/nomenclature/${nid}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null)
          ),
        ])
        setSupplier(sr)
        setDocuments((docsRes as any)?.items || [])
        const map: Record<number, { code?: string; name: string }> = {}
        ;(nomResults as any[]).filter(Boolean).forEach((n: any) => {
          map[n.id] = { code: n.code, name: n.name || '' }
        })
        setNomMap(map)
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Поставка не найдена</p>

  const uniqueItemsCount = hasMultiItems ? items.length : (item.nomenclature_id ? 1 : 0)

  const displayRows = hasMultiItems ? items : (item.nomenclature_id && nomMap[item.nomenclature_id] ? [{ nomenclature_id: item.nomenclature_id, quantity: item.quantity ?? 1, name: nomMap[item.nomenclature_id].name }] : [])

  return (
    <div>
      <Link to="/cabinet/entities?tab=supplies" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}>
        <ArrowLeft size={18} /> К списку поставок
      </Link>
      <h1 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>Поставка #{item.id}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, minWidth: 200 }}>
            <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Сведения</h3>
            <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
              <div><dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Кол-во позиций</dt><dd style={{ margin: 0 }}>{uniqueItemsCount}</dd></div>
              <div><dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Всего шт.</dt><dd style={{ margin: 0 }}>{item.quantity}</dd></div>
              {item.production_date && <div><dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата изготовления</dt><dd style={{ margin: 0 }}>{item.production_date}</dd></div>}
              {item.calibration_date && <div><dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата поверки</dt><dd style={{ margin: 0 }}>{item.calibration_date}</dd></div>}
            </dl>
          </section>
          {supplier && (
            <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, minWidth: 200 }}>
              <h3 style={{ marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Поставщик</h3>
              <Link to={`/cabinet/entities/supplier/${supplier.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 15 }}>{supplier.name}</Link>
            </section>
          )}
        </div>
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, width: '100%', minWidth: 0 }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Номенклатура</h3>
          {displayRows.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>№</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Наименование</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Кол-во, шт.</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((it, idx) => {
                    const name = it.name || (it.nomenclature_id && nomMap[it.nomenclature_id] ? `${nomMap[it.nomenclature_id].code ? nomMap[it.nomenclature_id].code + ' — ' : ''}${nomMap[it.nomenclature_id].name}`.trim() : '') || `Позиция ${idx + 1}`
                    const qty = it.quantity ?? 1
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {it.nomenclature_id ? (
                            <Link to={`/cabinet/entities/nomenclature/${it.nomenclature_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{name}</Link>
                          ) : (
                            <span>{name}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{qty}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>—</span>
          )}
        </section>
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Отгрузочная документация</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Загрузить файл (PDF, Word, JPEG, PNG, Excel)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpeg,.jpg,.png,.xls,.xlsx"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !id || !token || uploading) return
              setUploading(true)
              try {
                const fd = new FormData()
                fd.append('files', file)
                fd.append('entity_type', 'supply')
                fd.append('entity_id', id)
                const r = await fetch('/documents/upload-batch', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                if (r.ok) loadDocuments()
                else alert((await r.json().catch(() => ({}))).detail || 'Ошибка загрузки')
              } finally { setUploading(false); e.target.value = '' }
            }}
            disabled={uploading}
            style={{ width: '100%', maxWidth: 400, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          />
          {uploading && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Загрузка...</span>}
        </div>
        {documents.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {documents.map((d) => (
              <li key={d.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{d.filename}</span>
                <a href={`${window.location.origin}/documents/public/${d.id}?entity_type=supply&entity_id=${id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', padding: 4 }} title="Просмотр"><ExternalLink size={14} /></a>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await fetch(`/documents/${d.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
                    const blob = await r.blob()
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = d.filename || 'document'
                    a.click()
                    URL.revokeObjectURL(a.href)
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 4, cursor: 'pointer' }}
                  title="Скачать"
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Удалить документ?')) return
                    const r = await fetch(`/documents/${d.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                    if (r.ok) loadDocuments()
                    else alert((await r.json().catch(() => ({}))).detail || 'Ошибка удаления')
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', padding: 4, cursor: 'pointer' }}
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Нет загруженных документов</p>
        )}
        </section>
      </div>
    </div>
  )
}
