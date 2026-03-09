import { ReactNode } from 'react'
import { Container } from './Container'
import { useTheme } from '../../contexts/ThemeContext'

const sectionStyle: React.CSSProperties = {
  padding: '120px 0',
}

interface SectionProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  background?: 'default' | 'light' | 'dark'
}

const bgMapNight = {
  default: {
    background: 'linear-gradient(180deg, rgba(12,18,36,0.5) 0%, var(--bg) 50%, rgba(6,8,22,0.98) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
  },
  light: {
    background: 'linear-gradient(180deg, rgba(17,26,49,0.6) 0%, rgba(12,18,36,0.75) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  dark: { background: '#0f172a', color: '#f1f5f9' },
}

const bgMapDay = {
  default: {
    background: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 50%, #f8fafc 100%)',
    boxShadow: 'none',
  },
  light: {
    background: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 100%)',
    boxShadow: 'none',
  },
  dark: { background: '#1e293b', color: '#f1f5f9' },
}

export function Section({ children, className, style, background = 'default' }: SectionProps) {
  const { theme } = useTheme()
  const bgMap = theme === 'day' ? bgMapDay : bgMapNight
  return (
    <section
      className={`mk-section ${className ?? ''}`}
      style={{ ...sectionStyle, ...bgMap[background], ...style }}
    >
      <Container>{children}</Container>
    </section>
  )
}
