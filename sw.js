const PREFIX = 'nota-';
const CACHE = `${PREFIX}v40`;
const SHELL = ['./', './index.html', './styles.css', './app.js', './store.js', './auth.js', './ui.js', './screens.js', './statement.js',
  './xlsx.js', './kesh.js', './backup.js', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-512.png',
  './fonts/onest-latin-wght-normal.woff2', './fonts/outfit-latin-wght-normal.woff2', './i18n.js', './fonts/onest-cyrillic-wght-normal.woff2', './fonts/jetbrains-mono-latin-wght-normal.woff2', './fonts/jetbrains-mono-cyrillic-wght-normal.woff2',
  // PDF-разбор выписки должен работать и без сети
  './accounts.js', './vendor/pdf.min.mjs', './vendor/air-datepicker.js', './vendor/air-datepicker.css', './vendor/pdf.worker.min.mjs'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Удаляем только свои старые кэши: на github.io у других приложений тот же origin
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Сеть с таймаутом (свежая версия при хорошем интернете), иначе кэш.
// Подмена на index.html — только для переходов по страницам, не для скриптов и стилей.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') });
    const net = fetch(new Request(req, { cache: 'no-cache' })).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    });
    net.catch(() => {});
    try {
      return await (cached ? Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3000))]) : net);
    } catch {
      if (cached) return cached;
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
