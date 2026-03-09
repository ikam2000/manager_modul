import { useState } from 'react'

const MAP_NODES = [
  { id: 'suppliers', left: 46, top: 106, small: 'Источник', strong: 'Поставщики', span: 'Профили, ИНН, договоры' },
  { id: 'intake', left: 330, top: 106, small: 'Pipeline', strong: 'Data Intake', span: 'Excel, CSV, API, email' },
  { id: 'catalog', left: 595, top: 106, small: 'Ядро', strong: 'Catalog Core', span: 'SKU, атрибуты, версии' },
  { id: 'sync', left: 860, top: 106, small: 'Runtime', strong: 'Sync Engine', span: 'Политики, очереди, retry' },
  { id: 'documents', left: 220, top: 318, small: 'Compliance', strong: 'Документы', span: 'Сертификаты и спецификации' },
  { id: 'qr', left: 540, top: 318, small: 'Traceability', strong: 'QR-слой', span: 'Печать, сканирование, валидация' },
  { id: 'channels', left: 860, top: 318, small: 'Выходы', strong: 'Каналы', span: 'WB, Ozon, Shopify, ERP' },
  { id: 'audit', left: 800, top: 486, small: 'Безопасность', strong: 'Audit + RLS', span: 'Изоляция и логи' },
] as const

const MAP_TEXT: Record<string, { title: string; body: string; extra: string }> = {
  suppliers: { title: 'Поставщики', body: 'Реквизиты, ИНН, версии прайсов, источники загрузки и SLA по обновлениям.', extra: 'Каждое обновление получает audit trail и связывается с импортом, пользователем и downstream sync.' },
  intake: { title: 'Data Intake', body: 'Файлы Excel, API, email parsers и ручная загрузка приводятся к единому каноническому формату.', extra: 'Mapping layer отделяет входной формат поставщика от внутренней модели данных.' },
  catalog: { title: 'Каталог товаров', body: 'SKU, категории, атрибуты, спецификации, версии, связи с поставщиками и статусы readiness.', extra: 'Каталог становится центром для UI, аналитики, документов и интеграций.' },
  documents: { title: 'Документы', body: 'Сертификаты, декларации, инструкции, спецификации и история ревизий.', extra: 'Документы привязаны к SKU, поставщику, поставке и статусам compliance.' },
  qr: { title: 'QR-слой', body: 'Генерация кодов, контроль валидности, печать и связь с warehouse workflows.', extra: 'QR делает traceability частью повседневных операций, а не отдельным ручным процессом.' },
  sync: { title: 'Sync Engine', body: 'Очереди обновлений, diff engine, retries, webhooks, rate limits и downstream policies.', extra: 'Изменения не перезаписывают слепо данные, а проходят policy-based orchestration.' },
  channels: { title: 'Каналы', body: 'Ozon, Wildberries, Shopify, ERP, BI и custom API consumers.', extra: 'Каждый канал получает только свою projection-модель, а не прямой доступ к мастер-данным.' },
  audit: { title: 'Audit + Security', body: 'RLS, tenant isolation, API key scopes, log retention и контур расследования изменений.', extra: 'Security встроена в data path, а не оформлена отдельным документом после релиза.' },
}

/** Интерактивная модель данных из ikamdocs_v5 */
export function HomeDataMap() {
  const [active, setActive] = useState<string>('suppliers')
  const entry = MAP_TEXT[active] || MAP_TEXT.suppliers

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Интерактивная схема</div>
            <h2 className="section-title">Интерактивная модель данных</h2>
          </div>
          <p>Схема связывает поставщиков, intake, каталог, документы, QR, sync engine, каналы и аудит. Наведите курсор — изменится панель с описанием.</p>
        </div>
        <div className="data-map">
          <div className="map-stage">
            <svg className="map-svg" viewBox="0 0 1200 620" preserveAspectRatio="none">
              <path d="M148 146 C260 146, 300 130, 382 148" stroke="rgba(121,168,255,.7)" strokeWidth="3" fill="none" />
              <path d="M490 146 C572 146, 626 146, 714 146" stroke="rgba(103,232,249,.7)" strokeWidth="3" fill="none" />
              <path d="M812 146 C886 146, 948 146, 1030 146" stroke="rgba(121,168,255,.7)" strokeWidth="3" fill="none" />
              <path d="M434 194 C434 258, 434 290, 434 350" stroke="rgba(155,140,255,.65)" strokeWidth="3" fill="none" />
              <path d="M770 194 C770 258, 770 290, 770 350" stroke="rgba(103,232,249,.65)" strokeWidth="3" fill="none" />
              <path d="M496 398 C594 434, 632 434, 708 398" stroke="rgba(121,168,255,.55)" strokeWidth="3" fill="none" />
              <path d="M1096 194 C1108 262, 1108 306, 1108 364" stroke="rgba(103,232,249,.45)" strokeWidth="3" fill="none" />
            </svg>
            {MAP_NODES.map((n) => (
              <div
                key={n.id}
                className={`map-node ${active === n.id ? 'active' : ''}`}
                data-node={n.id}
                style={{ left: `${n.left}px`, top: `${n.top}px` }}
                onMouseEnter={() => setActive(n.id)}
                onClick={() => setActive(n.id)}
              >
                <small>{n.small}</small>
                <strong>{n.strong}</strong>
                <span>{n.span}</span>
              </div>
            ))}
          </div>
          <div className="map-panel">
            <div>
              <div className="card">
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
                <div className="callout">{entry.extra}</div>
              </div>
            </div>
            <div className="card">
              <h3>Последние события</h3>
              <div className="mini-log">
                <div className="log-item"><span>Импорт поставщиков нормализован</span><span className="code">2 мин назад</span></div>
                <div className="log-item"><span>Документ привязан к SKU</span><span className="code">9 мин назад</span></div>
                <div className="log-item"><span>Projection опубликован в Ozon</span><span className="code">16 мин назад</span></div>
                <div className="log-item"><span>API-ключ ротирован</span><span className="code">1 ч назад</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
