import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Package,
  Building2,
  FileText,
  BarChart3,
  QrCode,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Key,
  HelpCircle,
  Ticket,
  Lightbulb,
  X,
  Monitor,
} from 'lucide-react'
import { useFeatureFlags } from '../contexts/FeatureFlagsContext'
import { useCabinetMobile } from '../contexts/CabinetMobileContext'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  group?: 'main' | 'settings'
}

interface Props {
  isAdmin: boolean
  isSuperAdmin?: boolean
}

export default function CabinetSidebar({ isAdmin, isSuperAdmin }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { marketplace_oauth: mpOAuth } = useFeatureFlags()
  const mobile = useCabinetMobile()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isOverlay = isMobile && !!mobile

  useEffect(() => {
    if (isOverlay && mobile) mobile.setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  const workspaceNav: NavItem[] = [
    { to: '/cabinet', label: 'Панель управления', icon: <Home size={20} />, group: 'main' },
    { to: '/cabinet/entities', label: 'Каталог', icon: <Package size={20} />, group: 'main' },
    { to: '/cabinet/entities?tab=suppliers', label: 'Поставщики', icon: <Building2 size={20} />, group: 'main' },
    { to: '/cabinet/documents', label: 'Документы', icon: <FileText size={20} />, group: 'main' },
    { to: '/cabinet/qr', label: 'QR-слой', icon: <QrCode size={20} />, group: 'main' },
  ]

  const operationsNav: NavItem[] = [
    { to: mpOAuth ? '/cabinet/integrations?tab=oauth' : '/cabinet/integrations?tab=api', label: 'Интеграции', icon: <Key size={20} />, group: 'main' },
    { to: '/cabinet/integrations?tab=webhooks', label: 'Sync-политики', icon: <BarChart3 size={20} />, group: 'main' },
    { to: '/cabinet/audit-log', label: 'Журнал аудита', icon: <FileText size={20} />, group: 'main' },
    { to: '/cabinet/integrations?tab=api', label: 'Безопасность', icon: <Settings size={20} />, group: 'main' },
  ]

  const settingsNav: NavItem[] = [
    ...(isAdmin ? [{ to: '/cabinet/users', label: 'Управление пользователями', icon: <Users size={20} />, group: 'settings' as const }] : []),
    ...(isSuperAdmin ? [{ to: '/cabinet/sessions', label: 'Сессии авторизаций', icon: <Monitor size={20} />, group: 'settings' as const }] : []),
    { to: '/cabinet/settings', label: 'Профиль', icon: <Settings size={20} />, group: 'settings' },
  ]

  const helpItems = [
    { to: '/cabinet/help', label: 'Справка', icon: <HelpCircle size={18} /> },
    { to: '/cabinet/tickets', label: 'Тикеты', icon: <Ticket size={18} /> },
    { to: '/cabinet/suggestions', label: 'Идеи', icon: <Lightbulb size={18} /> },
  ]

  const width = collapsed ? 56 : 220
  const isOpen = mobile?.sidebarOpen ?? true

  const asideStyle: React.CSSProperties = isOverlay
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        height: '100vh',
        width: 280,
        maxWidth: '85vw',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        position: 'sticky',
        top: 56,
        alignSelf: 'flex-start',
        height: 'calc(100vh - 56px)',
        flexShrink: 0,
        width,
        minWidth: width,
        borderRight: '1px solid var(--border)',
        padding: collapsed ? '0.75rem 0.4rem' : '1rem 1rem',
        background: 'var(--bg-secondary)',
        transition: 'width 0.2s, padding 0.2s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }

  return (
    <>
      {isOverlay && isOpen && (
        <div
          className="cabinet-sidebar-backdrop"
          onClick={() => mobile?.setSidebarOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}
      <aside className="cabinet-sidebar" style={asideStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed && !isOverlay ? 'center' : 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        {(!collapsed || isOverlay) && <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Личный кабинет</span>}
        {isOverlay ? (
          <button
            onClick={() => mobile?.setSidebarOpen(false)}
            style={{
              padding: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              padding: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {!collapsed && <div className="cabinet-sidebar-group-title">Рабочее пространство</div>}
        {workspaceNav.map((item) => {
          const searchParams = new URLSearchParams(location.search)
          const tabParam = searchParams.get('tab')
          const itemTab = item.to.match(/tab=(\w+)/)?.[1]
          const itemPath = item.to.split('?')[0]
          let isActive: boolean
          if (location.pathname === '/cabinet/entities') {
            isActive = itemPath === '/cabinet/entities' && (itemTab ? tabParam === itemTab : (!tabParam || tabParam === 'nomenclature'))
          } else {
            isActive = location.pathname === itemPath || (itemPath !== '/cabinet' && location.pathname.startsWith(itemPath))
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={isActive ? 'cabinet-nav-active' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '8px' : '11px 12px',
                borderRadius: 14,
                color: isActive ? '#79a8ff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(121,168,255,0.11)' : 'transparent',
                border: isActive ? '1px solid rgba(121,168,255,0.16)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.875rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? item.label : undefined}
            >
              {!collapsed && <span className="cabinet-nav-dot" style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? '#53f3c3' : 'rgba(103,232,249,0.35)', boxShadow: isActive ? '0 0 0 3px rgba(83,243,195,0.25)' : 'none', flexShrink: 0 }} />}
              {item.icon}
              {!collapsed && item.label}
            </Link>
          )
        })}
        {!collapsed && <div className="cabinet-sidebar-group-title">Операции</div>}
        {operationsNav.map((item) => {
          const searchParams = new URLSearchParams(location.search)
          const tabParam = searchParams.get('tab')
          const itemTab = item.to.match(/tab=(\w+)/)?.[1]
          const itemPath = item.to.split('?')[0]
          let isActive: boolean
          if (location.pathname === '/cabinet/integrations') {
            isActive = itemPath === '/cabinet/integrations' && (itemTab ? tabParam === itemTab : (!tabParam || tabParam === 'oauth'))
          } else {
            isActive = location.pathname === itemPath || (itemPath !== '/cabinet' && location.pathname.startsWith(itemPath))
          }
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={isActive ? 'cabinet-nav-active' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '8px' : '11px 12px',
                borderRadius: 14,
                color: isActive ? '#79a8ff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(121,168,255,0.11)' : 'transparent',
                border: isActive ? '1px solid rgba(121,168,255,0.16)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.875rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? item.label : undefined}
            >
              {!collapsed && <span className="cabinet-nav-dot" style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? '#53f3c3' : 'rgba(103,232,249,0.35)', boxShadow: isActive ? '0 0 0 3px rgba(83,243,195,0.25)' : 'none', flexShrink: 0 }} />}
              {item.icon}
              {!collapsed && item.label}
            </Link>
          )
        })}
        {!collapsed && settingsNav.length > 0 && <div className="cabinet-sidebar-group-title">Настройки</div>}
        {settingsNav.length > 0 && collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
        {settingsNav.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/cabinet' && location.pathname.startsWith(item.to))
          return (
            <Link
              key={item.to}
              to={item.to}
              className={isActive ? 'cabinet-nav-active' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '8px' : '11px 12px',
                borderRadius: 14,
                color: isActive ? '#79a8ff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(121,168,255,0.11)' : 'transparent',
                border: isActive ? '1px solid rgba(121,168,255,0.16)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.875rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? item.label : undefined}
            >
              {!collapsed && <span className="cabinet-nav-dot" style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? '#53f3c3' : 'rgba(103,232,249,0.35)', boxShadow: isActive ? '0 0 0 3px rgba(83,243,195,0.25)' : 'none', flexShrink: 0 }} />}
              {item.icon}
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div className="cabinet-sidebar-group-title" style={{ marginBottom: 6, paddingLeft: collapsed ? 0 : 4 }}>Поддержка</div>
        {helpItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/cabinet/help' && location.pathname.startsWith(item.to))
          const commonStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '6px' : '8px 10px',
            borderRadius: 14,
            color: isActive ? '#79a8ff' : 'var(--text-secondary)',
            textDecoration: 'none' as const,
            fontSize: '0.8125rem',
            justifyContent: collapsed ? 'center' as const : 'flex-start' as const,
            background: isActive ? 'rgba(121,168,255,0.11)' : 'transparent',
          }
          return (
            <Link key={item.label} to={item.to} style={commonStyle} title={collapsed ? item.label : undefined}>
              {!collapsed && <span style={{ width: 6, height: 6, borderRadius: 999, background: isActive ? '#53f3c3' : 'rgba(103,232,249,0.3)', boxShadow: isActive ? '0 0 0 2px rgba(83,243,195,0.25)' : 'none', flexShrink: 0 }} />}
              {item.icon}
              {!collapsed && item.label}
            </Link>
          )
        })}
      </div>
    </aside>
    </>
  )
}
