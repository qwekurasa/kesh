// Сайт для компьютера: аналитика по резервной копии с телефона и инструкции по установке.
// Файл копии разбирается прямо в браузере и никуда не отправляется.
import '../guard.js';
import { L, EN, LANG, setLang, CURRENCIES, CURRENCY } from '../i18n.js';
import { CAT } from '../ui.js'; // раньше kesh.js: у них взаимный импорт
import { catAvatar } from '../kesh.js';
import { playIntro, scene } from './intro.js';
import { checkBackup } from '../backup.js';
import { writeXlsx } from '../xlsx.js';

const root = document.getElementById('root');
const KEY = 'webBackup';
const BUILD_WEB = '1.2';
const APP = 'https://kesh-money.vercel.app/';
const DL = `${APP}dl/`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  overview: ic('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  ops: ic('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  install: ic('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 18h.01"/>'),
  upload: ic('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  download: ic('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  left: ic('<path d="M15 18l-6-6 6-6"/>'),
  right: ic('<path d="M9 18l6-6-6-6"/>'),
  search: ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  lock: ic('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  app: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>'),
  side: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
  more: ic('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  globe: ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  trash: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  chart: ic('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  filePlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/></svg>',
};

/* ---------- состояние ---------- */
let raw = null; // исходный JSON копии (для экспорта обратно)
let data = null; // проверенные данные
const view = { page: (location.hash.slice(1) || 'overview'), mode: 'month', anchor: new Date(), q: '', type: 'all', cat: '', limit: 100, inst: 'iphone', error: '' };
if (!['overview', 'ops', 'install'].includes(view.page)) view.page = 'overview';

function load(json, persist) {
  const r = checkBackup(json);
  if (!r.ok) return r.error;
  if (!r.transactions.length) return L('В копии нет операций', 'The backup has no transactions');
  raw = json;
  data = r;
  data.transactions.sort((a, b) => b.ts - a.ts);
  if (persist) { try { localStorage.setItem(KEY, JSON.stringify(json)); } catch { /* большой файл — только на эту сессию */ } }
  const last = new Date(data.transactions[0].ts);
  view.anchor = last;
  return '';
}
try { const saved = localStorage.getItem(KEY); if (saved) load(JSON.parse(saved), false); } catch { /* повреждённая запись */ }

/* ---------- форматирование ---------- */
const LOC = EN ? 'en-US' : 'ru-RU';
const cur = () => { const c = raw?.preferences?.currency; return CURRENCIES.some(([x]) => x === c) ? c : CURRENCY; };
const fmt = (min) => new Intl.NumberFormat(LOC, { style: 'currency', currency: cur(), currencyDisplay: 'narrowSymbol', minimumFractionDigits: min, maximumFractionDigits: 2 });
const money = (kop) => (kop % 100 ? fmt(2) : fmt(0)).format(kop / 100).replace(/^-/, '−');
const short = (kop) => new Intl.NumberFormat(LOC, { notation: 'compact', maximumFractionDigits: 1 }).format(kop / 100);
const MONTHS = L(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const MON = L(['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const dateStr = (ts) => { const d = new Date(ts); return L(`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`, `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`); };
const isIn = (i) => i.type === 'in';
const sum = (list) => list.reduce((s, i) => s + i.amount, 0);

function cat(id) {
  const own = data?.categories.find((c) => c.id === id);
  if (own) return { name: own.name, color: own.color || '#9a9aa4' };
  return CAT[id] ? { name: CAT[id].name, color: CAT[id].color } : { name: id || L('Без категории', 'Uncategorized'), color: '#9a9aa4' };
}

/* ---------- период ---------- */
function range(shift = 0) {
  const a = view.anchor;
  if (view.mode === 'month') return [new Date(a.getFullYear(), a.getMonth() + shift, 1).getTime(), new Date(a.getFullYear(), a.getMonth() + shift + 1, 1).getTime()];
  if (view.mode === 'year') return [new Date(a.getFullYear() + shift, 0, 1).getTime(), new Date(a.getFullYear() + shift + 1, 0, 1).getTime()];
  if (shift) return null;
  const t = data.transactions;
  const first = new Date(t[t.length - 1].ts);
  return [new Date(first.getFullYear(), first.getMonth(), 1).getTime(), Date.now() + 1];
}
const inRange = (r) => (r ? data.transactions.filter((i) => i.ts >= r[0] && i.ts < r[1]) : []);
function periodLabel() {
  const a = view.anchor;
  if (view.mode === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  if (view.mode === 'year') return String(a.getFullYear());
  return L('Всё время', 'All time');
}

/* ---------- каркас: строится один раз, дальше меняются только части ---------- */
const mini = () => { try { return localStorage.getItem('webMini') === '1'; } catch { return false; } };
function frame() {
  const nav = (id, icon, label) => `<button class="nav" data-page="${id}" title="${label}">${icon}<span>${label}</span><em class="count" data-count="${id}"></em></button>`;
  root.innerHTML = `<div class="frame${mini() ? ' mini' : ''}" id="frame">
    <span class="frame-tag">Web</span>
    <aside class="side">
      <div class="side-top"><div class="brand"><img src="../icon-180.png" alt=""><span>${L('Кэш', 'Kesh')}</span></div></div>
      <div class="group"><div class="g-label">${L('Аналитика', 'Analytics')}</div>
        ${nav('overview', I.overview, L('Обзор', 'Overview'))}
        ${nav('ops', I.ops, L('Операции', 'Transactions'))}
      </div>
      <div class="group"><div class="g-label">${L('Устройства', 'Devices')}</div>
        ${nav('install', I.install, L('Установка', 'Install'))}
        <a class="nav" href="../?app" title="${L('Веб-приложение', 'Web app')}">${I.app}<span>${L('Веб-приложение', 'Web app')}</span></a>
      </div>
      <div class="group" id="g-data"></div>
      <div class="pet" id="pet"></div>
      <div class="side-foot">
        <button class="nav" data-act="lang" title="${L('Язык', 'Language')}">${I.globe}<span>${L('Язык', 'Language')}</span><em class="lang-v">${EN ? 'EN' : 'RU'}</em></button>
        <div class="user" id="user"></div>
      </div>
    </aside>
    <section class="panel">
      <header class="phead"><button class="icon-btn" data-act="mini" aria-label="${L('Свернуть меню', 'Toggle sidebar')}">${I.side}</button><span class="sep"></span><h1 id="ptitle"></h1><div class="phead-right" id="pactions"></div></header>
      <div class="pbody" id="pbody"></div>
    </section>
  </div><div class="tip" id="tip"></div><input type="file" id="file" accept=".json,application/json" hidden>`;
}
const shell = (title, actions, body) => ({ title, actions, body });
function chrome() {
  document.querySelectorAll('.nav[data-page]').forEach((n) => n.classList.toggle('on', n.dataset.page === view.page));
  const c = document.querySelector('[data-count="ops"]');
  c.textContent = data ? data.transactions.length : '';
  document.getElementById('g-data').innerHTML = data ? `<div class="g-label">${L('Данные', 'Data')}</div>
    <button class="nav" data-act="pick" title="${L('Обновить копию', 'Update backup')}">${I.upload}<span>${L('Обновить копию', 'Update backup')}</span></button>
    <button class="nav danger" data-act="forget" title="${L('Удалить с компьютера', 'Remove from computer')}">${I.trash}<span>${L('Удалить с компьютера', 'Remove from computer')}</span></button>` : '';
  const name = raw?.account?.login || L('Гость', 'Guest');
  const skin = Number(raw?.preferences?.avatarSkin) || 0;
  document.getElementById('user').innerHTML = `<span class="u-ava">${data ? catAvatar(skin, true) : esc(name[0])}</span><span class="u-name">${esc(name)}<small>${data ? `${L('копия от', 'backup')} ${dateStr(data.transactions[0].ts)}` : L('данные не загружены', 'no data loaded')}</small></span>`;
}

const ioButtons = () => `
  ${data ? `<span class="status ok"><i></i>${data.transactions.length} ${L('опер.', 'tx')}</span>` : `<span class="status"><i></i>${L('Нет данных', 'No data')}</span>`}
  ${data ? `<div class="menu" id="exp"><button class="btn primary" data-act="export">${I.download}${L('Экспорт', 'Export')}</button>
    <div class="menu-list">
      <button data-exp="xlsx">Excel <small>.xlsx</small></button>
      <button data-exp="csv">CSV <small>.csv</small></button>
      <button data-exp="json">${L('Копия для телефона', 'Backup for phone')} <small>.json</small></button>
    </div></div>` : ''}`;

const periodBar = () => `
  <div class="seg">${[['month', L('Месяц', 'Month')], ['year', L('Год', 'Year')], ['all', L('Всё', 'All')]].map(([m, t]) => `<button class="${view.mode === m ? 'on' : ''}" data-mode="${m}">${t}</button>`).join('')}</div>
  ${view.mode === 'all' ? '' : `<div class="period"><button class="arrow" data-shift="-1" aria-label="${L('Назад', 'Back')}">${I.left}</button><b>${periodLabel()}</b><button class="arrow" data-shift="1" ${range(1)[0] > Date.now() ? 'disabled' : ''} aria-label="${L('Вперёд', 'Forward')}">${I.right}</button></div>`}`;

/* ---------- пусто: как перенести данные ---------- */
function emptyView() {
  return `<div class="hero">
    <label class="drop" id="drop" data-act="pick">
      <div class="drop-icon">${I.filePlus}</div>
      <h2>${L('Перетащите сюда копию с телефона', 'Drop your phone backup here')}</h2>
      <p>${L('Файл .json из приложения «Кэш». Или нажмите, чтобы выбрать.', 'The .json file from the Kesh app. Or click to choose it.')}</p>
      ${view.error ? `<p class="err">${esc(view.error)}</p>` : ''}
      <span class="drop-meta">.JSON · ${L('до 30 МБ', 'up to 30 MB')} · ${L('локально', 'local only')}</span>
    </label>
    <div class="card">
      <div class="card-head"><h3>${L('Как получить файл', 'How to get the file')}</h3><span class="chip">1 ${L('минута', 'minute')}</span></div>
      <ol class="steps">
        <li>${L('В приложении на телефоне откройте <b>Профиль</b>.', 'On your phone, open <b>Profile</b> in the app.')}</li>
        <li>${L('Нажмите <b>Резервная копия</b> — появится файл <code>nota-backup-….json</code>.', 'Tap <b>Backup</b> — you get a <code>nota-backup-….json</code> file.')}</li>
        <li>${L('Отправьте его себе: Telegram «Избранное», AirDrop или почта.', 'Send it to yourself: Telegram Saved Messages, AirDrop or email.')}</li>
        <li>${L('Перетащите файл в окно слева — графики появятся сразу.', 'Drop the file on the left — charts appear right away.')}</li>
      </ol>
      <div class="privacy">${I.lock}<span>${L('Файл открывается прямо в браузере. На сервер ничего не загружается, регистрация не нужна.', 'The file is opened right in your browser. Nothing is uploaded, no sign-up needed.')}</span></div>
      <p style="margin-top:14px;color:var(--text-3);font-size:13px">${L('Ещё нет приложения?', 'No app yet?')} <a href="#install" data-page="install" style="color:var(--pos)">${L('Установите его за минуту', 'Install it in a minute')}</a></p>
    </div>
  </div>`;
}

/* ---------- обзор ---------- */
function delta(now, prev, good = false) {
  if (prev == null) return '';
  if (!prev) return now ? `<span class="delta flat">${L('нет данных раньше', 'no earlier data')}</span>` : '';
  const p = Math.round(((now - prev) / prev) * 100);
  const cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
  return `<span class="delta ${cls}${good ? ' good' : ''}">${p > 0 ? '+' : ''}${p}% ${L('к прошлому', 'vs prev')}</span>`;
}

function bars(items, r) {
  const out = items.filter((i) => !isIn(i));
  let buckets;
  const now = Date.now();
  if (view.mode === 'month') {
    const d0 = new Date(r[0]);
    const days = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
    buckets = Array.from({ length: days }, (_, k) => {
      const from = new Date(d0.getFullYear(), d0.getMonth(), k + 1).getTime();
      const to = from + 864e5;
      return { from, to, label: L(`${k + 1} ${MON[d0.getMonth()]}`, `${MON[d0.getMonth()]} ${k + 1}`), axis: k + 1 };
    });
  } else {
    const d0 = new Date(r[0]);
    const n = view.mode === 'year' ? 12 : Math.max(1, (new Date(r[1]).getFullYear() - d0.getFullYear()) * 12 + new Date(r[1]).getMonth() - d0.getMonth() + 1);
    buckets = Array.from({ length: n }, (_, k) => {
      const from = new Date(d0.getFullYear(), d0.getMonth() + k, 1);
      return { from: from.getTime(), to: new Date(from.getFullYear(), from.getMonth() + 1, 1).getTime(), label: `${MONTHS[from.getMonth()]} ${from.getFullYear()}`, axis: n > 14 ? `${MON[from.getMonth()]} ${String(from.getFullYear()).slice(2)}` : MON[from.getMonth()] };
    });
  }
  buckets.forEach((b) => { const list = out.filter((i) => i.ts >= b.from && i.ts < b.to); b.v = sum(list); b.n = list.length; });
  const peak = Math.max(...buckets.map((b) => b.v), 1);
  const ticks = [peak, peak / 2, 0];
  const step = Math.max(1, Math.ceil(buckets.length / 7));
  const axis = buckets.filter((_, k) => k % step === 0 || k === buckets.length - 1);
  return `<div class="bars">
      <div class="grid-lines">${ticks.map((t) => `<span>${short(t)}</span>`).join('')}</div>
      ${buckets.map((b) => `<div class="b${b.v ? '' : ' zero'}${now >= b.from && now < b.to ? ' now' : ''}" data-tip="${esc(b.label)}" data-v="${esc(money(b.v))}" data-n="${b.n}"><i style="height:${b.v ? Math.max(2, (b.v / peak) * 100) : 1}%"></i></div>`).join('')}
    </div>
    <div class="axis">${axis.map((b) => `<span>${b.axis}</span>`).join('')}</div>`;
}

function byCategory(list) {
  const m = new Map();
  list.forEach((i) => m.set(i.category, (m.get(i.category) || 0) + i.amount));
  return [...m].sort((a, b) => b[1] - a[1]);
}

function donut(list) {
  const cats = byCategory(list);
  const total = sum(list);
  if (!total) return `<div class="empty-list">${L('Расходов нет', 'No expenses')}</div>`;
  const top = cats.slice(0, 6);
  const rest = cats.slice(6).reduce((s, [, v]) => s + v, 0);
  const parts = top.map(([id, v]) => ({ name: cat(id).name, color: cat(id).color, v }));
  if (rest) parts.push({ name: L('Остальное', 'Other'), color: '#4A4A52', v: rest });
  const R = 52;
  const C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map((p) => {
    const len = (p.v / total) * C;
    const s = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" data-tip="${esc(p.name)}" data-v="${esc(money(p.v))}" data-n="${Math.round((p.v / total) * 100)}%"/>`;
    off += len;
    return s;
  }).join('');
  return `<div class="donut-wrap">
    <div class="donut"><svg viewBox="0 0 150 150" width="150" height="150">${arcs}</svg><div class="donut-mid"><small>${L('всего', 'total')}</small><b>${short(total)}</b></div></div>
    <div class="legend">${parts.map((p) => `<div><i style="background:${p.color}"></i><span>${esc(p.name)}</span><em>${Math.round((p.v / total) * 100)}%</em></div>`).join('')}</div>
  </div>`;
}

const ticks = (now, prev, n = 28, color = '') => {
  const k = Math.round((now / Math.max(now, prev || 0, 1)) * n);
  return `<div class="ticks">${Array.from({ length: n }, (_, i) => `<i class="${i < k ? 'on' : ''}"${i < k && color ? ` style="background:${color}"` : ''}></i>`).join('')}</div>`;
};
const sec = (n, t, extra = '') => `<div class="sec"><span>${String(n).padStart(2, '0')}</span>${t}${extra}</div>`;

// Накопленные расходы по ходу периода против прошлого — плавная линия с заливкой
function cumulative(items, prevItems, r) {
  const out = items.filter((i) => !isIn(i)).sort((a, b) => a.ts - b.ts);
  const pout = (prevItems || []).filter((i) => !isIn(i)).sort((a, b) => a.ts - b.ts);
  const span = r[1] - r[0];
  const N = 60;
  const series = (list, start) => { let acc = 0; let k = 0; return Array.from({ length: N + 1 }, (_, i) => { const t = start + (span * i) / N; while (k < list.length && list[k].ts <= t) acc += list[k++].amount; return acc; }); };
  const now = Math.min(N, Math.floor(((Date.now() - r[0]) / span) * N));
  const a = series(out, r[0]).slice(0, Math.max(1, now + 1));
  const b = prevItems ? series(pout, r[0] - span) : null;
  const peak = Math.max(...a, ...(b || [0]), 1);
  const W = 600; const H = 180;
  const pts = (arr) => arr.map((v, i) => [((i / N) * W).toFixed(1), (H - (v / peak) * (H - 12)).toFixed(1)]);
  const line = (arr) => { const p = pts(arr); return p.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(''); };
  const pa = pts(a);
  const last = pa[pa.length - 1];
  return `<svg class="cum" viewBox="0 0 ${W} ${H + 4}" preserveAspectRatio="none">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A6F0C0" stop-opacity=".28"/><stop offset="1" stop-color="#A6F0C0" stop-opacity="0"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${W}" y1="${H * f}" y2="${H * f}" class="cum-grid"/>`).join('')}
      ${b ? `<path d="${line(b)}" class="cum-prev"/>` : ''}
      <path d="${line(a)}L${last[0]} ${H}L0 ${H}Z" fill="url(#cg)"/>
      <path d="${line(a)}" class="cum-now"/>
    </svg>
    <div class="cum-legend"><span><i class="now"></i>${L('Этот период', 'This period')} · ${money(a[a.length - 1])}</span>${b ? `<span><i class="prev"></i>${L('Прошлый', 'Previous')} · ${money(b[b.length - 1])}</span>` : ''}</div>`;
}

function overview() {
  if (!data) return shell(L('Аналитика трат', 'Spending analytics'), ioButtons(), emptyView());
  const r = range();
  const pr = range(-1);
  const items = inRange(r);
  const prev = pr ? inRange(pr) : null;
  const out = items.filter((i) => !isIn(i));
  const spent = sum(out);
  const income = sum(items.filter(isIn));
  const diff = income - spent;
  const days = Math.max(1, Math.ceil((Math.min(r[1], Date.now()) - r[0]) / 864e5));
  const pSpent = prev && sum(prev.filter((i) => !isIn(i)));
  const pIncome = prev && sum(prev.filter(isIn));
  const pDays = pr ? Math.max(1, Math.round((pr[1] - pr[0]) / 864e5)) : 1;
  const cats = byCategory(out);
  const max = cats[0]?.[1] || 1;

  const body = `
    <div class="banner">${scene('xMidYMid slice', '0 300 1600 280')}<div class="banner-text"><small>${periodLabel()}</small><h2>${raw?.account?.login ? `${L('Привет', 'Hi')}, ${esc(raw.account.login)}.` : L('Ваши траты', 'Your spending')}</h2><p>${L('Потрачено', 'Spent')} <b>${money(spent)}</b>${income ? ` · ${L('получено', 'received')} <b>${money(income)}</b>` : ''}</p></div></div>
    <div class="toolbar">${periodBar()}</div>
    ${sec(1, L('Показатели', 'Key figures'), `<em>${periodLabel()}</em>`)}
    <div class="grid kpis">
      <div class="card kpi"><small>${L('Расходы', 'Spent')}</small><div class="val mono">${money(spent)}</div>${ticks(spent, pSpent)}<div class="kpi-foot">${delta(spent, pSpent)}<span>${L('пред.', 'prev')} ${prev ? short(pSpent) : '—'}</span></div></div>
      <div class="card kpi"><small>${L('Доходы', 'Income')}</small><div class="val mono ${income ? 'plus' : ''}">${income ? '+' : ''}${money(income)}</div>${ticks(income, pIncome, 28, 'var(--pos)')}<div class="kpi-foot">${delta(income, pIncome, true)}<span>${L('пред.', 'prev')} ${prev ? short(pIncome) : '—'}</span></div></div>
      <div class="card kpi"><small>${L('Разница', 'Net')}</small><div class="val mono ${diff > 0 ? 'plus' : diff < 0 ? 'minus' : ''}">${diff > 0 ? '+' : ''}${money(diff)}</div>${ticks(Math.min(spent, income), Math.max(spent, income), 28, diff >= 0 ? 'var(--pos)' : 'var(--neg)')}<div class="kpi-foot"><span class="delta flat">${income ? `${Math.round((spent / income) * 100)}% ${L('дохода потрачено', 'of income spent')}` : L('доходов нет', 'no income')}</span></div></div>
      <div class="card kpi"><small>${L('В среднем в день', 'Daily average')}</small><div class="val mono">${money(Math.round(spent / days))}</div>${ticks(spent / days, prev ? pSpent / pDays : 0)}<div class="kpi-foot">${prev ? delta(spent / days, pSpent / pDays) : ''}<span>${days} ${L('дн.', 'd')}</span></div></div>
    </div>
    ${sec(2, L('Динамика и структура', 'Trend & breakdown'))}
    <div class="grid row2">
      <div class="card"><div class="card-head"><h3>${view.mode === 'month' ? L('Расходы по дням', 'Daily spending') : L('Расходы по месяцам', 'Monthly spending')}</h3><span class="chip">${out.length} ${L('опер.', 'tx')}</span></div>${bars(items, r)}</div>
      <div class="card"><div class="card-head"><h3>${L('Структура', 'Breakdown')}</h3><span class="chip">${cats.length} ${L('кат.', 'cat.')}</span></div>${donut(out)}</div>
    </div>
    <div class="grid"><div class="card"><div class="card-head"><h3>${L('Накопительно', 'Cumulative')}</h3><span class="chip">${prev ? L('сравнение с прошлым', 'vs previous') : periodLabel()}</span></div>${cumulative(items, prev, r)}</div></div>
    ${sec(3, L('Детали', 'Details'))}
    <div class="grid row2">
      <div class="card"><div class="card-head"><h3>${L('Категории', 'Categories')}</h3><span class="chip">${L('топ', 'top')} ${Math.min(8, cats.length)}</span></div>
        ${cats.length ? cats.slice(0, 8).map(([id, v]) => { const c = cat(id); const n = out.filter((i) => i.category === id).length; return `<div class="cat-row"><span class="dot" style="background:${c.color}22;color:${c.color}">${esc(c.name.slice(0, 1).toUpperCase())}</span><div class="name">${esc(c.name)}<small>${n} ${L('опер.', 'tx')} · ${Math.round((v / spent) * 100)}%</small>${ticks(v, max, 40, c.color)}</div><span class="sum">${money(v)}</span></div>`; }).join('') : `<div class="empty-list">${L('Расходов нет', 'No expenses')}</div>`}
      </div>
      <div class="card"><div class="card-head"><h3>${L('Последние операции', 'Recent')}</h3><button class="chip" data-page="ops">${L('Все', 'All')} →</button></div>
        ${items.length ? items.slice(0, 8).map((i) => { const c = cat(i.category); return `<div class="cat-row"><span class="dot" style="background:${c.color}22;color:${c.color}">${esc(c.name.slice(0, 1).toUpperCase())}</span><div class="name">${esc(i.note || c.name)}<small>${esc(c.name)} · ${dateStr(i.ts)}</small></div><span class="sum${isIn(i) ? ' in' : ''}">${isIn(i) ? '+' : '−'}${money(i.amount)}</span></div>`; }).join('') : `<div class="empty-list">${L('В этом периоде пусто', 'Nothing in this period')}</div>`}
      </div>
    </div>`;
  return shell(L('Обзор', 'Overview'), ioButtons(), body);
}

/* ---------- операции ---------- */
function ops() {
  if (!data) return shell(L('Операции', 'Transactions'), ioButtons(), emptyView());
  const q = view.q.trim().toLowerCase();
  const list = data.transactions.filter((i) => (view.type === 'all' || (view.type === 'in') === isIn(i))
    && (!view.cat || i.category === view.cat)
    && (!q || `${i.note || ''} ${cat(i.category).name} ${i.amount / 100}`.toLowerCase().includes(q)));
  const used = [...new Set(data.transactions.map((i) => i.category))].map((id) => [id, cat(id).name]).sort((a, b) => a[1].localeCompare(b[1]));
  const total = sum(list.filter((i) => !isIn(i)));
  const body = `
    <div class="filters">
      <label class="search">${I.search}<input id="q" value="${esc(view.q)}" placeholder="${L('Поиск по описанию, категории, сумме', 'Search notes, categories, amounts')}"></label>
      <div class="seg">${[['all', L('Все', 'All')], ['out', L('Расходы', 'Spent')], ['in', L('Доходы', 'Income')]].map(([t, n]) => `<button class="${view.type === t ? 'on' : ''}" data-type="${t}">${n}</button>`).join('')}</div>
      <select class="sel" id="catf"><option value="">${L('Все категории', 'All categories')}</option>${used.map(([id, n]) => `<option value="${esc(id)}"${view.cat === id ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    </div>
    <div class="card" style="padding:14px 8px">
      <div class="card-head" style="padding:0 12px"><h3>${list.length} ${L('операций', 'transactions')}</h3><span class="chip">${L('расходы', 'spent')}: ${money(total)}</span></div>
      ${list.length ? `<table><thead><tr><th>${L('Дата', 'Date')}</th><th>${L('Категория', 'Category')}</th><th class="note-c">${L('Описание', 'Note')}</th><th>${L('Тип', 'Type')}</th><th>${L('Сумма', 'Amount')}</th></tr></thead><tbody>
        ${list.slice(0, view.limit).map((i) => { const c = cat(i.category); return `<tr><td class="date">${dateStr(i.ts)}</td><td><span class="cat"><i style="background:${c.color}"></i>${esc(c.name)}</span></td><td class="note-c">${esc(i.note || '—')}</td><td><span class="badge${isIn(i) ? ' in' : ''}"><i></i>${isIn(i) ? L('Доход', 'Income') : L('Расход', 'Expense')}</span></td><td class="sum${isIn(i) ? ' in' : ''}">${isIn(i) ? '+' : '−'}${money(i.amount)}</td></tr>`; }).join('')}
      </tbody></table>${list.length > view.limit ? `<button class="btn more" data-act="more">${L('Показать ещё', 'Show more')} · ${list.length - view.limit}</button>` : ''}` : `<div class="empty-list">${L('Ничего не найдено', 'Nothing found')}</div>`}
    </div>`;
  return shell(L('Операции', 'Transactions'), ioButtons(), body);
}

/* ---------- установка ---------- */
const card = (title, tag, sub, steps, extra = '') => `<div class="card"><h3>${title}${tag}</h3><p class="sub">${sub}</p><ol class="steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>${extra}</div>`;
const easy = `<span class="tag">${L('просто', 'easy')}</span>`;
const hard = `<span class="tag warn">${L('сложнее', 'advanced')}</span>`;
const weekly = `<div class="warn-line">${L('С бесплатным Apple ID приложение работает 7 дней — потом установите тот же файл ещё раз. Данные сохраняются.', 'With a free Apple ID the app runs for 7 days — then install the same file again. Your data stays.')}</div>`;

function install() {
  const T = {
    iphone: [
      card(L('Как приложение с сайта', 'Web app from Safari'), easy, L('Без компьютера. Работает офлайн, обновляется само.', 'No computer needed. Works offline, updates itself.'), [
        L(`Откройте <code>kesh-money.vercel.app</code> в <b>Safari</b>.`, `Open <code>kesh-money.vercel.app</code> in <b>Safari</b>.`),
        L('Нажмите <b>Поделиться</b> → <b>На экран «Домой»</b>.', 'Tap <b>Share</b> → <b>Add to Home Screen</b>.'),
        L('Запускайте «Кэш» с экрана «Домой».', 'Launch Kesh from the Home Screen.'),
      ]),
      card(L('Приложение через Windows', 'App via Windows'), hard, L('Нужны кабель и программа Sideloadly.', 'Needs a cable and Sideloadly.'), [
        L('Установите <b>iTunes</b> и <b>iCloud</b> с сайта Apple (не из Microsoft Store) и <a href="https://sideloadly.io/" target="_blank" rel="noopener">Sideloadly</a>.', 'Install <b>iTunes</b> and <b>iCloud</b> from Apple’s site (not the Microsoft Store) and <a href="https://sideloadly.io/" target="_blank" rel="noopener">Sideloadly</a>.'),
        L('Подключите iPhone кабелем и нажмите «Доверять».', 'Connect the iPhone by cable and tap Trust.'),
        L('Перетащите <code>Kesh.ipa</code> в Sideloadly, введите Apple ID, нажмите <b>Start</b>.', 'Drag <code>Kesh.ipa</code> into Sideloadly, enter your Apple ID, press <b>Start</b>.'),
        L('На iPhone: Настройки → Основные → VPN и управление устройством → ваш Apple ID → <b>Доверять</b>.', 'On the iPhone: Settings → General → VPN & Device Management → your Apple ID → <b>Trust</b>.'),
        L('Настройки → Конфиденциальность и безопасность → <b>Режим разработчика</b> → включить и перезагрузить.', 'Settings → Privacy & Security → <b>Developer Mode</b> → turn on and restart.'),
      ], `${weekly}<a class="btn" href="${DL}Kesh.ipa">${I.download}Kesh.ipa</a>`),
      card(L('Приложение через Mac', 'App via Mac'), hard, L('Нужны Xcode и исходники проекта.', 'Needs Xcode and the project sources.'), [
        L('Установите <b>Xcode</b> из App Store и <code>brew install xcodegen</code>.', 'Install <b>Xcode</b> from the App Store and <code>brew install xcodegen</code>.'),
        L('В папке <code>ios</code> выполните <code>xcodegen</code> и откройте <code>Kesh.xcodeproj</code>.', 'In the <code>ios</code> folder run <code>xcodegen</code> and open <code>Kesh.xcodeproj</code>.'),
        L('Signing & Capabilities → Team → свой Apple ID.', 'Signing & Capabilities → Team → your Apple ID.'),
        L('Подключите iPhone, выберите его и нажмите <b>▶</b>. Доверие и режим разработчика — как выше.', 'Connect the iPhone, select it and press <b>▶</b>. Trust and Developer Mode as above.'),
      ], weekly),
    ],
    android: [
      card(L('Как приложение с сайта', 'Web app from Chrome'), easy, L('Работает офлайн, обновляется само.', 'Works offline, updates itself.'), [
        L('Откройте <code>kesh-money.vercel.app</code> в <b>Chrome</b>.', 'Open <code>kesh-money.vercel.app</code> in <b>Chrome</b>.'),
        L('Меню <b>⋮</b> → <b>Установить приложение</b>.', 'Menu <b>⋮</b> → <b>Install app</b>.'),
      ]),
      card(L('Файл APK', 'APK file'), easy, L('Обычное приложение. Новые функции приходят сами, переустанавливать не нужно.', 'A regular app. New features arrive on their own, no reinstall needed.'), [
        L('Скачайте <code>Kesh.apk</code> на телефон.', 'Download <code>Kesh.apk</code> to the phone.'),
        L('Откройте файл и разрешите установку из этого источника.', 'Open it and allow installs from this source.'),
        L('Нажмите <b>Установить</b>.', 'Tap <b>Install</b>.'),
      ], `<a class="btn" href="${DL}Kesh.apk">${I.download}Kesh.apk</a>`),
    ],
    pc: [
      card(L('Аналитика на компьютере', 'Analytics on a computer'), easy, L('Этот сайт: графики и таблицы по копии с телефона.', 'This site: charts and tables from your phone backup.'), [
        L('В приложении: Профиль → <b>Резервная копия</b>.', 'In the app: Profile → <b>Backup</b>.'),
        L('Перешлите файл на компьютер и перетащите его на вкладку «Обзор».', 'Send the file to your computer and drop it on Overview.'),
      ]),
      card(L('Полное приложение в браузере', 'Full app in the browser'), easy, L('Тот же трекер, что на телефоне, с отдельными данными.', 'The same tracker as on the phone, with its own data.'), [
        L('Откройте <a href="../?app">веб-приложение</a>.', 'Open the <a href="../?app">web app</a>.'),
        L('Chrome или Edge: значок установки в адресной строке → <b>Установить</b>.', 'Chrome or Edge: install icon in the address bar → <b>Install</b>.'),
      ]),
    ],
    move: [
      card(L('С телефона на компьютер', 'Phone to computer'), '', L('Для графиков и Excel.', 'For charts and Excel.'), [
        L('Профиль → <b>Резервная копия</b>.', 'Profile → <b>Backup</b>.'),
        L('Отправьте файл себе: Telegram «Избранное», AirDrop, почта.', 'Send it to yourself: Telegram, AirDrop, email.'),
        L('Здесь: <b>Загрузить копию</b>.', 'Here: <b>Load backup</b>.'),
      ]),
      card(L('На новый телефон или в другую версию', 'To a new phone or another version'), '', L('Сайт, приложение iPhone и Android хранят данные отдельно.', 'The web app, iPhone and Android apps keep data separately.'), [
        L('На старом: Профиль → <b>Резервная копия</b>.', 'Old device: Profile → <b>Backup</b>.'),
        L('На новом: Профиль → <b>Восстановить из копии</b>.', 'New device: Profile → <b>Restore from backup</b>.'),
        L('Данные объединяются: ничего не удаляется и не дублируется.', 'Data is merged: nothing is deleted or duplicated.'),
      ]),
    ],
  };
  const tabs = [['iphone', 'iPhone'], ['android', 'Android'], ['pc', L('Компьютер', 'Computer')], ['move', L('Перенос данных', 'Moving data')]];
  const body = `<div class="seg inst-tabs">${tabs.map(([id, n]) => `<button class="${view.inst === id ? 'on' : ''}" data-inst="${id}">${n}</button>`).join('')}</div><div class="inst">${T[view.inst].join('')}</div>`;
  return shell(L('Установка', 'Install'), ioButtons(), body);
}

/* ---------- экспорт ---------- */
function save(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
const rub = (kop) => kop / 100;
function exportAs(kind) {
  const t = data.transactions;
  const typeName = (i) => (isIn(i) ? L('Пополнение', 'Income') : L('Расход', 'Expense'));
  if (kind === 'json') return save(new Blob([JSON.stringify(raw)], { type: 'application/json' }), `nota-backup-${stamp()}.json`);
  if (kind === 'csv') {
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = [[L('Дата', 'Date'), L('Тип', 'Type'), L('Категория', 'Category'), L('Описание', 'Note'), L('Сумма', 'Amount')],
      ...t.map((i) => [new Date(i.ts).toISOString().slice(0, 16).replace('T', ' '), typeName(i), cat(i.category).name, i.note || '', (rub(i.amount)).toFixed(2).replace('.', EN ? '.' : ',')])];
    return save(new Blob([`﻿${rows.map((r) => r.map(q).join(EN ? ',' : ';')).join('\r\n')}`], { type: 'text/csv' }), `kesh-${stamp()}.csv`);
  }
  const serial = (ts) => ({ v: (ts - new Date(ts).getTimezoneOffset() * 6e4) / 864e5 + 25569, f: 'date' });
  const cats = new Map();
  t.forEach((i) => { const k = `${i.category}|${isIn(i)}`; const c = cats.get(k) || { name: cat(i.category).name, kind: typeName(i), n: 0, sum: 0 }; c.n++; c.sum += i.amount; cats.set(k, c); });
  const sheets = [
    { name: 'Операции', cols: [17, 13, 18, 36, 14, 10], rows: [['Дата', 'Тип', 'Категория', 'Описание', 'Сумма', 'ID'], ...t.map((i) => [serial(i.ts), typeName(i), cat(i.category).name, i.note || '', rub(i.amount), i.id])] },
    { name: 'Категории', cols: [22, 13, 11, 14], rows: [['Категория', 'Тип', 'Операций', 'Сумма'], ...[...cats.values()].sort((a, b) => b.sum - a.sum).map((c) => [c.name, c.kind, c.n, rub(c.sum)])] },
  ];
  save(new Blob([writeXlsx(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `kesh-${stamp()}.xlsx`);
}

/* ---------- загрузка файла ---------- */
async function readFile(file) {
  if (!file) return;
  let err = '';
  if (file.size > 30e6) err = L('Файл слишком большой', 'File is too large');
  else {
    try { err = load(JSON.parse(await file.text()), true); } catch { err = L('Это не файл копии «Кэша»', 'This is not a Kesh backup file'); }
  }
  view.error = err;
  if (!err) { view.page = 'overview'; view.mode = 'month'; location.hash = 'overview'; }
  render();
}

/* ---------- отрисовка и события ---------- */
function render() {
  const keep = document.activeElement?.id === 'q' ? document.activeElement.selectionStart : null;
  const v = view.page === 'ops' ? ops() : view.page === 'install' ? install() : overview();
  document.getElementById('ptitle').textContent = v.title;
  document.getElementById('pactions').innerHTML = v.actions;
  document.getElementById('pbody').innerHTML = v.body;
  chrome();
  if (keep != null) { const q = document.getElementById('q'); q.focus(); q.setSelectionRange(keep, keep); }
}

root.addEventListener('click', (e) => {
  const t = e.target.closest('[data-page],[data-act],[data-mode],[data-shift],[data-type],[data-inst],[data-exp]');
  if (!t) { document.getElementById('exp')?.classList.remove('open'); return; }
  const d = t.dataset;
  if (d.page) { e.preventDefault(); view.page = d.page; view.limit = 100; location.hash = d.page; window.scrollTo(0, 0); return render(); }
  if (d.mode) { view.mode = d.mode; if (d.mode !== 'all' && data) view.anchor = new Date(data.transactions[0].ts); return render(); }
  if (d.shift) { const a = view.anchor; view.anchor = view.mode === 'month' ? new Date(a.getFullYear(), a.getMonth() + Number(d.shift), 1) : new Date(a.getFullYear() + Number(d.shift), 0, 1); return render(); }
  if (d.type) { view.type = d.type; view.limit = 100; return render(); }
  if (d.inst) { view.inst = d.inst; return render(); }
  if (d.exp) { document.getElementById('exp')?.classList.remove('open'); return exportAs(d.exp); }
  if (d.act === 'mini') { const m = !mini(); try { localStorage.setItem('webMini', m ? '1' : '0'); } catch { /* */ } return document.getElementById('frame').classList.toggle('mini', m); }
  if (d.act === 'lang') return setLang(EN ? 'ru' : 'en');
  if (d.act === 'pick') { e.preventDefault(); return document.getElementById('file').click(); }
  if (d.act === 'export') { e.stopPropagation(); return document.getElementById('exp').classList.toggle('open'); }
  if (d.act === 'more') { view.limit += 200; return render(); }
  if (d.act === 'forget') { try { localStorage.removeItem(KEY); } catch { /* нет доступа */ } raw = null; data = null; view.page = 'overview'; return render(); }
});
root.addEventListener('change', (e) => {
  if (e.target.id === 'file') readFile(e.target.files[0]);
  if (e.target.id === 'catf') { view.cat = e.target.value; view.limit = 100; render(); }
});
root.addEventListener('input', (e) => { if (e.target.id === 'q') { view.q = e.target.value; view.limit = 100; render(); } });

// Перетаскивание файла в любое место окна
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.getElementById('drop')?.classList.add('over'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.getElementById('drop')?.classList.remove('over'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; readFile(e.dataTransfer.files[0]); });

// Подсказка над столбиком и сектором
const tipAt = (el, x, y) => {
  const tip = document.getElementById('tip');
  if (!tip) return;
  if (!el) { tip.style.display = 'none'; return; }
  const n = el.dataset.n;
  tip.innerHTML = `<small>${esc(el.dataset.tip)}</small><b>${esc(el.dataset.v)}</b>${n && n !== '0' ? ` <small>${/%$/.test(n) ? n : `${n} ${L('опер.', 'tx')}`}</small>` : ''}`;
  tip.style.display = 'block';
  tip.style.left = `${x}px`;
  tip.style.top = `${y - 8}px`;
};
root.addEventListener('mousemove', (e) => tipAt(e.target.closest('[data-tip]'), e.clientX, e.clientY));
root.addEventListener('mouseleave', () => tipAt(null));
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (['overview', 'ops', 'install'].includes(p) && p !== view.page) { view.page = p; render(); } });

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const p = { 1: 'overview', 2: 'ops', 3: 'install' }[e.key];
  if (p && p !== view.page) { view.page = p; location.hash = p; render(); }
});

// Заставка-мультик, затем Кэш перебирается в уголок меню
frame();
render();
playIntro(() => (document.getElementById('frame').classList.contains('mini') ? null : document.getElementById('pet')));
