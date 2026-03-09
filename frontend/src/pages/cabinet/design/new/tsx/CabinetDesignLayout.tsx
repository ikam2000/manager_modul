export default function CabinetDesignLayout() {
  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Сетки и лейаут</h1>
          <p className="ds-lead">Единые сетки для дашбордов: KPI 4 колонки, 2 колонки для рабочих зон, auto-fill для карточек.</p>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">4 колонки (KPI)</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="analytics-kpi" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Колонка {i}
                </div>
              ))}
            </div>
            <div className="ds-hint">Здесь использован ваш `.analytics-kpi` как безопасный demo-tile (без новых зависимостей).</div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-grid ds-grid-2">
          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">2 колонки</div>
            </div>
            <div className="ds-cardBody">
              <div className="ds-grid ds-grid-2">
                <div className="analytics-card">Блок 1</div>
                <div className="analytics-card">Блок 2</div>
              </div>
            </div>
          </div>

          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">Отступы</div>
            </div>
            <div className="ds-cardBody">
              <div className="ds-hint" style={{ fontSize: 13 }}>
                <div><b>Padding main:</b> 22px</div>
                <div><b>Gap между блоками:</b> 14–18px</div>
                <div><b>Padding карточек:</b> 16–18px</div>
                <div><b>Радиусы:</b> 10 / 16 / 24</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Auto-fill (карточки главной)</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-autofill">
              {['Сущности', 'Документы', 'Аналитика', 'QR-код', 'Печать QR'].map((l) => (
                <div key={l} className="ds-navCard ds-navCard--static">
                  <div className="ds-navCardLabel">{l}</div>
                  <div className="ds-hint">Пример карточки</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
