export default function Company() {
  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.75rem', fontWeight: 600 }}>
          О компании
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7, fontSize: '0.9375rem' }}>
          ikamdocs — сервис для управления документами, номенклатурой и поставками. Мы помогаем компаниям
          централизованно хранить сопроводительную документацию, интегрироваться с 1С, ERP и CRM,
          печатать этикетки с QR-кодами и вести аналитику.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7, fontSize: '0.9375rem' }}>
          Данные хранятся на российских серверах. Мы соблюдаем требования 152-ФЗ, GDPR и международных
          стандартов ISO 27001.
        </p>
        <h2 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Контакты
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Сайт: ikamdocs.ru<br />
          Email: <a href="mailto:ikam2000@yandex.ru" style={{ color: 'var(--accent)' }}>ikam2000@yandex.ru</a>
        </p>
      </div>
    </div>
  )
}
