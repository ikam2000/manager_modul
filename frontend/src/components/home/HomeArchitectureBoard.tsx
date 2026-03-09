import { useEffect, useRef } from 'react'

/** Анимированная архитектура из ikamdocs_v5 — stack, flow-bridge, stage с анимацией линий и пульса */
export function HomeArchitectureBoard() {
  const bridgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bridge = bridgeRef.current
    if (!bridge) return
    const paths = bridge.querySelectorAll<SVGPathElement>('[data-animate-line]')
    const nodes = bridge.querySelectorAll<SVGGElement>('[data-pulse]')
    paths.forEach((path, i) => {
      const length = path.getTotalLength?.() ?? 500
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`
      path.animate(
        [{ strokeDashoffset: length, opacity: 0.1 }, { strokeDashoffset: 0, opacity: 1 }],
        { duration: 1900 + i * 160, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
      )
    })
    nodes.forEach((node, i) => {
      node.animate(
        [
          { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgba(103,232,249,0))' },
          { transform: 'scale(1.05)', filter: 'drop-shadow(0 0 12px rgba(103,232,249,.45))' },
          { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgba(103,232,249,0))' },
        ],
        { duration: 2200 + i * 120, iterations: Infinity, easing: 'ease-in-out' }
      )
    })
  }, [])

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="kicker">Архитектура данных</div>
            <h2 className="section-title">Единая архитектура управления товарными данными</h2>
          </div>
          <p>Intake данных, каталог, документы, QR-слой и каналы дистрибуции — единая архитектура управления товарными данными.</p>
        </div>
        <div className="architecture-board">
          <div className="stack-col">
            <div className="stack-card"><h4>Входы</h4><p>Excel, CSV, API поставщиков, парсеры почты, экспорты ERP и ручная загрузка.</p></div>
            <div className="stack-card"><h4>Нормализация</h4><p>Mapping layer, правила схемы, профили валидации и канонические модели.</p></div>
            <div className="stack-card"><h4>Контроль</h4><p>Согласования, audit log, политики изменений и откаты версий.</p></div>
          </div>
          <div className="flow-bridge" ref={bridgeRef}>
            <div className="flow-header">
              <div>
                <strong>ikamdocs system graph</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Event-driven master data plane для продуктов, документов и дистрибуции.</p>
              </div>
              <span className="code">enterprise graph</span>
            </div>
            <svg className="flow-svg" viewBox="0 0 760 470">
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#79A8FF" />
                  <stop offset="100%" stopColor="#67E8F9" />
                </linearGradient>
                <linearGradient id="lineGradient2" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9B8CFF" />
                  <stop offset="100%" stopColor="#67E8F9" />
                </linearGradient>
              </defs>
              <path data-animate-line d="M120 92 C220 92, 250 92, 318 92" stroke="url(#lineGradient)" strokeWidth="3" fill="none" opacity={0.8} />
              <path data-animate-line d="M442 92 C520 92, 560 92, 644 92" stroke="url(#lineGradient)" strokeWidth="3" fill="none" opacity={0.8} />
              <path data-animate-line d="M380 124 C380 170, 380 196, 380 240" stroke="url(#lineGradient2)" strokeWidth="3" fill="none" opacity={0.8} />
              <path data-animate-line d="M350 276 C286 302, 238 312, 152 340" stroke="url(#lineGradient2)" strokeWidth="3" fill="none" opacity={0.8} />
              <path data-animate-line d="M410 276 C496 304, 545 314, 626 340" stroke="url(#lineGradient)" strokeWidth="3" fill="none" opacity={0.8} />
              <path data-animate-line d="M128 356 C230 392, 286 394, 380 394 C474 394, 534 392, 632 356" stroke="url(#lineGradient)" strokeWidth="3" fill="none" opacity={0.55} />
              <g data-pulse><rect x="34" y="50" rx="22" width="128" height="84" fill="#10192F" stroke="#243458" /><text x="98" y="82" textAnchor="middle" fill="#EEF2FF" fontSize="18" fontFamily="Inter, sans-serif">Поставщики</text><text x="98" y="106" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">intake данных</text></g>
              <g data-pulse><rect x="318" y="50" rx="22" width="124" height="84" fill="#121D36" stroke="#31446B" /><text x="380" y="82" textAnchor="middle" fill="#EEF2FF" fontSize="18" fontFamily="Inter, sans-serif">Mapping</text><text x="380" y="106" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">нормализация</text></g>
              <g data-pulse><rect x="598" y="50" rx="22" width="128" height="84" fill="#10192F" stroke="#243458" /><text x="662" y="82" textAnchor="middle" fill="#EEF2FF" fontSize="18" fontFamily="Inter, sans-serif">Каналы</text><text x="662" y="106" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">публикация</text></g>
              <g data-pulse><rect x="286" y="206" rx="26" width="188" height="88" fill="#152344" stroke="#36568A" /><text x="380" y="244" textAnchor="middle" fill="#EEF2FF" fontSize="22" fontFamily="Inter, sans-serif">Catalog Core</text><text x="380" y="268" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">SKU, атрибуты, версии</text></g>
              <g data-pulse><rect x="58" y="318" rx="22" width="158" height="84" fill="#10192F" stroke="#243458" /><text x="137" y="350" textAnchor="middle" fill="#EEF2FF" fontSize="18" fontFamily="Inter, sans-serif">Документы</text><text x="137" y="374" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">compliance</text></g>
              <g data-pulse><rect x="550" y="318" rx="22" width="158" height="84" fill="#10192F" stroke="#243458" /><text x="629" y="350" textAnchor="middle" fill="#EEF2FF" fontSize="18" fontFamily="Inter, sans-serif">QR + Trace</text><text x="629" y="374" textAnchor="middle" fill="#8EA1CC" fontSize="13" fontFamily="Inter, sans-serif">складские ops</text></g>
            </svg>
          </div>
          <div className="stage-col">
            <div className="stage-card"><h4>Distribution layer</h4><p>Публикация в Ozon, Wildberries, Shopify, ERP и custom endpoints.</p></div>
            <div className="stage-card"><h4>Security layer</h4><p>Tenant isolation, scoped API keys, signed webhooks, RLS и audit.</p></div>
            <div className="stage-card"><h4>Observability</h4><p>Sync health, очереди сбоев, retry pipelines и visibility задержек.</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}
