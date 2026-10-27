// Запуск только на оригинальном адресе
const h = location.hostname;
const ok = ['keshi-ik.vercel.app', 'kesh-money.vercel.app', 'kesh-ecru.vercel.app', 'qwekurasa.github.io', 'localhost', '127.0.0.1'].includes(h) || h.endsWith('-artemdriller-gmailcoms-projects.vercel.app');
if (!ok) {
  document.documentElement.innerHTML = '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#09090A;color:#ECECEE;font:16px system-ui;text-align:center;padding:24px">'
    + '<div><p style="font-size:20px;font-weight:600">Это неофициальная копия Кэша</p><p>Оригинал: <a style="color:#A6F0C6" href="https://keshi-ik.vercel.app/">keshi-ik.vercel.app</a></p></div></body>';
  throw new Error('kesh: unofficial host');
}
