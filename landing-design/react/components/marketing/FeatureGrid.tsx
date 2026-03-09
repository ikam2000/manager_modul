import { ReactNode } from 'react'

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 32,
}

interface FeatureGridProps {
  children: ReactNode
  columns?: number
  className?: string
}

export function FeatureGrid({ children, columns, className }: FeatureGridProps) {
  const style = columns
    ? { ...gridStyle, gridTemplateColumns: `repeat(${columns}, 1fr)` }
    : gridStyle
  return (
    <div className={`mk-feature-grid ${className ?? ''}`} style={style}>
      {children}
    </div>
  )
}
