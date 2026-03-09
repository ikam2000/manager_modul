export default function CabinetDesignTypography() {
  const colors = [
    { var: '--text', name: 'Основной текст' },
    { var: '--text-secondary', name: 'Вторичный текст' },
    { var: '--text-muted', name: 'Приглушённый' },
    { var: '--accent', name: 'Акцент' },
    { var: '--accent-soft', name: 'Акцент мягкий' },
    { var: '--success', name: 'Успех' },
    { var: '--warning', name: 'Предупреждение' },
    { var: '--error', name: 'Ошибка' },
  ]

  const bgs = [
    { var: '--bg', name: 'Фон основной' },
    { var: '--bg-secondary', name: 'Фон вторичный' },
    { var: '--surface', name: 'Поверхность' },
    { var: '--surface-hover', name: 'Поверхность hover' },
  ]

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Типографика и цвета</h1>
          <p className="ds-lead">Шкала текста, токены цветов и поверхности. Важно: все значения берутся из var(--...).</p>
        </div>
        <div className="ds-tabs" role="tablist" aria-label="Typography tabs">
          <div className="ds-tab ds-tab--active">Шкала</div>
          <div className="ds-tab">Цвета</div>
          <div className="ds-tab">Фоны</div>
          <div className="ds-tab">Радиусы</div>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-grid ds-grid-2">
          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">Шкала текста</div>
            </div>
            <div className="ds-cardBody ds-stack">
              <div className="ds-scaleH1">H1 — 22px / 800</div>
              <div className="ds-scaleH2">H2 — 18px / 700</div>
              <div className="ds-scaleH3">H3 — 14px / 700</div>
              <div className="ds-scaleBody">Основной текст — 14px</div>
              <div className="ds-scaleCaption">Мелкий текст — 12px</div>
            </div>
          </div>

          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">Токены текста</div>
            </div>
            <div className="ds-cardBody">
              <div className="ds-grid ds-grid-autofill-sm">
                {colors.map((c) => (
                  <div key={c.var} className="ds-swatch">
                    <div className="ds-swatchChip" style={{ background: `var(${c.var})` }}>
                      Aa
                    </div>
                    <div className="ds-swatchName">{c.name}</div>
                    <code className="ds-code">{c.var}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Фоны</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-grid ds-grid-4">
              {bgs.map((c) => (
                <div key={c.var} className="ds-bgTile" style={{ background: `var(${c.var})` }}>
                  <div className="ds-bgTitle">{c.name}</div>
                  <code className="ds-code">{c.var}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Радиусы и тени</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-btnRow">
              <div className="ds-radiusTile ds-radiusTile--sm">radius — var(--radius)</div>
              <div className="ds-radiusTile ds-radiusTile--md">radius-lg — var(--radius-lg)</div>
              <div className="ds-radiusTile ds-radiusTile--lg">radius-xl + shadow</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
