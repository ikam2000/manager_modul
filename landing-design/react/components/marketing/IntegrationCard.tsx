import { ReactNode } from 'react'

const cardStyle: React.CSSProperties = {
  padding: 24,
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
  height: '100%',
}

const nameStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 8,
  color: '#1e293b',
}

const descStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: '#64748b',
}

interface IntegrationCardProps {
  logo?: ReactNode
  name: string
  description: string
}

export function IntegrationCard({ logo, name, description }: IntegrationCardProps) {
  return (
    <div className="mk-integration-card" style={cardStyle}>
      {logo && <div style={{ marginBottom: 12 }}>{logo}</div>}
      <h3 style={nameStyle}>{name}</h3>
      <p style={descStyle}>{description}</p>
    </div>
  )
}
