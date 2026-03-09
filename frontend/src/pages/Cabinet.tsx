import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import CabinetSidebar from '../components/CabinetSidebar'
import CabinetSettings from './cabinet/CabinetSettings'
import CabinetUsers from './cabinet/CabinetUsers'
import CabinetNotifications from './cabinet/CabinetNotifications'
import CabinetCreateQR from './cabinet/CabinetCreateQR'
import CabinetPayment from './cabinet/CabinetPayment'
import CabinetEntities from './cabinet/CabinetEntities'
import CabinetNomenclatureCard from './cabinet/CabinetNomenclatureCard'
import CabinetSupplierCard from './cabinet/CabinetSupplierCard'
import CabinetManufacturerCard from './cabinet/CabinetManufacturerCard'
import CabinetSupplyCard from './cabinet/CabinetSupplyCard'
import CabinetContractCard from './cabinet/CabinetContractCard'
import CabinetCategoryCard from './cabinet/CabinetCategoryCard'
import CabinetSubcategoryCard from './cabinet/CabinetSubcategoryCard'
import CabinetCustomerCard from './cabinet/CabinetCustomerCard'
import CabinetAnalytics from './cabinet/CabinetAnalytics'
import CabinetDocuments from './cabinet/CabinetDocuments'
import CabinetHome from './cabinet/CabinetHome'
import CabinetQRPrint from './cabinet/CabinetQRPrint'
import CabinetIntegrations from './cabinet/CabinetIntegrations'
import CabinetAuditLog from './cabinet/CabinetAuditLog'
import CabinetHelp from './cabinet/CabinetHelp'
import CabinetTickets from './cabinet/CabinetTickets'
import CabinetSuggestions from './cabinet/CabinetSuggestions'
import CabinetSessions from './cabinet/CabinetSessions'
import CabinetTraderSidebar from '../components/CabinetTraderSidebar'
import CabinetTraderDashboard from './cabinet/CabinetTraderDashboard'
import CabinetTraderEntities from './cabinet/CabinetTraderEntities'
import CabinetTraderMarkups from './cabinet/CabinetTraderMarkups'
import CabinetTraderImport from './cabinet/CabinetTraderImport'
import CabinetTraderExport from './cabinet/CabinetTraderExport'
import CabinetTraderSync from './cabinet/CabinetTraderSync'
import CabinetTraderSuppliers from './cabinet/CabinetTraderSuppliers'
import CabinetTraderCategories from './cabinet/CabinetTraderCategories'

