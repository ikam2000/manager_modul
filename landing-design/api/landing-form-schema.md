# API форм заявок — `/landing-form`

**Endpoint:** `POST /landing-form`  
**Content-Type:** `application/json`

## Request body

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `subject` | string | да | Тема заявки (отправляется в заголовок письма) |
| `name` | string | да | Имя контакта |
| `email` | string | да | Email (валидация: наличие @ и точки после @) |
| `phone` | string | нет | Телефон |
| `company` | string | нет | Название компании |
| `message` | string | нет | Комментарий |

## Response

**Успех (200):**
```json
{"ok": true, "message": "Заявка отправлена"}
```

**Ошибка валидации (422):**
```json
{
  "detail": [
    {"loc": ["body", "email"], "msg": "Некорректный email", "type": "value_error"}
  ]
}
```

**Ошибка сервера (500):**
```json
{"detail": "Не удалось отправить заявку. Попробуйте позже."}
```

## Пример запроса (fetch)

```javascript
fetch('/landing-form', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Запрос на демо — ikamdocs',
    name: 'Иван Иванов',
    email: 'ivan@company.ru',
    phone: '+7 (999) 123-45-67',
    company: 'ООО Пример',
    message: 'Интересует демонстрация платформы'
  })
})
.then(r => r.json())
.then(data => {
  if (data.ok) { /* успех */ }
  else { /* ошибка в data.detail */ }
});
```

## Важно

При локальной разработке HTML-страниц нужен прокси на backend. В основном проекте (vite) настроено:

```javascript
'/landing-form': { target: 'http://localhost:8000', changeOrigin: true }
```

При работе только с папкой `html/` — либо запускать backend отдельно на :8000 и поднимать CORS, либо подключать формы к реальному API через полный URL после деплоя.
