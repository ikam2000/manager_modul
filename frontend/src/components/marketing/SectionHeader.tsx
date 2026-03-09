import { ReactNode } from 'react'

const wrapStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 64,
  maxWidth: 640,
  margin: '0 auto 64px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
  marginBottom: 12,
}

const titleStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  marginBottom: 16,
  color: 'var(--text)',
}

const descStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
}

interface SectionHeaderProps {
  label?: string
  title: string
  description?: ReactNode
  /** @deprecated Use description */
  subtitle?: ReactNode
}

export function SectionHeader({ label, title, description, subtitle }: SectionHeaderProps) {
  const desc = description ?? subtitle
  return (
    <div style={wrapStyle}>
      {label && <div style={labelStyle}>{label}</div>}
      <h2 style={titleStyle}>{title}</h2>
      {desc && <p style={descStyle}>{desc}</p>}
    </div>
  )
}
