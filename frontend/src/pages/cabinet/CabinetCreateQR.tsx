import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, ChevronUp, Folder, Package, Truck, FileText, Maximize2, Minimize2, Download, QrCode, ExternalLink, Upload, Trash2, FileUp } from 'lucide-react'
import QRCodeStyling from 'qr-code-styling'

type EntityItem = {
  entity_type: string
  entity_id: number
  name: string
  code?: string
}

type TreeNode = {
  id: number
  name: string
  subcategories?: { id: number; name: string; nomenclature: { id: number; code: string; name: string }[] }[]
  nomenclature?: { id: number; code: string; name: string }[]
}

type SavedQr = {
  id: number
  entity_type: string
  entity_id: number
  name: string
  qr_url: string
  download_url: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  category: 'Категория',
  subcategory: 'Подкатегория',
  nomenclature: 'Номенклатура',
  supply: 'Поставка',
  supplier: 'Поставщик',
  manufacturer: 'Производитель',
  contract: 'Договор',
}

const ENTITY_DESCRIPTIONS: Record<string, string[]> = {
  category: ['Подкатегории', 'Номенклатура', 'Документы'],
  subcategory: ['Номенклатура', 'Документы'],
  nomenclature: ['Поставки', 'Документы'],
  supply: ['Номенклатура', 'Поставщик', 'Документы'],
  supplier: ['Поставки', 'Документы'],
  manufacturer: ['Номенклатура', 'Документы'],
  contract: ['Приложения', 'Документы'],
}

const LOGO_SHAPES = [
  { id: 'square', label: 'Квадрат', imageSize: 0.18 },
  { id: 'rectangle', label: 'Прямоугольник', imageSize: 0.22 },
] as const

