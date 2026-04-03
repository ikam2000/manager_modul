import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type FeatureFlags = {
  marketplace_oauth: boolean
  yookassa: boolean
  loaded: boolean
}

const defaultFlags: FeatureFlags = {
  marketplace_oauth: false,
  yookassa: false,
  loaded: false,
}

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags)

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags)

  useEffect(() => {
    let cancelled = false
    fetch('/features', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setFlags({
          marketplace_oauth: !!d.marketplace_oauth,
          yookassa: !!d.yookassa,
          loaded: true,
        })
      })
      .catch(() => {
        if (!cancelled) setFlags((f) => ({ ...f, loaded: true }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => flags, [flags])
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext)
}
