import { IntegrationCard } from './IntegrationCard'
import { Package, ShoppingBag, FileSpreadsheet, Code, Server } from 'lucide-react'
import { ReactNode } from 'react'

export interface IntegrationItem {
  name: string
  description?: string
  /** @deprecated Use description */
  desc?: string
  icon?: 'shopify' | 'wb' | 'ozon' | 'excel' | 'csv' | 'api' | 'erp'
}

const iconMap: Record<string, ReactNode> = {
  shopify: <Package size={24} style={{ color: '#0ea5e9' }} />,
  wb: <ShoppingBag size={24} style={{ color: '#0ea5e9' }} />,
  ozon: <ShoppingBag size={24} style={{ color: '#0ea5e9' }} />,
  excel: <FileSpreadsheet size={24} style={{ color: '#0ea5e9' }} />,
  csv: <FileSpreadsheet size={24} style={{ color: '#0ea5e9' }} />,
  api: <Code size={24} style={{ color: '#0ea5e9' }} />,
  erp: <Server size={24} style={{ color: '#0ea5e9' }} />,
}

interface IntegrationGridProps {
  items: IntegrationItem[]
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 32,
}

export function IntegrationGrid({ items }: IntegrationGridProps) {
  return (
    <div className="mk-integration-grid" style={gridStyle}>
      {items.map((item) => (
        <IntegrationCard
          key={item.name}
          logo={item.icon ? iconMap[item.icon] : undefined}
          name={item.name}
          description={item.description ?? item.desc ?? ''}
        />
      ))}
    </div>
  )
}
