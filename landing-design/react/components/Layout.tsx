import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import CabinetHeader from './CabinetHeader'
import Footer from './Footer'
import Analytics from './Analytics'
import { CabinetMobileProvider } from '../contexts/CabinetMobileContext'

export default function Layout() {
  const location = useLocation()
  const inCabinet = location.pathname.startsWith('/cabinet')

  const content = (
    <div className={inCabinet ? 'cabinet-area' : ''} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Analytics />
      {inCabinet ? <CabinetHeader /> : <Header />}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      {!inCabinet && <Footer />}
    </div>
  )

  return inCabinet ? <CabinetMobileProvider>{content}</CabinetMobileProvider> : content
}
