(function () {
  const body = document.body
  const menuBtn = document.querySelector('[data-mobile-menu]')
  const nav = document.querySelector('.nav')
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.style.display === 'flex'
      nav.style.display = open ? 'none' : 'flex'
      nav.style.position = 'absolute'
      nav.style.top = '72px'
      nav.style.left = '20px'
      nav.style.right = '20px'
      nav.style.padding = '14px'
      nav.style.border = '1px solid rgba(255,255,255,.08)'
      nav.style.borderRadius = '20px'
      nav.style.background = 'rgba(8,12,24,.95)'
      nav.style.flexDirection = 'column'
      nav.style.zIndex = '200'
    })
  }

  document.querySelectorAll('[data-animate-line]').forEach((path, i) => {
    const length = path.getTotalLength ? path.getTotalLength() : 500
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    path.animate([
      { strokeDashoffset: length, opacity: 0.1 },
      { strokeDashoffset: 0, opacity: 1 }
    ], {
      duration: 1900 + i * 160,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out'
    })
  })

  document.querySelectorAll('[data-pulse]').forEach((node, i) => {
    node.animate([
      { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgba(103,232,249,0))' },
      { transform: 'scale(1.05)', filter: 'drop-shadow(0 0 12px rgba(103,232,249,.45))' },
      { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgba(103,232,249,0))' }
    ], {
      duration: 2200 + i * 120,
      iterations: Infinity,
      easing: 'ease-in-out'
    })
  })

  const nodes = [...document.querySelectorAll('.map-node')]
  const panel = document.querySelector('[data-map-panel]')
  const text = {
    suppliers: {
      title: 'Suppliers',
      body: 'Реквизиты, ИНН, версии прайсов, источники загрузки и SLA по обновлениям.',
      extra: 'Каждое обновление получает audit trail и связывается с импортом, пользователем и downstream sync.'
    },
    intake: {
      title: 'Data Intake',
      body: 'Файлы Excel, API, email parsers и ручная загрузка приводятся к единому каноническому формату.',
      extra: 'Mapping layer отделяет входной формат поставщика от внутренней модели данных.'
    },
    catalog: {
      title: 'Product Catalog',
      body: 'SKU, category, attributes, specs, versions, supplier links и статусы readiness.',
      extra: 'Каталог становится центром для UI, аналитики, документов и интеграций.'
    },
    documents: {
      title: 'Documents',
      body: 'Сертификаты, декларации, инструкции, спецификации и история ревизий.',
      extra: 'Документы привязаны к SKU, поставщику, поставке и статусам compliance.'
    },
    qr: {
      title: 'QR Layer',
      body: 'Генерация кодов, контроль валидности, печать и связь с warehouse workflows.',
      extra: 'QR делает traceability частью повседневных операций, а не отдельным ручным процессом.'
    },
    sync: {
      title: 'Sync Engine',
      body: 'Очереди обновлений, diff engine, retries, webhooks, rate limits и downstream policies.',
      extra: 'Изменения не перезаписывают слепо данные, а проходят policy-based orchestration.'
    },
    channels: {
      title: 'Channels',
      body: 'Ozon, Wildberries, Shopify, ERP, BI и custom API consumers.',
      extra: 'Каждый канал получает только свою projection-модель, а не прямой доступ к мастер-данным.'
    },
    audit: {
      title: 'Audit + Security',
      body: 'RLS, tenant isolation, API key scopes, log retention и контур расследования изменений.',
      extra: 'Security встроена в data path, а не оформлена отдельным документом после релиза.'
    }
  }
  function activateNode(node) {
    nodes.forEach(n => n.classList.remove('active'))
    node.classList.add('active')
    if (!panel) return
    const entry = text[node.dataset.node]
    if (!entry) return
    panel.innerHTML = `<div class="card"><h3>${entry.title}</h3><p>${entry.body}</p><div class="callout">${entry.extra}</div></div>`
  }
  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => activateNode(node))
    node.addEventListener('click', () => activateNode(node))
  })
  if (nodes[0]) activateNode(nodes[0])

  document.querySelectorAll('[data-parallax]').forEach((el, index) => {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * (index + 1) * 5
      const y = (e.clientY / window.innerHeight - 0.5) * (index + 1) * 5
      el.style.transform = `translate(${x}px, ${y}px)`
    })
  })

  const year = document.querySelector('[data-year]')
  if (year) year.textContent = String(new Date().getFullYear())
})();
