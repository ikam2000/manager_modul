import { useState, useEffect, useRef } from 'react'
import { ChevronRight, ChevronDown, Folder, Printer } from 'lucide-react'
import QRCodeStyling from 'qr-code-styling'

type NomItem = {
  entity_type: 'nomenclature'
  entity_id: number
  name: string
  code?: string
}

type TreeNode = {
  id: number
  name: string
  subcategories?: { id: number; name: string; nomenclature: { id: number; code: string; name: string }[] }[]
}

type LabelDataItem = {
  nomenclature_id: number
  product_name: string
  product_code: string
  object_code: string
  supplier_name: string
  contact_phone: string
  contract_number: string | null
  contract_date: string | null
  specification_number: string
  specification_date: string | null
  production_date: string | null
}

const GAP_MM = 2

const PAPER_PRESETS = [
  { id: 'A4', label: 'A4 (210×297 мм)', mmW: 210, mmH: 297, cols: 2, rows: 4 },
  { id: 'A5', label: 'A5 (148×210 мм)', mmW: 148, mmH: 210, cols: 2, rows: 3 },
  { id: 'A6', label: 'A6 (105×148 мм)', mmW: 105, mmH: 148, cols: 1, rows: 2 },
  { id: '100x50', label: '100×50 мм', mmW: 100, mmH: 50, cols: 1, rows: 1 },
  { id: '50x30', label: '50×30 мм', mmW: 50, mmH: 30, cols: 1, rows: 1 },
  { id: 'custom_sheet', label: 'Кастомный лист', mmW: 210, mmH: 297, cols: 2, rows: 4 },
  { id: 'custom_label', label: 'Кастомная наклейка', mmW: 210, mmH: 297, cols: 2, rows: 4 },
] as const

type PaperConfig = { mmW: number; mmH: number; cols: number; rows: number }

const LABEL_FIELDS = [
  { key: 'product_name', label: 'Наименование изделия' },
  { key: 'supplier_name', label: 'Наименование поставщика' },
  { key: 'contact_phone', label: 'Контактная информация (+7…)' },
  { key: 'product_code', label: 'Код изделия' },
  { key: 'object_code', label: 'Код объекта' },
  { key: 'contract', label: 'Номер и дата договора' },
  { key: 'specification', label: 'Номер и дата спецификации' },
  { key: 'production_date', label: 'Дата изготовления (дд.мм.гггг)' },
  { key: 'qr_code', label: 'QR-код + код под ним' },
] as const

function buildQrUrl(nomId: number) {
  return `${window.location.origin}/scan/entity/nomenclature/${nomId}`
}

