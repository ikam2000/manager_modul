import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Download, ExternalLink, Trash2, Upload, FolderOpen, ChevronDown, ChevronRight, ChevronUp, FileSignature, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import SearchableSelect from '../../components/SearchableSelect'

const ENTITY_LABELS: Record<string, string> = {
  nomenclature: 'Номенклатура',
  supplier: 'Поставщик',
  manufacturer: 'Производитель',
  supply: 'Поставка',
  contract: 'Договор',
  contract_appendix: 'Приложение к договору',
  category: 'Категория',
  subcategory: 'Подкатегория',
}

function getEntityOptions(tree: any, entityType: string): { id: number; name: string }[] {
  if (!tree) return []
  const typeMap: Record<string, string> = { supplier: 'suppliers', manufacturer: 'manufacturers', supply: 'supplies', contract: 'contracts', nomenclature: 'nomenclature', category: 'categories', subcategory: 'subcategories' }
  const key = typeMap[entityType]
  if (key === 'nomenclature') {
    const out: { id: number; name: string }[] = []
    tree.categories?.forEach((c: any) => c.subcategories?.forEach((s: any) => s.nomenclature?.forEach((n: any) => out.push({ id: n.id, name: n.code ? `${n.code} — ${n.name}` : n.name }))))
    return out
  }
  if (key === 'categories') {
    return (tree.categories || []).map((c: any) => ({ id: c.id, name: c.name }))
  }
  if (key === 'subcategories') {
    const out: { id: number; name: string }[] = []
    tree.categories?.forEach((c: any) => c.subcategories?.forEach((s: any) => {
      if (s.id > 0) out.push({ id: s.id, name: `${c.name} › ${s.name}` })
    }))
    return out
  }
  return (tree[key] || []).map((x: any) => ({ id: x.id, name: x.code ? `${x.code} — ${x.name}` : x.name }))
}

function getEntityName(tree: any, entityType: string, entityId: number): string {
  const opts = getEntityOptions(tree, entityType)
  const found = opts.find((x) => x.id === entityId)
  return found ? found.name : `${ENTITY_LABELS[entityType] || entityType} #${entityId}`
}

