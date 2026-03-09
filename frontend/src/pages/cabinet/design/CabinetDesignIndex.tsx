import { Link } from 'react-router-dom'
import { Type, Layout, Component, Palette } from 'lucide-react'

const DESIGN_PAGES = [
  { to: '/cabinet/design/typography', label: 'Типографика и цвета', icon: <Type size={22} /> },
  { to: '/cabinet/design/components', label: 'Компоненты', icon: <Component size={22} /> },
  { to: '/cabinet/design/layout', label: 'Сетки и лейаут', icon: <Layout size={22} /> },
  { to: '/cabinet/design/analytics', label: 'Карточки аналитики', icon: <Palette size={22} /> },
]

export default function CabinetDesignIndex() {
  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Дизайн-система кабинета</h1>
          <p className="ds-lead">Справочные страницы: типографика, компоненты, сетки и аналитические карточки.</p>
        </div>
      </div>

      <div className="ds-grid ds-grid-autofill">
        {DESIGN_PAGES.map((item) => (
          <Link key={item.to} to={item.to} className="ds-navCard">
            <div className="ds-navCardIcon">{item.icon}</div>
            <div className="ds-navCardLabel">{item.label}</div>
            <div className="ds-hint">Открыть раздел</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
