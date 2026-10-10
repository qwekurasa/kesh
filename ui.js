import * as auth from './auth.js';

const BASE = [
  ['groceries', 'Продукты', '🛒'], ['cafe', 'Рестораны', '🍽️'], ['fastfood', 'Фастфуд', '🍔'], ['coffee', 'Кофе', '☕'],
  ['delivery', 'Доставка', '🥡'], ['transport', 'Транспорт', '🚇'], ['taxi', 'Такси', '🚕'], ['car', 'Авто', '⛽'],
  ['home', 'Дом и ЖКХ', '🏠'], ['mobile', 'Связь', '📱'], ['subs', 'Подписки', '🔁'], ['clothes', 'Одежда', '👕'],
  ['health', 'Здоровье', '💊'], ['beauty', 'Красота', '💅'], ['sport', 'Спорт', '🏋️'], ['fun', 'Развлечения', '🎬'],
  ['travel', 'Путешествия', '✈️'], ['education', 'Обучение', '📚'], ['gifts', 'Подарки', '🎁'], ['pets', 'Питомцы', '🐾'],
  ['kids', 'Дети', '🧸'], ['tech', 'Техника', '💻'], ['household', 'Хозтовары', '🧴'], ['transfers', 'Переводы', '💸'],
  ['finance', 'Финансы', '🏦'], ['cash', 'Наличные', '💵'], ['other', 'Другое', '📦'],
];

const KEYWORDS = {
  groceries: 'еда магазин супермаркет пятёрочка магнит лента',
  cafe: 'кафе ресторан обед ужин бар',
  fastfood: 'фастфуд бургер шаурма пицца столовая',
  coffee: 'кофе капучино латте',
  delivery: 'доставка еда самокат',
  transport: 'метро автобус электричка проезд билет',
  taxi: 'такси поездка',
  car: 'бензин заправка парковка машина',
  home: 'жкх квартира аренда коммуналка свет вода',
  mobile: 'связь интернет телефон мобильный оператор',
  subs: 'подписка сервис',
  clothes: 'одежда обувь вещи',
  health: 'аптека лекарства врач больница анализы здоровье',
  beauty: 'красота салон парикмахер маникюр косметика',
  sport: 'спорт зал фитнес бассейн',
  fun: 'развлечения кино театр концерт игры отдых',
  travel: 'путешествия отпуск отель билеты самолёт',
  education: 'обучение курсы книги школа учёба',
  gifts: 'подарки цветы праздник',
  pets: 'питомцы кот собака корм ветеринар',
  kids: 'дети ребёнок игрушки сад',
  tech: 'техника гаджеты электроника компьютер',
  household: 'хозтовары бытовая химия дом ремонт',
  transfers: 'перевод деньги другу',
  finance: 'финансы банк счёт вклад',
  cash: 'наличные снятие банкомат',
  other: 'другое прочее разное',
};

export const CATEGORIES = [];
export const CAT = {};

export const customCategories = () => {
  try { return JSON.parse(localStorage.getItem('customCats')) || []; } catch { return []; }
};

export function reloadCategories() {
  const custom = customCategories().map((c) => [c.id, c.name, c.emoji]);
  CATEGORIES.length = 0;
  CATEGORIES.push(...BASE.slice(0, -1), ...custom, BASE[BASE.length - 1]);
  Object.keys(CAT).forEach((k) => delete CAT[k]);
  CATEGORIES.forEach(([id, name, emoji]) => { CAT[id] = { id, name, emoji }; });
}
reloadCategories();

export function addCategory(name, emoji) {
  const list = customCategories();
  const id = `c${Date.now().toString(36)}`;
  list.push({ id, name, emoji });
  localStorage.setItem('customCats', JSON.stringify(list));
  reloadCategories();
  return id;
}

export function removeCategory(id) {
  localStorage.setItem('customCats', JSON.stringify(customCategories().filter((c) => c.id !== id)));
  reloadCategories();
}

export const matchCategory = (id, name, q) =>
  name.toLowerCase().includes(q) || (KEYWORDS[id] || '').includes(q);

export const app = document.getElementById('app');

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export const state = {
  tab: 'home',
  flow: 'add',
  amt: '', cat: null, note: '',
  usePassword: false,
  unlocked: auth.isOpen(),
  month: startOfMonth(),
  collapsed: new Set(),
  period: 'month',
  query: '', filter: null, authMode: null, imp: null, edit: null, catId: null,
  catQuery: '', date: Date.now(), step: 0, draft: {},
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
  tag: svg('<path d="M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8L3 11Z"/><circle cx="8" cy="8" r="1.4"/>'),
  trash: svg('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
};

let renderFn = () => {};
export const setRender = (fn) => { renderFn = fn; };
export const render = () => renderFn();

export function go(tab) {
  state.tab = tab;
  state.flow = null;
  state.catId = null;
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
    catQuery: '',
    date: item.ts,
  });
  render();
}

export function openCategory(id) {
  state.catId = id;
  state.flow = 'cat';
  render();
}

export function openAdd() {
  Object.assign(state, { flow: 'add', edit: null, amt: '', cat: null, note: '', catQuery: '', date: Date.now() });
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
export const avatarEmoji = () => localStorage.getItem('avatarEmoji') || '';

export function avatarHTML(cls = '') {
  const src = avatar();
  if (src) return `<span class="ava photo ${cls}" style="background-image:url(${src})"></span>`;
  const em = avatarEmoji();
  return em ? `<span class="ava emoji ${cls}">${em}</span>` : `<span class="ava orb ${cls}"></span>`;
}

// плавный счётчик для крупных чисел
export function countUp(el, to) {
  if (!el) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = money(to); return; }
  const dur = 620;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = money(Math.round(to * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
