import { ReactNode } from 'react'

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 32px',
}

interface ContainerProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Container({ children, className, style }: ContainerProps) {
  return (
    <div className={`mk-container ${className ?? ''}`} style={{ ...containerStyle, ...style }}>
      {children}
    </div>
  )
}
