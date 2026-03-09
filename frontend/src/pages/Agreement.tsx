export default function Agreement() {
  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: 600 }}>
          Соглашение о персональных данных
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
          Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7, fontSize: '0.9375rem' }}>
          Настоящим я подтверждаю своё согласие на обработку моих персональных данных оператором
          сервиса ikamdocs в целях регистрации, предоставления услуг и исполнения договора.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
          Согласие может быть отозвано путём направления письменного уведомления на ikam2000@yandex.ru.
        </p>
      </div>
    </div>
  )
}
