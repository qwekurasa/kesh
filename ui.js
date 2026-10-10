import * as auth from './auth.js';

export const CATEGORIES = [
  ['groceries', 'Продукты', '🛒'], ['cafe', 'Рестораны', '🍽️'], ['fastfood', 'Фастфуд', '🍔'], ['coffee', 'Кофе', '☕'],
  ['delivery', 'Доставка', '🥡'],
  ['transport', 'Транспорт', '🚇'], ['taxi', 'Такси', '🚕'], ['car', 'Авто', '⛽'], ['home', 'Дом и ЖКХ', '🏠'],
  ['mobile', 'Связь', '📱'], ['subs', 'Подписки', '🔁'], ['clothes', 'Одежда', '👕'], ['health', 'Здоровье', '💊'],
  ['beauty', 'Красота', '💅'], ['sport', 'Спорт', '🏋️'], ['fun', 'Развлечения', '🎬'], ['travel', 'Путешествия', '✈️'],
  ['education', 'Обучение', '📚'], ['gifts', 'Подарки', '🎁'], ['pets', 'Питомцы', '🐾'], ['kids', 'Дети', '🧸'],
  ['tech', 'Техника', '💻'], ['household', 'Хозтовары', '🧴'], ['transfers', 'Переводы', '💸'],
  ['finance', 'Финансы', '🏦'], ['cash', 'Наличные', '💵'], ['other', 'Другое', '📦'],
];
export const CAT = Object.fromEntries(CATEGORIES.map(([id, name, emoji]) => [id, { id, name, emoji }]));

export const app = document.getElementById('app');

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export const state = {
  tab: 'home',
  flow: 'add',
  amt: '', cat: null, note: '',
  usePassword: false,
  unlocked: !auth.account()?.credId && localStorage.getItem('loggedIn') === '1',
  month: startOfMonth(),
  collapsed: new Set(),
  period: 'month',
  query: '', filter: null, authMode: null, imp: null, edit: null, catId: null,
};

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const money = (kop) => `${nf.format(kop / 100)} ₽`;
export const moneyShort = (kop) => {
  const r = Math.round(kop / 100);
  if (Math.abs(r) >= 1000000) return `${nf.format(Math.round(r / 100000) / 10)}M`;
  if (Math.abs(r) >= 10000) return `${nf.format(Math.round(r / 1000))}к`;
  return nf.format(r);
};
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const haptic = () => navigator.vibrate?.(8);

const svg = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const icons = {
  back: svg('<path d="m15 18-6-6 6-6"/>', 2),
  left: svg('<path d="m15 18-6-6 6-6"/>', 2),
  right: svg('<path d="m9 18 6-6-6-6"/>', 2),
  down: svg('<path d="m6 9 6 6 6-6"/>', 2),
  del: svg('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m17 9-5 5M12 9l5 5"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 2),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.2),
  home: svg('<rect x="3" y="5" width="18" height="6" rx="2"/><rect x="3" y="15" width="18" height="4" rx="2"/>'),
  chart: svg('<path d="M5 20V10M12 20V4M19 20v-7"/>', 2),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  face: svg('<path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0"/>'),
  lock: svg('<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  out: svg('<path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2"/><path d="M19 12H9m10 0-3-3m3 3-3 3"/>'),
  down_file: svg('<path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/>'),
  up_file: svg('<path d="M12 20V9m0 0 4 4M12 9l-4 4"/><path d="M4 5h16"/>'),
  camera: svg('<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.5"/>'),
  bank: svg('<rect x="3" y="7" width="18" height="11" rx="3"/><circle cx="12" cy="12.5" r="2.4"/>'),
  spark: svg('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
  trash: svg('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>'),
};

let renderFn = () => {};
export const setRender = (fn) => { renderFn = fn; };
export const render = () => renderFn();

export function go(tab) {
  state.tab = tab;
  state.flow = null;
  render();
}

export function openEdit(item) {
  const rub = item.amount / 100;
  Object.assign(state, {
    flow: 'add',
    edit: item,
    amt: (Number.isInteger(rub) ? String(rub) : rub.toFixed(2)).replace('.', ','),
    cat: item.category,
    note: item.note || '',
  });
  render();
}

export function openCategory(id) {
  state.catId = id;
  state.flow = 'cat';
  render();
}

export function openAdd() {
  Object.assign(state, { flow: 'add', amt: '', cat: null, note: '' });
  render();
}

let toastTimer;
export function toast(text, undo) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(text)}</span>${undo ? '<button>Отменить</button>' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
  if (undo) el.querySelector('button').onclick = () => { el.hidden = true; undo(); };
}

export function tabbar() {
  const item = (id, label, icon) =>
    `<button class="tab${state.tab === id && !state.flow ? ' on' : ''}" data-tab="${id}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">
    ${item('home', 'Главная', icons.home)}
    ${item('charts', 'Графики', icons.chart)}
    <button class="tab add" data-tab="add" aria-label="Добавить трату">${icons.plus}</button>
    ${item('search', 'Поиск', icons.search)}
    ${item('profile', 'Профиль', icons.user)}
  </nav>`;
}

export function bindTabs() {
  app.querySelector('.tabbar')?.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    haptic();
    t.dataset.tab === 'add' ? openAdd() : go(t.dataset.tab);
  });
}

export const avatar = () => localStorage.getItem('avatar') || '';
export function avatarHTML(cls = '') {
  const src = avatar();
  return src
    ? `<span class="ava photo ${cls}" style="background-image:url(${src})"></span>`
    : `<span class="ava orb ${cls}"></span>`;
}
