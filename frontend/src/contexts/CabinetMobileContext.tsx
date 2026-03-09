import { createContext, useContext, useState } from 'react'

interface CabinetMobileContextType {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

const CabinetMobileContext = createContext<CabinetMobileContextType | null>(null)

export function CabinetMobileProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <CabinetMobileContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </CabinetMobileContext.Provider>
  )
}

export function useCabinetMobile() {
  const ctx = useContext(CabinetMobileContext)
  return ctx
}
