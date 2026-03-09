import { ReactNode } from 'react'

const cardStyle: React.CSSProperties = {
  padding: 24,
  height: '100%',
}

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 8,
  color: 'var(--text)',
}

const descStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
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
