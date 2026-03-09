import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'ikamdocs_cookie_notice_seen'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
      setVisible(true)
    } catch {
      setVisible(false)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="complementary"
      aria-label="Уведомление о cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '14px 20px',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(6,8,22,0.98) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 14, color: 'rgba(241,245,249,0.85)', textAlign: 'center' }}>
        Этот веб-сайт использует файлы cookie.{' '}
        <Link to="/privacy#cookies" style={{ color: '#79a8ff', fontWeight: 600 }} onClick={accept}>
          Подробнее
        </Link>
      </span>
      <button
        type="button"
        onClick={accept}
        className="btn-mk-primary"
        style={{ padding: '8px 20px', fontSize: 14 }}
      >
        Принять
      </button>
    </div>
  )
}
