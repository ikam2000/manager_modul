import { Link } from 'react-router-dom'
import { SITE, FOOTER_LINKS } from '../shared/siteConfig'
import { useTheme } from '../contexts/ThemeContext'

const FOOTER_TEXT = {
  night: { heading: 'rgba(241,245,249,0.88)', body: 'rgba(241,245,249,0.55)', border: 'rgba(255,255,255,0.06)', bg: 'linear-gradient(180deg, rgba(12,18,36,0.6) 0%, var(--bg-secondary) 100%)', shadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' },
  day: { heading: '#0f172a', body: '#475569', border: 'rgba(0,0,0,0.08)', bg: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 100%)', shadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' },
}

export default function Footer() {
  const { theme } = useTheme()
  const t = FOOTER_TEXT[theme]
  return (
    <footer
      className="site-footer"
      style={{
        padding: '56px 0',
        background: t.bg,
        borderTop: `1px solid ${t.border}`,
        boxShadow: t.shadow,
      }}
    >
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" style={{ display: 'inline-block' }}>
              <img src={theme === 'day' ? '/images/logo_white.png' : '/images/logo.png'} alt="ikamdocs" height={36} style={{ display: 'block' }} />
            </Link>
            <p style={{ marginTop: 10, color: t.body, fontSize: 14 }}>
              {SITE.tagline}
            </p>
          </div>
          <div>
            <h4 style={{ fontWeight: 650, marginBottom: 12, color: t.heading }}>Продукт</h4>
            {FOOTER_LINKS.product.map(({ href, label }) => (
              <a key={label} href={href} style={{ display: 'block', marginBottom: 10, color: t.body, fontSize: 14 }}>
                {label}
              </a>
            ))}
          </div>
          <div>
            <h4 style={{ fontWeight: 650, marginBottom: 12, color: t.heading }}>Компания</h4>
            {FOOTER_LINKS.company.map(({ href, label }) => (
              <a key={label} href={href} style={{ display: 'block', marginBottom: 10, color: t.body, fontSize: 14 }} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener' : undefined}>
                {label}
              </a>
            ))}
          </div>
          <div>
            <h4 style={{ fontWeight: 650, marginBottom: 12, color: t.heading }}>Правовая информация</h4>
            {FOOTER_LINKS.legal.map(({ href, label }) => (
              <Link key={label} to={href} style={{ display: 'block', marginBottom: 10, color: t.body, fontSize: 14 }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <p
          role="contentinfo"
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: `1px solid ${t.border}`,
            color: t.body,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          © 2026 ikamdocs. Все права защищены.
        </p>
      </div>
    </footer>
  )
}
