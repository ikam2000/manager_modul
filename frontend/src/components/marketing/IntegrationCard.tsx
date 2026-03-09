import { ReactNode } from 'react'

const cardStyle: React.CSSProperties = {
  padding: 24,
  height: '100%',
}

const nameStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 8,
  color: 'var(--text)',
}

const descStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: 'var(--text-secondary)',
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
