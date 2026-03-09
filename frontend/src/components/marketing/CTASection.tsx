import { Link } from 'react-router-dom'
import { Container } from './Container'
import { useTheme } from '../../contexts/ThemeContext'
import { formHref } from '../../shared/formHref'

const sectionStyle: React.CSSProperties = {
  padding: '120px 0',
  textAlign: 'center',
  background: 'var(--bg)',
}

const titleStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  marginBottom: 16,
  color: 'var(--text)',
}

const subStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
  marginBottom: 40,
}

const btnWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
}

function isExternalOrHtml(href: string) {
  return href.startsWith('http') || href.includes('.html')
}

interface CTASectionProps {
  title: string
  subtitle?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export function CTASection({
  title,
  subtitle,
  primaryLabel = 'Запросить демо',
  primaryHref = '/request-demo.html',
  secondaryLabel = 'Попробовать',
  secondaryHref = '/register',
}: CTASectionProps) {
  const { theme } = useTheme()
  const primary = formHref(primaryHref, theme)
  const secondary = isExternalOrHtml(secondaryHref) ? formHref(secondaryHref, theme) : secondaryHref
  return (
    <section className="mk-cta-section" style={sectionStyle}>
      <Container>
        <h2 style={titleStyle}>{title}</h2>
        {subtitle && <p style={subStyle}>{subtitle}</p>}
        <div style={btnWrapStyle}>
          <a href={primary} className="btn-mk-primary">{primaryLabel}</a>
          {isExternalOrHtml(secondaryHref) ? (
            <a href={secondary} className="btn-mk-secondary">{secondaryLabel}</a>
          ) : (
            <Link to={secondary} className="btn-mk-secondary">{secondaryLabel}</Link>
          )}
        </div>
      </Container>
    </section>
  )
}
