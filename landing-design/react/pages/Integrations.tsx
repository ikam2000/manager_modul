import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Section, SectionHeader, IntegrationGrid, CTASection } from '../components/marketing'

const MARKETPLACE = [
  { name: 'Shopify', description: 'Sync цен и остатков по SKU, OAuth-подключение', icon: 'shopify' as const },
  { name: 'Wildberries', description: 'wb_nm_id, остатки, импорт и обновление', icon: 'wb' as const },
  { name: 'Ozon', description: 'offer_id, остатки, единое сопоставление данных', icon: 'ozon' as const },
]

const DATA_IMPORT = [
  { name: 'Excel', description: 'Импорт, экспорт, шаблоны и пакетная обработка', icon: 'excel' as const },
  { name: 'CSV', description: 'Массовая загрузка, preview и маппинг', icon: 'csv' as const },
  { name: 'Preview', description: 'Проверка данных перед импортом в trader-контуре', icon: 'api' as const },
]

const API_INTEGRATIONS = [
  { name: 'REST API', description: 'X-Api-Key, CRUD по ключевым сущностям', icon: 'api' as const },
  { name: 'Webhooks', description: 'created / updated / deleted по supplier, contract, supply' },
  { name: 'ERP / 1С', description: 'Сценарий двусторонней синхронизации в развитии', icon: 'erp' as const },
]

export default function Integrations() {
  useEffect(() => { document.title = 'Интеграции — ikamdocs' }, [])
  return (
    <div style={{ background: '#f8fafc' }}>
      <Section style={{ padding: '120px 0 64px' }} background="light">
        <SectionHeader label="Интеграции" title="Подключение маркетплейсов, файлов и внешних систем" description="ikamdocs строится как интеграционный слой между источниками товарных данных, кабинетом компании и внешними системами." />
        <h3 style={{ fontSize: 26, fontWeight: 700, marginTop: 44, marginBottom: 22, color: '#0f172a' }}>Маркетплейсы</h3>
        <IntegrationGrid items={MARKETPLACE} />
        <h3 style={{ fontSize: 26, fontWeight: 700, marginTop: 48, marginBottom: 22, color: '#0f172a' }}>Импорт и экспорт данных</h3>
        <IntegrationGrid items={DATA_IMPORT} />
        <h3 style={{ fontSize: 26, fontWeight: 700, marginTop: 48, marginBottom: 22, color: '#0f172a' }}>API и автоматизация</h3>
        <IntegrationGrid items={API_INTEGRATIONS} />
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Обсудить интеграции</a>
          <Link to="/api" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Открыть API →</Link>
        </div>
      </Section>
      <CTASection title="Нужна интеграция под ваш контур?" subtitle="Подключим маркетплейсы, файлы, API и внешние системы без потери контроля над каталогом и поставщиками." primaryLabel="Запросить демо" primaryHref="/request-demo.html" secondaryLabel="Запросить кейсы" secondaryHref="/request-cases.html" />
    </div>
  )
}
