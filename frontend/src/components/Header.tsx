import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, LogIn, Sun, Moon } from 'lucide-react'
import { NAV_LINKS } from '../shared/siteConfig'
import { useTheme } from '../contexts/ThemeContext'
import { formHref } from '../shared/formHref'

const linkStyle = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  fontWeight: 500,
  padding: '10px',
  borderRadius: 10,
  textDecoration: 'none' as const,
}

export default function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const isLoginPage = location.pathname === '/login'
  const navLinks = isLoginPage ? NAV_LINKS.filter((l) => l.href !== '/login') : NAV_LINKS

  return (
    <header
      className="site-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(10px)',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        padding: '0 20px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }} title="На главную">
        <img src={theme === 'day' ? '/images/logo_white.png' : '/images/logo.png'} alt="ikamdocs" height={36} style={{ display: 'block', objectFit: 'contain' }} />
      </a>
      <nav className="site-header-nav" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {navLinks.map(({ href, label }) => {
          const isInternal = href.startsWith('/') && !href.startsWith('//') && !href.endsWith('.html')
          const isLogin = href === '/login'
          const content = isLogin ? <LogIn size={20} aria-hidden /> : label
          return isInternal ? (
            <Link key={label} to={href} style={{ ...linkStyle, ...(isLogin ? { color: '#79a8ff', fontWeight: 600, padding: '10px' } : {}) }} onClick={() => setMobileOpen(false)} title={isLogin ? 'Войти' : undefined}>
              {content}
            </Link>
          ) : (
            <a key={label} href={href} style={linkStyle} onClick={() => setMobileOpen(false)}>
              {label}
            </a>
          )
        })}
        <button
          type="button"
          onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
          aria-label={theme === 'night' ? 'Включить дневную тему' : 'Включить ночную тему'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer' }}
        >
          {theme === 'night' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <a href={formHref('/request-demo.html', theme)} className="btn btn-primary" onClick={() => setMobileOpen(false)}>
          Запросить демо
        </a>
      </nav>
      <button
        className="site-header-burger"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Меню"
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          padding: 0,
          background: 'var(--surface-hover)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && (
        <div
          className="site-header-mobile-menu"
          style={{
            position: 'fixed',
            inset: 0,
            top: 64,
            zIndex: 19,
            background: 'var(--bg)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            borderTop: '1px solid var(--border)',
            minHeight: 'calc(100vh - 64px)',
            height: 'calc(100dvh - 64px)',
            overflowY: 'auto',
          }}
        >
          {navLinks.map(({ href, label }) => {
            const isInternal = href.startsWith('/') && !href.startsWith('//') && !href.endsWith('.html')
            const isLogin = href === '/login'
            const content = isLogin ? <LogIn size={20} aria-hidden /> : label
            const style = { ...linkStyle, padding: '14px 16px', fontSize: 16, display: 'block' }
            return isInternal ? (
              <Link key={label} to={href} style={{ ...style, ...(isLogin ? { color: '#79a8ff', fontWeight: 600 } : {}) }} onClick={() => setMobileOpen(false)} title={isLogin ? 'Войти' : undefined}>
                {content}
              </Link>
            ) : (
              <a key={label} href={href} style={style} onClick={() => setMobileOpen(false)}>
                {label}
              </a>
            )
          })}
          <button
            type="button"
            onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
            aria-label={theme === 'night' ? 'Включить дневную тему' : 'Включить ночную тему'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer', marginTop: 8 }}
          >
            {theme === 'night' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <a href={formHref('/request-demo.html', theme)} className="btn btn-primary" style={{ padding: '14px 20px', marginTop: 8 }} onClick={() => setMobileOpen(false)}>
            Запросить демо
          </a>
        </div>
      )}
    </header>
  )
}
