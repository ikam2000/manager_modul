import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download, FileText, Pencil, Plus, X, Upload, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authFetchWithRetry } from '../../lib/authFetch'

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
]

const TRADER_IMPORT_FIELDS = [
  { v: 'supplier_sku', lbl: 'Артикул поставщика (Supplier SKU)' },
  { v: 'code', lbl: 'Внутр. артикул / Product ID' },
  { v: 'barcode', lbl: 'Баркод' },
  { v: 'name', lbl: 'Наименование' },
  { v: 'brand', lbl: 'Бренд' },
  { v: 'category_raw', lbl: 'Категория (сырая)' },
  { v: 'unit', lbl: 'Единица (шт/кг/л)' },
  { v: 'pack_size', lbl: 'Размер упаковки' },
  { v: 'moq', lbl: 'Мин. заказ (MOQ)' },
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

export default function CabinetSupplierCard() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const userRole = user?.role ?? ''
  const companyType = user?.company_type ?? ''
  const isTrader = userRole === 'trader' || companyType === 'trader'

  const [item, setItem] = useState<any>(null)
  const [links, setLinks] = useState<{ customers: { id: number; name: string }[]; manufacturers: { id: number; name: string }[] }>({ customers: [], manufacturers: [] })
  const [entityTree, setEntityTree] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [addManufacturerOpen, setAddManufacturerOpen] = useState(false)
  const [createCustomerName, setCreateCustomerName] = useState('')
  const [createManufacturerName, setCreateManufacturerName] = useState('')
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false)
  const [createManufacturerOpen, setCreateManufacturerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deliveryAddresses, setDeliveryAddresses] = useState<string[]>([''])
  const [supplyAddresses, setSupplyAddresses] = useState<string[]>([''])
  const [contracts, setContracts] = useState<any[]>([])
  const [supplies, setSupplies] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [innLookupLoading, setInnLookupLoading] = useState(false)
  const [oauthConnections, setOauthConnections] = useState<{ provider: string; store_url: string | null }[]>([])
  const [importConfigOpen, setImportConfigOpen] = useState(false)
  useEffect(() => {
    if (!importConfigOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImportConfigOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [importConfigOpen])
  const [importConfig, setImportConfig] = useState<{
    import_source?: string
    column_mappings?: Record<string, { mapTo: string }>
    api_url?: string
    api_key?: string
    api_field_map?: Record<string, string>
    oauth_auth_url?: string
    oauth_token_url?: string
    oauth_client_id?: string
    oauth_client_secret?: string
    oauth_scopes?: string
    sync_to_platforms?: string[]
  }>({})
  const [savingImportConfig, setSavingImportConfig] = useState(false)
  const [fetchApiLoading, setFetchApiLoading] = useState(false)
  const [oauthConnectLoading, setOauthConnectLoading] = useState(false)
  const [importConfigFile, setImportConfigFile] = useState<File | null>(null)
  const [importConfigPreview, setImportConfigPreview] = useState<{
    headers: Record<number, string>
    preview_rows: Record<number, string>[]
    suggested_mappings: Record<string, string>
  } | null>(null)
  const [importConfigRecognizeLoading, setImportConfigRecognizeLoading] = useState(false)
  const importConfigFileRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('access_token')

  const runImportConfigRecognize = async () => {
    if (!importConfigFile || !token) {
      alert('Сначала выберите файл')
      return
    }
    setImportConfigRecognizeLoading(true)
    setImportConfigPreview(null)
    try {
      const form = new FormData()
      form.append('files', importConfigFile)
      const r = await authFetchWithRetry('/trader/import/preview', { method: 'POST', body: form })
      const data = await r.json()
      if (r.ok && data.headers) {
        setImportConfigPreview(data)
        const suggested = data.suggested_mappings || {}
        const newMappings: Record<string, { mapTo: string }> = { ...(importConfig.column_mappings || {}) }
        Object.entries(suggested).forEach(([idx, mapTo]) => {
          if (mapTo && typeof mapTo === 'string') newMappings[idx] = { mapTo }
        })
        setImportConfig((ic) => ({ ...ic, column_mappings: newMappings }))
      } else {
        alert(data.detail || 'Не удалось распознать файл')
      }
    } catch (err) {
      alert('Ошибка распознавания: ' + String(err))
    } finally {
      setImportConfigRecognizeLoading(false)
    }
  }

  const clearImportConfigPreview = () => {
    setImportConfigPreview(null)
    setImportConfigFile(null)
    if (importConfigFileRef.current) importConfigFileRef.current.value = ''
  }

  const loadLinks = () => {
    if (!id || !token) return
    fetch(`/entities/suppliers/${id}/links`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { customers: [], manufacturers: [] }))
      .then(setLinks)
  }

  const loadDocuments = () => {
    if (!id || !token) return
    fetch(`/documents?entity_type=supplier&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setDocuments(d.items || []))
  }

  const refreshEntityTree = () => {
    if (!token) return
    fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .then(setEntityTree)
  }

  const fetchOauthConnections = () => {
    if (!token || !isTrader) return
    fetch('/api/cabinet/integrations/oauth', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d) => setOauthConnections(d.connections || []))
  }

  useEffect(() => { refreshEntityTree() }, [token])
  useEffect(() => { if (isTrader) fetchOauthConnections() }, [isTrader, token])
  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const oauthError = searchParams.get('oauth_error')
    if (oauth === 'connected') {
      setSearchParams({}, { replace: true })
      setItem(null)
      if (id && token) {
        fetch(`/entities/suppliers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setItem(d))
      }
    }
    if (oauthError) {
      setSearchParams({}, { replace: true })
      alert(`Ошибка OAuth: ${oauthError}`)
    }
  }, [searchParams])

  useEffect(() => {
    if (!id || !token) return
    Promise.all([
      fetch(`/entities/suppliers/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/suppliers/${id}/links`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/contracts?supplier_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/entities/supplies?supplier_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/documents?entity_type=supplier&entity_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([r1, r2, r3, r4, r5]) => [
        r1.ok ? await r1.json() : null,
        r2.ok ? await r2.json() : { customers: [], manufacturers: [] },
        r3.ok ? (await r3.json()).items : [],
        r4.ok ? (await r4.json()).items : [],
        r5.ok ? (await r5.json()).items : [],
      ])
      .then(([sup, lnks, cts, spl, docs]) => {
        setItem(sup)
        setLinks(lnks)
        setContracts(cts || [])
        setSupplies(spl || [])
        setDocuments(docs || [])
        if (sup?.extra_fields?.import_config) {
          setImportConfig(sup.extra_fields.import_config)
        } else {
          setImportConfig({ import_source: 'excel', sync_to_platforms: [] })
        }
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
  if (!item) return <p>Поставщик не найден</p>

  const getDeliveryAddresses = () => {
    const fromExtra = (item.extra_fields?.delivery_addresses as string[]) || []
    const single = item.delivery_address?.trim()
    if (single && !fromExtra.includes(single)) return [single, ...fromExtra]
    return fromExtra.length ? fromExtra : ['']
  }
  const getSupplyAddresses = () => {
    const fromExtra = (item.extra_fields?.supply_addresses as string[]) || []
    const single = item.supply_address?.trim()
    if (single && !fromExtra.includes(single)) return [single, ...fromExtra]
    return fromExtra.length ? fromExtra : ['']
  }

  const openEdit = () => {
    const vals: Record<string, string> = {}
    REQUISITE_FIELDS.forEach((f) => { vals[f.key] = (item[f.key] as string) ?? '' })
    setEditValues(vals)
    setDeliveryAddresses(getDeliveryAddresses())
    setSupplyAddresses(getSupplyAddresses())
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!id || !token) return
    const body: Record<string, unknown> = {}
    REQUISITE_FIELDS.forEach((f) => {
      const v = editValues[f.key]?.trim()
      if (v) body[f.key] = v
    })
    const da = deliveryAddresses.filter((a) => a.trim())
    const sa = supplyAddresses.filter((a) => a.trim())
    body.extra_fields = { ...(item.extra_fields || {}), delivery_addresses: da, supply_addresses: sa }
    const r = await fetch(`/entities/suppliers/${id}`, {
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

  const addCustomer = async (customerId: number) => {
    if (!id || !token) return
    const r = await fetch(`/entities/suppliers/${id}/customers/${customerId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) { loadLinks(); setAddCustomerOpen(false) }
    else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
  }

  const removeCustomer = async (customerId: number) => {
    if (!id || !token) return
    const r = await fetch(`/entities/suppliers/${id}/customers/${customerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) loadLinks()
  }

  const addManufacturer = async (manufacturerId: number) => {
    if (!id || !token) return
    const r = await fetch(`/entities/suppliers/${id}/manufacturers/${manufacturerId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) { loadLinks(); setAddManufacturerOpen(false) }
    else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
  }

  const removeManufacturer = async (manufacturerId: number) => {
    if (!id || !token) return
    const r = await fetch(`/entities/suppliers/${id}/manufacturers/${manufacturerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) loadLinks()
  }

  const createAndAddCustomer = async () => {
    const name = createCustomerName.trim()
    if (!name || !token || creating) return
    setCreating(true)
    try {
      const r = await fetch('/entities/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.id) {
        refreshEntityTree()
        setCreateCustomerOpen(false)
        setCreateCustomerName('')
        await addCustomer(data.id)
      } else {
        alert(data.detail || 'Ошибка создания заказчика')
      }
    } finally { setCreating(false) }
  }

  const createAndAddManufacturer = async () => {
    const name = createManufacturerName.trim()
    if (!name || !token || creating) return
    setCreating(true)
    try {
      const r = await fetch('/entities/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.id) {
        refreshEntityTree()
        setCreateManufacturerOpen(false)
        setCreateManufacturerName('')
        await addManufacturer(data.id)
      } else {
        alert(data.detail || 'Ошибка создания производителя')
      }
    } finally { setCreating(false) }
  }

  const runFetchApi = async () => {
    if (!id || !token || !isTrader) return
    setFetchApiLoading(true)
    try {
      const r = await fetch(`/trader/suppliers/${id}/fetch-api`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        alert(data.message || `Создано: ${data.created}, обновлено: ${data.updated}`)
      } else {
        alert(data.detail || 'Ошибка выкачки')
      }
    } finally {
      setFetchApiLoading(false)
    }
  }

  const runOauthConnect = async () => {
    if (!id || !token || !isTrader) return
    setOauthConnectLoading(true)
    try {
      const r = await fetch(`/trader/suppliers/${id}/oauth/init`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.redirect_url) {
        window.location.href = data.redirect_url
      } else {
        alert(data.detail || 'Не удалось получить ссылку')
        setOauthConnectLoading(false)
      }
    } catch (e) {
      setOauthConnectLoading(false)
      alert('Ошибка подключения')
    }
  }

  const saveImportConfig = async () => {
    if (!id || !token || !isTrader) return
    setSavingImportConfig(true)
    try {
      const cleanMappings: Record<string, { mapTo: string }> = {}
      Object.entries(importConfig.column_mappings || {}).forEach(([k, v]) => {
        const mt = v?.mapTo || ''
        if (mt && mt !== '__create__') cleanMappings[k] = v
      })
      const cfg = { ...importConfig, column_mappings: cleanMappings }
      const r = await fetch(`/entities/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          extra_fields: {
            ...(item?.extra_fields || {}),
            import_config: cfg,
          },
        }),
      })
      if (r.ok) {
        const updated = await r.json()
        setItem(updated)
        setImportConfigOpen(false)
      } else {
        const d = await r.json().catch(() => ({}))
        alert(d.detail || 'Ошибка сохранения')
      }
    } finally {
      setSavingImportConfig(false)
    }
  }

  const customers = entityTree?.customers || []
  const manufacturers = entityTree?.manufacturers || []
  const linkedCustomerIds = new Set(links.customers?.map((c: any) => c.id) || [])
  const linkedManufacturerIds = new Set(links.manufacturers?.map((m: any) => m.id) || [])

  return (
    <div>
      <Link
        to={isTrader ? '/cabinet/trader/suppliers' : '/cabinet/entities?tab=suppliers'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 20, textDecoration: 'none' }}
      >
        <ArrowLeft size={18} /> К списку поставщиков
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
                <input
                  type="text"
                  placeholder="10 или 12 цифр"
                  value={editValues.inn ?? ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, inn: e.target.value }))}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  inputMode="numeric"
                />
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
                        setEditValues((v) => ({
                          ...v,
                          name: d.name || v.name,
                          inn: d.inn || raw,
                          kpp: d.kpp || '',
                          ogrn: d.ogrn || '',
                          legal_address: d.legal_address || '',
                          address: d.address || d.legal_address || '',
                          phone: d.phone || '',
                          email: d.email || '',
                          contact_person: d.contact_person || '',
                          bank_name: d.bank_name || '',
                          bank_bik: d.bank_bik || '',
                          bank_account: d.bank_account || '',
                          bank_corr: d.bank_corr || '',
                        }))
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
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  <input
                    value={editValues[f.key] ?? ''}
                    onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Адреса отгрузки</label>
                {deliveryAddresses.map((addr, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={addr}
                      onChange={(e) => setDeliveryAddresses((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="Адрес"
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <button type="button" onClick={() => setDeliveryAddresses((a) => a.filter((_, j) => j !== i))} style={{ padding: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setDeliveryAddresses((a) => [...a, ''])} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={14} /> Добавить адрес
                </button>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Адреса поставки</label>
                {supplyAddresses.map((addr, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={addr}
                      onChange={(e) => setSupplyAddresses((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="Адрес"
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <button type="button" onClick={() => setSupplyAddresses((a) => a.filter((_, j) => j !== i))} style={{ padding: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setSupplyAddresses((a) => [...a, ''])} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={14} /> Добавить адрес
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={saveEdit} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {createCustomerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, maxWidth: 360, width: '100%' }}>
            <h3 style={{ marginBottom: 12 }}>Создать заказчика</h3>
            <input
              value={createCustomerName}
              onChange={(e) => setCreateCustomerName(e.target.value)}
              placeholder="Название заказчика"
              onKeyDown={(e) => e.key === 'Enter' && createAndAddCustomer()}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setCreateCustomerOpen(false); setCreateCustomerName('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={createAndAddCustomer} disabled={!createCustomerName.trim() || creating} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>{creating ? 'Создание…' : 'Создать и привязать'}</button>
            </div>
          </div>
        </div>
      )}

      {importConfigOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}
          onClick={(e) => e.target === e.currentTarget && setImportConfigOpen(false)}
        >
          <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, width: '100%', maxWidth: '100%', height: '100%', maxHeight: '100%', overflow: 'auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImportConfigOpen(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Закрыть"
            >
              <X size={24} />
            </button>
            <h3 style={{ marginBottom: 16, paddingRight: 36 }}>Настройка импорта</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Источник данных</label>
              <select
                value={importConfig.import_source || 'excel'}
                onChange={(e) => setImportConfig((ic) => ({ ...ic, import_source: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="excel">Excel (ручная загрузка)</option>
                <option value="csv">CSV (ручная загрузка)</option>
                <option value="api">REST API</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>
            {(importConfig.import_source === 'excel' || importConfig.import_source === 'csv') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Тестовый файл для настройки маппинга</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <input
                    ref={importConfigFileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setImportConfigFile(f)
                      if (!f) setImportConfigPreview(null)
                    }}
                    style={{ flex: 1, minWidth: 180, padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }}
                  />
                  <button
                    type="button"
                    onClick={runImportConfigRecognize}
                    disabled={!importConfigFile || importConfigRecognizeLoading}
                    style={{
                      padding: '8px 16px',
                      background: importConfigFile && !importConfigRecognizeLoading ? 'var(--accent)' : 'var(--surface)',
                      color: importConfigFile && !importConfigRecognizeLoading ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: importConfigFile && !importConfigRecognizeLoading ? 'pointer' : 'not-allowed',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Search size={16} />
                    {importConfigRecognizeLoading ? 'Распознавание…' : 'Распознать'}
                  </button>
                  {importConfigPreview && (
                    <button type="button" onClick={clearImportConfigPreview} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
                      Сбросить
                    </button>
                  )}
                </div>
                {importConfigPreview && (
                  <div style={{ marginBottom: 12, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, maxHeight: 'min(280px, 40vh)', overflow: 'auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Превью (первые строки)</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {Object.entries(importConfigPreview.headers || {}).sort(([a], [b]) => Number(a) - Number(b)).slice(0, 8).map(([idx]) => (
                            <th key={idx} style={{ padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Кол.{idx}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(importConfigPreview.preview_rows || []).slice(0, 4).map((row, ri) => (
                          <tr key={ri}>
                            {Object.keys(importConfigPreview.headers || {}).sort((a, b) => Number(a) - Number(b)).slice(0, 8).map((idx) => (
                              <td key={idx} style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                                {(row as Record<number, string>)[Number(idx)] ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Сопоставление колонок {importConfigPreview ? `(${Object.keys(importConfigPreview.headers || {}).length} колонок)` : '(загрузите файл и нажмите «Распознать» или настройте вручную)'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'min(400px, 50vh)', overflow: 'auto' }}>
                  {(() => {
                    const fromPreview = importConfigPreview?.headers ? Object.keys(importConfigPreview.headers).map(Number) : []
                    const fromSaved = importConfig.column_mappings ? Object.keys(importConfig.column_mappings).map(Number) : []
                    const indices = [...new Set([...fromPreview, ...fromSaved])].sort((a, b) => a - b)
                    const cols = indices.length > 0 ? indices : [0, 1, 2, 3, 4, 5]
                    return cols
                  })().map((idx) => {
                    const mapping = importConfig.column_mappings?.[String(idx)]?.mapTo || ''
                    const isCreate = mapping === '__create__'
                    const extraKeys = new Set<string>()
                    Object.values(importConfig.column_mappings || {}).forEach((m) => {
                      const mt = m?.mapTo || ''
                      if (mt.startsWith('extra:')) extraKeys.add(mt)
                    })
                    return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                        {importConfigPreview?.headers?.[idx] ? `Колонка ${idx}: ${importConfigPreview.headers[idx]}` : `Колонка ${idx}`}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                          value={isCreate ? '__create__' : mapping || ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setImportConfig((ic) => {
                              const cm = { ...(ic.column_mappings || {}), [String(idx)]: { mapTo: v } }
                              return { ...ic, column_mappings: cm }
                            })
                          }}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, minWidth: 140 }}
                        >
                          <option value="">— не импортировать —</option>
                          {TRADER_IMPORT_FIELDS.map((f) => (
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
                              if (k) {
                                setImportConfig((ic) => {
                                  const cm = { ...(ic.column_mappings || {}), [String(idx)]: { mapTo: 'extra:' + k } }
                                  return { ...ic, column_mappings: cm }
                                })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const k = normalizeExtraKey((e.target as HTMLInputElement).value)
                                if (k) {
                                  setImportConfig((ic) => {
                                    const cm = { ...(ic.column_mappings || {}), [String(idx)]: { mapTo: 'extra:' + k } }
                                    return { ...ic, column_mappings: cm }
                                  })
                                }
                              }
                            }}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, width: 140 }}
                          />
                        )}
                      </div>
                    </div>
                  )})}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                  Сохранённый шаблон будет применяться при выборе этого поставщика в разделе Импорт.
                </p>
              </div>
            )}
            {importConfig.import_source === 'api' && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL API</label>
                  <input
                    value={importConfig.api_url || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, api_url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>API-ключ (опц.)</label>
                  <input
                    type="password"
                    value={importConfig.api_key || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, api_key: e.target.value }))}
                    placeholder="Bearer или X-Api-Key"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Маппинг полей JSON (наше поле → ключ в API)</label>
                  {TRADER_IMPORT_FIELDS.map((f) => (
                    <div key={f.v} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ width: 140 }}>{f.lbl}</span>
                      <input
                        value={(importConfig.api_field_map || {})[f.v] ?? (f.v === 'barcode' ? 'ean' : f.v === 'purchase_price' ? 'price' : f.v)}
                        onChange={(e) =>
                          setImportConfig((ic) => ({
                            ...ic,
                            api_field_map: { ...(ic.api_field_map || {}), [f.v]: e.target.value },
                          }))
                        }
                        placeholder={f.v}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  API должен возвращать JSON: массив объектов или {'{'}items: [...]{'}'}. Обновление — по баркоду.
                </p>
              </div>
            )}
            {importConfig.import_source === 'oauth' && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL авторизации</label>
                  <input
                    value={importConfig.oauth_auth_url || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, oauth_auth_url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL обмена токена</label>
                  <input
                    value={importConfig.oauth_token_url || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, oauth_token_url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Client ID</label>
                  <input
                    value={importConfig.oauth_client_id || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, oauth_client_id: e.target.value }))}
                    placeholder="Client ID приложения"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Client Secret</label>
                  <input
                    type="password"
                    value={importConfig.oauth_client_secret || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, oauth_client_secret: e.target.value }))}
                    placeholder="Секрет приложения"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Scopes (опц.)</label>
                  <input
                    value={importConfig.oauth_scopes || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, oauth_scopes: e.target.value }))}
                    placeholder="read_products read_inventory"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL API для выкачки</label>
                  <input
                    value={importConfig.api_url || ''}
                    onChange={(e) => setImportConfig((ic) => ({ ...ic, api_url: e.target.value }))}
                    placeholder="https://api.example.com/products"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Маппинг полей JSON</label>
                  {TRADER_IMPORT_FIELDS.map((f) => (
                    <div key={f.v} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ width: 140 }}>{f.lbl}</span>
                      <input
                        value={(importConfig.api_field_map || {})[f.v] ?? (f.v === 'barcode' ? 'ean' : f.v === 'purchase_price' ? 'price' : f.v)}
                        onChange={(e) =>
                          setImportConfig((ic) => ({
                            ...ic,
                            api_field_map: { ...(ic.api_field_map || {}), [f.v]: e.target.value },
                          }))
                        }
                        placeholder={f.v}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  После сохранения нажмите «Подключить OAuth» — откроется страница авторизации поставщика.
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setImportConfigOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>
                Отмена
              </button>
              <button type="button" onClick={saveImportConfig} disabled={savingImportConfig} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {savingImportConfig ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createManufacturerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, maxWidth: 360, width: '100%' }}>
            <h3 style={{ marginBottom: 12 }}>Создать производителя</h3>
            <input
              value={createManufacturerName}
              onChange={(e) => setCreateManufacturerName(e.target.value)}
              placeholder="Название производителя"
              onKeyDown={(e) => e.key === 'Enter' && createAndAddManufacturer()}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setCreateManufacturerOpen(false); setCreateManufacturerName('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Отмена</button>
              <button type="button" onClick={createAndAddManufacturer} disabled={!createManufacturerName.trim() || creating} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>{creating ? 'Создание…' : 'Создать и привязать'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Реквизиты</h3>
          <dl style={{ margin: 0, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            {REQUISITE_FIELDS.filter((f) => item[f.key]).map((f) => (
              <div key={f.key} style={{ gridColumn: f.key === 'legal_address' || f.key === 'address' ? '1 / -1' : 'auto' }}>
                <dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{f.label}</dt>
                <dd style={{ margin: 0 }}>{item[f.key]}</dd>
              </div>
            ))}
            {(() => {
              const da = ((item.extra_fields?.delivery_addresses as string[]) || []).concat(item.delivery_address?.trim() ? [item.delivery_address] : []).filter(Boolean)
              const sa = ((item.extra_fields?.supply_addresses as string[]) || []).concat(item.supply_address?.trim() ? [item.supply_address] : []).filter(Boolean)
              const uniq = (arr: string[]) => [...new Set(arr)]
              return (
                <>
                  {uniq(da).length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Адреса отгрузки</dt>
                      <dd style={{ margin: 0 }}>{uniq(da).join('; ')}</dd>
                    </div>
                  )}
                  {uniq(sa).length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Адреса поставки</dt>
                      <dd style={{ margin: 0 }}>{uniq(sa).join('; ')}</dd>
                    </div>
                  )}
                </>
              )
            })()}
          </dl>
        </section>

        {isTrader && (
          <>
            <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Настройка импорта</h3>
                <button
                  type="button"
                  onClick={() => {
                    setImportConfig(item?.extra_fields?.import_config || { import_source: 'excel', sync_to_platforms: [] })
                    clearImportConfigPreview()
                    setImportConfigOpen(true)
                  }}
                  style={{ padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Pencil size={14} /> {item?.extra_fields?.import_config?.column_mappings ? 'Редактировать' : 'Настроить'}
                </button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <p style={{ margin: '0 0 8px' }}>
                  Источник: {importConfig.import_source === 'api' ? 'API' : importConfig.import_source === 'oauth' ? 'OAuth' : importConfig.import_source === 'csv' ? 'CSV' : 'Excel (ручная загрузка)'}
                </p>
                {importConfig.import_source === 'excel' || importConfig.import_source === 'csv' ? (
                  <Link
                    to={`/cabinet/trader/import?supplier_id=${id}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', textDecoration: 'none', marginTop: 8 }}
                  >
                    <Upload size={16} /> Импортировать {importConfig.import_source === 'csv' ? 'CSV' : 'Excel'} для этого поставщика
                  </Link>
                ) : (importConfig.import_source === 'api' || importConfig.import_source === 'oauth') && importConfig.api_url ? (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {importConfig.import_source === 'oauth' && (
                      <button
                        type="button"
                        onClick={runOauthConnect}
                        disabled={oauthConnectLoading}
                        style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: oauthConnectLoading ? 'not-allowed' : 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {oauthConnectLoading ? '…' : 'Подключить OAuth'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={runFetchApi}
                      disabled={fetchApiLoading}
                      style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: fetchApiLoading ? 'not-allowed' : 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Upload size={16} /> {fetchApiLoading ? 'Выкачка…' : 'Запустить выкачку'}
                    </button>
                  </div>
                ) : null}
                {oauthConnections.length > 0 && (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Синхронизация на площадки: {((importConfig.sync_to_platforms || []) as string[]).length > 0 ? (importConfig.sync_to_platforms as string[]).join(', ') : 'не настроена'}
                  </p>
                )}
              </div>
            </section>

            <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Сопоставление с площадками</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Выберите площадки, на которые выгружать товары этого поставщика. Подключение — в разделе <Link to="/cabinet/integrations" style={{ color: 'var(--accent)' }}>Интеграции</Link>.
              </p>
              {oauthConnections.length > 0 ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {oauthConnections.map((c) => (
                    <label key={c.provider} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(importConfig.sync_to_platforms || []).includes(c.provider)}
                        onChange={(e) => {
                          const cur = (importConfig.sync_to_platforms || []) as string[]
                          const next = e.target.checked ? [...cur, c.provider] : cur.filter((p) => p !== c.provider)
                          setImportConfig((ic) => ({ ...ic, sync_to_platforms: next }))
                        }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{c.provider}</span>
                      {c.store_url && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({c.store_url})</span>}
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={saveImportConfig}
                    disabled={savingImportConfig}
                    style={{ alignSelf: 'flex-start', padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                  >
                    {savingImportConfig ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
              ) : (
                <p style={{ margin: '8px 0 0', fontSize: 12 }}>Нет подключённых площадок</p>
              )}
            </section>
          </>
        )}

        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Заказчики</h3>
            <button type="button" onClick={() => setAddCustomerOpen(true)} style={{ padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={14} /> Добавить
            </button>
          </div>
          {links.customers?.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {links.customers.map((c: any) => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Link to={`/cabinet/entities/customer/${c.id}`} style={{ flex: 1, color: 'var(--accent)', textDecoration: 'none' }}>{c.name}</Link>
                  <button type="button" onClick={() => removeCustomer(c.id)} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Отвязать"><X size={14} /></button>
                </li>
              ))}
            </ul>
          ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Нет привязанных заказчиков</p>}
          {addCustomerOpen && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Выберите заказчика</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {customers.filter((c: any) => !linkedCustomerIds.has(c.id)).map((c: any) => (
                  <button key={c.id} type="button" onClick={() => addCustomer(c.id)} style={{ padding: 8, textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>{c.name}</button>
                ))}
                {customers.filter((c: any) => !linkedCustomerIds.has(c.id)).length === 0 && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Нет доступных заказчиков.</span>
                    <button type="button" onClick={() => setCreateCustomerOpen(true)} style={{ marginTop: 4, padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start' }}>
                      + Создать нового заказчика
                    </button>
                  </>
                )}
              </div>
              <button type="button" onClick={() => setAddCustomerOpen(false)} style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}>Закрыть</button>
            </div>
          )}
        </section>

        <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Производители</h3>
            <button type="button" onClick={() => setAddManufacturerOpen(true)} style={{ padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={14} /> Добавить
            </button>
          </div>
          {links.manufacturers?.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {links.manufacturers.map((m: any) => (
                <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Link to={`/cabinet/entities/manufacturer/${m.id}`} style={{ flex: 1, color: 'var(--accent)', textDecoration: 'none' }}>{m.name}</Link>
                  <button type="button" onClick={() => removeManufacturer(m.id)} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Отвязать"><X size={14} /></button>
                </li>
              ))}
            </ul>
          ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Нет привязанных производителей</p>}
          {addManufacturerOpen && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Выберите производителя</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {manufacturers.filter((m: any) => !linkedManufacturerIds.has(m.id)).map((m: any) => (
                  <button key={m.id} type="button" onClick={() => addManufacturer(m.id)} style={{ padding: 8, textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>{m.name}</button>
                ))}
                {manufacturers.filter((m: any) => !linkedManufacturerIds.has(m.id)).length === 0 && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Нет доступных производителей.</span>
                    <button type="button" onClick={() => setCreateManufacturerOpen(true)} style={{ marginTop: 4, padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start' }}>
                      + Создать нового производителя
                    </button>
                  </>
                )}
              </div>
              <button type="button" onClick={() => setAddManufacturerOpen(false)} style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}>Закрыть</button>
            </div>
          )}
        </section>

        {contracts.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Договоры</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {contracts.map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <Link to={`/cabinet/entities/contract/${c.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    {c.number || `Договор #${c.id}`}
                    {c.date_start && c.date_end && ` (${c.date_start} — ${c.date_end})`}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {supplies.length > 0 && (
          <section style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Поставки</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {supplies.slice(0, 20).map((s) => (
                <li key={s.id} style={{ marginBottom: 8 }}>
                  <Link to={`/cabinet/entities/supply/${s.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    Поставка #{s.id} — кол-во: {s.unique_items_count ?? s.quantity ?? 0}
                    {s.production_date && `, дата: ${s.production_date}`}
                  </Link>
                </li>
              ))}
              {supplies.length > 20 && <li style={{ fontSize: 12, color: 'var(--text-secondary)' }}>… и ещё {supplies.length - 20}</li>}
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
                  fd.append('entity_type', 'supplier')
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
                  <a href={`${window.location.origin}/documents/public/${d.id}?entity_type=supplier&entity_id=${id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', padding: 4 }} title="Просмотр"><ExternalLink size={14} /></a>
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
