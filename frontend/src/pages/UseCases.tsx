import { useEffect } from 'react'
import { Section, SectionHeader, CTASection } from '../components/marketing'

const CASES = [
  { title: 'Производство', problem: 'Каталоги продукции, спецификации, поставки и документы живут в разных таблицах и отделах.', solution: 'ikamdocs даёт единый каталог SKU, шаблоны документов, QR-контур и контроль поставок с production_date и calibration_date.', benefit: 'Снижается ручная работа и появляется единая точка правды по продукции и отгрузкам.' },
  { title: 'Дистрибуция', problem: 'Поставщики работают в разных форматах, договоры и приложения сложно увязать с фактическими поставками.', solution: 'Платформа связывает поставщиков, производителей, клиентов, договоры, приложения и поставки в одном контуре.', benefit: 'Данные становятся сопоставимыми, а документы и движения по поставкам — контролируемыми.' },
  { title: 'Marketplace sellers', problem: 'Каталоги на Shopify, Wildberries и Ozon расходятся по атрибутам, остаткам и идентификаторам.', solution: 'ikamdocs становится центральным каталогом с мэппингом и синхронизацией по SKU, wb_nm_id и offer_id.', benefit: 'Команда управляет каталогом централизованно и перестаёт поддерживать несколько несвязанных источников.' },
  { title: 'Retail / enterprise', problem: 'Бизнесу нужен безопасный слой данных с ролями, API, audit log и управляемым доступом по компаниям.', solution: 'Tenant isolation, PostgreSQL RLS, API-ключи, impersonation и webhooks встроены в архитектуру продукта.', benefit: 'ikamdocs подходит не только для учёта, но и как B2B-платформа для сложных интеграционных сценариев.' },
]

export default function UseCases() {
  useEffect(() => { document.title = 'Сценарии — ikamdocs' }, [])
  return (
    <div style={{ background: 'var(--bg)' }}>
      <Section style={{ padding: '120px 0 64px' }} background="light">
        <SectionHeader label="Сценарии" title="Как ikamdocs используется в реальных процессах" description="Типовые сценарии: где ломается управление товарными данными, как платформа решает проблему и какой эффект получает бизнес." />
        <div className="mk-use-case-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28 }}>
          {CASES.map((item) => (
            <div key={item.title} className="mk-use-case-card" style={{ padding: 28 }}>
              <div className="mk-kicker" style={{ marginBottom: 16 }}>{item.title}</div>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)', marginBottom: 10 }}><strong>Проблема:</strong> {item.problem}</div>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)', marginBottom: 10 }}><strong>Решение:</strong> {item.solution}</div>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--accent)' }}><strong>Эффект:</strong> {item.benefit}</div>
            </div>
          ))}
        </div>
      </Section>
      <CTASection title="Нужен сценарий именно под ваш бизнес?" subtitle="Покажем, как ikamdocs адаптируется под производство, дистрибуцию, маркетплейсы или enterprise-интеграции." primaryLabel="Запросить демо" primaryHref="/request-demo.html" secondaryLabel="Получить кейсы" secondaryHref="/request-cases.html" />
    </div>
  )
}
