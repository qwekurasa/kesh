// Кэш для компьютера: те же данные, что у веб-приложения на этом устройстве (IndexedDB).
// Главное — экспорт и перенос данных; плюс аналитика, операции, бюджет, счета, вклады и категории.
import '../guard.js';
import { L, EN, setLang, CURRENCIES, CURRENCY, setCurrency, curSymbol } from '../i18n.js';
import { CAT, CATEGORIES, INCOME_CATEGORIES, PALETTE, customCategories, addCategory, updateCategory, removeCategory, rawIcon } from '../ui.js'; // раньше kesh.js: взаимный импорт
import { catAvatar } from '../kesh.js';
import * as store from '../store.js';
import * as auth from '../auth.js';
import { makeBackup, checkBackup, restoreBackup } from '../backup.js';
import { accounts, addAccount, updateAccount, removeAccount, balances, ownTotal, TYPES } from '../accounts.js';
import { writeXlsx } from '../xlsx.js';

const root = document.getElementById('root');
const BUILD_WEB = '2.6';
const APP = 'https://kesh-money.vercel.app/';
const DL = `${APP}dl/`;
const PAGES = ['data', 'overview', 'ops', 'budget', 'deposits', 'cats', 'install', 'settings'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

const ic = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  data: ic('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  overview: ic('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  ops: ic('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  budget: ic('<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>'),
  safe: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M7 20v1M17 20v1"/>'),
  tag: ic('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  install: ic('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 18h.01"/>'),
  settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  app: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>'),
  side: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
  upload: ic('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  download: ic('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  left: ic('<path d="M15 18l-6-6 6-6"/>'),
  right: ic('<path d="M9 18l6-6-6-6"/>'),
  search: ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  lock: ic('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>', 2),
  edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  trash: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  cal: ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  x: ic('<path d="M6 6l12 12M18 6 6 18"/>', 2),
  xls: ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>'),
  csv: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>'),
  json: ic('<path d="M8 4c-2 0-2 2-2 4s-2 4-2 4 2 2 2 4 0 4 2 4M16 4c2 0 2 2 2 4s2 4 2 4-2 2-2 4 0 4-2 4"/>'),
  chart: ic('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  bank: ic('<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>'),
  phone: ic('<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.8C6.1 7 4.6 8 3.7 9.5c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.9-4.2zM14 5.3c.7-.9 1.2-2 1-3.3-1 0-2.2.7-3 1.6-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.4z"/></svg>',
  android: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.5l1.7-3a.4.4 0 0 0-.7-.4l-1.8 3A10.8 10.8 0 0 0 12 8a10.8 10.8 0 0 0-4.8 1.1l-1.8-3a.4.4 0 0 0-.7.4l1.7 3A9.5 9.5 0 0 0 2 17h20a9.5 9.5 0 0 0-4.4-7.5zM7 14.3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
  filePlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/></svg>',
};

/* ---------- данные ---------- */
let items = []; // все операции, новые сверху
let bal = []; // счета с остатками
let ready = false;
const budgets = () => readJSON('budgets', {});
const saveBudgets = (b) => localStorage.setItem('budgets', JSON.stringify(b));
const deposits = () => readJSON('deposits', []);
const saveDeposits = (list) => localStorage.setItem('deposits', JSON.stringify(list));

const hashPage = () => { const p = location.hash.slice(1); return PAGES.includes(p) ? p : 'data'; };
const view = { page: hashPage(), mode: 'month', anchor: new Date(), range: null, q: '', type: 'all', cat: '', acc: '', sort: 'date', dir: -1, limit: 100, inst: 'iphone', msg: '', sel: '', kind: 'out' };

async function load() {
  items = (await store.allExpenses()).sort((a, b) => b.ts - a.ts);
  bal = await balances();
  keepScroll = ready;
  ready = true;
  render();
}

// Старый сайт хранил копию отдельно — переносим её в общее хранилище один раз
async function migrate() {
  const old = localStorage.getItem('webBackup');
  if (!old) return;
  try { const c = checkBackup(JSON.parse(old)); if (c.ok) await restoreBackup(c); } catch { /* повреждённая запись */ }
  localStorage.removeItem('webBackup');
}

/* ---------- форматирование ---------- */
const LOC = EN ? 'en-US' : 'ru-RU';
const fmt = (min) => new Intl.NumberFormat(LOC, { style: 'currency', currency: CURRENCY, currencyDisplay: 'narrowSymbol', minimumFractionDigits: min, maximumFractionDigits: 2 });
const money = (kop) => (kop % 100 ? fmt(2) : fmt(0)).format(kop / 100).replace(/^-/, '−');
const short = (kop) => new Intl.NumberFormat(LOC, { notation: 'compact', maximumFractionDigits: 1 }).format(kop / 100);
const MONTHS = L(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const MON = L(['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const WD = L(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const dm = (ts) => { const d = new Date(ts); return L(`${d.getDate()} ${MON[d.getMonth()]}`, `${MON[d.getMonth()]} ${d.getDate()}`); };
const dateStr = (ts) => { const d = new Date(ts); return `${dm(ts)} ${d.getFullYear()}`; };
const timeStr = (ts) => new Date(ts).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });
const isIn = (i) => i.type === 'in';
const sum = (list) => list.reduce((s, i) => s + i.amount, 0);
const plural = (n, a, b, c) => (EN ? (n === 1 ? a : b) : (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c));
const nOps = (n) => `${n} ${plural(n, L('операция', 'transaction'), L('операции', 'transactions'), L('операций', 'transactions'))}`;
const cat = (id) => (CAT[id] ? { name: CAT[id].name, color: CAT[id].color, kind: CAT[id].kind, icon: CAT[id].icon } : { name: id || L('Без категории', 'Uncategorized'), color: '#9a9aa4', kind: 'out', icon: 'other' });
const accName = (id) => accounts().find((a) => a.id === id)?.name || '';
const parseAmount = (s) => { const v = Math.round(parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.')) * 100); return Number.isFinite(v) ? v : 0; };
const toLocalInput = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const day0 = (ts) => { const d = new Date(ts); return +new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
// Спокойная палитра: иконки нейтральные, графики — оттенки серого по месту
const SHADES = ['#EDEDEF', '#C4C4CA', '#9A9AA3', '#74747C', '#55555C', '#3E3E44', '#2E2E33'];
const dot = (c) => `<span class="dot">${rawIcon(c.icon || 'other')}</span>`;

/* ---------- период ---------- */
function range(shift = 0) {
  const a = view.anchor;
  if (view.mode === 'month') return [new Date(a.getFullYear(), a.getMonth() + shift, 1).getTime(), new Date(a.getFullYear(), a.getMonth() + shift + 1, 1).getTime()];
  if (view.mode === 'year') return [new Date(a.getFullYear() + shift, 0, 1).getTime(), new Date(a.getFullYear() + shift + 1, 0, 1).getTime()];
  if (view.mode === 'custom' && view.range) { const s = view.range.to - view.range.from; return [view.range.from + shift * s, view.range.to + shift * s]; }
  if (shift) return null;
  const first = items.length ? new Date(items[items.length - 1].ts) : new Date();
  return [new Date(first.getFullYear(), first.getMonth(), 1).getTime(), Date.now() + 1];
}
const inRange = (r) => (r ? items.filter((i) => i.ts >= r[0] && i.ts < r[1]) : []);
function periodLabel() {
  const a = view.anchor;
  if (view.mode === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  if (view.mode === 'year') return String(a.getFullYear());
  if (view.mode === 'custom' && view.range) { const { from, to } = view.range; return to - from === 864e5 ? dateStr(from) : `${dm(from)} – ${dateStr(to - 1)}`; }
  return L('Всё время', 'All time');
}
const periodBar = () => `<div class="toolbar">
  <div class="seg">${[['month', L('Месяц', 'Month')], ['year', L('Год', 'Year')], ['all', L('Всё время', 'All time')]].map(([m, t]) => `<button class="${view.mode === m ? 'on' : ''}" data-mode="${m}">${t}</button>`).join('')}
  <button class="${view.mode === 'custom' ? 'on' : ''}" data-act="calendar">${I.cal}${L('Даты', 'Dates')}</button></div>
  ${view.mode === 'all' ? '' : `<div class="period"><button class="arrow" data-shift="-1" aria-label="${L('Назад', 'Back')}">${I.left}</button><b>${periodLabel()}</b><button class="arrow" data-shift="1" ${range(1)[0] > Date.now() ? 'disabled' : ''} aria-label="${L('Вперёд', 'Forward')}">${I.right}</button></div>`}
</div>`;

/* ---------- каркас: узкая панель иконок, верхняя строка, рабочая область ---------- */
function frame() {
  const nav = (id, icon, label, badge = '') => `<button class="rl" data-page="${id}" aria-label="${label}">${icon}${badge}<span class="rl-tip">${label}</span></button>`;
  root.innerHTML = `<div class="app" id="frame">
    <nav class="rail">
      <button class="rl-logo" data-page="data" aria-label="${L('Кэш', 'Kesh')}"><img src="../icon-180.png" alt=""></button>
      ${nav('data', I.data, L('Экспорт и импорт', 'Export & import'))}
      ${nav('overview', I.overview, L('Обзор', 'Overview'))}
      ${nav('ops', I.ops, L('Операции', 'Transactions'), '<em class="rl-badge" data-count="ops"></em>')}
      <i class="rl-sep"></i>
      ${nav('budget', I.budget, L('Бюджет и счета', 'Budget & accounts'))}
      ${nav('deposits', I.safe, L('Вклады', 'Savings'))}
      ${nav('cats', I.tag, L('Категории', 'Categories'))}
      <i class="rl-sep"></i>
      ${nav('install', I.install, L('Установка', 'Install'))}
      <a class="rl" href="../?app" aria-label="${L('Веб-приложение', 'Web app')}">${I.app}<span class="rl-tip">${L('Веб-приложение', 'Web app')}</span></a>
      <span class="grow"></span>
      ${nav('settings', I.settings, L('Настройки', 'Settings'))}
      <button class="rl-ava" id="user" data-page="settings"></button>
    </nav>
    <section class="main">
      <header class="top">
        <h1 id="ptitle"></h1>
        <label class="gsearch">${I.search}<input id="gq" placeholder="${L('Поиск операций, категорий, сумм…', 'Search transactions, categories, amounts…')}" autocomplete="off"><kbd>/</kbd></label>
        <div class="top-right" id="pactions"></div>
      </header>
      <div class="content" id="pbody"></div>
    </section>
  </div><div class="tip" id="tip"></div><div class="toast" id="toast"></div>
  <input type="file" id="file-backup" accept=".json,application/json" hidden><input type="file" id="file-bank" accept=".pdf,.csv,application/pdf,text/csv" multiple hidden>`;
}

const headActions = () => `
  ${items.length ? `<span class="status ok"><i></i>${nOps(items.length)}</span>` : `<span class="status"><i></i>${L('Нет данных', 'No data')}</span>`}
  ${items.length ? `<div class="menu" id="exp"><button class="ibtn" data-act="export-menu" aria-label="${L('Экспорт', 'Export')}">${I.download}</button>
    <div class="menu-list">
      <button data-exp="xlsx">${I.xls}<span>Excel<small>${L('отчёт на 4 листа', '4-sheet report')}</small></span></button>
      <button data-exp="csv">${I.csv}<span>CSV<small>${L('для таблиц и банков', 'for spreadsheets')}</small></span></button>
      <button data-exp="json">${I.json}<span>${L('Резервная копия', 'Backup')}<small>${L('перенос на телефон', 'move to phone')}</small></span></button>
    </div></div>` : ''}
  <button class="btn primary" data-act="add">${I.plus}${L('Добавить', 'Add')}</button>`;

function chrome() {
  document.querySelectorAll('.rl[data-page]').forEach((n) => n.classList.toggle('on', n.dataset.page === view.page));
  const c = document.querySelector('[data-count="ops"]');
  c.textContent = items.length > 999 ? '999+' : items.length || '';
  const name = auth.account()?.login || L('Гость', 'Guest');
  const skin = Number(localStorage.getItem('avatarSkin')) || 0;
  const u = document.getElementById('user');
  u.innerHTML = auth.account() ? catAvatar(skin, true) : esc(name[0]);
  u.title = name;
  const g = document.getElementById('gq');
  if (document.activeElement !== g) g.value = view.q;
}

const card = (title, body, extra = '', cls = '') => `<div class="card ${cls}"><div class="card-head"><h3>${title}</h3>${extra}</div>${body}</div>`;
const empty = (t) => `<div class="empty-list">${t}</div>`;
const sec = (t, extra = '') => `<div class="sec">${t}${extra}</div>`;

/* ---------- 1. экспорт и импорт ---------- */
function dataPage() {
  const has = items.length > 0;
  const from = has ? items[items.length - 1].ts : 0;
  const exp = (kind, icon, name, desc, file) => `<button class="xcard" data-exp="${kind}"><span class="x-ico">${icon}</span><span class="x-name">${name}<small>${desc}</small></span><span class="x-file mono">${file}</span><span class="x-go">${I.download}${L('Скачать', 'Download')}</span></button>`;
  const body = `
    ${has ? `<div class="strip"><span><small>${L('Операций', 'Transactions')}</small><b class="mono">${items.length}</b></span><span><small>${L('Расходы за всё время', 'All-time spending')}</small><b class="mono">${money(sum(items.filter((i) => !isIn(i))))}</b></span><span><small>${L('Период', 'Period')}</small><b class="mono">${dm(from)} – ${dateStr(items[0].ts)}</b></span></div>
    ${sec(L('Экспорт', 'Export'), `<em>${L('главное — забрать данные в удобном формате', 'take your data in any format')}</em>`)}
    <div class="xgrid">
      ${exp('xlsx', I.xls, L('Отчёт Excel', 'Excel report'), L('Операции, категории, бюджет и вклады — по листам, с датами и суммами.', 'Transactions, categories, budget and savings on separate sheets.'), `kesh-${new Date().toISOString().slice(0, 10)}.xlsx`)}
      ${exp('csv', I.csv, 'CSV', L('Одна таблица операций. Открывается в Google Таблицах, Numbers и 1С.', 'One transaction table for Google Sheets, Numbers, etc.'), `kesh-${new Date().toISOString().slice(0, 10)}.csv`)}
      ${exp('json', I.json, L('Резервная копия', 'Backup'), L('Всё целиком: перенос на телефон или в другой браузер без потерь.', 'Everything: move to a phone or another browser losslessly.'), `nota-backup-${new Date().toISOString().slice(0, 10)}.json`)}
    </div>` : ''}
    ${sec(has ? L('Импорт', 'Import') : L('Начните с переноса данных', 'Start by bringing your data'))}
    <div class="hero">
      <label class="drop" id="drop" data-act="pick-backup">
        <div class="drop-icon">${I.filePlus}</div>
        <h2>${L('Перетащите копию с телефона', 'Drop your phone backup')}</h2>
        <p>${L('Файл .json из приложения «Кэш». Данные объединятся: ничего не удалится и не задвоится.', 'The .json file from the Kesh app. Data is merged: nothing is deleted or duplicated.')}</p>
        ${view.msg ? `<p class="msg">${esc(view.msg)}</p>` : ''}
        <span class="drop-meta">.JSON · ${L('локально', 'local only')}</span>
      </label>
      <div class="grid" style="margin:0">
        <button class="tile" data-act="pick-bank"><span class="x-ico">${I.bank}</span><span class="x-name">${L('Выписка банка', 'Bank statement')}<small>${L('PDF или CSV из Т-Банка — категории расставятся сами, повторы не добавятся.', 'PDF or CSV from T-Bank — auto categories, no duplicates.')}</small></span>${I.right}</button>
        <div class="card"><div class="card-head"><h3>${L('Как получить копию с телефона', 'How to get the phone backup')}</h3></div>
          <ol class="steps">
            <li>${L('В приложении откройте <b>Профиль</b> → <b>Резервная копия</b>.', 'In the app open <b>Profile</b> → <b>Backup</b>.')}</li>
            <li>${L('Отправьте файл себе: Telegram «Избранное», AirDrop или почта.', 'Send it to yourself: Telegram, AirDrop or email.')}</li>
            <li>${L('Перетащите его в поле слева.', 'Drop it into the field on the left.')}</li>
          </ol>
          <div class="privacy">${I.lock}<span>${L('Файлы открываются прямо в браузере и никуда не загружаются.', 'Files are opened in your browser and never uploaded.')}</span></div>
        </div>
      </div>
    </div>`;
  return { title: L('Экспорт и импорт', 'Export & import'), body };
}

/* ---------- 2. обзор ---------- */
function delta(now, prev, good = false) {
  if (prev == null) return '';
  if (!prev) return now ? `<span class="delta flat">${L('раньше пусто', 'no earlier data')}</span>` : '';
  const p = Math.round(((now - prev) / prev) * 100);
  return `<span class="delta ${p > 0 ? 'up' : p < 0 ? 'down' : 'flat'}${good ? ' good' : ''}">${p > 0 ? '+' : ''}${p}% ${L('к прошлому', 'vs prev')}</span>`;
}
const ticks = (now, prev, n = 28, color = '') => {
  const k = Math.round((now / Math.max(now, prev || 0, 1)) * n);
  return `<div class="ticks">${Array.from({ length: n }, (_, i) => `<i class="${i < k ? 'on' : ''}"${i < k && color ? ` style="background:${color}"` : ''}></i>`).join('')}</div>`;
};
function byCategory(list) {
  const m = new Map();
  list.forEach((i) => m.set(i.category, (m.get(i.category) || 0) + i.amount));
  return [...m].sort((a, b) => b[1] - a[1]);
}

function donut(list) {
  const cats = byCategory(list);
  const total = sum(list);
  if (!total) return empty(L('Расходов нет', 'No expenses'));
  const parts = cats.slice(0, 5).map(([id, v], k) => ({ name: cat(id).name, color: SHADES[k], v }));
  const rest = cats.slice(5).reduce((s0, [, v]) => s0 + v, 0);
  if (rest) parts.push({ name: L('Остальное', 'Other'), color: SHADES[6], v: rest });
  const R = 64; const C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map((p) => { const len = (p.v / total) * C; const s0 = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${p.color}" stroke-width="10" stroke-linecap="butt" stroke-dasharray="${Math.max(0, len - 3)} ${C}" stroke-dashoffset="${-off}" data-tip="${esc(p.name)}" data-v="${esc(money(p.v))}" data-n="${Math.round((p.v / total) * 100)}%"/>`; off += len; return s0; }).join('');
  return `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 160 160" width="160" height="160"><circle cx="80" cy="80" r="${R}" fill="none" stroke="rgba(255,255,255,.04)" stroke-width="10"/>${arcs}</svg><div class="donut-mid"><small>${L('всего', 'total')}</small><b>${short(total)}</b><small>${curSymbol(CURRENCY)}</small></div></div>
    <div class="legend">${parts.map((p) => `<div><i style="background:${p.color}"></i><span>${esc(p.name)}</span><em>${Math.round((p.v / total) * 100)}%</em></div>`).join('')}</div></div>`;
}

function catRows(list, total, kind = 'out') {
  const cats = byCategory(list);
  const max = cats[0]?.[1] || 1;
  return cats.length ? cats.slice(0, 8).map(([id, v]) => { const c = cat(id); const n = list.filter((i) => i.category === id).length; return `<button class="cat-row" data-filter-cat="${esc(id)}">${dot(c)}<div class="name">${esc(c.name)}<small>${nOps(n)} · ${Math.round((v / total) * 100)}%</small>${ticks(v, max, 40)}</div><span class="sum${kind === 'in' ? ' in' : ''}">${money(v)}</span></button>`; }).join('') : empty(kind === 'in' ? L('Доходов нет', 'No income') : L('Расходов нет', 'No expenses'));
}

// Траты по дням (или месяцам): аккуратные столбики фиксированной ширины, средняя линия, подписи
function dayChart(list, r) {
  const out = list.filter((i) => !isIn(i));
  const now = Date.now();
  const daily = view.mode === 'month' || (view.mode === 'custom' && r[1] - r[0] <= 62 * 864e5);
  let cols;
  if (daily) {
    const n = Math.max(1, Math.round((r[1] - r[0]) / 864e5));
    cols = Array.from({ length: n }, (_, k) => { const from = day0(r[0] + k * 864e5 + 36e5); return { from, to: from + 864e5, label: dateStr(from), ax: new Date(from).getDate() }; });
  } else {
    const d0 = new Date(r[0]); const end = new Date(Math.min(r[1], now + 1) - 1);
    const n = view.mode === 'year' ? 12 : Math.max(1, (end.getFullYear() - d0.getFullYear()) * 12 + end.getMonth() - d0.getMonth() + 1);
    cols = Array.from({ length: n }, (_, k) => { const f = new Date(d0.getFullYear(), d0.getMonth() + k, 1); return { from: +f, to: +new Date(f.getFullYear(), f.getMonth() + 1, 1), label: `${MONTHS[f.getMonth()]} ${f.getFullYear()}`, ax: n > 14 ? `${MON[f.getMonth()]} ${String(f.getFullYear()).slice(2)}` : MON[f.getMonth()] }; });
  }
  cols.forEach((c) => { const l = out.filter((i) => i.ts >= c.from && i.ts < c.to); c.v = sum(l); c.n = l.length; c.now = now >= c.from && now < c.to; c.future = c.from > now; });
  const raw = Math.max(...cols.map((c) => c.v), 1);
  // «круглая» верхняя граница шкалы
  const pow = 10 ** Math.floor(Math.log10(raw));
  const top = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * pow).find((v) => v >= raw * 1.08) || raw;
  const past = cols.filter((c) => !c.future);
  const avg = past.length ? sum(past.map((c) => ({ amount: c.v }))) / past.length : 0;
  const peak = cols.reduce((a, c) => (c.v > a.v ? c : a), cols[0]);
  const step = Math.max(1, Math.ceil(cols.length / 12));
  return `<div class="dc">
    <div class="dc-grid">${[1, 0.5, 0].map((f) => `<span style="bottom:${f * 100}%"><em>${f ? short(top * f) : '0'}</em></span>`).join('')}${avg ? `<div class="dc-avg" style="bottom:${Math.min(100, (avg / top) * 100)}%"><em>${L('в среднем', 'average')} ${money(Math.round(avg))}</em></div>` : ''}</div>
    <div class="dc-cols">${cols.map((c, k) => `<div class="dc-col${c.now ? ' now' : ''}${c.future ? ' future' : ''}${c === peak && c.v ? ' peak' : ''}" data-tip="${esc(c.label)}" data-v="${esc(money(c.v))}" data-n="${c.n}">
      ${c === peak && c.v ? `<b class="dc-val mono" style="bottom:calc(${(c.v / top) * 100}% + 6px)">${short(c.v)}</b>` : ''}
      <i style="height:${c.v ? Math.max(1.5, (c.v / top) * 100) : 0}%"></i><span class="dc-ax">${k % step === 0 || c.now ? c.ax : ''}</span></div>`).join('')}</div>
  </div>`;
}

function overview() {
  if (!items.length) return { title: L('Обзор', 'Overview'), body: dataPage().body };
  const r = range(); const pr = range(-1);
  const all = inRange(r); const prev = pr ? inRange(pr) : null;
  const out = all.filter((i) => !isIn(i)); const inc = all.filter(isIn);
  const spent = sum(out); const income = sum(inc); const diff = income - spent;
  const pOut = prev && prev.filter((i) => !isIn(i)); const pInc = prev && prev.filter(isIn);
  const pSpent = prev && sum(pOut); const pIncome = prev && sum(pInc);
  const side = view.kind === 'in' ? inc : out;
  const sideSum = view.kind === 'in' ? income : spent;
  const kpi = (label, val, cls, foot) => `<div class="card kpi"><small>${label}</small><div class="val mono ${cls}">${val}</div><div class="kpi-foot">${foot}</div></div>`;
  const body = `
    ${periodBar()}
    <div class="grid kpis k3">
      ${kpi(L('Потрачено', 'Spent'), money(spent), '', `${delta(spent, pSpent)}<span>${nOps(out.length)}</span>`)}
      ${kpi(L('Получено', 'Received'), `${income ? '+' : ''}${money(income)}`, income ? 'plus' : '', `${delta(income, pIncome, true)}<span>${nOps(inc.length)}</span>`)}
      ${bal.length ? kpi(L('Осталось', 'Left'), money(moneyLeft().v), moneyLeft().v < 0 ? 'minus' : '', `<span>${L('на счетах с учётом доходов и трат', 'in accounts incl. income & spending')}</span><button class="chip" data-page="budget">${L('Бюджет', 'Budget')} →</button>`) : kpi(L('Осталось', 'Left over'), `${diff > 0 ? '+' : ''}${money(diff)}`, diff > 0 ? 'plus' : diff < 0 ? 'minus' : '', `<span>${L('доходы − расходы за период', 'income − spending for the period')}</span>`)}
    </div>
    <div class="card chart-card"><div class="card-head"><h3>${view.mode === 'month' || (view.mode === 'custom' && r[1] - r[0] <= 62 * 864e5) ? L('Траты по дням', 'Spending by day') : L('Траты по месяцам', 'Spending by month')}</h3><span class="hint">${L('Наведите на столбец, чтобы увидеть сумму', 'Hover a column to see the amount')}</span></div>${dayChart(all, r)}</div>
    <div class="grid row3">
      <div class="card"><div class="card-head"><h3>${L('Куда уходят деньги', 'Where the money goes')}</h3><div class="seg sm"><button class="${view.kind === 'out' ? 'on' : ''}" data-kind2="out">${L('Расходы', 'Spent')}</button><button class="${view.kind === 'in' ? 'on' : ''}" data-kind2="in">${L('Доходы', 'Income')}</button></div></div>
        ${sideSum ? `${donut(side)}<div class="sp"></div>${catRows(side, sideSum, view.kind)}` : empty(view.kind === 'in' ? L('Доходов за период нет', 'No income in this period') : L('Трат за период нет', 'No spending in this period'))}</div>
      <div class="card"><div class="card-head"><h3>${L('Последние операции', 'Recent transactions')}</h3><button class="chip" data-page="ops">${L('Все операции', 'All')} →</button></div>
        ${all.length ? all.slice(0, 9).map((i) => { const c = cat(i.category); return `<button class="cat-row" data-edit="${esc(i.id)}">${dot(c)}<div class="name">${esc(i.note || c.name)}<small>${esc(c.name)} · ${dm(i.ts)}, ${timeStr(i.ts)}</small></div><span class="sum${isIn(i) ? ' in' : ''}">${isIn(i) ? '+' : '−'}${money(i.amount)}</span></button>`; }).join('') : empty(L('В этом периоде пусто', 'Nothing in this period'))}</div>
    </div>
    `;
  return { title: L('Обзор', 'Overview'), body };
}

/* ---------- 3. операции ---------- */
function opsPage() {
  if (!items.length) return { title: L('Операции', 'Transactions'), body: `${empty(L('Операций пока нет — добавьте первую или импортируйте данные.', 'No transactions yet — add one or import data.'))}<div class="center-row"><button class="btn primary" data-act="add">${I.plus}${L('Добавить операцию', 'Add transaction')}</button><button class="btn" data-page="data">${I.upload}${L('Импорт', 'Import')}</button></div>` };
  const r = range();
  const q = view.q.trim().toLowerCase();
  let list = inRange(r).filter((i) => (view.type === 'all' || (view.type === 'in') === isIn(i))
    && (!view.cat || i.category === view.cat) && (!view.acc || (view.acc === '-' ? !i.acc : i.acc === view.acc))
    && (!q || `${i.note || ''} ${cat(i.category).name} ${(i.amount / 100).toFixed(2)}`.toLowerCase().includes(q)));
  if (view.sort === 'amount') list = [...list].sort((a, b) => (a.amount - b.amount) * view.dir);
  else if (view.dir === 1) list = [...list].reverse();
  const used = [...new Set(items.map((i) => i.category))].map((id) => [id, cat(id).name]).sort((a, b) => a[1].localeCompare(b[1]));
  const accs = accounts();
  const arrow = (k) => (view.sort === k ? (view.dir < 0 ? ' ↓' : ' ↑') : '');
  const spent = sum(list.filter((i) => !isIn(i))); const income = sum(list.filter(isIn));
  const body = `${periodBar()}
    <div class="filters">
      <div class="seg">${[['all', L('Все', 'All')], ['out', L('Расходы', 'Spent')], ['in', L('Доходы', 'Income')]].map(([t, n]) => `<button class="${view.type === t ? 'on' : ''}" data-type="${t}">${n}</button>`).join('')}</div>
      <select class="sel" id="catf"><option value="">${L('Все категории', 'All categories')}</option>${used.map(([id, n]) => `<option value="${esc(id)}"${view.cat === id ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      ${accs.length ? `<select class="sel" id="accf"><option value="">${L('Все счета', 'All accounts')}</option><option value="-"${view.acc === '-' ? ' selected' : ''}>${L('Без счёта', 'No account')}</option>${accs.map((a) => `<option value="${esc(a.id)}"${view.acc === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>` : ''}
      ${view.q || view.cat || view.acc || view.type !== 'all' ? `<button class="btn" data-act="reset-filters">${I.x}${L('Сбросить', 'Reset')}</button>` : ''}
    </div>
    <div class="card table-card">
      <div class="card-head"><h3>${nOps(list.length)}</h3><span class="chip">−${money(spent)}${income ? ` · +${money(income)}` : ''}</span></div>
      ${list.length ? `<table><thead><tr><th class="sortable" data-sort="date">${L('Дата', 'Date')}${arrow('date')}</th><th>${L('Категория', 'Category')}</th><th class="note-c">${L('Описание', 'Note')}</th>${accs.length ? `<th class="note-c">${L('Счёт', 'Account')}</th>` : ''}<th>${L('Тип', 'Type')}</th><th class="sortable" data-sort="amount">${L('Сумма', 'Amount')}${arrow('amount')}</th><th></th></tr></thead><tbody>
        ${list.slice(0, view.limit).map((i) => { const c = cat(i.category); return `<tr data-edit="${esc(i.id)}"><td class="date">${dateStr(i.ts)}<small>${timeStr(i.ts)}</small></td><td><span class="cat">${dot(c)}${esc(c.name)}</span></td><td class="note-c">${esc(i.note || '—')}</td>${accs.length ? `<td class="note-c">${esc(accName(i.acc) || '—')}</td>` : ''}<td><span class="badge${isIn(i) ? ' in' : ''}"><i></i>${isIn(i) ? L('Доход', 'Income') : L('Расход', 'Expense')}</span></td><td class="sum${isIn(i) ? ' in' : ''}">${isIn(i) ? '+' : '−'}${money(i.amount)}</td><td class="act">${I.edit}</td></tr>`; }).join('')}
      </tbody></table>${list.length > view.limit ? `<button class="btn more" data-act="more">${L('Показать ещё', 'Show more')} · ${list.length - view.limit}</button>` : ''}` : empty(L('Ничего не найдено', 'Nothing found'))}
    </div>`;
  return { title: L('Операции', 'Transactions'), body };
}

/* ---------- 4. бюджет и счета ---------- */
// Сколько денег осталось. Без счетов: доходы − расходы за текущий месяц.
// Со счетами: их остатки (старт + свои операции) + операции без счёта с момента заведения первого счёта.
function moneyLeft() {
  const m0 = new Date(); const mFrom = +new Date(m0.getFullYear(), m0.getMonth(), 1);
  const net = (l) => sum(l.filter(isIn)) - sum(l.filter((i) => !isIn(i)));
  if (!bal.length) return { v: net(items.filter((i) => i.ts >= mFrom)), from: mFrom, acc: false };
  // время операции вводится с точностью до минуты — начало считаем с начала минуты
  const from = Math.floor(Math.min(...bal.map((a) => a.from || Date.now())) / 6e4) * 6e4;
  const loose = items.filter((i) => !i.acc && i.ts >= from && !bal.some((a) => a.all && i.ts >= a.from));
  return { v: ownTotal(bal) + net(loose), from, acc: true };
}

function budgetPage() {
  const b = budgets();
  const m0 = new Date(); const mFrom = +new Date(m0.getFullYear(), m0.getMonth(), 1);
  const monthOut = items.filter((i) => !isIn(i) && i.ts >= mFrom);
  const limited = Object.entries(b).filter(([id]) => CAT[id]);
  const totalLim = limited.reduce((s, [, v]) => s + v, 0);
  const totalSp = limited.reduce((s, [id]) => s + sum(monthOut.filter((i) => i.category === id)), 0);
  const monthIn = items.filter((i) => isIn(i) && i.ts >= mFrom);
  const mIn = sum(monthIn); const mOut = sum(items.filter((i) => !isIn(i) && i.ts >= mFrom));
  // осталось денег: со счетами — их остаток (старт + доходы − расходы), без счетов — доходы − расходы за месяц
  const ml = moneyLeft(); const left = ml.v;
  const limLeft = totalLim - totalSp;
  const mName = MONTHS[m0.getMonth()].toLowerCase();
  const body = `
    <div class="grid kpis">
      <div class="card kpi"><small>${L('Осталось денег', 'Money left')}</small><div class="val mono ${left < 0 ? 'minus' : ''}">${money(left)}</div><div class="kpi-foot"><span>${ml.acc ? L(`счета + доходы − расходы с ${dm(ml.from)}`, `accounts + income − spending since ${dm(ml.from)}`) : L(`доходы − расходы за ${mName}`, `income − spending, ${mName}`)}</span></div></div>
      <div class="card kpi"><small>${L('Доходы за месяц', 'Income this month')}</small><div class="val mono ${mIn ? 'plus' : ''}">${mIn ? '+' : ''}${money(mIn)}</div><div class="kpi-foot"><span>${nOps(monthIn.length)}</span><button class="chip" data-act="add-income">${I.plus}${L('Доход', 'Income')}</button></div></div>
      <div class="card kpi"><small>${L('Расходы за месяц', 'Spending this month')}</small><div class="val mono">${money(mOut)}</div><div class="kpi-foot"><span>${mIn ? `${Math.round((mOut / mIn) * 100)}% ${L('от доходов', 'of income')}` : L('доходов пока нет', 'no income yet')}</span></div></div>
      <div class="card kpi"><small>${L('Осталось по лимитам', 'Left within limits')}</small><div class="val mono ${limLeft < 0 ? 'minus' : ''}">${totalLim ? money(limLeft) : '—'}</div>${totalLim ? `${ticks(totalSp, totalLim, 28, totalSp > totalLim ? 'var(--neg)' : '')}<div class="kpi-foot"><span>${money(totalSp)} ${L('из', 'of')} ${money(totalLim)}</span></div>` : `<div class="kpi-foot"><span>${L('лимиты не заданы', 'no limits set')}</span></div>`}</div>
    </div>
    <div class="grid row3">
      ${card(L('Лимиты категорий', 'Category limits'), limited.length ? limited.sort((x, y) => y[1] - x[1]).map(([id, lim]) => { const sp = sum(monthOut.filter((i) => i.category === id)); const p = sp / lim; const c = cat(id); return `<div class="lim row">${dot(c)}<div class="lim-body"><div class="lim-top">${esc(c.name)}<span class="mono">${money(sp)} / ${money(lim)}</span></div><div class="bar"><i class="${p >= 1 ? 'over' : p >= 0.8 ? 'warn' : ''}" style="width:${Math.min(100, p * 100)}%"></i></div><small>${p >= 1 ? L(`Превышен на ${money(sp - lim)}`, `Over by ${money(sp - lim)}`) : L(`Осталось ${money(lim - sp)}`, `${money(lim - sp)} left`)}</small></div><button class="icon-btn" data-limit="${esc(id)}">${I.edit}</button></div>`; }).join('') : empty(L('Задайте лимит на категорию — Кэш покажет, сколько осталось до конца месяца.', 'Set a category limit to see what’s left this month.')), `<button class="btn" data-act="add-limit">${I.plus}${L('Лимит', 'Limit')}</button>`)}
      ${card(L('Счета', 'Accounts'), bal.length ? bal.map((a) => `<div class="acc row"><span class="acc-ico">${esc(TYPES[a.type]?.icon || '•')}</span><div class="lim-body"><div class="lim-top">${esc(a.name)}<span class="mono ${a.balance < 0 ? 'minus' : ''}">${money(a.balance)}</span></div><small>${esc(TYPES[a.type]?.name || '')} · ${L('старт', 'start')} ${money(a.base)} · +${money(a.inc)} / −${money(a.out)}</small></div><button class="icon-btn" data-account="${esc(a.id)}">${I.edit}</button></div>`).join('') : empty(L('Счетов нет. Добавьте карту или наличные — остаток будет считаться сам.', 'No accounts. Add a card or cash — the balance updates itself.')), `<button class="btn" data-act="add-account">${I.plus}${L('Счёт', 'Account')}</button>`)}
    </div>`;
  return { title: L('Бюджет и счета', 'Budget & accounts'), body };
}

/* ---------- 5. вклады ---------- */
const TERMS = [1, 2, 3, 6, 9, 12, 18, 24, 36];
const addMonths = (ts, m) => { const d = new Date(ts); d.setMonth(d.getMonth() + m); return +d; };
const depEnd = (d) => (d.kind === 'term' && d.months && d.opened ? addMonths(d.opened, d.months) : 0);
const depIncome = (d) => {
  const r = (d.rate || 0) / 100;
  if (d.kind !== 'term' || !d.months) return Math.round((d.amount * r) / 12);
  if (d.cap === 'month') return Math.round(d.amount * ((1 + r / 12) ** d.months - 1));
  const days = d.opened ? Math.round((depEnd(d) - d.opened) / 864e5) : d.months * 30.4;
  return Math.round((d.amount * r * days) / 365);
};
const monthly = (d) => (d.kind === 'term' && d.months ? Math.round(depIncome(d) / d.months) : depIncome(d));
const termLabel = (m) => (m % 12 === 0 ? `${m / 12} ${plural(m / 12, L('год', 'year'), L('года', 'years'), L('лет', 'years'))}` : `${m} ${L('мес', 'mo')}`);

function depositsPage() {
  const list = deposits();
  const total = list.reduce((a, d) => a + d.amount, 0);
  const income = list.reduce((a, d) => a + monthly(d), 0);
  const ending = list.filter((d) => depEnd(d) > Date.now()).sort((a, b) => depEnd(a) - depEnd(b))[0];
  const body = `
    <div class="grid kpis">
      <div class="card kpi"><small>${L('Всего на вкладах', 'Total saved')}</small><div class="val mono">${money(total)}</div><div class="kpi-foot"><span>${list.length} ${plural(list.length, L('вклад', 'deposit'), L('вклада', 'deposits'), L('вкладов', 'deposits'))}</span></div></div>
      <div class="card kpi"><small>${L('Доход в месяц', 'Monthly income')}</small><div class="val mono plus">+${money(income)}</div><div class="kpi-foot"><span>${L('в год', 'per year')} ~${money(income * 12)}</span></div></div>
      <div class="card kpi"><small>${L('Средняя ставка', 'Average rate')}</small><div class="val mono">${total ? (list.reduce((a, d) => a + d.amount * (d.rate || 0), 0) / total).toFixed(1) : '0'}%</div></div>
      <div class="card kpi"><small>${L('Ближайшее окончание', 'Next maturity')}</small><div class="val mono">${ending ? dateStr(depEnd(ending)) : '—'}</div><div class="kpi-foot"><span>${ending ? esc(ending.name) : ''}</span></div></div>
    </div>
    ${card(L('Вклады и накопительные счета', 'Deposits & savings accounts'), list.length ? `<table><thead><tr><th>${L('Название', 'Name')}</th><th>${L('Тип', 'Type')}</th><th>${L('Ставка', 'Rate')}</th><th class="note-c">${L('Срок', 'Term')}</th><th>${L('Доход в месяц', 'Per month')}</th><th>${L('Сумма', 'Amount')}</th><th></th></tr></thead><tbody>
      ${list.map((d) => `<tr data-deposit="${esc(d.id)}"><td><b>${esc(d.name)}</b></td><td><span class="badge in"><i></i>${d.kind === 'term' ? L('Срочный', 'Term') : L('Накопительный', 'Savings')}</span></td><td class="mono">${d.rate || 0}%</td><td class="note-c">${d.kind === 'term' && d.months ? `${termLabel(d.months)}${depEnd(d) ? ` · ${L('до', 'until')} ${dateStr(depEnd(d))}` : ''}` : '—'}</td><td class="sum in">+${money(monthly(d))}</td><td class="sum">${money(d.amount)}</td><td class="act">${I.edit}</td></tr>`).join('')}
    </tbody></table>` : empty(L('Добавьте вклад или накопительный счёт — Кэш посчитает доход.', 'Add a deposit or savings account to see the income.')), `<button class="btn" data-act="add-deposit">${I.plus}${L('Вклад', 'Deposit')}</button>`, 'table-card')}`;
  return { title: L('Вклады', 'Savings'), body };
}

/* ---------- 6. категории ---------- */
function catsPage() {
  const own = new Set(customCategories().map((c) => c.id));
  const count = new Map(); items.forEach((i) => count.set(i.category, (count.get(i.category) || 0) + 1));
  const col = (list, kind) => list.map(([id]) => { const c = cat(id); return `<div class="crow">${dot(c)}<span class="c-name">${esc(c.name)}<small>${count.get(id) ? nOps(count.get(id)) : L('нет операций', 'no transactions')}</small></span>${own.has(id) ? `<span class="tag">${L('своя', 'custom')}</span><button class="icon-btn" data-cat="${esc(id)}">${I.edit}</button>` : ''}</div>`; }).join('') + `<button class="btn center" data-act="add-cat" data-kind="${kind}">${I.plus}${L('Своя категория', 'Custom category')}</button>`;
  const body = `<div class="grid row2b">${card(L('Расходы', 'Expenses'), col(CATEGORIES, 'out'), `<span class="chip">${CATEGORIES.length}</span>`)}${card(L('Доходы', 'Income'), col(INCOME_CATEGORIES, 'in'), `<span class="chip">${INCOME_CATEGORIES.length}</span>`)}</div>`;
  return { title: L('Категории', 'Categories'), body };
}

/* ---------- 7. установка ---------- */
const step = (title, tag, sub, steps, extra = '') => `<div class="card"><h3 class="ih">${title}${tag}</h3><p class="sub">${sub}</p><ol class="steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>${extra}</div>`;
const easy = `<span class="tag">${L('просто', 'easy')}</span>`;
const hard = `<span class="tag warn">${L('сложнее', 'advanced')}</span>`;
const weekly = `<div class="warn-line">${L('С бесплатным Apple ID приложение работает 7 дней — потом установите тот же файл ещё раз. Данные сохраняются.', 'With a free Apple ID the app runs for 7 days — then install the same file again. Data stays.')}</div>`;
const dlCard = (os, icon, file, title, sub, meta) => `<a class="dl-card ${os}" href="${DL}${file}" download>
  <span class="dl-ico">${icon}</span><span class="dl-text"><small>${sub}</small><b>${title}</b><em class="mono">${file} · ${meta}</em></span><span class="dl-btn">${I.download}${L('Скачать', 'Download')}</span></a>`;

function installPage() {
  const T = {
    iphone: [
      dlCard('ios', I.apple, 'Kesh.ipa', L('Кэш для iPhone', 'Kesh for iPhone'), L('Файл приложения', 'App file'), L('ставится через Sideloadly', 'install with Sideloadly')),
      `<div class="inst">${step(L('Как приложение с сайта', 'Web app from Safari'), easy, L('Без компьютера. Работает офлайн, обновляется само.', 'No computer. Works offline, updates itself.'), [
        L('Откройте <code>kesh-money.vercel.app</code> в <b>Safari</b>.', 'Open <code>kesh-money.vercel.app</code> in <b>Safari</b>.'),
        L('<b>Поделиться</b> → <b>На экран «Домой»</b>.', '<b>Share</b> → <b>Add to Home Screen</b>.'),
        L('Запускайте «Кэш» с экрана «Домой».', 'Launch Kesh from the Home Screen.')])}
      ${step(L('Файл через Windows', 'File via Windows'), hard, L('Кабель и программа Sideloadly.', 'Cable and Sideloadly.'), [
        L('Установите <b>iTunes</b> и <b>iCloud</b> с сайта Apple (не из Microsoft Store) и <a href="https://sideloadly.io/" target="_blank" rel="noopener">Sideloadly</a>.', 'Install <b>iTunes</b> and <b>iCloud</b> from Apple (not the Microsoft Store) and <a href="https://sideloadly.io/" target="_blank" rel="noopener">Sideloadly</a>.'),
        L('Подключите iPhone кабелем и нажмите «Доверять».', 'Connect the iPhone and tap Trust.'),
        L('Перетащите <code>Kesh.ipa</code> в Sideloadly, введите Apple ID, нажмите <b>Start</b>.', 'Drag <code>Kesh.ipa</code> into Sideloadly, enter Apple ID, press <b>Start</b>.'),
        L('iPhone: Настройки → Основные → VPN и управление устройством → ваш Apple ID → <b>Доверять</b>.', 'iPhone: Settings → General → VPN & Device Management → your Apple ID → <b>Trust</b>.'),
        L('Настройки → Конфиденциальность и безопасность → <b>Режим разработчика</b> → включить, перезагрузить.', 'Settings → Privacy & Security → <b>Developer Mode</b> → on, restart.')], weekly)}
      ${step(L('Через Mac', 'Via Mac'), hard, L('Xcode и исходники проекта.', 'Xcode and project sources.'), [
        L('Установите <b>Xcode</b> и <code>brew install xcodegen</code>.', 'Install <b>Xcode</b> and <code>brew install xcodegen</code>.'),
        L('В папке <code>ios</code>: <code>xcodegen</code>, откройте <code>Kesh.xcodeproj</code>.', 'In <code>ios</code>: <code>xcodegen</code>, open <code>Kesh.xcodeproj</code>.'),
        L('Signing & Capabilities → Team → свой Apple ID.', 'Signing & Capabilities → Team → your Apple ID.'),
        L('Выберите iPhone и нажмите <b>▶</b>. Доверие и режим разработчика — как выше.', 'Pick the iPhone, press <b>▶</b>. Trust and Developer Mode as above.')], weekly)}</div>`,
    ],
    android: [
      dlCard('android', I.android, 'Kesh.apk', L('Кэш для Android', 'Kesh for Android'), L('Файл приложения', 'App file'), L('открыть на телефоне', 'open on the phone')),
      `<div class="inst">${step(L('Файл APK', 'APK file'), easy, L('Обычное приложение. Новые функции приходят сами.', 'A regular app. New features arrive on their own.'), [
        L('Скачайте <code>Kesh.apk</code> на телефон.', 'Download <code>Kesh.apk</code> to the phone.'),
        L('Откройте файл и разрешите установку из этого источника.', 'Open it and allow installs from this source.'),
        L('Нажмите <b>Установить</b>.', 'Tap <b>Install</b>.')])}
      ${step(L('Как приложение с сайта', 'Web app from Chrome'), easy, L('Работает офлайн, обновляется само.', 'Works offline, updates itself.'), [
        L('Откройте <code>kesh-money.vercel.app</code> в <b>Chrome</b>.', 'Open <code>kesh-money.vercel.app</code> in <b>Chrome</b>.'),
        L('Меню <b>⋮</b> → <b>Установить приложение</b>.', 'Menu <b>⋮</b> → <b>Install app</b>.')])}</div>`,
    ],
    pc: [`<div class="inst">${step(L('Этот сайт', 'This site'), easy, L('Экспорт, аналитика и все функции приложения на большом экране.', 'Export, analytics and every app feature on a big screen.'), [
      L('Откройте <code>kesh-money.vercel.app</code> на компьютере.', 'Open <code>kesh-money.vercel.app</code> on a computer.'),
      L('Перенесите копию с телефона во вкладке «Экспорт и импорт».', 'Bring your phone backup in “Export & import”.')])}
      ${step(L('Как отдельное приложение', 'As a separate app'), easy, L('Chrome или Edge.', 'Chrome or Edge.'), [
        L('Значок установки в адресной строке → <b>Установить</b>.', 'Install icon in the address bar → <b>Install</b>.')])}</div>`],
    move: [`<div class="inst">${step(L('С телефона на компьютер', 'Phone → computer'), '', L('Для отчётов и Excel.', 'For reports and Excel.'), [
      L('Телефон: Профиль → <b>Резервная копия</b>.', 'Phone: Profile → <b>Backup</b>.'),
      L('Отправьте файл себе и перетащите его во вкладку «Экспорт и импорт».', 'Send it to yourself and drop it into “Export & import”.')])}
      ${step(L('С компьютера на телефон', 'Computer → phone'), '', L('Например, после правок здесь.', 'E.g. after editing here.'), [
        L('Здесь: <b>Экспорт</b> → <b>Резервная копия</b>.', 'Here: <b>Export</b> → <b>Backup</b>.'),
        L('Телефон: Профиль → <b>Восстановить из копии</b>. Данные объединятся.', 'Phone: Profile → <b>Restore from backup</b>. Data is merged.')])}</div>`],
  };
  const tabs = [['iphone', 'iPhone'], ['android', 'Android'], ['pc', L('Компьютер', 'Computer')], ['move', L('Перенос данных', 'Moving data')]];
  return { title: L('Установка', 'Install'), body: `<div class="seg inst-tabs">${tabs.map(([id, n]) => `<button class="${view.inst === id ? 'on' : ''}" data-inst="${id}">${n}</button>`).join('')}</div>${T[view.inst].join('')}` };
}

/* ---------- 8. настройки ---------- */
function settingsPage() {
  const body = `<div class="grid row2b">
    ${card(L('Профиль', 'Profile'), `<label class="field"><span>${L('Имя', 'Name')}</span><input id="set-name" value="${esc(auth.account()?.login || '')}" maxlength="40" placeholder="${L('Как к вам обращаться', 'Your name')}"></label><button class="btn" data-act="save-name">${L('Сохранить', 'Save')}</button>`)}
    ${card(L('Язык и валюта', 'Language & currency'), `<label class="field"><span>${L('Язык', 'Language')}</span><div class="seg"><button class="${EN ? '' : 'on'}" data-lang="ru">Русский</button><button class="${EN ? 'on' : ''}" data-lang="en">English</button></div></label>
      <label class="field"><span>${L('Валюта', 'Currency')}</span><select class="sel" id="set-cur">${CURRENCIES.map(([c, ru, en]) => `<option value="${c}"${c === CURRENCY ? ' selected' : ''}>${curSymbol(c)} · ${L(ru, en)}</option>`).join('')}</select></label>
      <p class="hint">${L('Меняется только знак — суммы не пересчитываются по курсу.', 'Only the symbol changes — amounts are not converted.')}</p>`)}
    ${card(L('Данные на этом компьютере', 'Data on this computer'), `<p class="hint">${L('Сайт и веб-приложение в этом браузере используют одни и те же данные. На телефоне — свои, переносятся копией.', 'This site and the web app in this browser share data. Phones keep their own; move it with a backup.')}</p>
      <div class="center-row" style="justify-content:flex-start"><button class="btn primary" data-exp="json">${I.download}${L('Скачать копию', 'Download backup')}</button><button class="btn danger" data-act="wipe">${I.trash}${L('Удалить все данные', 'Erase all data')}</button></div>`)}
    ${card(L('О Кэше', 'About'), `<p class="hint">${L('Трекер трат без регистрации и облака. Все данные хранятся только у вас.', 'A spending tracker with no sign-up and no cloud. Your data stays with you.')}</p><p class="hint mono">web ${BUILD_WEB}</p>`)}
  </div>`;
  return { title: L('Настройки', 'Settings'), body };
}

/* ---------- окна ---------- */
function modal(title, body, onMount, onClose) {
  const wrap = document.createElement('div');
  wrap.className = 'mw';
  wrap.innerHTML = `<div class="mw-bd"></div><div class="mw-box" role="dialog" aria-modal="true"><div class="mw-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="${L('Закрыть', 'Close')}">${I.x}</button></div><div class="mw-body">${body}</div></div>`;
  document.body.appendChild(wrap);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.add('out');
    document.removeEventListener('keydown', key, true);
    setTimeout(() => wrap.remove(), 160);
    onClose?.();
  };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', key, true);
  wrap.querySelector('.mw-bd').onclick = close;
  wrap.querySelector('[data-close]').onclick = close;
  onMount?.(wrap.querySelector('.mw-box'), close);
  setTimeout(() => wrap.querySelector('.mw-body input:not([type=hidden]):not([type=checkbox]),.mw-body select')?.focus(), 30);
  return close;
}
const ask = (title, text, ok = L('Удалить', 'Delete')) => new Promise((res) => {
  let answer = false;
  modal(title, `<p class="hint">${text}</p><div class="mw-foot"><span class="grow"></span><button class="btn" data-no>${L('Отмена', 'Cancel')}</button><button class="btn danger-solid" data-yes>${ok}</button></div>`, (box, cl) => {
    box.querySelector('[data-no]').onclick = cl;
    box.querySelector('[data-yes]').onclick = () => { answer = true; cl(); };
    setTimeout(() => box.querySelector('[data-yes]').focus(), 40);
  }, () => res(answer));
});
let toastT;
function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

const catOptions = (kind, sel) => (kind === 'in' ? INCOME_CATEGORIES : CATEGORIES).map(([id]) => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(cat(id).name)}</option>`).join('');

function editTx(item, k0) {
  const isNew = !item;
  const it = item || { amount: 0, category: 'groceries', note: '', ts: Date.now(), type: undefined, acc: localStorage.getItem('lastAcc') || '' };
  let kind = k0 || (isIn(it) ? 'in' : 'out');
  const accs = accounts();
  modal(isNew ? L('Новая операция', 'New transaction') : L('Операция', 'Transaction'), `
    <div class="seg full" id="tx-kind"><button data-k="out" class="${kind === 'out' ? 'on' : ''}">${L('Расход', 'Expense')}</button><button data-k="in" class="${kind === 'in' ? 'on' : ''}">${L('Доход', 'Income')}</button></div>
    <label class="field big"><span>${L('Сумма', 'Amount')}</span><div class="amount-in"><input id="tx-amt" inputmode="decimal" autocomplete="off" value="${it.amount ? (it.amount / 100).toString().replace('.', EN ? '.' : ',') : ''}" placeholder="0"><em>${curSymbol(CURRENCY)}</em></div></label>
    <div class="two"><label class="field"><span>${L('Категория', 'Category')}</span><select class="sel" id="tx-cat">${catOptions(kind, it.category)}</select></label>
    <label class="field"><span>${L('Дата и время', 'Date & time')}</span><input type="datetime-local" id="tx-ts" value="${toLocalInput(it.ts)}" max="${toLocalInput(Date.now() + 864e5)}"></label></div>
    <label class="field"><span>${L('Описание', 'Note')}</span><input id="tx-note" maxlength="500" value="${esc(it.note || '')}" placeholder="${L('Например, Перекрёсток', 'e.g. Grocery store')}"></label>
    ${accs.length ? `<label class="field"><span>${L('Счёт', 'Account')}</span><select class="sel" id="tx-acc"><option value="">${L('Без счёта', 'No account')}</option>${accs.map((a) => `<option value="${esc(a.id)}"${a.id === it.acc ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>` : ''}
    <p class="err" id="tx-err"></p>
    <div class="mw-foot">${isNew ? '' : `<button class="btn danger" data-del>${I.trash}${L('Удалить', 'Delete')}</button>`}<span class="grow"></span><button class="btn" data-close2>${L('Отмена', 'Cancel')}</button><button class="btn primary" data-save>${L('Сохранить', 'Save')}<kbd>↵</kbd></button></div>`, (box, close) => {
    box.querySelector('#tx-kind').onclick = (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (!k || k === kind) return;
      kind = k;
      box.querySelectorAll('#tx-kind button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      box.querySelector('#tx-cat').innerHTML = catOptions(kind, kind === 'in' ? 'salary' : 'groceries');
    };
    box.querySelector('[data-close2]').onclick = close;
    const save = async () => {
      const amount = parseAmount(box.querySelector('#tx-amt').value);
      const ts = new Date(box.querySelector('#tx-ts').value).getTime();
      const err = box.querySelector('#tx-err');
      if (!(amount > 0 && amount <= 1e13)) { err.textContent = L('Введите сумму больше нуля', 'Enter an amount above zero'); return; }
      if (!Number.isFinite(ts)) { err.textContent = L('Укажите дату', 'Pick a date'); return; }
      const data = { amount, category: box.querySelector('#tx-cat').value, note: box.querySelector('#tx-note').value.trim().slice(0, 500), ts, acc: box.querySelector('#tx-acc')?.value ?? undefined };
      if (data.acc !== undefined) localStorage.setItem('lastAcc', data.acc);
      if (isNew) await store.addExpense({ ...data, type: kind === 'in' ? 'in' : undefined });
      else await store.updateExpense(it.id, { ...data, type: kind === 'in' ? 'in' : undefined });
      close();
      toast(isNew ? L('Операция добавлена', 'Transaction added') : L('Сохранено', 'Saved'));
    };
    box.querySelector('[data-save]').onclick = save;
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); save(); } });
    box.querySelector('[data-del]')?.addEventListener('click', async () => {
      close();
      if (await ask(L('Удалить операцию?', 'Delete transaction?'), `${esc(it.note || cat(it.category).name)} · ${money(it.amount)} · ${dateStr(it.ts)}`)) { await store.removeExpense(it.id); toast(L('Удалено', 'Deleted')); }
    });
  });
}

function editLimit(id) {
  const b = budgets();
  const free = CATEGORIES.filter(([c]) => !b[c] || c === id);
  modal(id ? `${L('Лимит', 'Limit')}: ${esc(cat(id).name)}` : L('Новый лимит', 'New limit'), `
    ${id ? '' : `<label class="field"><span>${L('Категория', 'Category')}</span><select class="sel" id="l-cat">${free.map(([c]) => `<option value="${esc(c)}">${esc(cat(c).name)}</option>`).join('')}</select></label>`}
    <label class="field big"><span>${L('Лимит в месяц', 'Monthly limit')}</span><div class="amount-in"><input id="l-amt" inputmode="decimal" value="${id && b[id] ? b[id] / 100 : ''}" placeholder="0"><em>${curSymbol(CURRENCY)}</em></div></label>
    <p class="err" id="l-err"></p>
    <div class="mw-foot">${id ? `<button class="btn danger" data-del>${I.trash}${L('Убрать лимит', 'Remove')}</button>` : ''}<span class="grow"></span><button class="btn primary" data-save>${L('Сохранить', 'Save')}</button></div>`, (box, close) => {
    box.querySelector('[data-save]').onclick = () => {
      const v = parseAmount(box.querySelector('#l-amt').value);
      if (!(v > 0 && v <= 1e13)) { box.querySelector('#l-err').textContent = L('Введите сумму больше нуля', 'Enter an amount above zero'); return; }
      const c = id || box.querySelector('#l-cat').value;
      saveBudgets({ ...budgets(), [c]: v }); close(); render(); toast(L('Лимит сохранён', 'Limit saved'));
    };
    box.querySelector('[data-del]')?.addEventListener('click', () => { const n = budgets(); delete n[id]; saveBudgets(n); close(); render(); });
  });
}

function editAccount(id) {
  const a = accounts().find((x) => x.id === id);
  modal(a ? L('Счёт', 'Account') : L('Новый счёт', 'New account'), `
    <label class="field"><span>${L('Название', 'Name')}</span><input id="a-name" maxlength="40" value="${esc(a?.name || '')}" placeholder="${L('Например, Т-Банк', 'e.g. Main card')}"></label>
    <div class="two"><label class="field"><span>${L('Тип', 'Type')}</span><select class="sel" id="a-type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}"${(a?.type || 'card') === k ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
    <label class="field"><span>${L('Стартовый остаток', 'Starting balance')}</span><div class="amount-in"><input id="a-base" inputmode="decimal" value="${a ? a.base / 100 : ''}" placeholder="0"><em>${curSymbol(CURRENCY)}</em></div></label></div>
    <p class="hint">${L('Остаток = старт + доходы − расходы по операциям с этим счётом.', 'Balance = start + income − expenses on this account.')}</p>
    <div class="mw-foot">${a ? `<button class="btn danger" data-del>${I.trash}${L('Удалить', 'Delete')}</button>` : ''}<span class="grow"></span><button class="btn primary" data-save>${L('Сохранить', 'Save')}</button></div>`, (box, close) => {
    box.querySelector('[data-save]').onclick = async () => {
      const name = box.querySelector('#a-name').value.trim().slice(0, 40); const type = box.querySelector('#a-type').value;
      const base = parseAmount(box.querySelector('#a-base').value || '0');
      if (Math.abs(base) > 1e13) return;
      if (a) updateAccount(a.id, { name: name || TYPES[type].name, type, base }); else addAccount({ name, type, base });
      close(); await load(); toast(L('Счёт сохранён', 'Account saved'));
    };
    box.querySelector('[data-del]')?.addEventListener('click', async () => { close(); if (await ask(L('Удалить счёт?', 'Delete account?'), L('Операции останутся, просто без счёта.', 'Transactions stay, just without the account.'))) { removeAccount(a.id); await load(); } });
  });
}

function editDeposit(id) {
  const d = deposits().find((x) => x.id === id) || { name: '', amount: 0, rate: 0, kind: 'savings', months: 12, opened: Date.now(), cap: 'month' };
  modal(id ? L('Вклад', 'Deposit') : L('Новый вклад', 'New deposit'), `
    <div class="seg full" id="d-kind"><button data-k="savings" class="${d.kind !== 'term' ? 'on' : ''}">${L('Накопительный счёт', 'Savings account')}</button><button data-k="term" class="${d.kind === 'term' ? 'on' : ''}">${L('Срочный вклад', 'Term deposit')}</button></div>
    <label class="field"><span>${L('Название', 'Name')}</span><input id="d-name" maxlength="60" value="${esc(d.name)}" placeholder="${L('Например, Вклад в Т-Банке', 'e.g. Bank deposit')}"></label>
    <div class="two"><label class="field"><span>${L('Сумма', 'Amount')}</span><div class="amount-in"><input id="d-amt" inputmode="decimal" value="${d.amount ? d.amount / 100 : ''}" placeholder="0"><em>${curSymbol(CURRENCY)}</em></div></label>
    <label class="field"><span>${L('Ставка, % годовых', 'Rate, % per year')}</span><input id="d-rate" inputmode="decimal" value="${d.rate || ''}" placeholder="18"></label></div>
    <div class="two term-only"${d.kind === 'term' ? '' : ' hidden'}><label class="field"><span>${L('Срок', 'Term')}</span><select class="sel" id="d-months">${TERMS.map((m) => `<option value="${m}"${m === d.months ? ' selected' : ''}>${termLabel(m)}</option>`).join('')}</select></label>
    <label class="field"><span>${L('Открыт', 'Opened')}</span><input type="date" id="d-open" value="${toLocalInput(d.opened || Date.now()).slice(0, 10)}"></label></div>
    <label class="field term-only"${d.kind === 'term' ? '' : ' hidden'}><span>${L('Проценты', 'Interest')}</span><select class="sel" id="d-cap"><option value="month"${d.cap !== 'end' ? ' selected' : ''}>${L('Капитализация каждый месяц', 'Monthly capitalisation')}</option><option value="end"${d.cap === 'end' ? ' selected' : ''}>${L('Выплата в конце срока', 'Paid at maturity')}</option></select></label>
    <p class="hint" id="d-calc"></p><p class="err" id="d-err"></p>
    <div class="mw-foot">${id ? `<button class="btn danger" data-del>${I.trash}${L('Удалить', 'Delete')}</button>` : ''}<span class="grow"></span><button class="btn primary" data-save>${L('Сохранить', 'Save')}</button></div>`, (box, close) => {
    let kind = d.kind === 'term' ? 'term' : 'savings';
    const read = () => ({ ...d, name: box.querySelector('#d-name').value.trim().slice(0, 60) || L('Вклад', 'Deposit'), amount: parseAmount(box.querySelector('#d-amt').value), rate: Math.min(100, Math.max(0, parseFloat(box.querySelector('#d-rate').value.replace(',', '.')) || 0)), kind, months: Number(box.querySelector('#d-months').value), opened: new Date(box.querySelector('#d-open').value).getTime() || Date.now(), cap: box.querySelector('#d-cap').value });
    const calc = () => { const v = read(); box.querySelector('#d-calc').innerHTML = v.amount ? (kind === 'term' ? L(`Доход за срок: <b>${money(depIncome(v))}</b> · в месяц ~${money(monthly(v))}`, `Income for the term: <b>${money(depIncome(v))}</b> · ~${money(monthly(v))}/mo`) : L(`Доход в месяц: <b>${money(monthly(v))}</b>`, `Monthly income: <b>${money(monthly(v))}</b>`)) : ''; };
    box.querySelector('#d-kind').onclick = (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return; kind = k; box.querySelectorAll('#d-kind button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); box.querySelectorAll('.term-only').forEach((el) => { el.hidden = k !== 'term'; }); calc(); };
    box.addEventListener('input', calc); box.addEventListener('change', calc); calc();
    box.querySelector('[data-save]').onclick = () => {
      const v = read();
      if (!(v.amount > 0 && v.amount <= 1e13)) { box.querySelector('#d-err').textContent = L('Введите сумму больше нуля', 'Enter an amount above zero'); return; }
      const list = deposits();
      if (id) saveDeposits(list.map((x) => (x.id === id ? v : x))); else saveDeposits([...list, { ...v, id: `d${Date.now().toString(36)}` }]);
      close(); render(); toast(L('Вклад сохранён', 'Deposit saved'));
    };
    box.querySelector('[data-del]')?.addEventListener('click', async () => { close(); if (await ask(L('Удалить вклад?', 'Delete deposit?'), esc(d.name))) { saveDeposits(deposits().filter((x) => x.id !== id)); render(); } });
  });
}

function editCat(id, kind0) {
  const c = customCategories().find((x) => x.id === id);
  const kind = c?.kind || kind0 || 'out';
  let color = c?.color || PALETTE[customCategories().length % PALETTE.length];
  modal(c ? L('Категория', 'Category') : L('Своя категория', 'Custom category'), `
    <label class="field"><span>${L('Название', 'Name')}</span><input id="c-name" maxlength="40" value="${esc(c?.name || '')}" placeholder="${L('Например, Хобби', 'e.g. Hobby')}"></label>
    <label class="field"><span>${L('Цвет', 'Colour')}</span><div class="swatches">${PALETTE.map((p) => `<button style="background:${p}" data-col="${p}" class="${p === color ? 'on' : ''}"></button>`).join('')}</div></label>
    <p class="hint">${kind === 'in' ? L('Категория доходов', 'Income category') : L('Категория расходов', 'Expense category')}</p><p class="err" id="c-err"></p>
    <div class="mw-foot">${c ? `<button class="btn danger" data-del>${I.trash}${L('Удалить', 'Delete')}</button>` : ''}<span class="grow"></span><button class="btn primary" data-save>${L('Сохранить', 'Save')}</button></div>`, (box, close) => {
    box.querySelector('.swatches').onclick = (e) => { const p = e.target.closest('[data-col]')?.dataset.col; if (!p) return; color = p; box.querySelectorAll('.swatches button').forEach((b) => b.classList.toggle('on', b.dataset.col === p)); };
    box.querySelector('[data-save]').onclick = () => {
      const name = box.querySelector('#c-name').value.trim();
      if (!name) { box.querySelector('#c-err').textContent = L('Введите название', 'Enter a name'); return; }
      if (c) updateCategory(c.id, { name, color }); else addCategory(name, 'star', color, kind);
      close(); render(); toast(L('Категория сохранена', 'Category saved'));
    };
    box.querySelector('[data-del]')?.addEventListener('click', async () => {
      close();
      const to = c.kind === 'in' ? 'in_other' : 'other';
      if (!(await ask(L('Удалить категорию?', 'Delete category?'), L(`Операции перейдут в «${cat(to).name}».`, `Transactions move to “${cat(to).name}”.`)))) return;
      await store.recategorize(c.id, to);
      const b = budgets(); if (b[c.id]) { delete b[c.id]; saveBudgets(b); }
      removeCategory(c.id); render();
    });
  });
}

// Календарь Air Datepicker (MIT), подгружается при первом открытии
let pickerLib;
const loadPicker = () => (pickerLib ||= new Promise((res, rej) => {
  document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '../vendor/air-datepicker.css' }));
  const sc = Object.assign(document.createElement('script'), { src: '../vendor/air-datepicker.js' });
  sc.onload = () => res(window.AirDatepicker);
  sc.onerror = () => { pickerLib = null; rej(new Error('picker')); };
  document.head.appendChild(sc);
}));
function pickDates() {
  const today = day0(Date.now());
  const preset = (n, label) => `<button class="chip" data-days="${n}">${label}</button>`;
  modal(L('Свой период', 'Custom period'), `<div class="presets">${preset(7, L('7 дней', '7 days'))}${preset(30, L('30 дней', '30 days'))}${preset(90, L('Квартал', 'Quarter'))}${preset('ytd', L('С начала года', 'Year to date'))}${preset(1, L('Сегодня', 'Today'))}</div>
    <div class="cal" id="cal"><div class="spin"></div></div><p class="hint" id="cal-sel">${L('Выберите первый и последний день — или один день дважды', 'Pick the first and last day — or one day twice')}</p>
    <div class="mw-foot"><span class="grow"></span><button class="btn primary" data-apply disabled>${L('Показать', 'Show')}</button></div>`, async (box, close) => {
    let sel = null;
    const apply = (from, to) => { view.mode = 'custom'; view.range = { from, to }; view.anchor = new Date(from); close(); render(); };
    box.querySelector('.presets').onclick = (e) => {
      const d = e.target.closest('[data-days]')?.dataset.days;
      if (!d) return;
      if (d === 'ytd') return apply(+new Date(new Date().getFullYear(), 0, 1), today + 864e5);
      apply(today - (Number(d) - 1) * 864e5, today + 864e5);
    };
    box.querySelector('[data-apply]').onclick = () => sel && apply(sel[0], sel[1]);
    try {
      const AirDatepicker = await loadPicker();
      const el = box.querySelector('#cal');
      el.innerHTML = '';
      const MS = MONTHS;
      new AirDatepicker(el, {
        inline: true, range: true, maxDate: new Date(), toggleSelected: false, firstDay: 1,
        locale: { days: L(['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']), daysShort: L(['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']), daysMin: L(['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']), months: MS, monthsShort: MON, today: L('Сегодня', 'Today'), clear: L('Очистить', 'Clear'), dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', firstDay: 1 },
        selectedDates: view.mode === 'custom' && view.range ? [new Date(view.range.from), new Date(view.range.to - 1)] : [],
        navTitles: { days: 'MMMM yyyy', months: 'yyyy', years: 'yyyy1 – yyyy2' },
        onSelect: ({ date }) => {
          const ds = [].concat(date).filter(Boolean);
          const btn = box.querySelector('[data-apply]');
          if (ds.length === 2) { sel = [day0(ds[0]), day0(ds[1]) + 864e5]; box.querySelector('#cal-sel').textContent = `${dm(sel[0])} – ${dateStr(sel[1] - 1)}`; btn.disabled = false; } else { sel = null; btn.disabled = true; }
        },
      });
    } catch { box.querySelector('#cal').innerHTML = empty(L('Календарь не загрузился', 'Calendar failed to load')); }
  });
}

/* ---------- экспорт ---------- */
function save(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
const rub = (kop) => kop / 100;
async function exportAs(kind) {
  if (!items.length && kind !== 'json') return toast(L('Пока нечего выгружать', 'Nothing to export yet'));
  const typeName = (i) => (isIn(i) ? L('Пополнение', 'Income') : L('Расход', 'Expense'));
  if (kind === 'json') {
    const data = await makeBackup(`web-${BUILD_WEB}`);
    save(new Blob([JSON.stringify(data)], { type: 'application/json' }), `nota-backup-${stamp()}.json`);
    localStorage.setItem('lastBackup', String(Date.now()));
    return toast(L(`Копия сохранена: ${nOps(items.length)}`, `Backup saved: ${nOps(items.length)}`));
  }
  if (kind === 'csv') {
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = [[L('Дата', 'Date'), L('Тип', 'Type'), L('Категория', 'Category'), L('Описание', 'Note'), L('Счёт', 'Account'), `${L('Сумма', 'Amount')}, ${curSymbol(CURRENCY)}`],
      ...items.map((i) => [toLocalInput(i.ts).replace('T', ' '), typeName(i), cat(i.category).name, i.note || '', accName(i.acc), rub(i.amount).toFixed(2).replace('.', EN ? '.' : ',')])];
    save(new Blob([`﻿${rows.map((r) => r.map(q).join(EN ? ',' : ';')).join('\r\n')}`], { type: 'text/csv' }), `kesh-${stamp()}.csv`);
    return toast(L('CSV сохранён', 'CSV saved'));
  }
  const serial = (ts) => ({ v: (ts - new Date(ts).getTimezoneOffset() * 6e4) / 864e5 + 25569, f: 'date' });
  const cats = new Map();
  items.forEach((i) => { const k = `${i.category}|${isIn(i)}`; const c = cats.get(k) || { name: cat(i.category).name, kind: typeName(i), n: 0, sum: 0 }; c.n++; c.sum += i.amount; cats.set(k, c); });
  const m0 = new Date(); const mFrom = +new Date(m0.getFullYear(), m0.getMonth(), 1);
  const b = budgets();
  const S = curSymbol(CURRENCY);
  const sheets = [
    { name: 'Операции', cols: [17, 13, 18, 36, 16, 14, 10], rows: [['Дата', 'Тип', 'Категория', 'Описание', 'Счёт', `Сумма, ${S}`, 'ID'], ...items.map((i) => [serial(i.ts), typeName(i), cat(i.category).name, i.note || '', accName(i.acc), rub(i.amount), i.id])] },
    { name: 'Категории', cols: [22, 13, 11, 14], rows: [['Категория', 'Тип', 'Операций', `Сумма, ${S}`], ...[...cats.values()].sort((x, y) => y.sum - x.sum).map((c) => [c.name, c.kind, c.n, rub(c.sum)])] },
    { name: 'Бюджет', cols: [22, 16, 16, 14], rows: [['Категория', `Лимит, ${S}`, `Потрачено (${MONTHS[m0.getMonth()].toLowerCase()}), ${S}`, `Осталось, ${S}`], ...Object.entries(b).filter(([id]) => CAT[id]).map(([id, v]) => { const sp = sum(items.filter((i) => !isIn(i) && i.category === id && i.ts >= mFrom)); return [cat(id).name, rub(v), rub(sp), rub(v - sp)]; })] },
    { name: 'Вклады', cols: [28, 14, 11, 16], rows: [['Название', `Сумма, ${S}`, 'Ставка, %', `Доход в месяц, ${S}`], ...deposits().map((d) => [d.name, rub(d.amount), d.rate || 0, rub(monthly(d))])] },
  ];
  save(new Blob([writeXlsx(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `kesh-${stamp()}.xlsx`);
  toast(L('Отчёт Excel сохранён', 'Excel report saved'));
}

/* ---------- импорт ---------- */
async function importBackup(file) {
  if (!file) return;
  let c;
  try {
    if (file.size > 30e6) throw new Error(L('Файл слишком большой', 'File is too large'));
    c = checkBackup(JSON.parse(await file.text()));
    if (!c.ok) throw new Error(c.error);
  } catch (e) { view.msg = e.message?.startsWith('Unexpected') || e instanceof SyntaxError ? L('Это не файл копии «Кэша»', 'This is not a Kesh backup') : e.message; return render(); }
  const r = await restoreBackup(c);
  view.msg = '';
  toast(L(`Добавлено ${r.added}, обновлено ${r.updated}, уже были ${r.unchanged}`, `Added ${r.added}, updated ${r.updated}, already there ${r.unchanged}`));
  view.page = 'overview'; location.hash = 'overview';
  await load();
}

async function importBank(files) {
  const list = [...files].slice(0, 5);
  if (!list.length) return;
  const close = modal(L('Выписка банка', 'Bank statement'), `<div class="spin"></div><p class="hint center">${L('Читаем выписку…', 'Reading the statement…')}</p>`);
  let found;
  try { const { parseStatement } = await import('../statement.js'); found = await parseStatement(list); } catch (e) { close(); return toast(L('Не удалось прочитать файл', 'Could not read the file')); }
  close();
  const known = await store.existingIds(found.flatMap((i) => [i.id, i.legacyId]));
  const opts = { external: false, internal: false };
  const pick = () => found.filter((i) => (i.kind === 'external' ? opts.external : i.kind === 'internal' ? opts.internal : true)).map(({ legacyId, kind, ...i }) => (known.has(legacyId) ? { ...i, id: legacyId } : i));
  const ext = found.filter((i) => i.kind === 'external'); const int = found.filter((i) => i.kind === 'internal');
  modal(L('Выписка банка', 'Bank statement'), `<div id="bk"></div>`, (box, cl) => {
    const draw = () => {
      const add = pick(); const fresh = add.filter((i) => !known.has(i.id));
      box.querySelector('#bk').innerHTML = `<div class="bk-sum"><div><b class="mono">${found.length}</b><small>${L('найдено', 'found')}</small></div><div><b class="mono">${fresh.length}</b><small>${L('новых', 'new')}</small></div><div><b class="mono">${money(sum(add))}</b><small>${L('сумма', 'total')}</small></div></div>
        ${ext.length ? `<label class="check"><input type="checkbox" data-o="external"${opts.external ? ' checked' : ''}>${L('Переводы людям', 'Transfers to people')} · ${ext.length}</label>` : ''}
        ${int.length ? `<label class="check"><input type="checkbox" data-o="internal"${opts.internal ? ' checked' : ''}>${L('Между своими счетами', 'Between own accounts')} · ${int.length}</label>` : ''}
        <div class="bk-list">${add.slice(0, 8).map((i) => `<div class="cat-row">${dot(cat(i.category))}<div class="name">${esc(i.note || cat(i.category).name)}<small>${esc(cat(i.category).name)} · ${dateStr(i.ts)}${known.has(i.id) ? ` · ${L('уже есть', 'already there')}` : ''}</small></div><span class="sum">${money(i.amount)}</span></div>`).join('')}${add.length > 8 ? `<p class="hint center">${L('и ещё', 'and')} ${add.length - 8}</p>` : ''}</div>
        <div class="mw-foot"><span class="grow"></span><button class="btn primary" data-add ${fresh.length ? '' : 'disabled'}>${fresh.length ? `${L('Добавить', 'Add')} ${fresh.length}` : L('Новых нет', 'Nothing new')}</button></div>`;
      box.querySelectorAll('[data-o]').forEach((c) => { c.onchange = () => { opts[c.dataset.o] = c.checked; draw(); }; });
      box.querySelector('[data-add]').onclick = async () => { const r = await store.importExpenses(pick()); cl(); toast(L(`Добавлено ${r.added}`, `Added ${r.added}`)); };
    };
    draw();
  });
}

/* ---------- отрисовка и события ---------- */
let keepScroll = false;
function render() {
  if (!ready) return;
  const keep = document.activeElement?.id === 'q' ? document.activeElement.selectionStart : null;
  const p = { data: dataPage, overview, ops: opsPage, budget: budgetPage, deposits: depositsPage, cats: catsPage, install: installPage, settings: settingsPage }[view.page]();
  const box = document.getElementById('pbody');
  const sc = box.querySelector('.page')?.scrollTop || 0;
  document.getElementById('ptitle').textContent = p.title;
  document.getElementById('pactions').innerHTML = headActions();
  box.innerHTML = `<div class="page">${p.body}</div>`;
  if (keepScroll) { const el = box.querySelector('.page'); if (el) el.scrollTop = sc; }
  keepScroll = false;
  chrome();
  if (keep != null) { const q = document.getElementById('q'); q?.focus(); q?.setSelectionRange(keep, keep); }
}
const go = (page) => { view.page = page; view.limit = 100; location.hash = page; render(); };

root.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-kind2],[data-page],[data-act],[data-mode],[data-shift],[data-type],[data-inst],[data-exp],[data-lang],[data-edit],[data-limit],[data-account],[data-deposit],[data-cat],[data-filter-cat],[data-search],[data-sort]');
  if (!t?.closest('#exp')) document.getElementById('exp')?.classList.remove('open');
  if (!t) return;
  const d = t.dataset;
  if (d.kind2) { view.kind = d.kind2; keepScroll = true; return render(); }
  if (d.page) { e.preventDefault(); return go(d.page); }
  if (d.lang) return d.lang !== (EN ? 'en' : 'ru') && setLang(d.lang);
  if (d.exp) { document.getElementById('exp')?.classList.remove('open'); return exportAs(d.exp); }
  if (d.mode) { view.mode = d.mode; view.range = null; if (items.length) view.anchor = new Date(items[0].ts); return render(); }
  if (d.shift) {
    const a = view.anchor; const k = Number(d.shift);
    if (view.mode === 'custom' && view.range) { const s = view.range.to - view.range.from; view.range = { from: view.range.from + k * s, to: view.range.to + k * s }; } else view.anchor = view.mode === 'month' ? new Date(a.getFullYear(), a.getMonth() + k, 1) : new Date(a.getFullYear() + k, 0, 1);
    return render();
  }
  if (d.type) { view.type = d.type; view.limit = 100; return render(); }
  if (d.inst) { view.inst = d.inst; return render(); }
  if (d.sort) { view.dir = view.sort === d.sort ? -view.dir : -1; view.sort = d.sort; return render(); }
  if (d.edit) return editTx(items.find((i) => i.id === d.edit));
  if (d.limit) return editLimit(d.limit);
  if (d.account) return editAccount(d.account);
  if (d.deposit) return editDeposit(d.deposit);
  if (d.cat) return editCat(d.cat);
  if (d.filterCat) { view.cat = d.filterCat; view.q = ''; return go('ops'); }
  if (d.search) { view.q = d.search; view.cat = ''; return go('ops'); }
  switch (d.act) {
    case 'mini': { const m = !mini(); try { localStorage.setItem('webMini', m ? '1' : '0'); } catch { /* */ } return document.getElementById('frame').classList.toggle('mini', m); }
    case 'export-menu': return document.getElementById('exp').classList.toggle('open');
    case 'add': return editTx(null);
    case 'add-income': return editTx(null, 'in');
    case 'calendar': return pickDates();
    case 'pick-backup': e.preventDefault(); return document.getElementById('file-backup').click();
    case 'pick-bank': return document.getElementById('file-bank').click();
    case 'more': view.limit += 200; keepScroll = true; return render();
    case 'reset-filters': Object.assign(view, { q: '', cat: '', acc: '', type: 'all' }); return render();
    case 'add-limit': return editLimit(null);
    case 'add-account': return editAccount(null);
    case 'add-deposit': return editDeposit(null);
    case 'add-cat': return editCat(null, d.kind);
    case 'save-name': { const n = document.getElementById('set-name').value.trim().slice(0, 40); if (n) { auth.register(n); toast(L('Имя сохранено', 'Name saved')); render(); } return; }
    case 'wipe':
      if (!(await ask(L('Удалить все данные?', 'Erase all data?'), L('Операции, категории, лимиты, счета и вклады на этом компьютере будут удалены. Сначала скачайте копию, если она нужна.', 'Transactions, categories, limits, accounts and savings on this computer will be deleted. Download a backup first if you need it.'), L('Удалить всё', 'Erase all')))) return;
      await store.wipe();
      ['customCats', 'budgets', 'deposits', 'wallet', 'accounts', 'accountsOff', 'lastAcc', 'lastBackup', 'webBackup'].forEach((k) => localStorage.removeItem(k));
      location.reload();
      return;
    default:
  }
});
root.addEventListener('change', (e) => {
  if (e.target.id === 'file-backup') { importBackup(e.target.files[0]); e.target.value = ''; }
  if (e.target.id === 'file-bank') { importBank(e.target.files); e.target.value = ''; }
  if (e.target.id === 'catf') { view.cat = e.target.value; view.limit = 100; render(); }
  if (e.target.id === 'accf') { view.acc = e.target.value; view.limit = 100; render(); }
  if (e.target.id === 'set-cur' && e.target.value !== CURRENCY) setCurrency(e.target.value);
});
root.addEventListener('input', (e) => {
  if (e.target.id === 'q') { view.q = e.target.value; view.limit = 100; render(); }
  if (e.target.id === 'gq') { view.q = e.target.value; view.limit = 100; if (view.page !== 'ops') { view.page = 'ops'; location.hash = 'ops'; } render(); }
});

// Перетаскивание: .json — копия, .pdf/.csv — выписка
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.getElementById('drop')?.classList.add('over'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.getElementById('drop')?.classList.remove('over'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0;
  const files = [...e.dataTransfer.files];
  if (!files.length) return;
  if (/\.json$/i.test(files[0].name)) importBackup(files[0]);
  else if (files.some((f) => /\.(pdf|csv)$/i.test(f.name))) importBank(files.filter((f) => /\.(pdf|csv)$/i.test(f.name)));
  else toast(L('Нужен файл .json, .pdf или .csv', 'Use a .json, .pdf or .csv file'));
});

const tipAt = (el, x, y) => {
  const tip = document.getElementById('tip');
  if (!tip) return;
  if (!el) { tip.style.display = 'none'; return; }
  const n = el.dataset.n;
  tip.innerHTML = `<small>${esc(el.dataset.tip)}</small><b>${esc(el.dataset.v)}</b>${n && n !== '0' ? ` <small>${/%$/.test(n) ? n : nOps(Number(n))}</small>` : ''}`;
  tip.style.display = 'block'; tip.style.left = `${x}px`; tip.style.top = `${y - 8}px`;
};
root.addEventListener('mousemove', (e) => tipAt(e.target.closest('[data-tip]'), e.clientX, e.clientY));
root.addEventListener('mouseleave', () => tipAt(null));
window.addEventListener('hashchange', () => { const p = hashPage(); if (p !== view.page) { view.page = p; render(); } });
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.mw') || e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'т') { e.preventDefault(); editTx(null); }
  if (e.key === '/') { e.preventDefault(); document.getElementById('gq').focus(); }
});
store.onChange(() => load());

// Заставка с деталями — пока поднимаются данные
const loader = document.getElementById('loader');
const first = !sessionStorage.getItem('kIntro');
frame();
const t0 = performance.now();
migrate().then(load).then(() => {
  sessionStorage.setItem('kIntro', '1');
  setTimeout(() => loader.classList.add('done'), Math.max(0, (first ? 1400 : 250) - (performance.now() - t0)));
  if (!items.length && view.page === 'data' && location.hash !== '#data') history.replaceState(null, '', '#data');
});
