# Общая шапка, подвал и аналитика

Эти файлы подключаются на **статических HTML-страницах** (лендинг, архитектура, deck).

## Файлы
- `header.html` — шапка с навигацией
- `footer.html` — подвал с © 2026 ikamdocs и ссылками
- `layout.js` — загружает header/footer и скрипты аналитики

## Использование
На странице должны быть элементы:
```html
<div id="shared-header"></div>
<!-- контент -->
<div id="shared-footer"></div>
<script src="/shared/layout.js"></script>
```

## Аналитика
Скрипты метрики добавлять в `layout.js` в конце файла (раздел с комментарием).

Для React-страниц (login, privacy и т.п.) — в `src/shared/siteConfig.ts` массив `ANALYTICS_SCRIPTS`.
