import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Database,
  BarChart3,
  Package,
  Users,
  Plug,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { formHref } from '../../shared/formHref'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

const MOBILE_BREAK = 1024

/** 5 cards: spread ±26vw */
const CARD_LAYOUT = [
  { xVw: -26, zIndex: 1 },   // Поставщики — far left
  { xVw: -13, zIndex: 2 },   // Каталог
  { xVw: 0, zIndex: 10 },    // Аналитика — center, on top
  { xVw: 13, zIndex: 3 },    // Интеграции
  { xVw: 26, zIndex: 4 },    // Поставки
]

/** Airtable-style: stacked panels spread horizontally on scroll */
export function HomeCabinetShowcase() {
  const { theme } = useTheme()
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAK)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const onScroll = () => {
      rafRef.current = requestAnimationFrame(() => {
        if (!section) return
        const rect = section.getBoundingClientRect()
        const vh = window.innerHeight
        // Animation completes before next block: progress=1 when scrolled ~70vh (section ~200vh, next block at ~100vh)
        const scrollRange = Math.max(rect.height - vh * 1.3, 1)
        const scrolled = -rect.top
        const raw = Math.max(0, Math.min(1, scrolled / scrollRange))
        setProgress(easeOutCubic(raw))
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const p = isMobile ? 1 : progress

  const getCardStyle = (index: number) => {
    if (isMobile) return {}
    const layout = CARD_LAYOUT[index]
    const xVw = lerp(0, layout.xVw, p)
    const opacity = lerp(0.4, 1, p)
    const scale = lerp(0.92, 1, p)
    return {
      transform: `translateX(${xVw}vw) scale(${scale})`,
      opacity,
      zIndex: layout.zIndex,
    }
  }

  return (
    <section
      ref={sectionRef}
      className={`product-showcase section ${isMobile ? 'product-showcase--mobile' : ''}`}
      id="cabinet-showcase"
      style={{ minHeight: isMobile ? 'auto' : '200vh' }}
    >
      <div className="product-showcase__bg">
        <div className="product-showcase__glow product-showcase__glow--1" />
        <div className="product-showcase__glow product-showcase__glow--2" />
        <div className="product-showcase__glow product-showcase__glow--3" />
      </div>

      <div className="product-showcase__sticky">
        <div className="container product-showcase__container">
          <div className="product-showcase__header section-header">
            <div>
              <div className="kicker">Платформа ikamdocs</div>
              <h2 className="section-title">Как ikamdocs собирает данные в один рабочий контур</h2>
            </div>
            <p>Поставщики, каталог, аналитика, интеграции и поставки раскрываются как единая система управления товарными данными.</p>
          </div>

          <div className="product-showcase__scene">
            <div className="product-showcase__scene-inner">
              <div
                className="product-showcase__panel product-showcase__panel--suppliers"
                style={getCardStyle(0)}
              >
                <div className="product-showcase__panel-header">
                  <Users size={16} />
                  <span>Поставщики</span>
                </div>
                <div className="product-showcase__panel-body">
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ООО «Поставщик А»</span>
                    <small>Договор активен</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ИП Иванов</span>
                    <small>Ожидает подписания</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ЗАО «Партнёр»</span>
                    <small>Синхронизация API</small>
                  </div>
                  <div className="product-showcase__stat">
                    <strong>12</strong> поставщиков
                  </div>
                </div>
              </div>

              <div
                className="product-showcase__panel product-showcase__panel--catalog"
                style={getCardStyle(1)}
              >
                <div className="product-showcase__panel-header">
                  <Database size={16} />
                  <span>Каталог</span>
                </div>
                <div className="product-showcase__panel-body">
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>LMN-AX-2041</span>
                    <small>Версия спецификации</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>QR-IND-4420</span>
                    <small>Изменения поставщика</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>WB-773-810</span>
                    <small>Статус обновления</small>
                  </div>
                  <div className="product-showcase__stat">
                    <strong>148 220</strong> активных SKU
                  </div>
                </div>
              </div>

              <div
                className="product-showcase__panel product-showcase__panel--analytics"
                style={getCardStyle(2)}
              >
                <div className="product-showcase__panel-header">
                  <BarChart3 size={16} />
                  <span>Аналитика</span>
                </div>
                <div className="product-showcase__panel-body">
                  <svg viewBox="0 0 80 80" className="product-showcase__donut">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(121,168,255,0.15)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#79a8ff" strokeWidth="8" strokeDasharray="53 160" strokeLinecap="round" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#67e8f9" strokeWidth="8" strokeDasharray="43 170" strokeDashoffset="-53" strokeLinecap="round" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#53f3c3" strokeWidth="8" strokeDasharray="32 181" strokeDashoffset="-96" strokeLinecap="round" transform="rotate(-90 40 40)" />
                  </svg>
                  <div className="product-showcase__metrics">
                    <div><strong>5</strong> каналов</div>
                    <div><strong>1 942</strong> документов</div>
                    <div><strong>320 мс</strong> обработка</div>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>Активные потоки</span>
                    <small>Данные в реальном времени</small>
                  </div>
                  <div className="product-showcase__stat">
                    <strong>98%</strong> uptime
                  </div>
                </div>
              </div>

              <div
                className="product-showcase__panel product-showcase__panel--integrations"
                style={getCardStyle(3)}
              >
                <div className="product-showcase__panel-header">
                  <Plug size={16} />
                  <span>Интеграции</span>
                </div>
                <div className="product-showcase__panel-body">
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>API</span>
                    <small>REST, webhooks</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>Webhook</span>
                    <small>События в реальном времени</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>Маркетплейсы</span>
                    <small>Ozon, WB, Shopify</small>
                  </div>
                  <div className="product-showcase__stat">
                    <strong>7</strong> каналов интеграции
                  </div>
                </div>
              </div>

              <div
                className="product-showcase__panel product-showcase__panel--supplies"
                style={getCardStyle(4)}
              >
                <div className="product-showcase__panel-header">
                  <Package size={16} />
                  <span>Поставки</span>
                </div>
                <div className="product-showcase__panel-body">
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ПО-2024-0892</span>
                    <small>Ожидает отгрузки</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ПО-2024-0891</span>
                    <small>В пути</small>
                  </div>
                  <div className="product-showcase__row">
                    <Check size={12} className="product-showcase__icon-ok" />
                    <span>ПО-2024-0889</span>
                    <small>Получено</small>
                  </div>
                  <div className="product-showcase__stat">
                    <strong>24</strong> в работе
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="product-showcase__cta">
            <a
              href={formHref('/request-demo.html', theme)}
              className="product-showcase__btn product-showcase__btn--primary"
            >
              Запросить демо
            </a>
            <Link to="/platform" className="product-showcase__btn product-showcase__btn--secondary">
              Изучить возможности
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
