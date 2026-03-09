export default function HowItWorks() {
  const steps = [
    { n: 1, title: 'Регистрация', desc: 'Создайте аккаунт и добавьте компанию. Укажите ИНН для выставления счетов.' },
    { n: 2, title: 'Загрузка данных', desc: 'Добавьте номенклатуру, поставщиков, поставки, договоры. Загрузите документы (паспорта, сертификаты, спецификации).' },
    { n: 3, title: 'QR-коды и этикетки', desc: 'Каждая сущность получает QR. Используйте конструктор для печати этикеток под ваш принтер.' },
    { n: 4, title: 'Интеграция', desc: 'Подключите 1С, ERP или CRM по API. Выберите сущности для синхронизации.' },
    { n: 5, title: 'Аналитика', desc: 'Смотрите отчёты, планируйте поставки, выгружайте данные.' },
  ]

  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 600 }}>
          Как это работает
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '0.9375rem' }}>
          Пять шагов до полноценной работы с ikamdocs
        </p>
        {steps.map((s) => (
          <div
            key={s.n}
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginBottom: '2rem',
              padding: '1.25rem',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--accent)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              {s.n}
            </div>
            <div>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '1.0625rem', fontWeight: 600 }}>{s.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
