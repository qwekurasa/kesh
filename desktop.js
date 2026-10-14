// На компьютере открываем сайт с аналитикой и инструкциями; ?app — веб-приложение
(function () {
  try {
    if (/[?&]app\b/.test(location.search)) sessionStorage.setItem('kApp', '1');
    var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!standalone && !sessionStorage.getItem('kApp') && matchMedia('(min-width: 1024px) and (pointer: fine)').matches) location.replace('./web/');
  } catch (e) { /* без перенаправления */ }
})();
