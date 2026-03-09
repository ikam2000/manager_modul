import { useEffect } from 'react'
import { Section, SectionHeader, FeatureGrid, SecurityCard, ArchitectureDiagram, CTASection } from '../components/marketing'
import { useTheme } from '../contexts/ThemeContext'
import { formHref } from '../shared/formHref'

const ITEMS = [
  { kicker: 'Изоляция', title: 'Tenant isolation', description: 'Данные компаний изолируются по company_id и tenant-контексту во всех ключевых маршрутах.' },
  { kicker: 'База данных', title: 'PostgreSQL RLS', description: 'Row-level security для suppliers, documents, api_keys, oauth_connections, mapping_profiles и sync_logs.' },
  { kicker: 'Интеграции', title: 'Encrypted integrations', description: 'OAuth-токены и API-ключи шифруются, а секреты маскируются в логах.' },
  { kicker: 'Webhook', title: 'Replay protection', description: 'Идемпотентность, защита от повторных событий и проверка подписи webhook.' },
  { kicker: 'Доступ', title: 'Roles & impersonation', description: 'Супер-админ, админ клиента и пользователь с ограничениями по действиям и доступам.' },
  { kicker: 'API', title: 'Scopes и expiration', description: 'API-ключи работают по scope, сроку действия и ограничению частоты запросов.' },
]

export default function Security() {
  const { theme } = useTheme()
  useEffect(() => { document.title = 'Безопасность — ikamdocs' }, [])
  return (
    <div style={{ background: 'var(--bg)' }}>
      <Section style={{ padding: '120px 0 64px' }} background="default">
        <SectionHeader label="Безопасность" title="Архитектура для данных, интеграций и enterprise-сценариев" description="Безопасность ikamdocs строится вокруг tenant isolation, RLS, контроля webhook, шифрования интеграций и журнала действий." />
        <div style={{ marginTop: 40, marginBottom: 56 }}><ArchitectureDiagram /></div>
        <FeatureGrid columns={3}>{ITEMS.map((item) => <SecurityCard key={item.title} kicker={item.kicker} title={item.title} description={item.description} />)}</FeatureGrid>
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <a href={formHref('/request-security.html', theme)} className="btn-mk-primary">Запросить описание безопасности</a>
          <a href="/architecture.html" className="btn-mk-secondary" style={{ marginLeft: 16 }}>Архитектура →</a>
        </div>
      </Section>
      <CTASection title="Нужна платформа с понятной моделью безопасности?" subtitle="Покажем, как в ikamdocs устроены tenant isolation, RLS, roles, API-ключи и защита интеграций." primaryLabel="Получить описание безопасности" primaryHref="/request-security.html" secondaryLabel="Запросить демо" secondaryHref="/request-demo.html" />
    </div>
  )
}
