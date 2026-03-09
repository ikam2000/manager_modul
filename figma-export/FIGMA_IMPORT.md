# Импорт макета ikamdocs в Figma

## Вариант 1: html.to.design (плагин Figma)

1. Установите плагин [html.to.design](https://www.figma.com/community/plugin/1159123024924461424/html-to-design) в Figma.
2. Запустите локальный сервер из папки `ikamdocs`:
   ```bash
   cd ikamdocs
   npx serve .
   ```
3. Откройте в браузере: `http://localhost:3000/figma-export/ikamdocs-design.html`
   (или запустите `npx serve figma-export` из ikamdocs и откройте `http://localhost:3000/ikamdocs-design.html`)
4. В Figma: Plugins → html.to.design → вставьте URL страницы и нажмите Import.

## Вариант 2: Скриншоты (Place image)

1. Откройте файл `ikamdocs-design.html` в браузере (двойной клик или File → Open).
2. Сделайте скриншоты нужных секций (Cmd+Shift+4 на Mac или инструмент разработчика).
3. В Figma: перетащите PNG на холст или Place image (Cmd+K / Ctrl+K).

## Вариант 3: Разделение на фреймы

Откройте HTML в браузере и сохраните скриншоты каждой секции отдельно:
- Header (шапка)
- Hero (главный экран)
- Проблема (Разрозненные данные)
- Решение (Единое ядро)
- Как это работает
- Интеграции
- Footer

Потом загрузите каждую как изображение в Figma и расположите на артборде.

## Размер макета

Ширина: **1440px** (стандартный десктоп).

## Цветовая палитра (для Figma Variables)

| Название | Hex |
|----------|-----|
| bg | #060a12 |
| bg-secondary | #0c1220 |
| surface | #111827 |
| accent | #0ea5e9 |
| text | #f1f5f9 |
| text-secondary | #94a3b8 |
| light-bg | #f8fafc |
| light-surface | #ffffff |
