const cardStyle: React.CSSProperties = {
  padding: 24,
  height: '100%',
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#79a8ff',
  marginBottom: 8,
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