function EntityTreeSelector({
  tree,
  selected,
  onSelect,
}: {
  tree: { categories: any[]; suppliers: any[]; manufacturers: any[]; supplies: any[]; contracts: any[] }
  selected: { entity_type: string; entity_id: number } | null
  onSelect: (entity_type: string, entity_id: number) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ suppliers: true, manufacturers: true, supplies: true, contracts: true })
  const [search, setSearch] = useState('')
  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }))
  const match = (s: string) => !search.trim() || s.toLowerCase().includes(search.toLowerCase())
  const isSelected = (et: string, id: number) =>
    selected?.entity_type === et && selected?.entity_id === id

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 8,
        background: 'var(--bg)',
        fontSize: 13,
      }}
    >
      <input
        type="text"
        placeholder="Поиск по сущностям..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
      />
      <div style={{ maxHeight: 240, overflow: 'auto' }}>
      {tree.categories?.map((cat: any) => (
        <div key={`cat-${cat.id}`}>
          <button
            type="button"
            onClick={() => toggle(`cat-${cat.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              border: 'none',
              background: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            {expanded[`cat-${cat.id}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <strong>{cat.name}</strong>
          </button>
          {expanded[`cat-${cat.id}`] &&
            cat.subcategories?.filter((sub: any) => match(sub.name)).map((sub: any) => (
              <div key={`sub-${sub.id}`} style={{ marginLeft: 20 }}>
                <button
                  type="button"
                  onClick={() => toggle(`sub-${sub.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {expanded[`sub-${sub.id}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {sub.name}
                </button>
                {expanded[`sub-${sub.id}`] &&
                  sub.nomenclature?.filter((nom: any) => match((nom.code || '') + ' ' + (nom.name || ''))).map((nom: any) => (
                    <div
                      key={`nom-${nom.id}`}
                      onClick={() => onSelect('nomenclature', nom.id)}
                      style={{
                        marginLeft: 36,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        borderRadius: 6,
                        background: isSelected('nomenclature', nom.id) ? 'rgba(14,165,233,0.2)' : 'transparent',
                        color: isSelected('nomenclature', nom.id) ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {nom.code ? `${nom.code} — ${nom.name}` : nom.name}
                    </div>
                  ))}
              </div>
            ))}
        </div>
      ))}
      {['suppliers', 'manufacturers', 'supplies', 'contracts'].map((section) => {
        const key = section.slice(0, -1) as 'supplier' | 'manufacturer' | 'supply' | 'contract'
        const et = key === 'supplier' ? 'suppliers' : key === 'manufacturer' ? 'manufacturers' : key === 'supply' ? 'supplies' : 'contracts'
        const items = (tree[et] || []).filter((item: any) => match(item.name || '') || match(item.code || ''))
        const typeMap: Record<string, string> = {
          suppliers: 'supplier',
          manufacturers: 'manufacturer',
          supplies: 'supply',
          contracts: 'contract',
        }
        return (
          <div key={section}>
            <button
              type="button"
              onClick={() => toggle(section)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                border: 'none',
                background: 'none',
                color: 'var(--text)',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {expanded[section] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <strong>{ENTITY_LABELS[typeMap[section]] || section}</strong>
            </button>
            {expanded[section] &&
              items.map((item: any) => (
                <div
                  key={`${section}-${item.id}`}
                  onClick={() => onSelect(typeMap[section], item.id)}
                  style={{
                    marginLeft: 20,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: isSelected(typeMap[section], item.id) ? 'rgba(14,165,233,0.2)' : 'transparent',
                    color: isSelected(typeMap[section], item.id) ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  {item.code ? `${item.code} — ${item.name}` : item.name}
                </div>
              ))}
          </div>
        )
      })}
      </div>
    </div>
  )
}

export default function CabinetDocuments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'contracts' ? 'contracts' : 'documents'
  const { user } = useAuth()
  const canDelete = user?.permissions?.can_delete_documents ?? false
  const [items, setItems] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ entity_type?: string; entity_id?: string; search?: string }>({})
  const [mode, setMode] = useState<'manual' | 'recognize'>('manual')
  const [entityTree, setEntityTree] = useState<any>(null)
  const [selectedEntity, setSelectedEntity] = useState<{ entity_type: string; entity_id: number } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [recognizeResults, setRecognizeResults] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<number, Array<{ entity_type: string; entity_id: number }>>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadBlockOpen, setUploadBlockOpen] = useState(false)
  const [docCounts, setDocCounts] = useState<{ total: number; by_category: Record<number, number>; by_supplier: Record<number, number>; by_manufacturer: Record<number, number>; by_supply?: Record<number, number> } | null>(null)
  const token = localStorage.getItem('access_token')

  const loadDocuments = useCallback(() => {
    if (!token) return
    const params = new URLSearchParams()
    if (filter.entity_type) params.set('entity_type', filter.entity_type)
    if (filter.entity_id) params.set('entity_id', filter.entity_id)
    if (filter.search?.trim()) params.set('search', filter.search.trim())
    fetch(`/documents?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [token, filter.entity_type, filter.entity_id, filter.search])

  const loadEntityTree = useCallback(() => {
    if (!token) return
    fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setEntityTree)
      .catch(() => setEntityTree(null))
  }, [token])

  const loadDocCounts = useCallback(() => {
    if (!token) return
    fetch('/api/cabinet/documents-counts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDocCounts)
      .catch(() => setDocCounts(null))
  }, [token])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const applyCatalogFilter = (entity_type?: string, entity_id?: string) => {
    setFilter((f) => ({ ...f, entity_type, entity_id }))
  }

  useEffect(() => {
    if (tab === 'documents') loadDocCounts()
  }, [tab, loadDocCounts])

  useEffect(() => {
    loadEntityTree()
  }, [loadEntityTree])

  useEffect(() => {
    if (tab !== 'contracts') return
    if (!token) return
    setContractsLoading(true)
    fetch('/entities/contracts?limit=500', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setContracts((d.items || [])))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false))
  }, [tab, token])

  const viewDoc = (doc: any) => {
    const ext = (doc.filename || '').split('.').pop()?.toLowerCase()
    const isWordOrExcel = ['doc', 'docx', 'xls', 'xlsx'].includes(ext || '')
    const publicUrl = `${window.location.origin}/documents/public/${doc.id}?entity_type=${doc.entity_type}&entity_id=${doc.entity_id}`
    if (isWordOrExcel) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`, '_blank')
    } else {
      fetch(`/documents/${doc.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => window.open(URL.createObjectURL(blob), '_blank'))
    }
  }

  const downloadDoc = async (doc: any) => {
    const r = await fetch(`/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = doc.filename || 'document'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = Array.from(e.target.files || [])
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip']
    const filtered = fl.filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)))
    setFiles((prev) => [...prev, ...filtered])
    e.target.value = ''
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = Array.from(e.target.files || [])
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx']
    const filtered = fl.filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)))
    setFiles((prev) => [...prev, ...filtered])
    e.target.value = ''
  }

  const runRecognize = async () => {
    if (!token || files.length === 0) return
    setUploadProgress('Распознавание...')
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    try {
      const r = await fetch('/documents/recognize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.files) {
        setRecognizeResults(d.files)
        setAssignments({})
      } else {
        alert(d.detail || 'Ошибка распознавания')
      }
    } catch {
      alert('Ошибка сети')
    } finally {
      setUploadProgress('')
    }
  }

  const doUploadManual = async () => {
    if (!token || !selectedEntity || files.length === 0) {
      alert('Выберите сущность и файлы')
      return
    }
    setUploading(true)
    setUploadProgress('Загрузка...')
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    fd.append('entity_type', selectedEntity.entity_type)
    fd.append('entity_id', String(selectedEntity.entity_id))
    try {
      const r = await fetch('/documents/upload-batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        const count = d.uploaded ?? files.length
        setSuccessMessage(`Загружено ${count} документов`)
        setTimeout(() => setSuccessMessage(''), 5000)
        setFiles([])
        setSelectedEntity(null)
        loadDocuments()
      } else {
        alert(d.detail || 'Ошибка загрузки')
      }
    } catch {
      alert('Ошибка сети')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  const doUploadRecognize = async () => {
    if (!token || files.length === 0) return
    const assignsList: { file_index: number; entity_type: string; entity_id: number }[] = []
    recognizeResults.forEach((_: any, i: number) => {
      const list = assignments[i] || []
      list.forEach((a) => assignsList.push({ file_index: i, entity_type: a.entity_type, entity_id: a.entity_id }))
    })
    if (assignsList.length === 0) {
      alert('Выберите привязку хотя бы для одного файла')
      return
    }
    setUploading(true)
    setUploadProgress('Загрузка...')
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    fd.append('assignments', JSON.stringify(assignsList))
    try {
      const r = await fetch('/documents/upload-batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        const count = d.uploaded ?? assignsList.length
        setSuccessMessage(`Загружено ${count} документов`)
        setTimeout(() => setSuccessMessage(''), 5000)
        setFiles([])
        setRecognizeResults([])
        setAssignments({})
        loadDocuments()
        loadDocCounts()
      } else {
        alert(d.detail || 'Ошибка загрузки')
      }
    } catch {
      alert('Ошибка сети')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  const toggleAssignment = (fileIndex: number, entity_type: string, entity_id: number) => {
    setAssignments((prev) => {
      const list = prev[fileIndex] || []
      const exists = list.some((e) => e.entity_type === entity_type && e.entity_id === entity_id)
      const next = exists
        ? list.filter((e) => !(e.entity_type === entity_type && e.entity_id === entity_id))
        : [...list, { entity_type, entity_id }]
      return { ...prev, [fileIndex]: next }
    })
  }

  const isAssigned = (fileIndex: number, entity_type: string, entity_id: number) =>
    (assignments[fileIndex] || []).some((e) => e.entity_type === entity_type && e.entity_id === entity_id)

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Документы</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Загрузка вручную с выбором сущности или автоматическое распознавание с предложением привязки
      </p>

      {/* Табы: Документы | Договоры */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setSearchParams({})}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: tab === 'documents' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: tab === 'documents' ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Документы
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'contracts' })}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: tab === 'contracts' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: tab === 'contracts' ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <FileSignature size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Договоры
        </button>
      </div>

      {tab === 'contracts' && (
        <>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Договоры</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
            Договоры с поставщиками. Приложения (спецификации) — в карточке договора.
          </p>
          {contractsLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
          ) : (
            <div className="data-list" style={{ overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Поставщик</th>
                    <th>Срок</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/cabinet/entities/contract/${c.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {c.number || `Договор #${c.id}`}
                        </Link>
                      </td>
                      <td>
                        {entityTree && c.supplier_id ? (() => {
                          const sup = entityTree.suppliers?.find((s: any) => s.id === c.supplier_id)
                          return sup ? <Link to={`/cabinet/entities/supplier/${sup.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{sup.name}</Link> : '—'
                        })() : '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {c.date_start && c.date_end ? `${c.date_start} — ${c.date_end}` : '—'}
                      </td>
                      <td>
                        <Link to={`/cabinet/entities/contract/${c.id}`} style={{ color: 'var(--accent)', fontSize: 13 }}>Карточка</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contracts.length === 0 && (
                <p style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center' }}>Нет договоров</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'documents' && <>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {entityTree && docCounts && (
        <aside style={{
          width: 240,
          flexShrink: 0,
          marginRight: 24,
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          alignSelf: 'flex-start',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Каталог</div>
          <div
            onClick={() => applyCatalogFilter()}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              background: !filter.entity_type && !filter.entity_id ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: !filter.entity_type && !filter.entity_id ? 'var(--accent)' : 'var(--text)',
            }}
          >
            Все документы ({docCounts.total})
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>Категории</div>
          {(entityTree.categories || []).map((c: any) => (
            <div
              key={c.id}
              onClick={() => applyCatalogFilter('category', String(c.id))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                background: filter.entity_type === 'category' && filter.entity_id === String(c.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: filter.entity_type === 'category' && filter.entity_id === String(c.id) ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {c.name} ({docCounts.by_category?.[c.id] ?? 0})
            </div>
          ))}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>Поставщики</div>
          {(entityTree.suppliers || []).slice(0, 15).map((s: any) => (
            <div
              key={s.id}
              onClick={() => applyCatalogFilter('supplier', String(s.id))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                background: filter.entity_type === 'supplier' && filter.entity_id === String(s.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: filter.entity_type === 'supplier' && filter.entity_id === String(s.id) ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {s.name} ({docCounts.by_supplier?.[s.id] ?? 0})
            </div>
          ))}
          {(entityTree.suppliers || []).length > 15 && <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12 }}>...</div>}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>Производители</div>
          {(entityTree.manufacturers || []).slice(0, 15).map((m: any) => (
            <div
              key={m.id}
              onClick={() => applyCatalogFilter('manufacturer', String(m.id))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                background: filter.entity_type === 'manufacturer' && filter.entity_id === String(m.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: filter.entity_type === 'manufacturer' && filter.entity_id === String(m.id) ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {m.name} ({docCounts.by_manufacturer?.[m.id] ?? 0})
            </div>
          ))}
          {(entityTree.manufacturers || []).length > 15 && <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12 }}>...</div>}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>Поставки</div>
          {(entityTree.supplies || []).slice(0, 15).map((sp: any) => (
            <div
              key={sp.id}
              onClick={() => applyCatalogFilter('supply', String(sp.id))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                background: filter.entity_type === 'supply' && filter.entity_id === String(sp.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: filter.entity_type === 'supply' && filter.entity_id === String(sp.id) ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {sp.name} ({docCounts.by_supply?.[sp.id] ?? 0})
            </div>
          ))}
          {(entityTree.supplies || []).length > 15 && <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12 }}>...</div>}
        </aside>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
      {/* Блок загрузки — сворачиваемый */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setUploadBlockOpen((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plus size={20} />
            Загрузить документы
          </span>
          {uploadBlockOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {uploadBlockOpen && (
      <div style={{ padding: 24, borderTop: '1px solid var(--border)' }}>
        {/* Режимы загрузки */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode('manual')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: mode === 'manual' ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: mode === 'manual' ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            1. Ручной выбор сущности
          </button>
          <button
            type="button"
            onClick={() => setMode('recognize')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: mode === 'recognize' ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: mode === 'recognize' ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            2. Распознавание и привязка
          </button>
        </div>
        {successMessage && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(34,197,94,0.2)',
              border: '1px solid rgba(34,197,94,0.5)',
              borderRadius: 8,
              color: 'var(--success)',
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            ✓ {successMessage}
          </div>
        )}
        <h3 style={{ marginBottom: 16 }}>{mode === 'manual' ? 'Выберите сущность и файлы' : 'Загрузите файлы для распознавания'}</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', minWidth: 200 }}>
            {mode === 'manual' && entityTree && (
              <>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Дерево сущностей</label>
                <EntityTreeSelector
                  tree={entityTree}
                  selected={selectedEntity}
                  onSelect={(et, id) => setSelectedEntity({ entity_type: et, entity_id: id })}
                />
              </>
            )}
            {mode === 'recognize' && recognizeResults.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Предложенные привязки (множественный выбор)</label>
                <div style={{ maxHeight: 280, overflow: 'auto', fontSize: 13 }}>
                  {recognizeResults.map((file, fi) => (
                    <div key={fi} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <strong>{file.filename}</strong>
                      {file.suggested?.length > 0 ? (
                        file.suggested.map((s: any) => {
                          const assigned = isAssigned(fi, s.entity_type, s.entity_id)
                          return (
                            <label
                              key={`${s.entity_type}-${s.entity_id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 6,
                                cursor: 'pointer',
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: assigned ? 'rgba(34,197,94,0.2)' : 'transparent',
                                border: assigned ? '1px solid rgba(34,197,94,0.5)' : '1px solid transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={() => toggleAssignment(fi, s.entity_type, s.entity_id)}
                              />
                              {s.code ? `${s.code} — ${s.name}` : s.name} ({s.match_score}%)
                            </label>
                          )
                        })
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 12 }}>Нет совпадений</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Файлы</label>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                  <Upload size={18} /> Выбрать файлы
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileInput} style={{ display: 'none' }} />
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer' }}>
                  <FolderOpen size={18} /> Папка
                  <input type="file" multiple {...({ webkitdirectory: '' } as Record<string, unknown>)} onChange={handleFolderInput} style={{ display: 'none' }} />
                </label>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>PDF, изображения, Word, Excel, ZIP (распаковывается)</p>
              {files.length > 0 && (
                <ul style={{ marginTop: 12, padding: 0, listStyle: 'none', textAlign: 'left', maxHeight: 120, overflow: 'auto' }}>
                  {files.slice(0, 15).map((f, i) => (
                    <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>{f.name}</li>
                  ))}
                  {files.length > 15 && <li style={{ fontSize: 12, color: 'var(--text-secondary)' }}>... и ещё {files.length - 15}</li>}
                </ul>
              )}
            </div>
            {uploadProgress && <p style={{ marginTop: 8, color: 'var(--accent)' }}>{uploadProgress}</p>}
            {(mode === 'manual' && selectedEntity && files.length > 0) && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Будет загружено документов: <strong style={{ color: 'var(--text)' }}>{files.length}</strong>
              </p>
            )}
            {(mode === 'recognize' && recognizeResults.length > 0) && (() => {
              const assignsCount = recognizeResults.reduce((s, _: any, i) => s + (assignments[i]?.length ?? 0), 0)
              return assignsCount > 0 ? (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Будет привязано документов: <strong style={{ color: 'var(--text)' }}>{assignsCount}</strong>
                </p>
              ) : null
            })()}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {mode === 'manual' && (
                <button
                  type="button"
                  onClick={doUploadManual}
                  disabled={uploading || !selectedEntity || files.length === 0}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  Загрузить
                </button>
              )}
              {mode === 'recognize' && recognizeResults.length === 0 && (
                <button
                  type="button"
                  onClick={runRecognize}
                  disabled={uploading || files.length === 0}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  Распознать
                </button>
              )}
              {mode === 'recognize' && recognizeResults.length > 0 && (
                <button
                  type="button"
                  onClick={doUploadRecognize}
                  disabled={uploading}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  Загрузить с выбранными привязками
                </button>
              )}
              <button
                type="button"
                onClick={() => { setFiles([]); setRecognizeResults([]); setAssignments({}); setSuccessMessage('') }}
                style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      </div>
        )}
      </div>

      {/* Список документов */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Поиск по имени файла…"
          value={filter.search ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9375rem', minWidth: 220 }}
        />
        <select
          value={filter.entity_type || ''}
          onChange={(e) => setFilter((f) => ({ ...f, entity_type: e.target.value || undefined, entity_id: undefined }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9375rem', minWidth: 180 }}
        >
          <option value="">Все типы сущностей</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {filter.entity_type && (
          <div style={{ minWidth: 220 }}>
            <SearchableSelect
              options={getEntityOptions(entityTree, filter.entity_type)}
              value={filter.entity_id || ''}
              onChange={(v) => setFilter((f) => ({ ...f, entity_id: v || undefined }))}
              placeholder="Поиск в списке…"
              allowEmpty
              emptyLabel="— все —"
            />
          </div>
        )}
      </div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div className="data-list" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Файл</th>
                <th>Сущность</th>
                <th>ID</th>
                <th>Дата</th>
                <th style={{ width: 120, minWidth: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} />
                      {doc.filename}
                    </span>
                  </td>
                  <td>
                    {entityTree ? getEntityName(entityTree, doc.entity_type, doc.entity_id) : `${ENTITY_LABELS[doc.entity_type] || doc.entity_type} #${doc.entity_id}`}
                  </td>
                  <td>{doc.entity_id}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ru') : '—'}
                  </td>
                  <td style={{ width: 120, minWidth: 120, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" onClick={() => viewDoc(doc)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }} title="Просмотр">
                      <ExternalLink size={16} />
                    </button>
                    <button type="button" onClick={() => downloadDoc(doc)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }} title="Скачать">
                      <Download size={16} />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Удалить документ?')) return
                          const r = await fetch(`/documents/${doc.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                          if (r.ok) setItems((prev) => prev.filter((d) => d.id !== doc.id))
                          else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                        }}
                        style={{ padding: 6, background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Нет документов. Загрузите файлы выше или в карточках номенклатуры.
            </p>
          )}
        </div>
      )}
      </div>
      </div>
      </>}
    </div>
  )
}
