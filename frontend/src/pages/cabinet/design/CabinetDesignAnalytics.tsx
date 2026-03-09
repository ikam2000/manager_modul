import { Package, QrCode, Truck, Users } from 'lucide-react'

const SUMMARY = [
  { count: 32, label: 'Номенклатура', bg: 'rgba(34,197,94,0.16)', fg: '#bbf7d0', meta: '51%' },
  { count: 3, label: 'Поставщики', bg: 'rgba(139,92,246,0.18)', fg: '#ddd6fe', meta: '6%' },
  { count: 2, label: 'Поставки', bg: 'rgba(14,165,233,0.16)', fg: '#bae6fd', meta: '3%' },
  { count: 26, label: 'Документы', bg: 'rgba(245,158,11,0.18)', fg: '#fde68a', meta: '40%' },
]

export default function CabinetDesignAnalytics() {
  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Карточки аналитики</h1>
          <p className="ds-lead">
            KPI, summary и прогресс в едином визуальном языке: единые радиусы, подсветка, контраст, минимум случайных цветов.
          </p>
        </div>
        <div className="ds-btnRow">
          <button className="btn-secondary">Экспорт</button>
          <button className="btn-primary">Создать отчёт</button>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">KPI карточки</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-4">
              <div className="ds-kpi">
                <div className="ds-kpiIcon" style={{ background: 'rgba(14,165,233,0.15)' }}>
                  <Package size={20} color="var(--accent)" />
                </div>
                <div>
                  <div className="ds-kpiValue">1 234</div>
                  <div className="ds-kpiLabel">Всего товаров</div>
                  <div className="ds-kpiDelta">↑ 12.5% за период</div>
                </div>
              </div>

              <div className="ds-kpi">
                <div className="ds-kpiIcon" style={{ background: 'rgba(34,197,94,0.14)' }}>
                  <QrCode size={20} color="var(--success)" />
                </div>
                <div>
                  <div className="ds-kpiValue">456</div>
                  <div className="ds-kpiLabel">Объём товаров</div>
                  <div className="ds-hint">по складам</div>
                </div>
              </div>

              <div className="ds-kpi">
                <div className="ds-kpiIcon" style={{ background: 'rgba(139,92,246,0.16)' }}>
                  <Truck size={20} color="#8b5cf6" />
                </div>
                <div>
                  <div className="ds-kpiValue">78</div>
                  <div className="ds-kpiLabel">Поставок</div>
                  <div className="ds-hint">за неделю</div>
                </div>
              </div>

              <div className="ds-kpi">
                <div className="ds-kpiIcon" style={{ background: 'rgba(245,158,11,0.16)' }}>
                  <Users size={20} color="#f59e0b" />
                </div>
                <div>
                  <div className="ds-kpiValue">23</div>
                  <div className="ds-kpiLabel">Поставщиков</div>
                  <div className="ds-hint">активных</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Состав сводки</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-4">
              {SUMMARY.map((s) => (
                <div key={s.label} className="ds-summary">
                  <div className="ds-bubble" style={{ background: s.bg, color: s.fg }}>
                    {s.count}
                  </div>
                  <div className="ds-summaryLabel">{s.label}</div>
                  <div className="ds-summaryMeta">{s.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Прогресс-бары</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-progress">
              {[{ label: 'Категория A', v: 33 }, { label: 'Категория B', v: 66 }, { label: 'Категория C', v: 99 }].map((x) => (
                <div key={x.label}>
                  <div className="ds-progressLabel">{x.label}</div>
                  <div className="ds-track">
                    <div className="ds-bar" style={{ width: `${x.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
