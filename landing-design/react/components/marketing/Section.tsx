import { ReactNode } from 'react'
import { Container } from './Container'

const sectionStyle: React.CSSProperties = {
  padding: '120px 0',
}

interface SectionProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  background?: 'default' | 'light' | 'dark'
}

const bgMap = {
  default: { background: '#f8fafc' },
  light: { background: '#ffffff' },
  dark: { background: '#0f172a', color: '#f1f5f9' },
}

export function Section({ children, className, style, background = 'default' }: SectionProps) {
  return (
    <section
      className={`mk-section ${className ?? ''}`}
      style={{ ...sectionStyle, ...bgMap[background], ...style }}
    >
      <Container>{children}</Container>
    </section>
  )
}
