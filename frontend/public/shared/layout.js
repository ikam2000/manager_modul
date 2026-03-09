/**
 * Общая шапка, подвал и скрипты аналитики.
 * Подключать на всех статических страницах: <script src="/shared/layout.js"></script>
 * Требует разметку: <div id="shared-header"></div> и <div id="shared-footer"></div>
 */
(function() {
  var theme = localStorage.getItem('ikamdocs_theme') || 'night';
  document.documentElement.setAttribute('data-theme', theme);

  function updateLogosForTheme() {
    var logo = theme === 'day' ? '/images/logo_white.png' : '/images/logo.png';
    document.querySelectorAll('#shared-header img[alt="ikamdocs"], #shared-footer img[alt="ikamdocs"], header img[alt="ikamdocs"], footer img[alt="ikamdocs"]').forEach(function(img) {
      img.src = logo;
    });
  }

  function load(id, url) {
    var el = document.getElementById(id);
    if (!el) return Promise.resolve();
    return fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(html) { el.innerHTML = html; })
      .catch(function() {});
  }

  load('shared-header', '/shared/header.html').then(function() {
    updateLogosForTheme();
    var details = document.querySelector('.header-nav-mobile');
    if (details) {
      details.querySelectorAll('.header-nav-dropdown a').forEach(function(a) {
        a.addEventListener('click', function() { details.removeAttribute('open'); });
      });
    }
  });
  load('shared-footer', '/shared/footer.html').then(updateLogosForTheme);

  /* Yandex.Metrika counter */
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  ym(62177743, 'init', { webvisor: true, clickmap: true, referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
})();
