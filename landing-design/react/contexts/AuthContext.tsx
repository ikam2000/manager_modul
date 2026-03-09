import { createContext, useContext, useEffect, useState } from 'react'

export interface UserPermissions {
  can_delete_entities?: boolean
  can_delete_documents?: boolean
}

export interface User {
  id: number
  email: string
  full_name: string
  role: string
  company_id: number | null
  company_name: string | null
  company_type?: string | null
  avatar_url?: string | null
  permissions?: UserPermissions
  impersonated?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchMe() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const r = await fetch('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (r.ok) {
        const data = await r.json()
        setUser({
          ...data,
          permissions: data.permissions ?? { can_delete_entities: false, can_delete_documents: false },
        })
      } else if (r.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMe()
    const onLogout = () => {
      setUser(null)
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
      } catch {
        // ignore — очищаем локально в любом случае
      }
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
