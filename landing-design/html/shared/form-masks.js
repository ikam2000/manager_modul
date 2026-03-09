/**
 * Маски ввода для форм: телефон +7 (___) ___-__-__, валидация email.
 */
(function() {
  function phoneMask(input) {
    if (!input) return;
    var keyDown = function(e) {
      var v = input.value.replace(/\D/g, '');
      if (e.key === 'Backspace' && v.length <= 1) { input.value = ''; e.preventDefault(); return; }
    };
    var inputEv = function() {
      var v = input.value.replace(/\D/g, '');
      if (v.length > 0) {
        if (v[0] === '8' || v[0] === '7') v = v.substr(1);
        var r = v.match(/(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
        input.value = '+7';
        if (r[1]) input.value += ' (' + r[1];
        if (r[2]) input.value += ') ' + r[2];
        if (r[3]) input.value += '-' + r[3];
        if (r[4]) input.value += '-' + r[4];
      }
    };
    input.addEventListener('keydown', keyDown);
    input.addEventListener('input', inputEv);
    if (input.value) inputEv();
  }
  function init() {
    document.querySelectorAll('[data-phone-mask]').forEach(phoneMask);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
