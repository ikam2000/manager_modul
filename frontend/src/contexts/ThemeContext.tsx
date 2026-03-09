import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'ikamdocs_theme'
const INTRO_SHOWN_KEY = 'ikamdocs_theme_intro_shown'

export type Theme = 'night' | 'day'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  introShown: boolean
  setIntroShown: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    return saved === 'day' || saved === 'night' ? saved : 'night'
  })
  const [introShown, setIntroShownState] = useState(() => !!localStorage.getItem(INTRO_SHOWN_KEY))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
  }

  const setIntroShown = () => {
    setIntroShownState(true)
    localStorage.setItem(INTRO_SHOWN_KEY, '1')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, introShown, setIntroShown }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