function CabinetLayout() {
  const { user, loading } = useAuth()
  const { theme, setTheme, introShown, setIntroShown } = useTheme()
  const token = localStorage.getItem('access_token')
  if (!token) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      </div>
    )
  }

  const userRole = user?.role ?? (() => { try { const p = JSON.parse(atob(token.split('.')[1])); return p.role || ''; } catch { return ''; } })()
  const companyType = user?.company_type ?? ''
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'trader'
  const isTrader = userRole === 'trader' || companyType === 'trader'

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', flexDirection: 'column' }}>
      {user?.impersonated && (
        <div
          style={{
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Вы вошли от имени пользователя
        </div>
      )}
      <div style={{ display: 'flex', flex: 1 }}>
      {/* Модальное окно выбора темы при первом входе */}
      {!introShown && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            className="cabinet-intro-modal"
            style={{
              background: 'linear-gradient(180deg, rgba(17,26,49,0.98) 0%, rgba(8,12,24,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 28,
              maxWidth: 420,
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            }}
          >
            <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>Выберите тему оформления</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              Вы можете изменить тему в любой момент в правом верхнем углу.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setTheme('night')
                  setIntroShown()
                }}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: theme === 'night' ? 'rgba(121,168,255,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${theme === 'night' ? 'rgba(121,168,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  color: '#f1f5f9',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                🌙 Ночная
              </button>
              <button
                onClick={() => {
                  setTheme('day')
                  setIntroShown()
                }}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: theme === 'day' ? 'rgba(121,168,255,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${theme === 'day' ? 'rgba(121,168,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  color: '#f1f5f9',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                ☀️ Дневная
              </button>
            </div>
          </div>
        </div>
      )}
      {isTrader ? <CabinetTraderSidebar isAdmin={isAdmin} /> : <CabinetSidebar isAdmin={isAdmin} isSuperAdmin={userRole === 'super_admin'} />}
      <main className="cabinet-main" style={{ flex: 1, minWidth: 0, padding: '2rem', background: 'var(--bg)' }}>
        {typeof localStorage !== 'undefined' && localStorage.getItem('impersonated') && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                const origAccess = localStorage.getItem('original_access_token')
                const origRefresh = localStorage.getItem('original_refresh_token')
                if (origAccess) {
                  localStorage.setItem('access_token', origAccess)
                  localStorage.removeItem('original_access_token')
                }
                if (origRefresh) {
                  localStorage.setItem('refresh_token', origRefresh)
                  localStorage.removeItem('original_refresh_token')
                }
                localStorage.removeItem('impersonated')
                window.location.href = '/cabinet'
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <span style={{ marginRight: 2 }}>←</span>
              Вернуться в мой кабинет
            </button>
          </div>
        )}
        <Routes>
          <Route index element={isTrader ? <CabinetTraderDashboard /> : <CabinetHome />} />
          {isTrader && (
            <>
              <Route path="trader" element={<CabinetTraderDashboard />} />
              <Route path="trader/entities" element={<CabinetTraderEntities />} />
              <Route path="trader/markups" element={<CabinetTraderMarkups />} />
              <Route path="trader/import" element={<CabinetTraderImport />} />
              <Route path="trader/export" element={<CabinetTraderExport />} />
              <Route path="trader/sync" element={<CabinetTraderSync />} />
              <Route path="trader/suppliers" element={<CabinetTraderSuppliers />} />
              <Route path="trader/categories" element={<CabinetTraderCategories />} />
            </>
          )}
          <Route path="entities" element={<CabinetEntities />} />
          <Route path="entities/nomenclature/:id" element={<CabinetNomenclatureCard />} />
          <Route path="entities/supplier/:id" element={<CabinetSupplierCard />} />
          <Route path="entities/manufacturer/:id" element={<CabinetManufacturerCard />} />
          <Route path="entities/supply/:id" element={<CabinetSupplyCard />} />
          <Route path="entities/contract/:id" element={<CabinetContractCard />} />
          <Route path="entities/category/:id" element={<CabinetCategoryCard />} />
          <Route path="entities/subcategory/:id" element={<CabinetSubcategoryCard />} />
          <Route path="entities/customer/:id" element={<CabinetCustomerCard />} />
          <Route path="documents" element={<CabinetDocuments />} />
          <Route path="analytics" element={<CabinetAnalytics />} />
          <Route path="qr-create" element={<CabinetCreateQR />} />
          <Route path="qr" element={<CabinetQRPrint />} />
          <Route path="notifications" element={<CabinetNotifications />} />
          <Route path="users" element={<CabinetUsers />} />
          <Route path="sessions" element={<CabinetSessions />} />
          <Route path="integrations" element={<CabinetIntegrations />} />
          <Route path="audit-log" element={<CabinetAuditLog />} />
          <Route path="help" element={<CabinetHelp />} />
          <Route path="tickets" element={<CabinetTickets />} />
          <Route path="suggestions" element={<CabinetSuggestions />} />
          <Route path="settings" element={<CabinetSettings />} />
          <Route path="payment" element={<CabinetPayment />} />
        </Routes>
      </main>
      </div>
    </div>
  )
}

export default function Cabinet() {
  return (
    <Routes>
      <Route path="/*" element={<CabinetLayout />} />
    </Routes>
  )
}
