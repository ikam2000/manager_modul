import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  category: 'Категория',
  subcategory: 'Подкатегория',
  supplier: 'Поставщик',
  manufacturer: 'Производитель',
  nomenclature: 'Номенклатура',
  supply: 'Поставка',
  contract: 'Договор',
  contract_appendix: 'Приложение к договору',
}

export default function QREntityPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !id) return
    fetch(`/qr/entity/${type}/${id}`, { headers: { Accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('Не найдено')
        return r.text()
      })
      .then((text) => {
        try {
          return JSON.parse(text)
        } catch {
          throw new Error('Ошибка данных')
        }
      })
      .then(setData)
      .catch(() => setError('Сущность не найдена'))
  }, [type, id])

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center', minHeight: '50vh' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Не найдено</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 48, textAlign: 'center', minHeight: '50vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      </div>
    )
  }

  const { entity_type, entity_id, data: entityData, related, documents } = data
  const docUrl = (doc: { id: number; entity_type?: string; entity_id?: number }) =>
    `/documents/public/${doc.id}?entity_type=${doc.entity_type ?? entity_type}&entity_id=${doc.entity_id ?? entity_id}`

  const fields = Object.entries(entityData || {}).filter(
    ([k, v]) => !['id', 'company_id', 'is_deleted', 'created_at', 'updated_at'].includes(k) && v != null && v !== ''
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: '0.9375rem',
        }}
      >
        <ArrowLeft size={18} /> Назад
      </button>
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {TYPE_LABELS[entity_type] || entity_type}
          </span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20 }}>
          {entityData?.name || entityData?.number || entityData?.code || `#${entity_id}`}
        </h1>
        <dl style={{ display: 'grid', gap: '12px 24px' }}>
          {fields.map(([key, value]) => (
            <span key={key} style={{ display: 'flex', gap: 8 }}>
              <dt style={{ color: 'var(--text-secondary)', minWidth: 160 }}>{key.replace(/_/g, ' ')}:</dt>
              <dd style={{ margin: 0 }}>{String(value)}</dd>
            </span>
          ))}
        </dl>

        {/* Подкатегории и номенклатура для категории */}
        {entity_type === 'category' && related?.subcategories?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Подкатегории</h3>
            {related.subcategories.map((sub: any) => (
              <div key={sub.id} style={{ marginBottom: 12 }}>
                <a
                  href={`/scan/entity/subcategory/${sub.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 16px',
                    background: 'rgba(14,165,233,0.12)',
                    borderRadius: 10,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    marginBottom: 8,
                  }}
                >
                  {sub.name}
                </a>
                {sub.nomenclature?.length > 0 && (
                  <div style={{ paddingLeft: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {sub.nomenclature.map((n: any) => (
                      <a
                        key={n.id}
                        href={`/scan/entity/nomenclature/${n.id}`}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 6,
                          color: 'var(--text)',
                          textDecoration: 'none',
                          fontSize: 14,
                        }}
                      >
                        {n.name}
                        {n.code ? ` (${n.code})` : ''}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Номенклатура для подкатегории */}
        {entity_type === 'subcategory' && related?.nomenclature?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Номенклатура</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {related.nomenclature.map((n: any) => (
                <a
                  key={n.id}
                  href={`/scan/entity/nomenclature/${n.id}`}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(14,165,233,0.12)',
                    borderRadius: 10,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {n.name}
                  {n.code ? ` (${n.code})` : ''}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Связанные сущности для поставки: номенклатура, поставщик */}
        {entity_type === 'supply' && related && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Связанные сущности</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {related.nomenclature && (
                <a
                  href={`/scan/entity/nomenclature/${related.nomenclature.id}`}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(14,165,233,0.12)',
                    borderRadius: 12,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}
                >
                  Номенклатура: {related.nomenclature.name}
                  {related.nomenclature.code && ` (${related.nomenclature.code})`}
                </a>
              )}
              {related.supplier && (
                <a
                  href={`/scan/entity/supplier/${related.supplier.id}`}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(14,165,233,0.12)',
                    borderRadius: 12,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}
                >
                  Поставщик: {related.supplier.name}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Поставки для номенклатуры */}
        {entity_type === 'nomenclature' && related?.supplies?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Поставки</h3>
            {related.supplies.map((s: any) => (
              <div
                key={s.id}
                style={{
                  padding: 16,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  marginBottom: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <strong>Поставка #{s.id}</strong> — кол-во: {s.quantity}
                <br />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Дата изготовления: {s.production_date || '—'} | Поверка: {s.calibration_date || '—'}
                </span>
                {s.supplier && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.9375rem' }}>
                    <strong>Поставщик:</strong>{' '}
                    <a href={`/scan/entity/supplier/${s.supplier.id}`} style={{ color: 'var(--accent)' }}>
                      {s.supplier.name}
                    </a>
                    {s.supplier.phone && ` (${s.supplier.phone})`}
                  </p>
                )}
                {s.contract && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.9375rem' }}>
                    <strong>Договор:</strong>{' '}
                    <a href={`/scan/entity/contract/${s.contract.id}`} style={{ color: 'var(--accent)' }}>
                      {s.contract.number || '№' + s.contract.id}
                    </a>
                    {s.contract.date_start && ` (${s.contract.date_start} — ${s.contract.date_end || '...'})`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Связанные (производитель и т.п.; category/subcategory/supply — уже показаны выше) */}
        {related && (() => {
          const skipKeys = ['supplies']
          if (entity_type === 'supply') skipKeys.push('nomenclature', 'supplier')
          if (entity_type === 'category') skipKeys.push('subcategories')
          if (entity_type === 'subcategory') skipKeys.push('nomenclature')
          const links = Object.entries(related)
            .filter(([k]) => !skipKeys.includes(k))
            .filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v) && (v as any).id)
          if (links.length === 0) return null
          return (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: 8 }}>Связанные</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {links.map(([relType, rel]: [string, any]) => (
                  <a
                    key={relType}
                    href={`/scan/entity/${relType}/${rel.id}`}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(14,165,233,0.15)',
                      borderRadius: 8,
                      color: 'var(--accent)',
                      fontSize: '0.9375rem',
                    }}
                  >
                    {rel.name || rel.code || rel.number || relType}
                  </a>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Документы с иконкой скачать */}
      {documents && documents.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} />
            Сопроводительная документация
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map((doc: any) => (
              <li key={doc.id}>
                <a
                  href={docUrl(doc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    color: 'var(--text)',
                    textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}
                >
                  <FileText size={20} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{doc.filename}</span>
                  <span title="Скачать / Просмотр"><Download size={18} style={{ color: 'var(--accent)' }} /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
