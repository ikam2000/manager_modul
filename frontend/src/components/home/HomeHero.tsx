import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { formHref } from '../../shared/formHref'

/** Hero с product mock из ikamdocs_v5 — единый слой данных, метрики, панель дашборда */
export function HomeHero() {
  const { theme } = useTheme()
  return (
    <section className="hero" id="top">
      <div className="glow one" />
      <div className="glow two" />
      <div className="container hero-grid">
        <div>
          <div className="kicker"><span className="eyebrow-dot" /> Enterprise-платформа данных для бизнеса</div>
          <h1 className="display">Единый слой данных для каталога, поставщиков и интеграций.</h1>
          <p className="lead">ikamdocs превращает хаотичные Excel-файлы, документы, данные поставщиков и маркетплейс-синхронизации в единый управляемый product data core.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={formHref('/request-demo.html', theme)}>Запросить демо</a>
            <Link to="/register" className="btn btn-secondary">Попробовать платформу</Link>
          </div>
          <div className="badge-line">
            <span className="code">каталог</span>
            <span className="code">поставщики</span>
            <span className="code">документы</span>
            <span className="code">sync</span>
          </div>
          <div className="hero-metrics">
            <div className="metric"><strong>99,97%</strong><span>целевая доступность платформы для enterprise-процессов</span></div>
            <div className="metric"><strong>12×</strong><span>быстрее онбординг поставщиков с нормализованными потоками</span></div>
            <div className="metric"><strong>1 источник</strong><span>правды для каталога, документов, QR и синхронизации</span></div>
          </div>
        </div>
        <div className="panel">
          <div className="browser-bar">
            <span className="browser-dot" /><span className="browser-dot" /><span className="browser-dot" />
            <span className="browser-url">app.ikamdocs.ru / workspace / enterprise</span>
          </div>
          <div className="product-shell">
            <aside className="sidebar">
              <div className="sidebar-group">
                <h4>Рабочее пространство</h4>
                <div className="sidebar-item active"><span className="sidebar-badge" />Панель управления</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Каталог</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Поставщики</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Документы</div>
                <div className="sidebar-item"><span className="sidebar-badge" />QR-слой</div>
              </div>
              <div className="sidebar-group">
                <h4>Операции</h4>
                <div className="sidebar-item"><span className="sidebar-badge" />Интеграции</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Sync-политики</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Журнал аудита</div>
                <div className="sidebar-item"><span className="sidebar-badge" />Безопасность</div>
              </div>
            </aside>
            <div className="dashboard">
              <div className="dashboard-top">
                <div className="card">
                  <h3>Центр управления каталогом</h3>
                  <p>Управляйте каталогом, версиями SKU, маппингом полей, статусами комплаенса и публикацией в каналы из одной операционной поверхности.</p>
                  <div className="stat-grid" style={{ marginTop: 16 }}>
                    <div className="stat"><strong>148 220</strong><span>активных SKU</span></div>
                    <div className="stat"><strong>1 942</strong><span>обновлённых документов</span></div>
                    <div className="stat"><strong>320 мс</strong><span>среднее время обработки diff</span></div>
                  </div>
                </div>
                <div className="card">
                  <h4>Состояние синхронизации</h4>
                  <div className="pipeline">
                    <div className="pipeline-row"><span className="pill">Ozon</span><div className="bar"><span style={{ width: '94%' }} /></div><span>94%</span></div>
                    <div className="pipeline-row"><span className="pill">WB</span><div className="bar"><span style={{ width: '91%' }} /></div><span>91%</span></div>
                    <div className="pipeline-row"><span className="pill">Shopify</span><div className="bar"><span style={{ width: '99%' }} /></div><span>99%</span></div>
                    <div className="pipeline-row"><span className="pill">ERP</span><div className="bar"><span style={{ width: '87%' }} /></div><span>87%</span></div>
                  </div>
                </div>
              </div>
              <div className="main-grid">
                <div className="card">
                  <h4>Последние события</h4>
                  <table className="table">
                    <thead><tr><th>SKU</th><th>Изменение</th><th>Статус</th><th>Канал</th></tr></thead>
                    <tbody>
                      <tr><td>LMN-AX-2041</td><td>Обновлена версия спецификации</td><td><span className="status ok">OK</span></td><td>Shopify</td></tr>
                      <tr><td>QR-IND-4420</td><td>Перевыпуск QR-партии</td><td><span className="status sync">Синхр.</span></td><td>Склад</td></tr>
                      <tr><td>WB-773-810</td><td>Изменение цены поставщика</td><td><span className="status review">Проверка</span></td><td>Wildberries</td></tr>
                      <tr><td>OZ-998-120</td><td>Нет документа для compliance</td><td><span className="status review">Проверка</span></td><td>Ozon</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="card">
                  <h4>Задержка projection</h4>
                  <div className="spark">
                    <div className="grid-lines" />
                    <svg viewBox="0 0 300 170" preserveAspectRatio="none">
                      <path d="M0 138C20 128 42 122 60 106C78 90 94 88 112 74C130 60 147 72 166 50C184 30 203 42 220 34C240 24 262 8 300 16" stroke="url(#g1)" strokeWidth="5" fill="none" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="300" y2="0"><stop stopColor="#79A8FF" /><stop offset="1" stopColor="#67E8F9" /></linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <p style={{ marginTop: 12 }}>Политика синхронизации обновляет downstream-каналы без прямого доступа к мастер-данным.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
