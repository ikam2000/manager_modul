const cardStyle: React.CSSProperties = {
  padding: 24,
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
  height: '100%',
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#0ea5e9',
  marginBottom: 8,
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

interface SecurityCardProps {
  kicker?: string
  title: string
  description: string
}

export function SecurityCard({ kicker, title, description }: SecurityCardProps) {
  return (
    <div className="mk-security-card" style={cardStyle}>
      {kicker && <div style={kickerStyle}>{kicker}</div>}
      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>
    </div>
  )
}