export default function CabinetCreateQR() {
  const [tree, setTree] = useState<{
    categories: TreeNode[]
    supplies: { id: number; name: string; code: string }[]
    suppliers: { id: number; name: string; code: string }[]
    manufacturers: { id: number; name: string; code: string }[]
    contracts: { id: number; name: string; code: string; supplier_id?: number }[]
  } | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [logoShape, setLogoShape] = useState<(typeof LOGO_SHAPES)[number]>(LOGO_SHAPES[0])
  const [selected, setSelected] = useState<EntityItem | null>(null)
  const [size, setSize] = useState(200)
  const [generated, setGenerated] = useState<string | null>(null)
  const [useLogo, setUseLogo] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savedList, setSavedList] = useState<SavedQr[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [supplyUploadOpen, setSupplyUploadOpen] = useState(false)
  const [supplyFiles, setSupplyFiles] = useState<File[]>([])
  const [supplyRecognizeResults, setSupplyRecognizeResults] = useState<any[]>([])
  const [supplySupplierId, setSupplySupplierId] = useState<string>('')
  const [supplyDate, setSupplyDate] = useState<string>('')
  const [useSupplyDate, setUseSupplyDate] = useState(false)
  const [supplyContractId, setSupplyContractId] = useState<string>('')
  const [supplyBuyerName, setSupplyBuyerName] = useState<string>('')
  const [supplyShippingAddress, setSupplyShippingAddress] = useState<string>('')
  const [supplyDeliveryAddress, setSupplyDeliveryAddress] = useState<string>('')
  const [supplyItemDecisions, setSupplyItemDecisions] = useState<Record<number, { action: 'merge' | 'new'; nomenclature_id?: number }>>({})
  const [supplyImporting, setSupplyImporting] = useState(false)
  const [supplyImportSuccess, setSupplyImportSuccess] = useState('')
  const [supplyLimitReachedInfo, setSupplyLimitReachedInfo] = useState<{ message: string; url: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { categories: [], supplies: [], suppliers: [], manufacturers: [], contracts: [] }))
      .then(setTree)
      .catch(() => setTree({ categories: [], supplies: [], suppliers: [], manufacturers: [], contracts: [] }))
  }, [])

  const loadSavedQrCodes = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/qr-codes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setSavedList(d.items || []))
      .catch(() => setSavedList([]))
  }

  useEffect(loadSavedQrCodes, [])

  const runSupplyRecognize = async () => {
    const t = localStorage.getItem('access_token')
    if (!t || supplyFiles.length === 0) return
    setSupplyImporting(true)
    const fd = new FormData()
    supplyFiles.forEach((f) => fd.append('files', f))
    try {
      const r = await fetch('/documents/recognize', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.files) {
        setSupplyRecognizeResults(d.files)
        const first = d.files[0]
        const sd = first?.extracted_structured?.supply_date_detected
        if (sd) setSupplyDate(sd)
        const bySupplier = (first?.suggested || []).filter((s: any) => s.entity_type === 'supplier')
        if (bySupplier[0]) setSupplySupplierId(String(bySupplier[0].entity_id))
        const h = first?.extracted_structured?.header || {}
        if (h.покупатель) setSupplyBuyerName(h.покупатель)
        if (h.адрес_отгрузки) setSupplyShippingAddress(h.адрес_отгрузки)
        if (h.адрес_поставки) setSupplyDeliveryAddress(h.адрес_поставки)
        const decisions: Record<number, { action: 'merge' | 'new'; nomenclature_id?: number }> = {}
        const items = first?.extracted_structured?.nomenclature_items || []
        items.forEach((it: any, idx: number) => {
          const best = it.match_candidates?.[0]
          decisions[idx] = best ? { action: 'merge', nomenclature_id: best.nomenclature_id } : { action: 'new' }
        })
        setSupplyItemDecisions(decisions)
      } else {
        const msg = Array.isArray(d.detail) ? d.detail.map((x: any) => x.msg || x.detail || JSON.stringify(x)).join(', ') : (d.detail?.message || d.detail || 'Ошибка распознавания')
        alert(msg)
      }
    } catch { alert('Ошибка сети') }
    finally { setSupplyImporting(false) }
  }

  const doImportSupplies = async () => {
    const t = localStorage.getItem('access_token')
    if (!t || supplyFiles.length === 0) return
    const sid = supplySupplierId ? parseInt(supplySupplierId, 10) : null
    if (!sid) {
      alert('Выберите поставщика')
      return
    }
    const first = supplyRecognizeResults[0]
    const nomItems = first?.extracted_structured?.nomenclature_items || []
    const itemsPayload = nomItems.map((it: any, idx: number) => {
      const dec = supplyItemDecisions[idx] || { action: 'new' }
      return {
        row_index: idx,
        action: dec.action,
        nomenclature_id: dec.nomenclature_id,
        quantity: it.quantity ?? 1,
        code: it.article || it.code,
        name: it.name,
        tag_number: it.tag_number,
        package_number: it.package_number,
        manufacturer_name: it.manufacturer,
      }
    })
    setSupplyImporting(true)
    const fd = new FormData()
    supplyFiles.forEach((f) => fd.append('files', f))
    fd.append('supplier_id', String(sid))
    fd.append('use_supply_date', String(useSupplyDate))
    if (useSupplyDate && supplyDate) fd.append('supply_date', supplyDate)
    if (supplyContractId) fd.append('contract_id', supplyContractId)
    if (supplyBuyerName?.trim()) fd.append('buyer_name', supplyBuyerName.trim())
    if (supplyShippingAddress?.trim()) fd.append('shipping_address', supplyShippingAddress.trim())
    if (supplyDeliveryAddress?.trim()) fd.append('delivery_address', supplyDeliveryAddress.trim())
    fd.append('items', JSON.stringify(itemsPayload))
    try {
      const r = await fetch('/documents/import-supplies', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setSupplyImportSuccess(`Создано поставок: ${d.created ?? 0}`)
        if (d.limit_reached && d.subscription_url) {
          setSupplyLimitReachedInfo({ message: d.limit_message || 'Достигнут лимит. Оформите подписку для расширения.', url: d.subscription_url })
          setTimeout(() => setSupplyLimitReachedInfo(null), 15000)
        } else setSupplyLimitReachedInfo(null)
        setTimeout(() => setSupplyImportSuccess(''), 5000)
        setSupplyFiles([])
        setSupplyRecognizeResults([])
        setSupplyItemDecisions({})
        loadSavedQrCodes()
        fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${t}` } })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => data && setTree(data))
      } else {
        const msg = Array.isArray(d.detail) ? d.detail.map((x: any) => x.msg || x.detail || JSON.stringify(x)).join(', ') : (d.detail?.message || d.detail || 'Ошибка импорта')
        alert(msg)
      }
    } catch (e: any) { alert(e?.message || 'Ошибка сети') }
    finally { setSupplyImporting(false) }
  }

  function buildQrUrl(item: EntityItem) {
    const base = window.location.origin
    return `${base}/scan/entity/${item.entity_type}/${item.entity_id}`
  }

  function generateQrDataUrl(url: string, logo: string | null, sz: number): Promise<string> {
    const imgSize = logo && useLogo ? logoShape.imageSize : undefined
    const qr = new QRCodeStyling({
      width: sz,
      height: sz,
      data: url,
      margin: 8,
      qrOptions: { errorCorrectionLevel: logo ? 'H' : 'M' },
      image: logo || undefined,
      imageOptions: logo && imgSize != null
        ? {
            imageSize: imgSize,
            margin: 4,
            hideBackgroundDots: true,
          }
        : undefined,
    })
    return qr.getRawData('png').then((blob) => {
      if (!blob) return ''
      return new Promise<string>((res) => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result as string)
        reader.readAsDataURL(blob)
      })
    })
  }

  const saveQrCode = async (dataUrl: string) => {
    if (!selected || !dataUrl) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    const url = buildQrUrl(selected)
    const name = `${TYPE_LABELS[selected.entity_type] || selected.entity_type}: ${selected.name}${selected.code ? ` (${selected.code})` : ''}`
    try {
      const r = await fetch('/api/cabinet/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entity_type: selected.entity_type,
          entity_id: selected.entity_id,
          name,
          qr_url: url,
          image_base64: dataUrl,
        }),
      })
      if (r.ok) loadSavedQrCodes()
    } catch {
      /* ignore */
    }
  }

  async function generate() {
    if (!selected) return
    const url = buildQrUrl(selected)
    const logo = useLogo && logoDataUrl ? logoDataUrl : null
    const dataUrl = await generateQrDataUrl(url, logo, size)
    setGenerated(dataUrl)
    setPickerOpen(false)
    saveQrCode(dataUrl)
  }

  const selectAndGenerate = async (item: EntityItem) => {
    setSelected(item)
    const url = buildQrUrl(item)
    const logo = useLogo && logoDataUrl ? logoDataUrl : null
    const dataUrl = await generateQrDataUrl(url, logo, size)
    setGenerated(dataUrl)
    setPickerOpen(false)
    saveQrCode(dataUrl)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onloadend = () => setLogoDataUrl(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    setDeleting(true)
    try {
      const r = await fetch('/api/cabinet/qr-codes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (r.ok) {
        setSelectedIds(new Set())
        loadSavedQrCodes()
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === savedList.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(savedList.map((q) => q.id)))
    }
  }

  const pickerContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {tree?.categories?.map((cat) => (
        <CategoryNode key={cat.id} category={cat} onSelect={selectAndGenerate} />
      ))}
      {tree?.supplies?.length ? (
        <Section title="Поставки" icon={<Truck size={18} />}>
          {tree.supplies.map((s) => (
            <EntityRow key={s.id} entity_type="supply" entity_id={s.id} name={s.name} onSelect={selectAndGenerate} />
          ))}
        </Section>
      ) : null}
      {tree?.suppliers?.length ? (
        <Section title="Поставщики" icon={<Truck size={18} />}>
          {tree.suppliers.map((s) => (
            <EntityRow
              key={s.id}
              entity_type="supplier"
              entity_id={s.id}
              name={s.name}
              code={s.code}
              onSelect={selectAndGenerate}
            />
          ))}
        </Section>
      ) : null}
      {tree?.manufacturers?.length ? (
        <Section title="Производители" icon={<Package size={18} />}>
          {tree.manufacturers.map((m) => (
            <EntityRow key={m.id} entity_type="manufacturer" entity_id={m.id} name={m.name} onSelect={selectAndGenerate} />
          ))}
        </Section>
      ) : null}
      {tree?.contracts?.length ? (
        <Section title="Договоры" icon={<FileText size={18} />}>
          {tree.contracts.map((c) => (
            <EntityRow
              key={c.id}
              entity_type="contract"
              entity_id={c.id}
              name={c.name}
              code={c.code}
              onSelect={selectAndGenerate}
            />
          ))}
        </Section>
      ) : null}
    </div>
  )

  const qrUrl = selected ? buildQrUrl(selected) : ''
  const entityDesc = selected ? ENTITY_DESCRIPTIONS[selected.entity_type] || [] : []

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Создать QR-код</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
        Выберите сущность — при сканировании откроется страница с ней и связанными документами.
      </p>

      <div style={{ marginBottom: '2rem', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setSupplyUploadOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileUp size={20} />
            Загрузка файла для маркировки (отгрузочная документация)
          </span>
          {supplyUploadOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {supplyUploadOpen && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
            {supplyImportSuccess && (
              <div style={{ padding: '12px 0', color: 'var(--success)', fontWeight: 500 }}>✓ {supplyImportSuccess}</div>
            )}
            {supplyLimitReachedInfo && (
              <div style={{ padding: 12, background: 'var(--warning)', color: 'var(--text)', borderRadius: 8, marginTop: 8 }}>
                <div style={{ marginBottom: 8 }}>{supplyLimitReachedInfo.message}</div>
                <Link to={supplyLimitReachedInfo.url} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Оформить подписку</Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Файл XLSX</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSupplyFiles(Array.from(e.target.files || []))}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <a
                href="/api/cabinet/template/supplies"
                download="шаблон_отгрузочная_ведомость.xlsx"
                onClick={async (e) => {
                  const t = localStorage.getItem('access_token')
                  if (!t) { e.preventDefault(); alert('Войдите в систему'); return }
                  e.preventDefault()
                  const tryFetch = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${t}` }, credentials: 'same-origin' })
                  try {
                    let r = await tryFetch('/api/cabinet/template/supplies')
                    if (!r.ok) r = await tryFetch('/documents/template/supplies')
                    if (!r.ok) throw new Error(`Ошибка ${r.status}`)
                    const blob = await r.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'шаблон_отгрузочная_ведомость.xlsx'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (err) { alert('Не удалось скачать шаблон. Проверьте подключение к интернету и авторизацию.') }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, textDecoration: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                <Download size={18} /> Скачать шаблон
              </a>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={runSupplyRecognize}
                  disabled={supplyImporting || supplyFiles.length === 0}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
                >
                  {supplyImporting ? 'Распознавание...' : 'Распознать'}
                </button>
              </div>
            </div>
            {supplyRecognizeResults[0]?.extracted_structured?.supply_document && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Поставщик</label>
                    <select
                      value={supplySupplierId}
                      onChange={(e) => { setSupplySupplierId(e.target.value); setSupplyContractId('') }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      <option value="">— выбрать —</option>
                      {tree?.suppliers?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Договор</label>
                    <select
                      value={supplyContractId}
                      onChange={(e) => setSupplyContractId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      <option value="">— выбрать —</option>
                      {(tree?.contracts || [])
                        .filter((c: any) => !supplySupplierId || c.supplier_id === parseInt(supplySupplierId, 10))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Покупатель</label>
                    <input
                      type="text"
                      value={supplyBuyerName}
                      onChange={(e) => setSupplyBuyerName(e.target.value)}
                      placeholder="ввести вручную"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={useSupplyDate} onChange={(e) => setUseSupplyDate(e.target.checked)} />
                      <span>Дата поставки</span>
                    </label>
                    {useSupplyDate && (
                      <input
                        type="date"
                        value={supplyDate}
                        onChange={(e) => setSupplyDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ flex: '1 1 280px' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Адрес отгрузки</label>
                    <input
                      type="text"
                      value={supplyShippingAddress}
                      onChange={(e) => setSupplyShippingAddress(e.target.value)}
                      placeholder="ввести вручную"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 280px' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Адрес доставки</label>
                    <input
                      type="text"
                      value={supplyDeliveryAddress}
                      onChange={(e) => setSupplyDeliveryAddress(e.target.value)}
                      placeholder="ввести вручную"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
                <div className="data-list data-list-sticky data-list-recognized" style={{ marginBottom: 16, maxHeight: 300, overflow: 'auto' }}>
                  <table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 8, textAlign: 'left' }}>Код/Артикул</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Наименование</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Таговый №</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Кол-во</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Действие</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Выбор</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(supplyRecognizeResults[0]?.extracted_structured?.nomenclature_items || []).map((it: any, idx: number) => {
                        const dec = supplyItemDecisions[idx] || { action: 'new' }
                        const conflict = it.conflict_same_code_diff_tag
                        const candidates = it.match_candidates || []
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: conflict ? 'rgba(239,68,68,0.08)' : candidates.length ? 'rgba(34,197,94,0.06)' : undefined,
                            }}
                          >
                            <td style={{ padding: 8 }}>{it.article || it.code || '—'}</td>
                            <td style={{ padding: 8 }}>{it.name || '—'}</td>
                            <td style={{ padding: 8 }}>{it.tag_number || '—'}</td>
                            <td style={{ padding: 8 }}>{it.quantity ?? 1}</td>
                            <td style={{ padding: 8 }}>
                              <select
                                value={candidates.length ? dec.action : 'new'}
                                onChange={(e) => {
                                  const v = e.target.value as 'merge' | 'new'
                                  setSupplyItemDecisions((p) => ({
                                    ...p,
                                    [idx]: { ...p[idx], action: v, nomenclature_id: v === 'merge' ? candidates[0]?.nomenclature_id : undefined },
                                  }))
                                }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                              >
                                {candidates.length > 0 && <option value="merge">Объединить (добавить кол-во)</option>}
                                <option value="new">Добавить новую</option>
                              </select>
                            </td>
                            <td style={{ padding: 8 }}>
                              {dec.action === 'merge' && (
                                <select
                                  value={dec.nomenclature_id ?? ''}
                                  onChange={(e) => setSupplyItemDecisions((p) => ({
                                    ...p,
                                    [idx]: { ...p[idx], nomenclature_id: e.target.value ? parseInt(e.target.value, 10) : undefined },
                                  }))}
                                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, minWidth: 180 }}
                                >
                                  {candidates.map((c: any) => (
                                    <option key={c.nomenclature_id} value={c.nomenclature_id}>
                                      {c.name} {c.code ? `(${c.code})` : ''} — {c.match_score}%
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={doImportSupplies}
                  disabled={supplyImporting || !supplySupplierId}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  {supplyImporting ? 'Импорт...' : 'Завести в базу'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Выбор сущности</label>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            width: '100%',
            maxWidth: 500,
            padding: '16px 20px',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 12,
            color: selected ? 'var(--text)' : 'var(--text-secondary)',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <QrCode size={24} style={{ flexShrink: 0 }} />
          {selected ? (
            <span>
              {TYPE_LABELS[selected.entity_type] || selected.entity_type}: {selected.name}
              {selected.code ? ` (${selected.code})` : ''}
            </span>
          ) : (
            <span>Нажмите для выбора категории, поставки, номенклатуры...</span>
          )}
        </button>
      </div>

      {pickerOpen && (
        <div
          style={{
            position: fullscreen ? 'fixed' : 'relative',
            inset: fullscreen ? 0 : undefined,
            zIndex: 50,
            background: fullscreen ? 'var(--bg)' : 'var(--surface)',
            border: fullscreen ? 'none' : '1px solid var(--border)',
            borderRadius: fullscreen ? 0 : 12,
            padding: 24,
            maxHeight: fullscreen ? '100vh' : 400,
            overflow: 'auto',
            boxShadow: fullscreen ? 'none' : '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Выберите сущность</h3>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              style={{
                padding: 8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              title={fullscreen ? 'Свернуть' : 'На весь экран'}
            >
              {fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
          {tree ? pickerContent : <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>}
          <button
            onClick={() => setPickerOpen(false)}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      )}

      {selected && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>Размер QR (пикселей)</label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10) || 200)}
              min={100}
              max={500}
              style={{
                width: 120,
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>Логотип (PNG, JPG, SVG, WebP)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <Upload size={18} />
                {logoDataUrl ? 'Заменить логотип' : 'Загрузить логотип'}
              </button>
              {logoDataUrl && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={useLogo}
                      onChange={(e) => setUseLogo(e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>Добавить в центр QR</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {LOGO_SHAPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setLogoShape(s)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: logoShape.id === s.id ? 'rgba(14,165,233,0.2)' : 'var(--surface)',
                          color: logoShape.id === s.id ? 'var(--accent)' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoDataUrl(null)
                      setUseLogo(false)
                    }}
                    style={{
                      padding: '6px 12px',
                      color: 'var(--text-secondary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Убрать
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <button
          onClick={generate}
          style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Создать QR-код
        </button>
      )}

      {generated && selected && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            maxWidth: 420,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
            {TYPE_LABELS[selected.entity_type] || selected.entity_type}: {selected.name}
            {selected.code ? ` (${selected.code})` : ''}
          </h3>

          {entityDesc.length > 0 && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Входит: {entityDesc.join(', ')}
            </p>
          )}

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Ссылка для проверки:
            </span>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--accent)',
                textDecoration: 'none',
                wordBreak: 'break-all',
              }}
            >
              {qrUrl}
              <ExternalLink size={14} style={{ flexShrink: 0 }} />
            </a>
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: 12,
              background: '#fff',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <img
              src={generated}
              alt="QR"
              style={{ width: size, height: size, display: 'block', borderRadius: 4 }}
            />
          </div>

          <button
            onClick={() => {
              const a = document.createElement('a')
              a.href = generated
              a.download = `qr-${selected.entity_type}-${selected.entity_id}.png`
              a.click()
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={18} /> Скачать PNG
          </button>
        </div>
      )}

      {savedList.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Сохранённые QR-коды</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={savedList.length > 0 && selectedIds.size === savedList.length}
                onChange={toggleSelectAll}
                style={{ width: 18, height: 18 }}
              />
              <span>Выбрать все</span>
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 8,
                  cursor: deleting ? 'wait' : 'pointer',
                  fontSize: 14,
                }}
              >
                <Trash2 size={16} /> Удалить ({selectedIds.size})
              </button>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {savedList.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(q.id)) next.delete(q.id)
                        else next.add(q.id)
                        return next
                      })
                    }}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{q.name}</span>
                </label>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(q.created_at).toLocaleDateString('ru')}
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <a
                    href={q.qr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                    }}
                  >
                    Открыть
                  </a>
                  <a
                    href={q.download_url}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                    }}
                    onClick={async (e) => {
                      e.preventDefault()
                      const token = localStorage.getItem('access_token')
                      if (!token) return
                      const r = await fetch(q.download_url, { headers: { Authorization: `Bearer ${token}` } })
                      const blob = await r.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `qr-${q.entity_type}-${q.entity_id}.png`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download size={14} /> Скачать
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {icon}
        {title}
      </div>
      <div style={{ paddingLeft: 24 }}>{children}</div>
    </div>
  )
}

function EntityRow({
  entity_type,
  entity_id,
  name,
  code,
  onSelect,
}: {
  entity_type: string
  entity_id: number
  name: string
  code?: string
  onSelect: (item: EntityItem) => void
}) {
  return (
    <button
      onClick={() => onSelect({ entity_type, entity_id, name, code })}
      style={{
        display: 'block',
        width: '100%',
        padding: '10px 14px',
        textAlign: 'left',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid transparent',
        borderRadius: 8,
        color: 'var(--text)',
        cursor: 'pointer',
        marginBottom: 4,
      }}
    >
      {name}
      {code ? <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}> — {code}</span> : null}
    </button>
  )
}

function CategoryNode({
  category,
  onSelect,
}: {
  category: TreeNode
  onSelect: (item: EntityItem) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <button
          onClick={() => onSelect({ entity_type: 'category', entity_id: category.id, name: category.name })}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <Folder size={18} />
          {category.name}
        </button>
      </div>
      {open && (
        <div style={{ paddingLeft: 24, marginTop: 8 }}>
          {category.subcategories?.map((sub) => (
            <SubCategoryNode key={sub.id} subcategory={sub} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubCategoryNode({
  subcategory,
  onSelect,
}: {
  subcategory: { id: number; name: string; nomenclature: { id: number; code: string; name: string }[] }
  onSelect: (item: EntityItem) => void
}) {
  const [open, setOpen] = useState(false)
  const isVirtual = subcategory.id < 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {isVirtual ? (
          <div style={{ flex: 1, padding: '8px 12px', fontSize: 14, color: 'var(--text-secondary)' }}>{subcategory.name}</div>
        ) : (
          <button
            onClick={() => onSelect({ entity_type: 'subcategory', entity_id: subcategory.id, name: subcategory.name })}
            style={{
              flex: 1,
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {subcategory.name}
          </button>
        )}
      </div>
      {open && (
        <div style={{ paddingLeft: 24, marginTop: 4 }}>
          {subcategory.nomenclature?.map((n) => (
            <EntityRow
              key={n.id}
              entity_type="nomenclature"
              entity_id={n.id}
              name={n.name}
              code={n.code || undefined}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
