import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Section, SectionHeader, FeatureGrid, FeatureCard, ArchitectureDiagram, CTASection } from '../components/marketing'
import { Database, Users, FileText, QrCode, Plug, BarChart3 } from 'lucide-react'

const MODULES = [
  { icon: <Database size={24} style={{ color: '#0ea5e9' }} />, title: 'Каталог номенклатуры', description: 'SKU, категории, подкатегории, атрибуты, версии, спецификации, товарные номера и листы вопросов.' },
  { icon: <Users size={24} style={{ color: '#0ea5e9' }} />, title: 'Поставщики и производители', description: 'Реквизиты, ИНН, DaData, связи с клиентами и производителями, договоры и приложения.' },
  { icon: <FileText size={24} style={{ color: '#0ea5e9' }} />, title: 'Документы', description: 'PDF, JPEG, PNG, Excel, OCR, импорт номенклатуры и поставок, шаблоны и публичный просмотр.' },
  { icon: <QrCode size={24} style={{ color: '#0ea5e9' }} />, title: 'QR-маркировка', description: 'Генерация кодов, печать, поиск по коду, макеты этикеток и публичные страницы сущностей.' },
  { icon: <Plug size={24} style={{ color: '#0ea5e9' }} />, title: 'Интеграции', description: 'Shopify, Wildberries, Ozon, Excel, CSV, X-Api-Key, OAuth, callback-потоки и webhooks.' },
  { icon: <BarChart3 size={24} style={{ color: '#0ea5e9' }} />, title: 'Trader и аналитика', description: 'Наценки поставщиков и категорий, dashboard, отчёты, фильтры, выгрузка и история изменений.' },
]

const BANDS = [
  { title: 'Ядро платформы', description: 'ikamdocs работает как master data layer для каталога, поставщиков, поставок и договоров. Это не просто интерфейс хранения, а единый продуктовый контур для всех сущностей.', bullets: ['Справочник SKU и структурированные атрибуты', 'Связи поставщик ↔ клиент ↔ производитель', 'Поставки, quantity, production_date, calibration_date', 'Договоры поставки и приложения'] },
  { title: 'Документы и операции', description: 'Система связывает документы с поставками и номенклатурой, поддерживает OCR и пакетную работу с файлами, а также формирует публичные QR-страницы.', bullets: ['POST /documents/upload и upload-batch', 'OCR через /documents/recognize', 'Импорт номенклатуры и поставок', 'Шаблоны для документов поставок'] },
  { title: 'Интеграционный слой', description: 'Платформа предоставляет API, webhooks и OAuth-потоки для подключения маркетплейсов и внешних систем без ручного копирования данных.', bullets: ['REST API /api/v1/integrate', 'CRUD по category, supplier, manufacturer, supply, contract', 'Replay protection и подпись webhook', 'Preview/import/export для трейдерского модуля'] },
]

export default function Platform() {
  useEffect(() => { document.title = 'Платформа — ikamdocs' }, [])
  return (
    <div style={{ background: '#f8fafc' }}>
      <Section style={{ padding: '120px 0 72px' }} background="light">
        <SectionHeader label="Платформа" title="Единое ядро данных для номенклатуры, поставщиков и документов" description="ikamdocs уже включает каталог, документы, QR-контур, интеграции, личный кабинет, платёжный модуль и trader-сценарии." />
        <FeatureGrid columns={3}>{MODULES.map((m) => <FeatureCard key={m.title} icon={m.icon} title={m.title} description={m.description} />)}</FeatureGrid>
      </Section>

      <Section background="default">
        <SectionHeader label="Архитектура" title="Платформа, которая соединяет данные и процессы" description="Ниже показан уровень продукта: источники данных попадают в единый контур ikamdocs, а дальше используются в API, аналитике, импорте, экспорте и QR-сценариях." />
        <ArchitectureDiagram />
      </Section>

      <Section background="light">
        <FeatureGrid columns={3}>
          {BANDS.map((band) => (
            <div key={band.title} className="mk-band-card" style={{ padding: 28 }}>
              <div className="mk-kicker" style={{ marginBottom: 16 }}>{band.title}</div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#64748b', marginBottom: 12 }}>{band.description}</p>
              <ul className="mk-list">{band.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          ))}
        </FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Запросить демо</a>
          <Link to="/integrations" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Интеграции →</Link>
        </div>
      </Section>

      <CTASection title="Нужен единый контур для каталога, поставщиков и документов?" subtitle="Покажем, как ikamdocs заменяет разрозненные Excel, ручные импорты и нестабильные связки между системами." primaryLabel="Запросить демо" primaryHref="/request-demo.html" secondaryLabel="Запросить презентацию" secondaryHref="/request-presentation.html" />
    </div>
  )
}
