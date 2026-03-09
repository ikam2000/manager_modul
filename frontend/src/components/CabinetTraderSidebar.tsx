import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Package,
  Building2,
  FolderTree,
  Percent,
  Upload,
  Download,
  RefreshCw,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Key,
  HelpCircle,
  Ticket,
  Lightbulb,
} from 'lucide-react'
import { useCabinetMobile } from '../contexts/CabinetMobileContext'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

interface Props {
  isAdmin?: boolean
}

export default function CabinetTraderSidebar({ isAdmin: _isAdmin }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const mobile = useCabinetMobile()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isOverlay = isMobile && !!mobile

  const mainNav: NavItem[] = [
    { to: '/cabinet/trader', label: 'Дашборд', icon: <BarChart3 size={20} /> },
    { to: '/cabinet/trader/entities', label: 'Товары', icon: <Package size={20} /> },
    { to: '/cabinet/trader/suppliers', label: 'Поставщики', icon: <Building2 size={20} /> },
    { to: '/cabinet/trader/categories', label: 'Категории', icon: <FolderTree size={20} /> },
    { to: '/cabinet/trader/markups', label: 'Наценки', icon: <Percent size={20} /> },
    { to: '/cabinet/trader/import', label: 'Импорт', icon: <Upload size={20} /> },
    { to: '/cabinet/trader/export', label: 'Выгрузка Excel', icon: <Download size={20} /> },
    { to: '/cabinet/trader/sync', label: 'Синхронизация с площадками', icon: <RefreshCw size={20} /> },
    { to: '/cabinet/integrations', label: 'Интеграции', icon: <Key size={20} /> },
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
      <aside className="cabinet-sidebar cabinet-trader-sidebar" style={asideStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed && !isOverlay ? 'center' : 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
          {(!collapsed || isOverlay) && <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Трейдер</span>}
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
          {!collapsed && <div className="cabinet-sidebar-group-title">Операции</div>}
          {mainNav.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/cabinet/trader' && location.pathname.startsWith(item.to))
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
                {!collapsed && <span style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? '#53f3c3' : 'rgba(103,232,249,0.35)', boxShadow: isActive ? '0 0 0 3px rgba(83,243,195,0.25)' : 'none', flexShrink: 0 }} />}
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
            return (
              <Link
                key={item.label}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: collapsed ? '6px' : '8px 10px',
                  borderRadius: 14,
                  color: isActive ? '#79a8ff' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  justifyContent: collapsed ? 'center' as const : 'flex-start' as const,
                  background: isActive ? 'rgba(121,168,255,0.11)' : 'transparent',
                }}
                title={collapsed ? item.label : undefined}
              >
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
