/* Data flow: ERP/Excel/Marketplace → IKAMDOCS (Catalog/Suppliers/Docs) → API/Analytics */
const sources = ['ERP / Excel', 'Marketplace', 'Supplier APIs']
const core = ['Catalog', 'Suppliers', 'Docs', 'Supplies', 'QR', 'Mapping']
const outputs = ['API', 'Analytics', 'Exports']

interface ArchitectureDiagramProps {
  compact?: boolean
}

export function ArchitectureDiagram({ compact }: ArchitectureDiagramProps) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: compact ? 10 : 16,
    flexWrap: 'wrap',
  }
  const boxStyle: React.CSSProperties = {
    padding: compact ? '10px 14px' : '14px 20px',
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    fontSize: compact ? 12 : 14,
    fontWeight: 700,
    color: '#0f172a',
    boxShadow: '0 6px 16px rgba(15,23,42,0.05)',
  }
  const coreStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: compact ? 560 : 760,
    padding: compact ? '20px 18px' : '28px 24px',
    background: 'linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%)',
    borderRadius: 18,
    border: '1px solid rgba(14,165,233,0.22)',
    color: '#0f172a',
    textAlign: 'center',
    boxShadow: '0 12px 30px rgba(14,165,233,0.08)',
  }
  const arrowStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: compact ? 18 : 24,
    fontWeight: 700,
    padding: compact ? '4px 0' : '8px 0',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16, alignItems: 'center' }}>
      <div style={rowStyle}>{sources.map((s) => <div key={s} style={boxStyle}>{s}</div>)}</div>
      <div style={arrowStyle}>↓</div>
      <div style={coreStyle}>
        <div style={{ marginBottom: 14, fontSize: compact ? 16 : 20, fontWeight: 800, letterSpacing: '-0.02em' }}>IKAMDOCS</div>
        <div style={{ fontSize: compact ? 12 : 14, lineHeight: 1.65, color: '#475569', maxWidth: 620, margin: '0 auto 16px' }}>
          Catalog / Suppliers / Docs — единый слой данных для номенклатуры, поставщиков, документов, поставок и QR-маркировки.
        </div>
        <div style={rowStyle}>{core.map((c) => <div key={c} style={{ ...boxStyle, background: '#fff' }}>{c}</div>)}</div>
      </div>
      <div style={arrowStyle}>↓</div>
      <div style={rowStyle}>{outputs.map((o) => <div key={o} style={boxStyle}>{o}</div>)}</div>
    </div>
  )
}
