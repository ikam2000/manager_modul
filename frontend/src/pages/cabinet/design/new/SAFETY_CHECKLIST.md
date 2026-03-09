# Safety checklist

Перед merge:
- [ ] Night/day темы работают одинаково хорошо
- [ ] `btn-primary` / `btn-secondary` визуально не сломались
- [ ] `data-list` таблицы не потеряли sticky-header (где нужно)
- [ ] Мобилка: <=480px — нет горизонтального скролла
- [ ] Hover/Active: нет резких скачков layout (transform только на карточках)
- [ ] Контраст текста достаточный (особенно secondary)
- [ ] Нет новых селекторов вида `[style*="..."]`