function CategoryNode({
  category,
  selectedIds,
  onAddNomenclature,
  onToggleNom,
}: {
  category: TreeNode
  selectedIds: Set<number>
  onAddNomenclature: (items: NomItem[]) => void
  onToggleNom: (item: NomItem) => void
}) {
  const [open, setOpen] = useState(false)
  const allNoms: NomItem[] = []
  for (const sub of category.subcategories || []) {
    for (const n of sub.nomenclature || []) {
      allNoms.push({
        entity_type: 'nomenclature',
        entity_id: n.id,
        name: n.name,
        code: n.code || undefined,
      })
    }
  }
  const allSelected = allNoms.length > 0 && allNoms.every((n) => selectedIds.has(n.entity_id))

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <button
          type="button"
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
          type="button"
          onClick={() => onAddNomenclature(allNoms)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            textAlign: 'left',
            background: allSelected ? 'rgba(14,165,233,0.12)' : 'transparent',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <Folder size={18} />
          {category.name}
          {allNoms.length > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({allNoms.length})</span>}
        </button>
      </div>
      {open && (
        <div style={{ paddingLeft: 24, marginTop: 8 }}>
          {(category.subcategories || []).map((sub) => (
            <SubCategoryNode
              key={sub.id}
              subcategory={sub}
              selectedIds={selectedIds}
              onAddNomenclature={onAddNomenclature}
              onToggleNom={onToggleNom}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubCategoryNode({
  subcategory,
  selectedIds,
  onAddNomenclature,
  onToggleNom,
}: {
  subcategory: { id: number; name: string; nomenclature: { id: number; code: string; name: string }[] }
  selectedIds: Set<number>
  onAddNomenclature: (items: NomItem[]) => void
  onToggleNom: (item: NomItem) => void
}) {
  const [open, setOpen] = useState(false)
  const isVirtual = subcategory.id < 0
  const noms: NomItem[] = (subcategory.nomenclature || []).map((n) => ({
    entity_type: 'nomenclature' as const,
    entity_id: n.id,
    name: n.name,
    code: n.code || undefined,
  }))
  const allSelected = noms.length > 0 && noms.every((n) => selectedIds.has(n.entity_id))

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <button
          type="button"
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
            type="button"
            onClick={() => onAddNomenclature(noms)}
            style={{
              flex: 1,
              padding: '8px 12px',
              textAlign: 'left',
              background: allSelected ? 'rgba(14,165,233,0.12)' : 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {subcategory.name}
            {noms.length > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> ({noms.length})</span>}
          </button>
        )}
      </div>
      {open && (
        <div style={{ paddingLeft: 24, marginTop: 4 }}>
          {noms.map((n) => (
            <label
              key={n.entity_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: selectedIds.has(n.entity_id) ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedIds.has(n.entity_id) ? 'var(--accent)' : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 4,
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(n.entity_id)}
                onChange={() => onToggleNom(n)}
                style={{ width: 18, height: 18 }}
                onClick={(ev) => ev.stopPropagation()}
              />
              <span style={{ color: 'var(--text)', flex: 1 }}>
                {n.name}
                {n.code ? <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}> ({n.code})</span> : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function LabelPreview({
  data,
  qrSrc,
  qrSize,
  fields,
}: {
  data: LabelDataItem
  qrSrc?: string
  qrSize: number
  fields: Set<string>
}) {
  const esc = (s: string | null | undefined) => (s ? String(s).replace(/</g, '&lt;') : '—')
  const hasBase = fields.has('product_name') || fields.has('supplier_name')
  const hasExtra = [ 'contact_phone', 'product_code', 'object_code', 'contract', 'specification', 'production_date' ].some((k) => fields.has(k))
  const hasQr = fields.has('qr_code')

  return (
    <div
      style={{
        padding: 8,
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: '#fff',
        color: '#1e293b',
        fontSize: 9,
      }}
    >
      {hasBase && (
        <>
          {fields.has('product_name') && <div><b>Наим. изделия:</b> {esc(data.product_name)}</div>}
          {fields.has('supplier_name') && <div><b>Поставщик:</b> {esc(data.supplier_name)}</div>}
          {(hasExtra || hasQr) && <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />}
        </>
      )}
      {(hasExtra || hasQr) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {fields.has('contact_phone') && <div><b>Контакт:</b> <span style={{ color: '#0284c7' }}>{esc(data.contact_phone)}</span></div>}
            {fields.has('product_code') && <div><b>Код изделия:</b> {esc(data.product_code)}</div>}
            {fields.has('object_code') && <div><b>Код объекта:</b> {esc(data.object_code)}</div>}
            {fields.has('contract') && <div><b>Договор:</b> {esc(data.contract_number)} {data.contract_date ? `от ${data.contract_date}` : ''}</div>}
            {fields.has('specification') && <div><b>Спецификация:</b> {esc(data.specification_number)} {data.specification_date ? `от ${data.specification_date}` : ''}</div>}
            {fields.has('production_date') && <div><b>Дата изг.:</b> {esc(data.production_date)}</div>}
          </div>
          {hasQr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              {qrSrc ? <img src={qrSrc} alt="QR" width={qrSize} height={qrSize} style={{ display: 'block' }} /> : null}
              <div style={{ fontWeight: 600, marginTop: 2 }}>{esc(data.product_code)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CabinetQRPrint() {
  const [tree, setTree] = useState<{ categories: TreeNode[] } | null>(null)
  const [selected, setSelected] = useState<NomItem[]>([])
  const [labelData, setLabelData] = useState<LabelDataItem[]>([])
  const [fieldVisible, setFieldVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(LABEL_FIELDS.map((f) => [f.key, true]))
  )
  const [paperPreset, setPaperPreset] = useState<string>(PAPER_PRESETS[0].id)
  const [paperConfig, setPaperConfig] = useState<PaperConfig>({
    mmW: PAPER_PRESETS[0].mmW,
    mmH: PAPER_PRESETS[0].mmH,
    cols: PAPER_PRESETS[0].cols,
    rows: PAPER_PRESETS[0].rows,
  })
  const [qrSize, setQrSize] = useState(80)
  const [qrImages, setQrImages] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => setTree({ categories: d.categories || [] }))
      .catch(() => setTree({ categories: [] }))
  }, [])

  const selectedIds = new Set(selected.map((s) => s.entity_id))

  const addNomenclature = (items: NomItem[]) => {
    setSelected((prev) => {
      const prevIds = new Set(prev.map((p) => p.entity_id))
      const toAdd = items.filter((n) => !prevIds.has(n.entity_id))
      if (toAdd.length === 0) {
        const toRemove = new Set(items.map((n) => n.entity_id))
        return prev.filter((p) => !toRemove.has(p.entity_id))
      }
      return [...prev, ...toAdd]
    })
  }

  const toggleNom = (item: NomItem) => {
    if (selectedIds.has(item.entity_id)) {
      setSelected((prev) => prev.filter((p) => p.entity_id !== item.entity_id))
    } else {
      setSelected((prev) => [...prev, item])
    }
  }

  useEffect(() => {
    const ids = selected.map((s) => s.entity_id)
    if (ids.length === 0) {
      setLabelData([])
      return
    }
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch(`/api/cabinet/label-data?nomenclature_ids=${ids.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setLabelData(d.items || []))
      .catch(() => setLabelData([]))
  }, [selected])

  const generateQrPng = async (url: string, size: number): Promise<string> => {
    const qr = new QRCodeStyling({
      width: size,
      height: size,
      data: url,
      margin: 4,
      qrOptions: { errorCorrectionLevel: 'M' },
    })
    const blob = await qr.getRawData('png')
    if (!blob) return ''
    return new Promise((res) => {
      const reader = new FileReader()
      reader.onloadend = () => res(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  useEffect(() => {
    if (selected.length === 0) {
      setQrImages({})
      return
    }
    setGenerating(true)
    const load = async () => {
      const imgs: Record<number, string> = {}
      for (const item of selected) {
        imgs[item.entity_id] = await generateQrPng(buildQrUrl(item.entity_id), qrSize * 2)
      }
      setQrImages(imgs)
      setGenerating(false)
    }
    load()
  }, [selected, qrSize])

  const fieldsSet = new Set(Object.entries(fieldVisible).filter(([, v]) => v).map(([k]) => k))

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const paper = paperConfig
    const labelW = (paper.mmW - (paper.cols - 1) * GAP_MM) / paper.cols
    const labelH = (paper.mmH - (paper.rows - 1) * GAP_MM) / paper.rows

    const labelHtml = (d: LabelDataItem, src: string) => {
      const esc = (s: string | null | undefined) => (s ? String(s).replace(/</g, '&lt;') : '—')
      const hasBase = fieldsSet.has('product_name') || fieldsSet.has('supplier_name')
      const hasExtra = fieldsSet.has('contact_phone') || fieldsSet.has('product_code') || fieldsSet.has('object_code') || fieldsSet.has('contract') || fieldsSet.has('specification') || fieldsSet.has('production_date')
      const hasQr = fieldsSet.has('qr_code')

      let html = ''
      if (hasBase) {
        if (fieldsSet.has('product_name')) html += `<div><b>Наим. изделия:</b> ${esc(d.product_name)}</div>`
        if (fieldsSet.has('supplier_name')) html += `<div><b>Поставщик:</b> ${esc(d.supplier_name)}</div>`
        if (hasExtra || hasQr) html += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:2px 0"/>`
      }
      if (hasExtra || hasQr) {
        html += `<div style="display:flex;gap:3mm;align-items:flex-start;margin-top:1px">`
        html += `<div style="flex:1;min-width:0">`
        if (fieldsSet.has('contact_phone')) html += `<div><b>Контакт:</b> <span style="color:#0284c7">${esc(d.contact_phone)}</span></div>`
        if (fieldsSet.has('product_code')) html += `<div><b>Код изделия:</b> ${esc(d.product_code)}</div>`
        if (fieldsSet.has('object_code')) html += `<div><b>Код объекта:</b> ${esc(d.object_code)}</div>`
        if (fieldsSet.has('contract')) html += `<div><b>Договор:</b> ${esc(d.contract_number)} ${d.contract_date ? `от ${d.contract_date}` : ''}</div>`
        if (fieldsSet.has('specification')) html += `<div><b>Спецификация:</b> ${esc(d.specification_number)} ${d.specification_date ? `от ${d.specification_date}` : ''}</div>`
        if (fieldsSet.has('production_date')) html += `<div><b>Дата изг.:</b> ${esc(d.production_date)}</div>`
        html += `</div>`
        if (hasQr) html += `<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0"><img src="${src}" alt="QR" width="${qrSize}" height="${qrSize}"/><div style="font-weight:600;margin-top:2px">${esc(d.product_code)}</div></div>`
        html += `</div>`
      }
      return html
    }

    let body = ''
    const perPage = paper.cols * paper.rows
    for (let i = 0; i < labelData.length; i++) {
      if (i % perPage === 0) body += '<div class="page">'
      const d = labelData[i]
      const src = qrImages[d.nomenclature_id] || ''
      if (src) {
        body += `<div class="label">${labelHtml(d, src)}</div>`
      }
      if ((i + 1) % perPage === 0) body += '</div>'
    }
    if (labelData.length % perPage !== 0) body += '</div>'

    printWindow.document.write(`
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Печать этикеток</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,sans-serif;padding:5mm;background:#fff;font-size:9px}
@media print{body{padding:0;background:#fff}}
.page{width:${paper.mmW}mm;min-height:${paper.mmH}mm;display:grid;grid-template-columns:repeat(${paper.cols},1fr);grid-template-rows:repeat(${paper.rows},1fr);gap:${GAP_MM}mm;page-break-after:always}
.label{width:${labelW}mm;height:${labelH}mm;padding:3mm;background:#fff;color:#1e293b;overflow:hidden}
.label div{margin-bottom:1px}
</style>
</head><body>${body}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const pickerContent = tree?.categories?.map((cat) => (
    <CategoryNode
      key={cat.id}
      category={cat}
      selectedIds={selectedIds}
      onAddNomenclature={addNomenclature}
      onToggleNom={toggleNom}
    />
  ))

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Печать QR / Конструктор этикеток</h1>
          <p className="ds-lead">
            Выберите категорию или подкатегорию — этикетки создаются на номенклатуру. Настройте поля и отправьте на печать.
          </p>
        </div>
      </div>

      <div className="ds-grid ds-grid-2" style={{ gridTemplateColumns: 'minmax(280px, 360px) 1fr' }}>
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Выбор номенклатуры</div>
          </div>
          <div className="ds-cardBody" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {tree ? pickerContent : <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>}
          </div>
          <div className="ds-cardBody" style={{ paddingTop: 0 }}>
            <div className="ds-stack">
              <label className="ds-label">
                Размер листа / наклейки
                <select
                  className="ds-select"
                  value={paperPreset}
                  onChange={(e) => {
                    const id = e.target.value
                    setPaperPreset(id)
                    const p = PAPER_PRESETS.find((x) => x.id === id)
                    if (p && !id.startsWith('custom_')) setPaperConfig({ mmW: p.mmW, mmH: p.mmH, cols: p.cols, rows: p.rows })
                  }}
                >
                  {PAPER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
              {paperPreset === 'custom_sheet' && (
                <>
                  <label className="ds-label">
                    Ширина листа (мм)
                    <input
                      type="number"
                      className="ds-input"
                      value={paperConfig.mmW}
                      onChange={(e) => setPaperConfig((c) => ({ ...c, mmW: Math.max(50, parseInt(e.target.value, 10) || 210) }))}
                      min={50}
                    />
                  </label>
                  <label className="ds-label">
                    Высота листа (мм)
                    <input
                      type="number"
                      className="ds-input"
                      value={paperConfig.mmH}
                      onChange={(e) => setPaperConfig((c) => ({ ...c, mmH: Math.max(50, parseInt(e.target.value, 10) || 297) }))}
                      min={50}
                    />
                  </label>
                </>
              )}
              {paperPreset === 'custom_label' && (
                <>
                  <label className="ds-label">
                    Ширина наклейки (мм)
                    <input
                      type="number"
                      className="ds-input"
                      value={Math.round((paperConfig.mmW - (paperConfig.cols - 1) * GAP_MM) / paperConfig.cols)}
                      onChange={(e) => {
                        const w = Math.max(20, parseInt(e.target.value, 10) || 50)
                        setPaperConfig((c) => ({ ...c, mmW: c.cols * w + (c.cols - 1) * GAP_MM }))
                      }}
                      min={20}
                    />
                  </label>
                  <label className="ds-label">
                    Высота наклейки (мм)
                    <input
                      type="number"
                      className="ds-input"
                      value={Math.round((paperConfig.mmH - (paperConfig.rows - 1) * GAP_MM) / paperConfig.rows)}
                      onChange={(e) => {
                        const h = Math.max(20, parseInt(e.target.value, 10) || 50)
                        setPaperConfig((c) => ({ ...c, mmH: c.rows * h + (c.rows - 1) * GAP_MM }))
                      }}
                      min={20}
                    />
                  </label>
                </>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <label className="ds-label" style={{ flex: 1 }}>
                  Колонок на листе
                  <input
                    type="number"
                    className="ds-input"
                    value={paperConfig.cols}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                      setPaperConfig((c) => {
                        if (paperPreset === 'custom_label') {
                          const labelW = (c.mmW - (c.cols - 1) * GAP_MM) / c.cols
                          return { ...c, cols: v, mmW: v * labelW + (v - 1) * GAP_MM }
                        }
                        return { ...c, cols: v }
                      })
                    }}
                    min={1}
                  />
                </label>
                <label className="ds-label" style={{ flex: 1 }}>
                  Строк на листе
                  <input
                    type="number"
                    className="ds-input"
                    value={paperConfig.rows}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                      setPaperConfig((c) => {
                        if (paperPreset === 'custom_label') {
                          const labelH = (c.mmH - (c.rows - 1) * GAP_MM) / c.rows
                          return { ...c, rows: v, mmH: v * labelH + (v - 1) * GAP_MM }
                        }
                        return { ...c, rows: v }
                      })
                    }}
                    min={1}
                  />
                </label>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Размер наклейки: {Math.round((paperConfig.mmW - (paperConfig.cols - 1) * GAP_MM) / paperConfig.cols)}×{Math.round((paperConfig.mmH - (paperConfig.rows - 1) * GAP_MM) / paperConfig.rows)} мм
              </div>
              <label className="ds-label">
                Размер QR (px)
                <input
                  type="number"
                  className="ds-input"
                  value={qrSize}
                  onChange={(e) => setQrSize(Math.max(40, Math.min(120, parseInt(e.target.value, 10) || 80)))}
                  min={40}
                  max={120}
                />
              </label>
              <div className="ds-label">
                <span style={{ marginBottom: 8, display: 'block' }}>Поля на этикетке</span>
                {LABEL_FIELDS.map((f) => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={fieldVisible[f.key] ?? true}
                      onChange={(e) => setFieldVisible((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Предпросмотр</div>
          </div>
          <div className="ds-cardBody">
            {selected.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                Выберите категорию, подкатегорию или номенклатуру слева
              </p>
            ) : generating ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>Генерация QR…</p>
            ) : (
              <>
                <div
                  ref={printRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${paperConfig.cols}, 1fr)`,
                    gap: 8,
                    maxWidth: 500,
                  }}
                >
                  {labelData.map((d) => (
                    <LabelPreview
                      key={d.nomenclature_id}
                      data={d}
                      qrSrc={qrImages[d.nomenclature_id]}
                      qrSize={qrSize}
                      fields={fieldsSet}
                    />
                  ))}
                </div>
                <div className="ds-btnRow" style={{ marginTop: 20 }}>
                  <button type="button" className="btn-primary" onClick={handlePrint} disabled={selected.length === 0 || labelData.length === 0}>
                    <Printer size={18} style={{ marginRight: 8 }} />
                    Печать / PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
