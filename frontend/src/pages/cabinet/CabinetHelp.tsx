import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HelpCircle, ChevronDown, ChevronRight, Book, QrCode, FileText, Database, Settings, BarChart3 } from 'lucide-react'

type Section = { id: string; title: string; icon: React.ReactNode; items: { q: string; a: React.ReactNode; id?: string }[] }

const SECTIONS: Section[] = [
  {
    id: 'start',
    title: 'Начало работы',
    icon: <Book size={18} />,
    items: [
      { q: 'Как зарегистрироваться?', a: <>Перейдите в <Link to="/register" style={{ color: 'var(--accent)' }}>Регистрация</Link>. Укажите email, пароль, ФИО и название компании. После входа откроется личный кабинет.</> },
      { q: 'Как войти в систему?', a: <>Кнопка «Войти» в шапке или <Link to="/login" style={{ color: 'var(--accent)' }}>/login</Link>. Используйте email и пароль.</> },
      { q: 'Структура личного кабинета', a: <>Главная — сводка. Номенклатура — каталог с категориями, поставщиками, производителями, поставками. Документы — загрузка, привязка и договоры. Аналитика — отчёты. Печать QR — конструктор этикеток. Интеграции — API, webhooks. Профиль — настройки компании и пользователя.</> },
    ],
  },
  {
    id: 'entities',
    title: 'Номенклатура и каталог',
    icon: <Database size={18} />,
    items: [
      { q: 'Как добавить номенклатуру?', a: <>Номенклатура → «Добавить» или через импорт Excel в разделе Документы. Заполните код, название, категорию, подкатегорию.</> },
      { q: 'Категории и подкатегории', a: <>Номенклатура → в левом сайдбаре выберите Категории. Создайте категорию, затем подкатегорию. Номенклатура привязывается к категории и подкатегории.</> },
      { q: 'Как импортировать из Excel?', a: <>Документы → Импорт. Загрузите файл Excel с колонками: код, название, категория и др. Система сопоставит столбцы и создаст номенклатуру.</> },
      { q: 'Поставщики и производители', a: <>Номенклатура → Поставщики или через сайдбар. Добавьте контакты, ИНН. Можно добавлять вручную или по API/Webhooks. Производители привязываются к номенклатуре.</> },
      { q: 'Поставки', a: <>Поставки в сайдбаре или Номенклатура → Поставки. Укажите поставщика, номенклатуру, количество, дату изготовления. Используются для этикеток и отчётности.</> },
      { q: 'Договоры и спецификации', a: <>Документы → Договоры. Создайте договор к поставщику. Приложения (спецификации) в карточке договора. Документы можно фильтровать по категориям, поставщикам, производителям.</> },
    ],
  },
  {
    id: 'documents',
    title: 'Документы',
    icon: <FileText size={18} />,
    items: [
      { q: 'Как загрузить документ?', a: <>Документы → Загрузить. Выберите файл (PDF, JPEG, PNG, Excel). Укажите, к какой сущности привязать — номенклатура, поставщик, поставка и т.д.</> },
      { q: 'Какие форматы поддерживаются?', a: <>PDF, JPEG, PNG, Excel (.xlsx). Для паспортов и сертификатов используйте PDF или изображения.</> },
      { q: 'Просмотр и скачивание', a: <>В карточке сущности отображаются привязанные документы. Можно просмотреть в браузере или скачать. QR-страницы показывают документы для сканирования.</> },
    ],
  },
  {
    id: 'qr',
    title: 'QR-коды и печать этикеток',
    icon: <QrCode size={18} />,
    items: [
      { q: 'Как печатать QR-этикетки?', a: <>Печать QR → выберите категорию, подкатегорию или отдельные позиции → настройте поля на этикетке (чекбоксы) → выберите размер листа и количество наклеек → Печать.</> },
      { q: 'Кастомный размер листа и наклейки', a: <>В настройках печати: «Кастомный лист» — введите ширину и высоту в мм; «Кастомная наклейка» — размер одной наклейки; «Колонок» и «Строк» — сетка на листе.</> },
      { q: 'Поля на этикетке', a: <>Обязательные по ТЗ: наименование, поставщик, контакт, код изделия, код объекта, договор, спецификация, дата изготовления, QR + код под ним. Можно скрыть ненужные чекбоксами.</> },
      { q: 'Отдельный QR для сущности', a: <>Создать QR-код → выберите сущность (номенклатура, поставщик и т.д.) → сгенерируйте и скачайте изображение.</> },
    ],
  },
  {
    id: 'integrations',
    title: 'Интеграции',
    icon: <Settings size={18} />,
    items: [
      { q: 'Как настроить API?', a: <>Интеграции → REST API → создайте ключ. Сохраните его — он показывается один раз. Базовый URL: /api/v1/integrate. Заголовок: X-Api-Key.</> },
      { q: 'Где документация API?', a: <>Документация OpenAPI: <a href="/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>/docs</a> (Swagger UI).</> },
      { q: 'Webhooks', a: <>Интеграции → Webhooks. Добавьте URL, выберите события (номенклатура создана, поставка обновлена и т.д.). При изменениях система отправит POST на ваш endpoint.</> },
      { q: 'Модули 1С / ERP', a: <>Используйте REST API. Обработка для 1С — по запросу. Zapier, Make, n8n — через webhooks и API.</> },
      { q: 'OAuth-подключения (Shopify, Wildberries, Ozon)', a: <>Интеграции → Подключения. OAuth-подключение к маркетплейсам и магазинам. Для каждого провайдера есть инструкция ниже.</>, id: 'integrations-oauth' },
    ],
  },
  {
    id: 'oauth-shopify',
    title: 'Подключение Shopify',
    icon: <Settings size={18} />,
    items: [
      { q: 'Как подключить Shopify?', a: <>1) Создайте приложение в <a href="https://partners.shopify.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Shopify Partners</a>. 2) Укажите Redirect URL: <code>https://ikamdocs.ru/api/cabinet/integrations/oauth/shopify/callback</code>. 3) Скопируйте API Key (Client ID) и API Secret. 4) Администратор ikamdocs добавляет их в настройки. 5) В Интеграциях укажите адрес магазина (mystore.myshopify.com) и нажмите «Подключить».</>, id: 'shopify' },
      { q: 'Обновление доступа', a: <>Если токен истёк — нажмите «Обновить» в карточке Shopify. Повторная авторизация через OAuth.</> },
      { q: 'Отключение', a: <>Кнопка «Отключить» удаляет сохранённый токен. Синхронизация прекратится.</> },
    ],
  },
  {
    id: 'oauth-wildberries',
    title: 'Подключение Wildberries',
    icon: <Settings size={18} />,
    items: [
      { q: 'Как подключить Wildberries?', a: <>1) Зарегистрируйте приложение в <a href="https://seller.wildberries.ru" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Личном кабинете продавца WB</a>. 2) Укажите Redirect URI. 3) Администратор добавляет Client ID и Secret. 4) В Интеграциях нажмите «Подключить».</>, id: 'wildberries' },
      { q: 'Обновление и отключение', a: <>«Обновить» — повторная OAuth-авторизация. «Отключить» — удаление связи.</> },
    ],
  },
  {
    id: 'oauth-ozon',
    title: 'Подключение Ozon',
    icon: <Settings size={18} />,
    items: [
      { q: 'Как подключить Ozon Seller?', a: <>1) В <a href="https://seller.ozon.ru" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>кабинете продавца Ozon</a> создайте приложение API. 2) Укажите Redirect URL для OAuth. 3) Администратор добавляет credentials. 4) В Интеграциях нажмите «Подключить».</>, id: 'ozon' },
      { q: 'Обновление и отключение', a: <>«Обновить» — повторная авторизация. «Отключить» — разрыв связи.</> },
    ],
  },
  {
    id: 'analytics',
    title: 'Аналитика',
    icon: <BarChart3 size={18} />,
    items: [
      { q: 'Что показывает дашборд?', a: <>Сводки по номенклатуре, поставкам, документам. Графики и отчёты. Доступ зависит от роли пользователя.</> },
      { q: 'Выгрузка отчётов', a: <>Аналитика → выберите отчёт → экспорт в Excel или PDF.</> },
    ],
  },
  {
    id: 'support',
    title: 'Поддержка',
    icon: <HelpCircle size={18} />,
    items: [
      { q: 'Как создать тикет?', a: <><Link to="/cabinet/tickets" style={{ color: 'var(--accent)' }}>Тикеты</Link> → Новый тикет. Опишите проблему. Ответы приходят в разделе и в уведомлениях.</> },
      { q: 'Как предложить идею?', a: <><Link to="/cabinet/suggestions" style={{ color: 'var(--accent)' }}>Предложить идею</Link>. Вы получите уведомления о получении, рассмотрении и благодарности.</> },
      { q: 'Уведомления', a: <>В шапке кабинета — колокольчик. Уведомления о новых ответах по тикетам, обновлениях по предложениям и других событиях.</> },
    ],
  },
]

export default function CabinetHelp() {
  const { hash } = useLocation()
  const [openSection, setOpenSection] = useState<string | null>('start')

  useEffect(() => {
    const anchor = hash.replace('#', '')
    if (anchor) {
      const sectionId = { shopify: 'oauth-shopify', wildberries: 'oauth-wildberries', ozon: 'oauth-ozon', 'integrations-oauth': 'integrations' }[anchor] || anchor
      setOpenSection(sectionId)
      setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [hash])

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Справка</h1>
          <p className="ds-lead">
            Полный справочник по настройке и использованию ikamdocs.
          </p>
        </div>
      </div>

      <div className="ds-card">
        <div className="ds-cardBody">
          {SECTIONS.map((sec) => {
            const isOpen = openSection === sec.id
            return (
              <div key={sec.id} id={sec.id} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : sec.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    background: isOpen ? 'rgba(14,165,233,0.08)' : 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  {sec.icon}
                  {sec.title}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {sec.items.map((item, i) => (
                      <div key={i} id={item.id || `${sec.id}-${i}`} style={{ marginTop: 16, paddingTop: 16, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.q}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{item.a}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
