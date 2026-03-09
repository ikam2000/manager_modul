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

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 8,
  color: '#1e293b',
}

const descStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: '#64748b',
}

interface FeatureCardProps {
  icon?: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className="mk-feature-card"
      style={cardStyle}
    >
      {icon && <div style={{ marginBottom: 16 }}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>
    </div>
  )
}
