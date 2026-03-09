import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Bell, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useCabinetMobile } from '../contexts/CabinetMobileContext'

type NotificationItem = { id: number; title: string; body: string; created_at: string; read: boolean }

export default function CabinetHeader() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    if (notifOpen) {
      setNotifLoading(true)
      const token = localStorage.getItem('access_token')
      if (!token) {
        setNotifLoading(false)
        return
      }
      fetch('/api/cabinet/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setNotifications(d.items || []))
        .catch(() => setNotifications([]))
        .finally(() => setNotifLoading(false))
    }
  }, [notifOpen])

  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)
  const initials = user?.full_name
    ? user.full_name
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const avatarBlobRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user?.avatar_url || user.avatar_url.startsWith('blob:')) {
      setAvatarBlobUrl(null)
      return
    }
    const token = localStorage.getItem('access_token')
    if (!token) return
    let cancelled = false
    fetch(user.avatar_url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return
        if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current)
        const url = URL.createObjectURL(blob)
        avatarBlobRef.current = url
        setAvatarBlobUrl(url)
      })
      .catch(() => !cancelled && setAvatarBlobUrl(null))
    return () => {
      cancelled = true
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current)
        avatarBlobRef.current = null
      }
    }
  }, [user?.avatar_url])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'trader'
  const unreadCount = notifications.filter((n) => !n.read).length
  const mobile = useCabinetMobile()

  return (
    <header
      className="cabinet-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(10px)',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        padding: '0 16px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="cabinet-header-burger"
          onClick={() => mobile?.setSidebarOpen(true)}
          aria-label="Меню"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            padding: 0,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <Menu size={22} />
        </button>
        <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }} title="На главную">
          <img src={theme === 'night' ? '/images/logo.png' : '/images/logo_white.png'} alt="ikamdocs" height={32} style={{ display: 'block', objectFit: 'contain' }} />
        </a>
      </div>
      <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="cabinet-header-nav" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link
          to="/cabinet"
          style={{
            color: location.pathname === '/cabinet' ? 'var(--text)' : 'var(--text-secondary)',
            fontSize: 14,
            padding: '8px 12px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Главная
        </Link>
        <Link
          to="/cabinet/settings"
          style={{
            color: location.pathname.startsWith('/cabinet/settings') ? 'var(--text)' : 'var(--text-secondary)',
            fontSize: 14,
            padding: '8px 12px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Настройки
        </Link>
        {!location.pathname.startsWith('/cabinet/trader') && (user?.role !== 'trader' && user?.company_type !== 'trader') && (
        <Link
          to="/cabinet/qr-create"
          style={{
            color: location.pathname.startsWith('/cabinet/qr-create') ? 'var(--text)' : 'var(--text-secondary)',
            fontSize: 14,
            padding: '8px 12px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Создать QR
        </Link>
        )}
        {isAdmin && (
          <Link
            to="/cabinet/users"
            style={{
              color: location.pathname.startsWith('/cabinet/users') ? 'var(--text)' : 'var(--text-secondary)',
              fontSize: 14,
              padding: '8px 12px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Пользователи
          </Link>
        )}
        </div>
        {/* Переключатель темы */}
        <button
          onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
          title={theme === 'night' ? 'Дневная тема' : 'Ночная тема'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            padding: 0,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {theme === 'night' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {/* Уведомления */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              padding: 0,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Уведомления"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'var(--error)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 360,
                maxHeight: 400,
                overflow: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow)',
                zIndex: 30,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>Уведомления</span>
                <Link
                  to="/cabinet/notifications"
                  onClick={() => setNotifOpen(false)}
                  style={{
                    fontSize: 13,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  Все уведомления →
                </Link>
              </div>
              <div style={{ maxHeight: 320, overflow: 'auto' }}>
                {notifLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Загрузка...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Нет уведомлений
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <Link
                      key={n.id}
                      to="/cabinet/notifications"
                      onClick={() => setNotifOpen(false)}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: n.read ? 'transparent' : 'var(--accent-muted)',
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{n.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{n.body}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{n.created_at}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div ref={ref} style={{ position: 'relative', marginLeft: 8 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 40,
              gap: 8,
              padding: '0 10px',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: avatarBlobUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {avatarBlobUrl ? (
                <img src={avatarBlobUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <span className="cabinet-header-user-name" style={{ fontSize: 12, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email}
            </span>
          </button>
          {open && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                minWidth: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 8,
                boxShadow: 'var(--shadow)',
              }}
            >
              <Link
                to="/cabinet/settings"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
                onClick={() => setOpen(false)}
              >
                Профиль
              </Link>
              <a
                href="/"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
                onClick={() => setOpen(false)}
              >
                На сайт
              </a>
              <button
                onClick={() => {
                  logout()
                  setOpen(false)
                  window.location.href = '/'
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--error)',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
