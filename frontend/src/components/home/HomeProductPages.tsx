import { Link } from 'react-router-dom'

/** Подробные продуктные страницы — 3 карточки */
export function HomeProductPages() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Платформа, Интеграции, Безопасность</div>
            <h2 className="section-title">Подробные продуктные страницы</h2>
          </div>
          <p>Platform объясняет продукт, Integrations снимает технические риски, Security повышает доверие procurement и IT.</p>
        </div>
        <div className="grid-3">
          <Link className="feature-card" to="/platform">
            <div className="icon-chip">П</div>
            <h3>Платформа</h3>
            <p>Модули продукта, ядро данных, orchestration и интерфейсы на уровне реального SaaS.</p>
            <ul className="feature-list"><li>Архитектура данных</li><li>Центр управления</li><li>Объяснение по модулям</li></ul>
          </Link>
          <Link className="feature-card" to="/integrations">
            <div className="icon-chip">И</div>
            <h3>Интеграции</h3>
            <p>Data contracts, API, импорты, outbound sync, маркетплейсы и партнёрская экосистема.</p>
            <ul className="feature-list"><li>Коннекторы маркетплейсов</li><li>Контракты intake</li><li>Projection-based экспорт</li></ul>
          </Link>
          <Link className="feature-card" to="/security">
            <div className="icon-chip">Б</div>
            <h3>Безопасность</h3>
            <p>Enterprise security, audit trail, изоляция ролей, secrets management.</p>
            <ul className="feature-list"><li>Tenant isolation и RLS</li><li>Audit-friendly логи</li><li>Procurement-ready</li></ul>
          </Link>
        </div>
      </div>
    </section>
  )
}
