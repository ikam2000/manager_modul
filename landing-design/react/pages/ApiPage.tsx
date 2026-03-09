import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Section, SectionHeader, FeatureGrid, CTASection } from '../components/marketing'

const BLOCKS = [
  { title: 'REST API', description: 'Базовый URL: https://ikamdocs.ru/api/v1/integrate. Аутентификация через X-Api-Key. CRUD по category, subcategory, nomenclature, supplier, manufacturer, supply, contract и contract_appendix.', code: 'POST /api/v1/integrate/nomenclature\nGET /api/v1/integrate/supplier\nPOST /api/v1/integrate/supply' },
  { title: 'Webhooks', description: 'Push-события для nomenclature, supply, supplier и contract по сценариям created / updated / deleted. Поддерживаются replay protection и проверка подписи.', code: 'supplier.updated\nsupply.created\ncontract.deleted' },
  { title: 'Импорт данных', description: 'Preview, import и export доступны в trader-модуле и в сценариях загрузки документов. Поддерживаются Excel, CSV, OCR и пакетная работа.', code: 'POST /trader/import/preview\nPOST /trader/import\nGET /trader/export' },
]

export default function ApiPage() {
  useEffect(() => { document.title = 'API — ikamdocs' }, [])
  return (
    <div style={{ background: '#f8fafc' }}>
      <Section style={{ padding: '120px 0 64px' }} background="light">
        <SectionHeader label="API" title="Интеграционный слой для внешних систем и автоматизации" description="На странице API важно показывать не Swagger, а понятный продуктовый контур: что именно можно подключить, какие сущности доступны и как это помогает бизнесу." />
        <FeatureGrid columns={3}>
          {BLOCKS.map((block) => (
            <div key={block.title} className="mk-band-card" style={{ padding: 26 }}>
              <div className="mk-kicker" style={{ marginBottom: 14 }}>{block.title}</div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#64748b', marginBottom: 16 }}>{block.description}</p>
              <div className="mk-code-block">
                <div className="mk-code-kicker">Пример</div>
                {block.code.split('\n').map((line) => <div key={line} className="mk-code-line">{line}</div>)}
              </div>
            </div>
          ))}
        </FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <a href="/request-demo.html" className="btn-mk-primary">Обсудить API</a>
          <Link to="/integrations" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Интеграции →</Link>
        </div>
      </Section>
      <CTASection title="Нужен API-контур для 1С, ERP, CRM или внешнего кабинета?" subtitle="Подскажем, как подключить ikamdocs через API-ключи, webhooks и сценарии импорта без дублирования данных." primaryLabel="Запросить консультацию" primaryHref="/request-demo.html" secondaryLabel="Получить кейсы" secondaryHref="/request-cases.html" />
    </div>
  )
}
