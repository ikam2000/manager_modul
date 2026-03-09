import { Link } from 'react-router-dom'

export default function CabinetDesignComponents() {
  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Компоненты</h1>
          <p className="ds-lead">Кнопки, поля, таблица и карточки в едином стиле. Всё через CSS-переменные и классы.</p>
        </div>
      </div>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Кнопки</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-btnRow">
              <button className="btn-primary">Primary</button>
              <button className="btn-secondary">Secondary</button>
              <button className="btn-tertiary">Tertiary</button>
            </div>
            <div className="ds-hint">Primary с лёгким glow, единые радиусы/высоты, аккуратный hover.</div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Поля ввода</div>
          </div>
          <div className="ds-cardBody">
            <div className="ds-fieldGrid">
              <label className="ds-label">
                Обычное поле
                <input className="ds-input" type="text" placeholder="Например: Название товара" />
              </label>
              <label className="ds-label">
                Выпадающий список
                <select className="ds-select">
                  <option>Выберите тип</option>
                  <option>Товар</option>
                  <option>Поставка</option>
                  <option>Документ</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Таблица (пример)</div>
          </div>
          <div className="ds-cardBody ds-tableWrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Колонка 1</th>
                  <th>Колонка 2</th>
                  <th>Колонка 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Строка 1</td>
                  <td>Данные</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Строка 2</td>
                  <td>Данные</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
            <div className="ds-hint">Ваши реальные таблицы остаются на `.data-list`. Это отдельный scoped пример.</div>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-grid ds-grid-3">
          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">Обычная карточка</div>
            </div>
            <div className="ds-cardBody">Контейнер для сущности / настроек / виджетов.</div>
          </div>

          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle">KPI карточка</div>
            </div>
            <div className="ds-cardBody">
              <div className="ds-kpiValue" style={{ fontSize: 28 }}>42</div>
              <div className="ds-hint">Шаблон KPI с сильной цифрой.</div>
            </div>
          </div>

          <Link to="#" className="ds-navCard">
            <div className="ds-navCardLabel">Ссылка-карточка</div>
            <div className="ds-hint">Подходит для навигации и summary.</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
