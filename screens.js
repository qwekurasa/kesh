import * as store from './store.js';
import * as auth from './auth.js';
import {
  CAT, app, state, money, moneyShort, esc, haptic, icons,
  render, go, toast, dialog, sheet, bottomSheet, PALETTE, tabbar, bindTabs, avatarHTML, openEdit, openRepeat, openInfo, openCategory, countUp, customCategories, removeCategory, catIcon, ask, askText, applySkin, SKINS, skinStyle, avatarSkin,
  CATEGORIES, catColor, isIncome, sumCell, num, SYM, reloadCategories, addCategory, ticket,
} from './ui.js';
import { writeXlsx, readXlsx } from './xlsx.js';
import { keshOn, setKesh, hintsOn, setHints, keshHint, keshSay, calmMode, setCalm, keshCoat, setCoat, keshSVG, catAvatar } from './kesh.js';

const REPO = 'https://github.com/qwekurasa/kesh';
import { makeBackup, checkBackup, restoreBackup } from './backup.js';
import { TYPES, accounts, balances, ownTotal, addAccount, updateAccount, removeAccount, accountsOff, setAccountsOff } from './accounts.js';
import { L, LANG, setLang, plural as pl, CURRENCIES, CURRENCY, curSymbol, setCurrency } from './i18n.js';

export const BUILD = 'v39';


const MONTHS = L(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const MONTHS_LOW = L(['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'], MONTHS);
const MONTHS_SHORT = L(['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const WEEKDAYS = L(['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const sum = (items) => items.reduce((a, i) => a + i.amount, 0);
const spent = (items) => items.filter((i) => !isIncome(i));

function groupByDay(items) {
  const map = new Map();
  for (const i of [...items].sort((a, b) => b.ts - a.ts)) {
    const k = dayKey(i.ts);
    if (!map.has(k)) map.set(k, { ts: i.ts, items: [] });
    map.get(k).items.push(i);
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

/* ---------- home ---------- */
const MONTHS_GEN = L(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], MONTHS);
const MONTHS_PREP = L(['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'], MONTHS);
const hhmm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export async function renderHome() {
  const live = ticket();
  const m = state.month;
  const isMonth = !state.range;
  const from = isMonth ? m.getTime() : state.range.from;
  const to = isMonth ? +new Date(m.getFullYear(), m.getMonth() + 1, 1) : state.range.to;
  const isCurrent = to > Date.now() && from <= Date.now();
  const span = to - from;
  const elapsed = isCurrent ? Date.now() - from : span;
  // сравнение с прошлым периодом на тот же отрезок, иначе текущий всегда «дешевле»
  const prevFrom = isMonth ? +new Date(m.getFullYear(), m.getMonth() - 1, 1) : from - span;
  const prevTo = isCurrent ? Math.min(from, prevFrom + elapsed) : from;
  const [items, before, wal] = await Promise.all([
    store.expensesBetween(from, to - 1),
    store.expensesBetween(prevFrom, prevTo - 1),
    balances(),
  ]);
  const days = groupByDay(items);
  const total = sum(spent(items));
  const income = sum(items.filter(isIncome));
  const prevTotal = sum(spent(before));
  const prevIncome = sum(before.filter(isIncome));
  const nDays = Math.max(1, Math.round(span / 864e5));
  const passed = isCurrent ? Math.floor((Date.now() - from) / 864e5) + 1 : nDays;
  const prevPassed = isCurrent ? passed : Math.max(1, Math.round((prevTo - prevFrom) / 864e5));
  const todayKey = dayKey(Date.now());
  const yKey = dayKey(Date.now() - 864e5);
  const today = sum(spent(items.filter((i) => dayKey(i.ts) === todayKey)));
  const yesterday = sum(spent([...items, ...before].filter((i) => dayKey(i.ts) === yKey)));
  // столбики по дням; длинный период — по неделям
  const step = nDays > 62 ? 7 : 1;
  const perDay = Array(Math.ceil(nDays / step)).fill(0);
  spent(items).forEach((i) => { const k = Math.floor(Math.floor((i.ts - from) / 864e5) / step); if (k >= 0 && k < perDay.length) perDay[k] += i.amount; });
  const nowBar = isCurrent ? Math.floor((passed - 1) / step) : -1;
  const peak = Math.max(...perDay, 1);
  const dm = (ts) => { const d = new Date(ts); return L(`${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`); };
  const axis = isMonth ? [1, 8, 15, 22, nDays] : [dm(from), dm(from + span / 2), dm(to - 1)];
  const oneDay = !isMonth && span === 864e5;
  const label = isMonth ? `${MONTHS[m.getMonth()]} ${m.getFullYear()}` : oneDay ? dm(from) : `${dm(from)} – ${dm(to - 1)}`;
  const sub = prevTotal
    ? (isMonth
      ? (isCurrent ? L(`За 1–${passed} ${MONTHS_GEN[new Date(prevFrom).getMonth()]} было ${money(prevTotal)}`, `${MONTHS_SHORT[new Date(prevFrom).getMonth()]} 1–${passed}: ${money(prevTotal)}`)
        : L(`В ${MONTHS_PREP[new Date(prevFrom).getMonth()]} было ${money(prevTotal)}`, `${MONTHS[new Date(prevFrom).getMonth()]}: ${money(prevTotal)}`))
      : L(`За такой же период до этого — ${money(prevTotal)}`, `Previous period: ${money(prevTotal)}`))
    : items.length ? '' : L('Трат пока нет', 'No expenses yet');
  const acc = auth.account();

  const row = (i) => `
    <div class="tr" data-id="${i.id}">
      <span class="tr-ico">${catIcon(i.category)}</span>
      <span class="tr-name">${esc(CAT[i.category]?.name || i.category)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</span>
      <span class="tr-right">${sumCell(i)}<small>${hhmm(i.ts)}</small></span>
    </div>`;

  const day = (d, n) => {
    const date = new Date(d.ts);
    const open = !state.collapsed.has(d.key);
    const label = d.key === todayKey ? L('Сегодня · ', 'Today · ') : d.key === yKey ? L('Вчера · ', 'Yesterday · ') : `${WEEKDAYS[date.getDay()]} · `;
    const out = sum(spent(d.items));
    const inc = sum(d.items.filter(isIncome));
    return `
      <section class="day${open ? ' open' : ''}" data-key="${d.key}" style="--i:${n}">
        <button class="day-head">
          <span class="day-title">${label}${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}</span>
          <span class="day-sum">${out ? `−${money(out)}` : ''}${inc ? ` <span class="plus">+${money(inc)}</span>` : ''}</span>
        </button>
        <div class="day-items">${d.items.map(row).join('')}</div>
      </section>`;
  };

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="home-head">
        <span class="head-side"></span>
        <div class="period-nav">
          <button class="icon-btn sm" id="prev" aria-label="${L('Назад', 'Back')}">${icons.left}</button>
          <button class="period-btn" id="period"><span class="month-name">${label}</span>${icons.calendar}</button>
          <button class="icon-btn sm" id="next" aria-label="${L('Вперёд', 'Forward')}" ${to > Date.now() ? 'disabled' : ''}>${icons.right}</button>
        </div>
        <button class="who" id="me" aria-label="${L('Профиль', 'Profile')}">${avatarHTML()}</button>
      </header>
      <div class="scroll" id="list">
        <div class="hero">
          <div class="hero-top"><span class="hero-label">${isMonth ? L('Расходы за месяц', 'Spent this month') : oneDay ? L('Расходы за день', 'Spent that day') : L('Расходы за период', 'Spent in period')}</span>${wal.length ? `<button class="wallet-pill" id="wallet">${icons.wallet}<b class="${ownTotal(wal) < 0 ? 'minus' : ''}">${money(ownTotal(wal))}</b></button>` : ''}</div>
          <div class="hero-row"><div class="month-total">${money(total)}</div>${deltaChip(total, prevTotal)}</div>
          <div class="month-sub">${sub}</div>
        </div>
        <div class="metrics">
          <div><small>${L('Сегодня', 'Today')}</small><b>${isCurrent ? money(today) : '—'}</b>${isCurrent ? deltaChip(today, yesterday) : ''}</div>
          <div><small>${L('Доходы', 'Income')}</small><b class="${income ? 'plus' : ''}">${income ? '+' : ''}${money(income)}</b>${deltaChip(income, prevIncome, true)}</div>
          <div><small>${L('В день', 'Per day')}</small><b>${money(Math.round(total / passed))}</b>${deltaChip(total / passed, prevTotal / prevPassed)}</div>
        </div>
        ${total ? `<button class="card mini-chart" id="to-charts">
          <span class="card-head"><b>${step > 1 ? L('По неделям', 'Weekly') : L('По дням', 'Daily')}</b><span class="chip">${step > 1 ? L('по неделям', 'weekly') : isMonth ? L('1М', '1M') : `${nDays} ${L('дн', 'd')}`}</span></span>
          <span class="mini-bars">${perDay.map((v, i) => `<i class="${i === nowBar ? 'today' : ''}" style="height:${v ? Math.max(6, (v / peak) * 100) : 2}%"></i>`).join('')}</span>
          <span class="mini-axis">${axis.map((d) => `<small>${d}</small>`).join('')}</span>
        </button>` : ''}
        ${days.length ? days.map(day).join('') : `<div class="empty">${L('Нажмите <b>＋</b>, чтобы добавить первую трату', 'Tap <b>＋</b> to add your first expense')}</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#period').onclick = () => { haptic(); pickPeriod(); };
  app.querySelector('#wallet')?.addEventListener('click', () => { haptic(); go('budget'); });
  countUp(app.querySelector('.month-total'), total);
  app.querySelector('#me').onclick = () => { haptic(); go('profile'); };
  app.querySelector('#to-charts')?.addEventListener('click', () => { haptic(); state.period = 'month'; go('charts'); });
  restoreScroll(app.querySelector('#list'));
  if (!items.length && isCurrent && isMonth) keshHint('home-first', L('Это твой месяц. Жми «＋» — запишем первую трату.', 'This is your month. Tap “＋” to log your first expense.'));
  app.querySelector('#prev').onclick = () => { shiftMonth(-1); };
  app.querySelector('#next').onclick = () => { shiftMonth(1); };
  app.querySelector('#list').addEventListener('click', (e) => {
    const head = e.target.closest('.day-head');
    if (head) {
      const sec = head.parentElement;
      state.collapsed.has(sec.dataset.key) ? state.collapsed.delete(sec.dataset.key) : state.collapsed.add(sec.dataset.key);
      sec.classList.toggle('open');
      haptic();
      return;
    }
    const tr = e.target.closest('.tr');
    if (tr) {
      const item = items.find((i) => i.id === tr.dataset.id);
      if (item) { haptic(); state.keepScroll = app.querySelector('#list').scrollTop; openInfo(item); }
    }
  });
}

// После возврата из карточки операции список остаётся на том же месте
function restoreScroll(el) {
  if (el && state.keepScroll) el.scrollTop = state.keepScroll;
  state.keepScroll = 0;
}

function shiftMonth(delta) {
  if (state.range) {
    const span = state.range.to - state.range.from;
    state.range = { from: state.range.from + delta * span, to: state.range.to + delta * span };
  } else state.month = new Date(state.month.getFullYear(), state.month.getMonth() + delta, 1);
  render();
}

// Календарь — открытый Air Datepicker (MIT), подгружается при первом открытии
let pickerLib;
const loadPicker = () => (pickerLib ||= new Promise((res, rej) => {
  document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: './vendor/air-datepicker.css' }));
  const sc = Object.assign(document.createElement('script'), { src: './vendor/air-datepicker.js' });
  sc.onload = () => res(window.AirDatepicker);
  sc.onerror = () => { pickerLib = null; rej(new Error('picker')); };
  document.head.appendChild(sc);
}));
const PICKER_LOCALE = L({
  days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  daysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], daysMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  months: MONTHS, monthsShort: MONTHS_SHORT, today: 'Сегодня', clear: 'Очистить', dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', firstDay: 1,
}, {
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  months: MONTHS, monthsShort: MONTHS_SHORT, today: 'Today', clear: 'Clear', dateFormat: 'MM/dd/yyyy', timeFormat: 'hh:mm aa', firstDay: 1,
});

const chevSvg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const day0 = (ts) => { const d = new Date(ts); return +new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
// Календарь в контейнере (Air Datepicker); onPick(dates)
export async function mountCalendar(el, opts) {
  try {
    const AirDatepicker = await loadPicker();
    if (!el.isConnected) return null;
    el.innerHTML = '';
    return new AirDatepicker(el, {
      inline: true, locale: PICKER_LOCALE, maxDate: new Date(), toggleSelected: false,
      navTitles: { days: 'MMMM yyyy', months: 'yyyy', years: 'yyyy1 – yyyy2' },
      prevHtml: chevSvg('m15 18-6-6 6-6'), nextHtml: chevSvg('m9 18 6-6-6-6'), ...opts,
    });
  } catch {
    el.innerHTML = `<div class="empty sm">${L('Календарь не загрузился. Проверьте сеть.', 'Calendar failed to load. Check your connection.')}</div>`;
    return null;
  }
}

// Выбор периода: месяц (один тап), день или «от–до»
function pickPeriod(tab) {
  const tomorrow = day0(Date.now()) + 864e5;
  const r = state.range;
  tab ||= !r ? 'month' : r.to - r.from === 864e5 ? 'day' : 'range';
  const now = new Date();
  let year = state.month.getFullYear();
  const tabs = [['month', L('Месяц', 'Month')], ['day', L('День', 'Day')], ['range', L('От–до', 'Range')]];
  const { panel, close } = bottomSheet(L('Выбор периода', 'Choose period'), `
    <div class="seg pp-tabs">${tabs.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>
    <div class="pp-body"></div>
    <div class="bs-foot pp-foot"></div>`, () => dp?.destroy());
  let dp;
  const body = panel.querySelector('.pp-body');
  const foot = panel.querySelector('.pp-foot');
  const reset = `<button class="link" id="pp-reset">${L('Сбросить', 'Reset')}</button>`;
  const apply = (range, month) => { state.range = range; if (month) state.month = month; close(); render(); };
  const bindReset = () => { foot.querySelector('#pp-reset').onclick = () => apply(null, new Date(now.getFullYear(), now.getMonth(), 1)); };
  const longDate = (d) => L(`${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`, `${MONTHS[d.getMonth()]} ${d.getDate()}`);

  const showMonth = () => {
    const sel = !state.range ? state.month : null;
    body.innerHTML = `<div class="pp-year"><button class="icon-btn sm" data-y="-1">${icons.left}</button><b>${year}</b><button class="icon-btn sm" data-y="1" ${year >= now.getFullYear() ? 'disabled' : ''}>${icons.right}</button></div>
      <div class="pp-months">${MONTHS_SHORT.map((m, i) => {
        const on = sel && sel.getFullYear() === year && sel.getMonth() === i;
        const future = year > now.getFullYear() || (year === now.getFullYear() && i > now.getMonth());
        return `<button class="pp-m${on ? ' on' : ''}" data-m="${i}" ${future ? 'disabled' : ''}>${m[0].toUpperCase() + m.slice(1)}${on ? ' ✓' : ''}</button>`;
      }).join('')}</div>`;
    foot.innerHTML = `<div><small>${L('Выбрано', 'Selected')}</small><b>${sel ? `${MONTHS[sel.getMonth()]} ${sel.getFullYear()}` : '—'}</b></div>${reset}`;
    bindReset();
    body.querySelector('.pp-year').onclick = (e) => { const d = Number(e.target.closest('[data-y]')?.dataset.y); if (d) { year += d; showMonth(); } };
    body.querySelector('.pp-months').onclick = (e) => {
      const m = e.target.closest('[data-m]');
      if (!m || m.disabled) return;
      haptic();
      apply(null, new Date(year, Number(m.dataset.m), 1));
    };
  };
  const showDay = async () => {
    body.innerHTML = '<div class="cal"><div class="spinner"></div></div>';
    foot.innerHTML = `<span class="pp-hint">${L('Нажмите на дату для выбора', 'Tap a date to select it')}</span>${reset}`;
    bindReset();
    const cur = state.range && state.range.to - state.range.from === 864e5 ? new Date(state.range.from) : null;
    dp = await mountCalendar(body.querySelector('.cal'), {
      selectedDates: cur ? [cur] : [], startDate: cur || new Date(),
      onSelect: ({ date }) => { if (date) { haptic(); const a = day0(date); apply({ from: a, to: a + 864e5 }); } },
    });
  };
  const showRange = async () => {
    body.innerHTML = '<div class="cal"><div class="spinner"></div></div>';
    const hint = (d) => {
      foot.innerHTML = d
        ? `<span class="pp-step">${icons.check}<span><b>${L('Начало', 'Start')}: ${longDate(d)}</b><small>${L('Теперь выберите конечную дату', 'Now pick the end date')}</small></span></span>`
        : `<span class="pp-hint">${L('Сначала начало, затем конец', 'Start first, then end')}</span>${reset}`;
      if (!d) bindReset();
    };
    hint(null);
    dp = await mountCalendar(body.querySelector('.cal'), {
      range: true, dynamicRange: true, startDate: state.range ? new Date(state.range.to - 1) : new Date(),
      onSelect: ({ date }) => {
        const d = Array.isArray(date) ? date : [date];
        if (d.length === 1) { haptic(); hint(d[0]); }
        if (d.length === 2) { haptic(); const a = day0(d[0]), b = day0(d[1]); setTimeout(() => apply({ from: Math.min(a, b), to: Math.max(a, b) + 864e5 }), 180); }
      },
    });
  };
  const show = (t) => {
    tab = t;
    dp?.destroy(); dp = null;
    panel.querySelectorAll('.pp-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    ({ month: showMonth, day: showDay, range: showRange })[t]();
  };
  panel.querySelector('.pp-tabs').onclick = (e) => { const t = e.target.closest('[data-t]')?.dataset.t; if (t && t !== tab) { haptic(); show(t); } };
  show(tab);
}

const PL_EN = {
  операция: ['transaction', 'transactions'], операцию: ['transaction', 'transactions'], трата: ['expense', 'expenses'], трату: ['expense', 'expenses'],
  поступление: ['income', 'incomes'], день: ['day', 'days'], вклад: ['account', 'accounts'], лимит: ['limit', 'limits'], категория: ['category', 'categories'],
  строка: ['row', 'rows'], год: ['year', 'years'], новую: ['new', 'new'], была: ['was', 'were'], 'операция перенесена': ['transaction moved', 'transactions moved'],
};
const plural = (n, one, few, many) => pl(n, [one, few, many], PL_EN[one] || [one, few]);

/* ---------- charts ---------- */
const PERIODS = [['week', L('Нед', 'Wk')], ['month', L('Мес', 'Mo')], ['year', L('Год', 'Yr')]];

function periodRange(period) {
  const now = new Date();
  if (period === 'day') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: new Date(+from + 864e5), label: `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]}`, bars: 24, step: 'hour' };
  }
  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { from: d, to: new Date(+d + 7 * 864e5), label: L('Эта неделя', 'This week'), bars: 7, step: 'day' };
  }
  if (period === 'year') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from, to: new Date(now.getFullYear() + 1, 0, 1), label: String(now.getFullYear()), bars: 12, step: 'month' };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from, to, label: MONTHS[now.getMonth()], bars: new Date(+to - 1).getDate(), step: 'day' };
}

// Прошлый период обрезается до того же количества времени, что уже прошло в текущем,
// иначе неполный месяц всегда «дешевле» полного предыдущего.
function prevRange(r, elapsed) {
  let from, label;
  if (r.step === 'month') { from = new Date(r.from.getFullYear() - 1, 0, 1); label = String(from.getFullYear()); }
  else if (r.step === 'hour') { from = new Date(+r.from - 864e5); label = L('Вчера', 'Yesterday'); }
  else if (r.bars === 7) { from = new Date(+r.from - 7 * 864e5); label = L('Прошлая неделя', 'Last week'); }
  else { from = new Date(r.from.getFullYear(), r.from.getMonth() - 1, 1); label = MONTHS[from.getMonth()]; }
  const full = new Date(r.from);
  const to = new Date(Math.min(+full, +from + elapsed));
  return { from, to, label, clipped: +to < +full };
}

function bucketOf(ts, r) {
  const d = new Date(ts);
  if (r.step === 'hour') return d.getHours();
  if (r.step === 'month') return d.getMonth();
  if (r.bars === 7) return (d.getDay() + 6) % 7;
  return d.getDate() - 1;
}

function barLabel(i, r) {
  if (r.step === 'hour') return i % 6 === 0 ? `${i}` : '';
  if (r.step === 'month') return i % 2 === 0 ? MONTHS_SHORT[i][0].toUpperCase() : '';
  if (r.bars === 7) return WEEKDAYS[(i + 1) % 7];
  return (i + 1) % 5 === 0 || i === 0 ? `${i + 1}` : '';
}

export async function renderCharts() {
  const live = ticket();
  if (!PERIODS.some(([id]) => id === state.period)) state.period = 'month';
  const r = periodRange(state.period);
  const elapsed = Math.min(Date.now(), +r.to) - +r.from;
  const prev = prevRange(r, elapsed);
  const [now, before] = await Promise.all([
    store.expensesBetween(r.from.getTime(), r.to.getTime() - 1),
    store.expensesBetween(prev.from.getTime(), prev.to.getTime() - 1),
  ]);
  // Расходы или поступления — одна и та же аналитика по выбранному типу
  const inc = state.statKind === 'in';
  const pick = inc ? (a) => a.filter(isIncome) : spent;
  const items = pick(now);
  const prevItems = pick(before);
  const outSum = sum(spent(now));
  const inSum = sum(now.filter(isIncome));
  const diff = inSum - outSum;
  const total = sum(items);
  const prevTotal = sum(prevItems);

  const buckets = Array(r.bars).fill(0);
  items.forEach((i) => { buckets[bucketOf(i.ts, r)] += i.amount; });
  const prevBuckets = Array(r.bars).fill(0);
  prevItems.forEach((i) => { const b = bucketOf(i.ts, r); if (b < r.bars) prevBuckets[b] += i.amount; });
  const peak = Math.max(...buckets, ...prevBuckets, 1);
  const nowBucket = Date.now() < +r.to ? bucketOf(Date.now(), r) : -1;
  const prevOut = sum(spent(before));
  const prevIn = sum(before.filter(isIncome));
  const short = (lbl) => lbl.slice(0, 3).toUpperCase();

  const cats = byCategory(items);
  const prevCats = Object.fromEntries(byCategory(prevItems));
  const days = Math.max(1, Math.ceil((Math.min(Date.now(), +r.to) - +r.from) / 864e5));

  const slices = cats.slice(0, 5);
  const restSum = sum(items) - slices.reduce((a, [, v]) => a + v, 0);
  const pie = [...slices.map(([id, v]) => [CAT[id]?.name || id, v, catColor(id), id]), ...(restSum > 0 ? [[L('Прочее', 'Other'), restSum, '#55535e', null]] : [])];
  // вафля 10×10: каждая клетка — 1 % суммы, оттенки серого по убыванию доли
  pie.forEach((p, n) => { p[2] = WAFFLE[n]; });
  let acc = 0;
  const cells = pie.flatMap(([, v, c]) => {
    const from = Math.round((acc / total) * 100); acc += v;
    return Array(Math.round((acc / total) * 100) - from).fill(c);
  });

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar">
        <h1>${L('Аналитика', 'Analytics')}</h1>
        <div class="seg">${PERIODS.map(([id, name]) =>
          `<button class="${state.period === id ? 'on' : ''}" data-p="${id}">${name}</button>`).join('')}</div>
      </header>
      <div class="scroll">
        <div class="flow-card">
          <button class="flow${inc ? '' : ' on'}" data-k="out"><small>${L('Расходы', 'Expenses')}</small><b>${money(outSum)}</b>${deltaChip(outSum, prevOut)}</button>
          <button class="flow${inc ? ' on' : ''}" data-k="in"><small>${L('Доходы', 'Income')}</small><b class="plus">+${money(inSum)}</b>${deltaChip(inSum, prevIn, true)}</button>
          <div class="flow"><small>${L('Разница', 'Net')}</small><b class="${diff >= 0 ? 'plus' : 'minus'}">${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</b>${deltaChip(diff, prevIn - prevOut, true)}</div>
        </div>
        <div class="month-total" hidden>${money(total)}</div>
        <div class="card chart">
          <div class="card-head"><b>${L('Динамика', 'Trend')}</b><span class="chip">${short(r.label)} / ${short(prev.label)}</span></div>
          <div class="bar-tip" id="tip"></div>
          <div class="bars${inc ? ' income' : ''}" style="--n:${r.bars}">
            ${buckets.map((v, i) => `
              <div class="bar-col${i === nowBucket ? ' now' : ''}" title="${money(v)}">
                <div class="pair"><div class="bar" style="height:${Math.max(v ? 4 : 0, (v / peak) * 100)}%;--i:${i}"></div><div class="bar-prev" style="height:${Math.max(prevBuckets[i] ? 4 : 0, (prevBuckets[i] / peak) * 100)}%"></div></div>
                <span>${barLabel(i, r)}</span>
              </div>`).join('')}
          </div>
          <div class="chart-legend"><span><i></i>${r.label}</span><span><i class="prev"></i>${prev.label}</span></div>
        </div>

        ${total ? `
        <div class="card">
          <div class="card-head"><b>${inc ? L('Откуда пришли деньги', 'Where money came from') : L('Куда ушли деньги', 'Where money went')}</b><span class="chip">100 = ${money(total)}</span></div>
          <div class="donut-wrap">
            <div class="waffle" aria-hidden="true">${cells.map((c, n) => `<i style="background:${c};--i:${n}"></i>`).join('')}</div>
            <div class="legend">
              ${pie.map(([name, v, c, id]) => id
                ? `<button data-cat="${id}"><i style="background:${c}"></i><span>${esc(name)}</span><b>${Math.round((v / total) * 100)}%</b></button>`
                : `<div><i style="background:${c}"></i><span>${esc(name)}</span><b>${Math.round((v / total) * 100)}%</b></div>`).join('')}
            </div>
          </div>
        </div>


        ${inc ? '' : `<div class="section-label">${L('Что заметно', 'Insights')}</div>
        <div class="tips">${tips(items, cats, prevCats, total, prevTotal, r, days).map((t, n) =>
          `<div class="tip" style="--i:${n}"><span class="tip-ico">${t[0]}</span><p>${t[1]}</p></div>`).join('')}</div>`}

        <div class="section-label">${L('По категориям', 'By category')}</div>
        <div class="card">
          ${cats.map(([id, v]) => {
            const pv = prevCats[id] || 0;
            const d = pv ? Math.round(((v - pv) / pv) * 100) : null;
            return `<button class="cat-row" data-cat="${id}" style="--i:${cats.findIndex(([c]) => c === id)}">
              <span class="tr-ico">${catIcon(id)}</span>
              <span class="cat-info">
                <span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
                <span class="meter"><i style="width:${pct(v, total)}%"></i></span>
              </span>
              <span class="cat-pct">${d === null ? `${Math.round((v / total) * 100)}%` : `${d > 0 ? '+' : ''}${d}%`}</span>
              <span class="chev sm">${icons.right}</span>
            </button>`;
          }).join('')}
        </div>` : `<div class="empty">${inc ? L('За этот период поступлений нет', 'No income in this period') : L('За этот период трат нет', 'No expenses in this period')}</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.month-total'), total);
  scrubBars(buckets, r);
  if (total) keshHint('charts-scrub', L('Проведи пальцем по графику — покажу каждый день.', 'Slide your finger across the chart to see each day.'));
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const row = e.target.closest('[data-cat]');
    if (row) { haptic(); openCategory(row.dataset.cat); }
  });
  app.querySelector('.flow-card').onclick = (e) => {
    const b = e.target.closest('[data-k]');
    if (!b || b.dataset.k === (state.statKind || 'out')) return;
    haptic();
    state.statKind = b.dataset.k;
    render();
  };
  app.querySelector('.seg').onclick = (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    state.period = b.dataset.p;
    haptic();
    render();
  };
}

const WAFFLE = ['#EDEDEF', '#B4B4BB', '#85858D', '#606068', '#45454B', '#2E2E33'];
const pct = (v, max) => (max ? Math.max(2, (v / max) * 100) : 0);

function barTitle(i, r) {
  if (r.step === 'hour') return `${String(i).padStart(2, '0')}:00`;
  if (r.step === 'month') return `${MONTHS[i]} ${r.from.getFullYear()}`;
  const d = new Date(r.from.getFullYear(), r.from.getMonth(), r.from.getDate() + i);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}

// Ведёшь пальцем по графику — над столбиком показывается дата и сумма
function scrubBars(buckets, r) {
  const bars = app.querySelector('.bars');
  const tip = app.querySelector('#tip');
  const cols = [...bars.children];
  let sel = -1;
  const show = (i) => {
    if (i === sel) return;
    sel = i;
    cols.forEach((c, n) => c.classList.toggle('on', n === i));
    tip.innerHTML = `<b>${money(buckets[i])}</b><span>${barTitle(i, r)}</span>`;
    const card = tip.parentElement.getBoundingClientRect();
    const bar = cols[i].querySelector('.bar').getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const cx = bar.left + bar.width / 2 - card.left;
    tip.style.left = `${Math.min(card.width - half - 6, Math.max(half + 6, cx))}px`;
    tip.style.top = `${Math.max(6, bar.top - card.top - tip.offsetHeight - 8)}px`;
  };
  const last = Date.now() < +r.to ? bucketOf(Date.now(), r) : cols.length - 1;
  const at = (x) => {
    const b = bars.getBoundingClientRect();
    return Math.max(0, Math.min(last, Math.floor(((x - b.left) / b.width) * cols.length)));
  };
  bars.addEventListener('pointerdown', (e) => { bars.classList.add('picking'); haptic(); show(at(e.clientX)); });
  bars.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || e.buttons) {
      const i = at(e.clientX);
      if (i !== sel && e.pointerType !== 'mouse') haptic();
      bars.classList.add('picking');
      show(i);
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => bars.addEventListener(ev, () => bars.classList.remove('picking')));
  show(last);
}

function byCategory(items) {
  const m = new Map();
  items.forEach((i) => m.set(i.category, (m.get(i.category) || 0) + i.amount));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// good — рост это хорошо (доходы): зелёный вверх
function deltaChip(now, before, good = false) {
  if (!before) return '';
  const d = Math.round(((now - before) / before) * 100);
  if (!d) return '<span class="delta">0%</span>';
  return `<span class="delta ${(d > 0) !== good ? 'up' : 'down'}">${d > 0 ? '↑' : '↓'} ${Math.abs(d)}%</span>`;
}

function tips(items, cats, prevCats, total, prevTotal, r, days) {
  const out = [];
  if (!items.length) return out;

  const grown = cats
    .map(([id, v]) => [id, v, prevCats[id] || 0])
    .filter(([, v, pv]) => pv > 0 && v > pv * 1.25 && v - pv >= 30000)
    .sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]))[0];
  if (grown) {
    out.push(['📈', L(`На категорию <b>${esc(CAT[grown[0]]?.name || grown[0])}</b> ушло на <b>${money(grown[1] - grown[2])}</b> больше, чем в прошлый период. Это главный источник роста трат.`, `<b>${esc(CAT[grown[0]]?.name || grown[0])}</b> took <b>${money(grown[1] - grown[2])}</b> more than last period — the main driver of higher spending.`)]);
  }

  const saved = cats
    .map(([id, v]) => [id, v, prevCats[id] || 0])
    .filter(([, v, pv]) => pv > v * 1.25 && pv - v >= 30000)
    .sort((a, b) => (b[2] - b[1]) - (a[2] - a[1]))[0];
  if (saved) {
    out.push(['👏', L(`На категории <b>${esc(CAT[saved[0]]?.name || saved[0])}</b> вы сэкономили <b>${money(saved[2] - saved[1])}</b> по сравнению с прошлым периодом.`, `You saved <b>${money(saved[2] - saved[1])}</b> on <b>${esc(CAT[saved[0]]?.name || saved[0])}</b> compared to last period.`)]);
  }

  const [topId, topV] = cats[0];
  const share = Math.round((topV / total) * 100);
  if (share >= 30) {
    out.push(['🎯', L(`<b>${esc(CAT[topId]?.name || topId)}</b> забирает <b>${share}%</b> всех трат. Сократив эту категорию на 10%, вы сбережёте <b>${money(Math.round(topV * 0.1))}</b> за период.`, `<b>${esc(CAT[topId]?.name || topId)}</b> takes <b>${share}%</b> of spending. Cutting it by 10% saves <b>${money(Math.round(topV * 0.1))}</b> per period.`)]);
  }

  const small = items.filter((i) => i.amount <= 50000);
  if (small.length >= 8) {
    out.push(['☕', L(`<b>${small.length}</b> мелких покупок до ${money(50000)} сложились в <b>${money(sum(small))}</b> — это ${Math.round((sum(small) / total) * 100)}% всех трат за период.`, `<b>${small.length}</b> small purchases under ${money(50000)} added up to <b>${money(sum(small))}</b> — ${Math.round((sum(small) / total) * 100)}% of the period’s spending.`)]);
  }

  const byDay = new Map();
  items.forEach((i) => { const k = dayKey(i.ts); byDay.set(k, (byDay.get(k) || 0) + i.amount); });
  const worst = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worst && byDay.size > 2) {
    const d = new Date(items.find((i) => dayKey(i.ts) === worst[0]).ts);
    out.push(['📅', L(`Самый дорогой день — <b>${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</b>: <b>${money(worst[1])}</b>.`, `Priciest day — <b>${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}</b>: <b>${money(worst[1])}</b>.`)]);
    const free = days - byDay.size;
    if (free > 0) out.push(['🧘', L(`<b>${free}</b> ${plural(free, 'день', 'дня', 'дней')} без единой траты из ${days}. Так держать.`, `<b>${free}</b> of ${days} days with no spending at all. Keep it up.`)]);
  }

  if (state.period === 'month') {
    const inMonth = new Date(r.to - 1).getDate();
    const forecast = Math.round((total / days) * inMonth / 100) * 100;
    out.push(['🔮', L(`При таком темпе за месяц выйдет около <b>${money(forecast)}</b>${prevTotal ? `, за те же ${days} ${plural(days, 'день', 'дня', 'дней')} прошлого месяца было ${money(prevTotal)}` : ''}.`, `At this pace the month will come to about <b>${money(forecast)}</b>${prevTotal ? `; the same ${days} days last month were ${money(prevTotal)}` : ''}.`)]);
  }

  return out.slice(0, 5);
}

/* ---------- одна категория ---------- */
export async function renderCategoryDetail() {
  const live = ticket();
  const id = state.catId;
  const r = periodRange(state.period);
  const all = await store.expensesBetween(r.from.getTime(), r.to.getTime() - 1);
  const items = all.filter((i) => i.category === id).sort((a, b) => b.ts - a.ts);
  const total = sum(items);
  const periodTotal = sum(all.filter((i) => isIncome(i) === (CAT[id]?.kind === 'in')));
  const merchants = new Map();
  items.forEach((i) => {
    const k = i.note || L('Без описания', 'No description');
    merchants.set(k, (merchants.get(k) || 0) + i.amount);
  });
  const top = [...merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="month-head">
        <div class="topbar">
          <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
          <div class="pill">${r.label}</div>
          <div style="width:40px"></div>
        </div>
        <div class="cat-hero">
          <span class="tr-ico lg">${catIcon(id)}</span>
          <div>
            <div class="month-total sm">${money(total)}</div>
            <div class="month-sub">${esc(CAT[id]?.name || id)} · ${Math.round((total / (periodTotal || 1)) * 100)}% ${CAT[id]?.kind === 'in' ? L('поступлений', 'of income') : L('трат', 'of spending')} ${L('периода', '')}</div>
          </div>
        </div>
      </header>
      <div class="scroll">
        ${top.length > 1 ? `<div class="section-label">${L('Куда уходит', 'Where it goes')}</div>
        <div class="card">
          ${top.map(([name, v]) => `<div class="cat-row">
            <span class="cat-info"><span class="cat-top">${esc(name)}<b>${money(v)}</b></span>
            <span class="meter"><i style="width:${pct(v, total)}%"></i></span></span>
          </div>`).join('')}
        </div>` : ''}
        <div class="section-label">${items.length} ${plural(items.length, 'операция', 'операции', 'операций')}</div>
        <div class="card">
          ${items.map((i) => {
            const d = new Date(i.ts);
            return `<button class="res" data-id="${i.id}">
              <span class="tr-ico">${catIcon(i.category)}</span>
              <span class="tr-name">${esc(i.note || CAT[i.category]?.name || '')}<small>${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</small></span>
              ${sumCell(i)}
            </button>`;
          }).join('') || `<div class="empty sm">${L('Операций нет', 'No transactions')}</div>`}
        </div>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#back').onclick = () => { state.flow = null; state.catId = null; render(); };
  restoreScroll(app.querySelector('.scroll'));
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const item = items.find((i) => i.id === row.dataset.id);
    if (item) { haptic(); state.keepScroll = app.querySelector('.scroll').scrollTop; openInfo(item); }
  });
}

/* ---------- карточка траты ---------- */
const WD_FULL = L(['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

export function renderInfo() {
  const i = state.info;
  const d = new Date(i.ts);
  const close = () => { state.info = null; render(); };

  app.innerHTML = `
    <section class="screen sheet-screen">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
        <div class="pill">${isIncome(i) ? L('Доход', 'Income') : L('Трата', 'Expense')}</div>
        <div style="width:40px"></div>
      </div>
      <div class="info-hero">
        <span class="tr-ico xl">${catIcon(i.category)}</span>
        <div class="info-amount${isIncome(i) ? ' plus' : ''}">${isIncome(i) ? '+' : ''}${money(i.amount)}</div>
        <div class="month-sub">${esc(CAT[i.category]?.name || i.category)}</div>
      </div>
      <div class="cats">
        <div class="card rows">
          <div class="row"><span>${L('Дата', 'Date')}</span><span class="row-extra">${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${WD_FULL[d.getDay()]}</span></div>
          <div class="row"><span>${L('Время', 'Time')}</span><span class="row-extra">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span></div>
          ${i.note ? `<div class="row"><span>${L('Описание', 'Note')}</span><span class="row-extra">${esc(i.note)}</span></div>` : ''}
          <div class="row"><span>${L('Источник', 'Source')}</span><span class="row-extra">${i.id.startsWith('imp') ? L('Выписка банка', 'Bank statement') : L('Добавлено вручную', 'Added manually')}</span></div>
        </div>
      </div>
      <div class="bottom">
        <div class="dep-actions">
          <button class="btn alt" id="repeat">${L('Повторить', 'Repeat')}</button>
          <button class="btn alt" id="edit">${L('Изменить', 'Edit')}</button>
        </div>
        <button class="btn ghost danger" id="del">${L('Удалить операцию', 'Delete transaction')}</button>
      </div>
    </section>`;

  app.querySelector('#back').onclick = close;
  app.querySelector('#edit').onclick = () => openEdit(i);
  app.querySelector('#repeat').onclick = () => { haptic(); openRepeat(i); };
  app.querySelector('#del').onclick = async () => {
    if (!(await ask(L('Удалить операцию?', 'Delete this transaction?'), `${money(i.amount)} · ${CAT[i.category]?.name || ''}`))) return;
    state.info = null;
    await store.removeExpense(i.id);
    render();
    toast(L('Операция удалена', 'Transaction deleted'));
  };
}

/* ---------- profile ---------- */
export async function renderProfile() {
  const live = ticket();
  const acc = auth.account();
  const all = await store.allExpenses();
  const imported = await store.importedCount();

  const item = (id, icon, label, extra = '') =>
    `<button class="row" data-a="${id}">${icon}<span>${label}</span><span class="row-extra">${extra}</span></button>`;

  const first = all.length ? Math.min(...all.map((i) => i.ts)) : 0;
  const coat = keshOn() ? `${keshCoat() === 'black' ? L('чёрный', 'black') : L('белый', 'white')} · ${L('вкл', 'on')}` : L('выкл', 'off');
  const link = (href, icon, label, extra = '') =>
    `<a class="row" href="${href}" target="_blank" rel="noopener">${icon}<span>${label}</span><span class="row-extra">${extra}</span></a>`;

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${L('Профиль', 'Profile')}</h1></button></header>
      <div class="scroll">
        <div class="card profile-card">
          <button class="ava-wrap" id="pick-ava" aria-label="${L('Сменить фото', 'Change photo')}">${avatarHTML()}</button>
          <span class="tr-name"><span class="profile-name">${esc(acc.login)}</span><small>${all.length} ${plural(all.length, 'операция', 'операции', 'операций')}${first ? ` · ${L('с', 'since')} ${new Date(first).getDate()} ${MONTHS_SHORT[new Date(first).getMonth()]}` : ''}</small></span>
        </div>
        <div class="ava-row" role="radiogroup" aria-label="${L('Аватар', 'Avatar')}">${SKINS.map((_, n) => `<button class="ava-pick${!localStorage.getItem('avatar') && avatarSkin() % SKINS.length === n ? ' on' : ''}" data-skin="${n}" aria-label="${L('Аватар', 'Avatar')} ${n + 1}">${catAvatar(n, true)}</button>`).join('')}</div>
        <div class="section-label">${L('Данные', 'Data')}</div>
        <div class="card rows group">
          ${item('backup', icons.down_file, L('Резервная копия', 'Backup'), lastBackupLabel())}
          ${item('import', icons.sync, L('Восстановить из копии', 'Restore from backup'), 'JSON · XLSX')}
          ${item('export', icons.chart, L('Отчёт в Excel', 'Excel report'))}
          ${item('statement', icons.bank, L('Импорт выписки банка', 'Import bank statement'), 'PDF · CSV')}
          ${item('cats', icons.tag, L('Свои категории', 'Custom categories'), String(customCategories().length))}
          ${imported ? item('clear-imported', icons.trash, L('Удалить импортированные', 'Delete imported'), String(imported)) : ''}
        </div>
        <div class="section-label">${L('Кэш и интерфейс', 'Kesh & interface')}</div>
        <div class="card rows group">
          <button class="row" data-a="kesh"><span class="row-kesh">${keshSVG('Ждёт', keshCoat() === 'black', keshCoat() === 'black')}</span><span>${L('Кэш', 'Kesh')}</span><span class="row-extra">${coat}</span><span class="chev sm">${icons.right}</span></button>
          <button class="row" data-a="lang">${icons.globe}<span>${L('Язык', 'Language')}</span>${langSwitch()}</button>
          ${item('currency', `<span class="row-sym">${SYM}</span>`, L('Валюта', 'Currency'), CURRENCY)}
        </div>
        <div class="section-label">${L('О проекте', 'About')}</div>
        <div class="card rows group">
          ${link(REPO, icons.heart, L('Поддержать проект', 'Support the project'))}
          ${link(REPO, icons.code, L('Исходный код', 'Source code'), 'GitHub')}
        </div>
        <div class="card rows group">
          ${item('wipe', icons.trash, L('Сбросить все данные', 'Erase all data'))}
        </div>
        <div class="version">${L('Кэш', 'Kesh')} ${BUILD} · ${L('данные хранятся на этом устройстве', 'data stays on this device')}</div>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#back').onclick = () => go('home');
  app.querySelector('#pick-ava').onclick = pickAvatar;
  app.querySelector('.ava-row').onclick = (e) => {
    const n = e.target.closest('[data-skin]')?.dataset.skin;
    if (n === undefined) return;
    haptic();
    localStorage.setItem('avatarSkin', n);
    localStorage.removeItem('avatar');
    render();
  };
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const a = e.target.closest('.row')?.dataset.a;
    if (!a) return;
    // белый → чёрный → выкл → белый
    if (a === 'kesh') { haptic(); state.flow = 'keshset'; return render(); }
    if (a === 'currency') return pickCurrency();
    if (a === 'lang') return flipLang(e.target.closest('.row').querySelector('.lswitch'));
    if (a === 'cats') { state.flow = 'cats'; return render(); }
    if (a === 'statement') return pickStatement();
    if (a === 'export') return exportData();
    if (a === 'backup') return downloadBackup().then(render);
    if (a === 'import') return importData();
    if (a === 'clear-imported') {
      return ask(L(`Удалить ${imported} ${plural(imported, 'трату', 'траты', 'трат')}?`, `Delete ${imported} ${plural(imported, 'трату', 'траты', 'трат')}?`), L('Это траты из выписок. Внесённые вручную останутся.', 'These came from statements. Manual entries stay.'))
        .then(async (yes) => { if (yes) { toast(`${L('Удалено трат', 'Deleted')}: ${await store.removeImported()}`); render(); } });
    }
    if (a === 'wipe') return wipeAll();
  });
}

// Физический переключатель языка: ползунок едет, затем перезагрузка на новом языке
export const langSwitch = () => `<span class="lswitch${LANG === 'en' ? ' en' : ''}" role="switch" aria-checked="${LANG === 'en'}" aria-label="Language"><i></i><b>RU</b><b>EN</b></span>`;
export function flipLang(sw) {
  haptic();
  sw?.classList.toggle('en');
  setTimeout(() => setLang(LANG === 'en' ? 'ru' : 'en'), 260);
}

/* ---------- настройки Кэша ---------- */
const PREVIEW = ['Ждёт', 'Привет', 'Рад', 'Думает', 'Удивлён', 'Ликует', 'Сомневается', 'Спит'];
// Выбор валюты: меняется знак во всём приложении, суммы не пересчитываются
function pickCurrency() {
  const { panel, close } = bottomSheet(L('Валюта', 'Currency'), `
    <p class="bs-sub">${L('Меняется только знак — суммы не пересчитываются по курсу.', 'Only the symbol changes — amounts are not converted.')}</p>
    <div class="acc-list">${CURRENCIES.map(([c, ru, en]) => `<button class="acc-opt${c === CURRENCY ? ' on' : ''}" data-c="${c}"><span class="acc-ico">${curSymbol(c)}</span><span class="tr-name">${L(ru, en)}<small>${c}</small></span>${c === CURRENCY ? icons.check : ''}</button>`).join('')}</div>`);
  panel.querySelector('.acc-list').onclick = (e) => {
    const c = e.target.closest('[data-c]')?.dataset.c;
    if (!c) return;
    haptic();
    if (c === CURRENCY) return close();
    setCurrency(c);
  };
}

export function renderKeshSettings() {
  const black = keshCoat() === 'black';
  const sw = (id, on, title, sub) => `<button class="switch-row" data-s="${id}"><span>${title}<small>${sub}</small></span><span class="sw${on ? ' on' : ''}"></span></button>`;
  app.innerHTML = `
    <section class="screen">
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${L('Кэш', 'Kesh')}</h1></button></header>
      <div class="scroll">
        <div class="card kesh-preview${keshOn() ? '' : ' off'}${calmMode() ? ' calm' : ''}" id="preview">
          <div class="kp-cat" id="kp">${keshSVG(calmMode() ? 'Спит' : 'Ждёт', black, black)}</div>
          <div class="kp-edge"></div>
          <div class="kp-caption" id="kpc">${keshOn() ? (calmMode() ? L('Дремлет — спокойный режим', 'Napping — calm mode') : L('Так Кэш выглядит в приложении', 'This is how Kesh looks in the app')) : L('Кэш выключен', 'Kesh is off')}</div>
        </div>
        <div class="section-label">${L('Окрас', 'Coat')}</div>
        <div class="coat-pick">
          ${[['white', L('Белый', 'White')], ['black', L('Чёрный', 'Black')]].map(([k, name]) => `<button class="coat-opt${keshCoat() === k ? ' on' : ''}" data-coat="${k}">${keshSVG('Рад', k === 'black', k === 'black')}<span>${name}</span></button>`).join('')}
        </div>
        <div class="section-label">${L('Поведение', 'Behavior')}</div>
        ${sw('on', keshOn(), L('Показывать Кэша', 'Show Kesh'), L('Сидит на краю нижней панели, реагирует на суммы и лимиты', 'Sits on the tab bar edge, reacts to amounts and limits'))}
        ${sw('hints', hintsOn(), L('Подсказки', 'Tips'), L('Не больше одной на экран: первый визит, лимиты, крупные траты', 'At most one per screen: first visit, limits, big expenses'))}
        ${sw('calm', calmMode(), L('Спокойный режим', 'Calm mode'), L('Кэш дремлет: без реакций, анимаций и подсказок. Просто трекер', 'Kesh naps: no reactions, animations or tips. Just a tracker'))}
        <div class="imp-note dep-note">${L('Нажми на Кэша — свернётся клубком. Долгое нажатие — быстрое меню.', 'Tap Kesh to curl him up. Long-press for a quick menu.')}</div>
      </div>
    </section>`;
  app.querySelector('#back').onclick = () => { state.flow = null; render(); };
  // живое превью: позы по кругу, тап — клубок
  const kp = app.querySelector('#kp');
  let n = 0, hold = 0;
  const tick = () => {
    if (!kp.isConnected) return clearInterval(timer);
    if (!keshOn() || calmMode() || Date.now() < hold) return;
    n = (n + 1) % PREVIEW.length;
    kp.innerHTML = keshSVG(PREVIEW[n], black, black);
    kp.classList.remove('pop'); void kp.offsetWidth; kp.classList.add('pop');
  };
  const timer = setInterval(tick, 1500);
  kp.onclick = () => { haptic(); hold = Date.now() + 3000; kp.innerHTML = keshSVG('Спит', black, black); };
  app.querySelector('.coat-pick').onclick = (e) => {
    const c = e.target.closest('[data-coat]')?.dataset.coat;
    if (!c || c === keshCoat()) return;
    haptic(); setCoat(c); if (!keshOn()) setKesh(true); render();
  };
  app.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
    haptic();
    const k = b.dataset.s;
    if (k === 'on') setKesh(!keshOn());
    if (k === 'hints') setHints(!hintsOn());
    if (k === 'calm') setCalm(!calmMode());
    render();
  }));
}

async function pickAvatar() {
  if (localStorage.getItem('avatar')) {
    if (await ask(L('Убрать фото?', 'Remove photo?'), L('Вернётся аватар-кот.', 'Your cat avatar will return.'), L('Убрать', 'Remove'))) {
      localStorage.removeItem('avatar');
      return render();
    }
    return;
  }
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const size = 192;
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
      canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
      localStorage.setItem('avatar', canvas.toDataURL('image/jpeg', 0.85));
      render();
    } catch {
      toast(L('Не удалось открыть изображение', 'Couldn’t open the image'));
    }
  };
  input.click();
}

export function renderCustomCats() {
  const list = customCategories();
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="month-head">
        <div class="topbar">
          <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
          <div class="pill">${L('Свои категории', 'Custom categories')}</div>
          <div style="width:40px"></div>
        </div>
      </header>
      <div class="scroll">
        ${list.length ? `<div class="card rows">${list.map((c) => `
          <div class="row" data-edit="${c.id}"><span class="tr-ico">${catIcon(c.id)}</span><span>${esc(c.name)}<small class="row-sub">${c.kind === 'in' ? L('Доход', 'Income') : L('Расход', 'Expense')}</small></span>
            <button class="icon-btn sm" data-edit="${c.id}" aria-label="${L('Изменить', 'Edit')}">${icons.edit}</button>
            <button class="icon-btn sm" data-del="${c.id}" aria-label="${L('Удалить', 'Delete')}">${icons.trash}</button></div>`).join('')}</div>`
          : `<div class="empty">${L('Своих категорий пока нет.<br>Добавьте при записи траты или в «Бюджете».', 'No custom categories yet.<br>Add one while logging an expense or in Budget.')}</div>`}
      </div>
      ${tabbar()}
    </section>`;
  bindTabs();
  app.querySelector('#back').onclick = () => { state.flow = null; render(); };
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    const edit = !id && e.target.closest('[data-edit]')?.dataset.edit;
    if (edit) {
      haptic();
      return editCategory(list.find((x) => x.id === edit), 'cats');
    }
    if (id) deleteCategory(list.find((x) => x.id === id));
  });
}

// Удаление своей категории: операции уходят в «Другое», лимит снимается
async function deleteCategory(cat) {
  const to = cat.kind === 'in' ? 'in_other' : 'other';
  if (!(await ask(L(`Удалить «${cat.name}»?`, `Delete “${cat.name}”?`), L('Операции из неё перейдут в «Другое», лимит категории будет снят.', 'Its transactions move to “Other”, and its limit is removed.')))) return;
  const n = await store.recategorize(cat.id, to);
  const b = budgets();
  if (b[cat.id]) { delete b[cat.id]; saveBudgets(b); }
  removeCategory(cat.id);
  render();
  toast(n ? L(`Категория удалена, ${n} ${plural(n, 'операция перенесена', 'операции перенесены', 'операций перенесено')} в «Другое»`, `Category deleted, ${n} ${plural(n, 'операция перенесена', 'операции перенесены', 'операций перенесено')} to “Other”`) : L('Категория удалена', 'Category deleted'));
}

const editCategory = (c, from) => {
  state.draft = { id: c.id, name: c.name, icon: c.icon || 'star', color: CAT[c.id]?.color, kind: c.kind || 'out', from };
  state.flow = 'newcat';
  render();
};

/* ---------- резервная копия ---------- */
function lastBackupLabel() {
  const t = Number(localStorage.getItem('lastBackup'));
  if (!t) return L('ещё нет', 'never');
  const d = new Date(t);
  return new Date().toDateString() === d.toDateString() ? L('сегодня', 'today') : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function saveFile(file) {
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(() => {});
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return Promise.resolve();
}

async function downloadBackup() {
  const data = await makeBackup(BUILD);
  const name = `nota-backup-${new Date().toISOString().slice(0, 10)}.json`;
  await saveFile(new File([JSON.stringify(data)], name, { type: 'application/json' }));
  localStorage.setItem('lastBackup', String(Date.now()));
  toast(`${L('Копия сохранена', 'Backup saved')}: ${data.transactions.length} ${plural(data.transactions.length, 'операция', 'операции', 'операций')}`);
}

const importSummary = (r) => [
  `${L('Добавлено', 'Added')} ${r.added}`,
  r.updated && `${L('обновлено', 'updated')} ${r.updated}`,
  r.unchanged && `${L('уже были', 'already there')} ${r.unchanged}`,
  r.skipped && `${L('ваши правки сохранены', 'your edits kept')}: ${r.skipped}`,
  r.invalid && `${L('отброшено', 'dropped')} ${r.invalid}`,
].filter(Boolean).join(' · ');

async function wipeAll() {
  const fresh = Date.now() - Number(localStorage.getItem('lastBackup') || 0) < 10 * 6e4;
  if (!fresh) {
    const want = await dialog({ title: L('Сначала сохранить копию?', 'Save a backup first?'), text: L('Данные хранятся только на этом устройстве. После сброса их не вернуть без копии.', 'Data lives only on this device. Without a backup it can’t be recovered.'), ok: L('Скачать копию', 'Download backup'), cancel: L('Без копии', 'No backup') });
    if (want === null) return;
    if (want) await downloadBackup();
  }
  if (!(await ask(L('Сбросить все данные?', 'Erase all data?'), L('Имя, настройки, категории, лимиты, вклады и все операции на этом устройстве будут удалены.', 'Name, settings, categories, limits, savings and all transactions on this device will be deleted.'), L('Сбросить', 'Erase')))) return;
  try {
    await store.wipe();
  } catch (e) {
    return toast(e.message === 'blocked' ? L('Кэш открыт в другой вкладке — закройте её и повторите', 'Kesh is open in another tab — close it and retry') : L('Не удалось удалить данные', 'Couldn’t delete data'));
  }
  auth.reset();
  ['loggedIn', 'avatar', 'avatarSkin', 'customCats', 'budgets', 'deposits', 'wallet', 'accounts', 'accountsOff', 'lastAcc', 'lastBackup', 'kitty', 'kittyCoat', 'kesh', 'keshHints', 'keshSeen'].forEach((k) => localStorage.removeItem(k));
  reloadCategories();
  state.authMode = null;
  render();
}

const toSerial = (ts) => (ts - new Date(ts).getTimezoneOffset() * 6e4) / 864e5 + 25569;
const fromSerial = (n) => { const t = (n - 25569) * 864e5; return Math.round(t + new Date(t).getTimezoneOffset() * 6e4); };
const rubles = (kop) => ({ v: kop / 100, f: 'money' });

async function exportData() {
  const all = (await store.allExpenses()).sort((a, b) => b.ts - a.ts);
  const kind = (i) => (isIncome(i) ? 'Пополнение' : 'Расход');
  const byCat = new Map();
  all.forEach((i) => {
    const c = byCat.get(i.category) || { n: 0, sum: 0, kind: kind(i) };
    c.n++; c.sum += i.amount;
    byCat.set(i.category, c);
  });
  const now = new Date();
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthSpent = Object.fromEntries(byCategory(spent(all).filter((i) => i.ts >= monthFrom)));
  const b = budgets();
  const sheets = [
    { name: 'Операции', cols: [17, 13, 18, 36, 14, 10],
      rows: [['Дата', 'Тип', 'Категория', 'Описание', `Сумма, ${SYM}`, 'ID'],
        ...all.map((i) => [{ v: toSerial(i.ts), f: 'date' }, kind(i), CAT[i.category]?.name || i.category, i.note, rubles(i.amount), i.id])] },
    { name: 'Категории', cols: [22, 13, 11, 14],
      rows: [['Категория', 'Тип', 'Операций', `Сумма, ${SYM}`],
        ...[...byCat].sort((x, y) => y[1].sum - x[1].sum).map(([id, c]) => [CAT[id]?.name || id, c.kind, c.n, rubles(c.sum)])] },
    { name: 'Бюджет', cols: [22, 16, 16, 14],
      rows: [['Категория', `Лимит в месяц, ${SYM}`, `Потрачено (${MONTHS[now.getMonth()].toLowerCase()}), ${SYM}`, `Осталось, ${SYM}`],
        ...Object.entries(b).filter(([id]) => CAT[id]).map(([id, v]) => [CAT[id].name, rubles(v), rubles(monthSpent[id] || 0), rubles(v - (monthSpent[id] || 0))])] },
    { name: 'Вклады', cols: [28, 14, 11, 16],
      rows: [['Название', `Сумма, ${SYM}`, 'Ставка, %', `Доход в месяц, ${SYM}`],
        ...deposits().map((d) => [d.name, rubles(d.amount), d.rate || 0, rubles(monthly(d))])] },
  ];
  const name = `nota-${now.toISOString().slice(0, 10)}.xlsx`;
  return saveFile(new File([writeXlsx(sheets)], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// Восстановление из своей Excel-выгрузки: категории ищутся по названию, незнакомые создаются
async function importXlsx(book) {
  const ops = (book['Операции'] || []).slice(1).filter((r) => typeof r[0] === 'number' && typeof r[4] === 'number');
  const find = (name, kind) => {
    const hit = Object.values(CAT).find((c) => c.kind === kind && c.name.toLowerCase() === String(name).trim().toLowerCase());
    return hit ? hit.id : addCategory(String(name).trim().slice(0, 40) || 'Другое', 'star', undefined, kind);
  };
  const items = ops.map((r) => {
    const kind = r[1] === 'Пополнение' ? 'in' : 'out';
    return {
      id: String(r[5] || `x${Math.round(r[0] * 1e6).toString(36)}-${Math.round(r[4] * 100)}`),
      ts: fromSerial(r[0]),
      category: find(r[2] || 'Другое', kind),
      note: String(r[3] ?? ''),
      amount: Math.round(r[4] * 100),
      ...(kind === 'in' ? { type: 'in' } : {}),
    };
  });
  if (!deposits().length) {
    const list = (book['Вклады'] || []).slice(1).filter((r) => r[0] && typeof r[1] === 'number')
      .filter((r) => r[1] >= 0 && r[1] <= 1e11)
      .map((r, n) => ({ id: `d${Date.now().toString(36)}${n}`, name: String(r[0]).slice(0, 60), amount: Math.round(r[1] * 100), rate: Math.min(100, Math.max(0, Number(r[2]) || 0)) }));
    if (list.length) saveDeposits(list);
  }
  if (!Object.keys(budgets()).length) {
    const next = {};
    (book['Бюджет'] || []).slice(1).forEach((r) => { if (r[0] && r[1] > 0 && r[1] <= 1e11) next[find(r[0], 'out')] = Math.round(r[1] * 100); });
    if (Object.keys(next).length) saveBudgets(next);
  }
  return store.importExpenses(items);
}

/* ---------- импорт выписки ---------- */
function pickStatement() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.pdf,.csv,application/pdf,text/csv', multiple: true });
  input.onchange = async () => {
    const files = [...input.files].slice(0, 5);
    if (!files.length) return;
    state.flow = 'import';
    state.imp = { loading: true, items: [], external: false, internal: false, name: files.map((f) => f.name).join(', '), extra: input.files.length - files.length };
    render();
    try {
      const { parseStatement } = await import('./statement.js');
      state.imp.items = await parseStatement(files);
      state.imp.loading = false;
      if (!state.imp.items.length) state.imp.error = L('В файлах не нашлось операций списания', 'No expenses found in the files');
    } catch {
      state.imp.loading = false;
      state.imp.error = L('Не удалось разобрать файл. Подойдёт PDF «Справка о движении средств» или CSV-выписка.', 'Couldn’t read the file. Use a T-Bank PDF statement (“Справка о движении средств”) or a CSV export.');
    }
    render();
  };
  input.click();
}

export async function renderImport() {
  const live = ticket();
  const imp = state.imp;
  const items = imp.items.filter((i) => (i.kind === 'external' ? imp.external : i.kind === 'internal' ? imp.internal : true));
  const ext = imp.items.filter((i) => i.kind === 'external');
  const int = imp.items.filter((i) => i.kind === 'internal');
  const cats = byCategory(items);
  const from = items.length ? new Date(Math.min(...items.map((i) => i.ts))) : null;
  const to = items.length ? new Date(Math.max(...items.map((i) => i.ts))) : null;
  // уже импортированные (в том числе со старыми ID) и похожие на внесённые вручную: та же сумма в тот же день
  const known = await store.existingIds(items.flatMap((i) => [i.id, i.legacyId]));
  const isKnown = (i) => known.has(i.id) || known.has(i.legacyId);
  const pool = new Map();
  if (items.length) {
    (await store.expensesBetween(+from - 864e5, +to + 864e5))
      .filter((x) => !x.id.startsWith('imp') && !isIncome(x))
      .forEach((x) => { const k = `${dayKey(x.ts)}|${x.amount}`; pool.set(k, (pool.get(k) || 0) + 1); });
  }
  const twins = new Set();
  items.filter((i) => !isKnown(i)).forEach((i) => {
    const k = `${dayKey(i.ts)}|${i.amount}`;
    if (pool.get(k) > 0) { twins.add(i.id); pool.set(k, pool.get(k) - 1); }
  });
  imp.add = items
    .filter((i) => imp.manual || !twins.has(i.id))
    .map(({ legacyId, kind, ...i }) => (known.has(legacyId) ? { ...i, id: legacyId } : i));
  const fresh = imp.add.filter((i) => !known.has(i.id)).length;


  if (!live()) return;
  app.innerHTML = `
    <section class="screen">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
        <div class="pill">${esc(imp.name)}</div>
        <div style="width:40px"></div>
      </div>
      ${imp.loading ? `<div class="spinner"></div><div class="empty">${L('Читаем выписку…', 'Reading the statement…')}</div>` : imp.error ? `<div class="empty">${esc(imp.error)}</div>` : `
      <div class="imp-head">
        <h2 class="cat-title">${L('Найдено', 'Found')} ${items.length} ${plural(items.length, 'трата', 'траты', 'трат')}</h2>
        <div class="month-sub">${from ? `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} — ${to.getDate()} ${MONTHS_SHORT[to.getMonth()]}` : ''}${imp.extra > 0 ? L(' · взяли первые 5 файлов', ' · first 5 files used') : ''}</div>
        <div class="imp-sum">
          <div><b>${money(sum(items))}</b><small>${L('Сумма', 'Total')}</small></div>
          <div><b>${cats.length}</b><small>${L('Категорий', 'Categories')}</small></div>
        </div>
      </div>
      <div class="cats">
        ${ext.length ? `<div class="switch-row" data-sw="external"><span>${L('Переводы людям', 'Transfers to people')}<small>${ext.length} · ${money(sum(ext))}</small></span><span class="sw${imp.external ? ' on' : ''}"></span></div>` : ''}
        ${twins.size ? `<div class="switch-row" data-sw="manual"><span>${L('Похожи на внесённые вручную', 'Look like manual entries')}<small>${twins.size} · ${L('та же сумма в тот же день — по умолчанию не добавляются', 'same amount, same day — skipped by default')}</small></span><span class="sw${imp.manual ? ' on' : ''}"></span></div>` : ''}
        ${int.length ? `<div class="switch-row" data-sw="internal"><span>${L('Между своими счетами', 'Between own accounts')}<small>${int.length} · ${money(sum(int))}</small></span><span class="sw${imp.internal ? ' on' : ''}"></span></div>` : ''}
        <div class="section-label">${L('Распределение', 'Breakdown')}</div>
        <div class="card">
          ${cats.map(([id, v]) => `<div class="cat-row">
            <span class="tr-ico">${catIcon(id)}</span>
            <span class="cat-info"><span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
            <span class="meter"><i style="width:${pct(v, sum(items))}%"></i></span></span>
          </div>`).join('')}
        </div>
        <div class="section-label">${L('Операции', 'Transactions')}</div>
        <div class="card">
          ${(imp.expanded ? items : items.slice(0, 10)).map((i) => {
            const d = new Date(i.ts);
            return `<div class="res">
              <span class="tr-ico">${catIcon(i.category)}</span>
              <span class="tr-name">${esc(i.note || CAT[i.category]?.name || '')}<small>${CAT[i.category]?.name} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</small></span>
              <span class="tr-sum">${money(i.amount)}</span>
            </div>`;
          }).join('')}
          ${items.length > 10 ? `<button class="more" id="more">${imp.expanded ? L('Свернуть', 'Collapse') : `${L('Ещё', 'More')} ${items.length - 10} ${plural(items.length - 10, 'операция', 'операции', 'операций')}`}<span class="chev${imp.expanded ? ' up' : ''}">${icons.down}</span></button>` : ''}
        </div>
      </div>
      <div class="bottom">
        ${known.size ? `<div class="imp-note">${L('Уже в приложении', 'Already in the app')}: ${items.filter(isKnown).length} — ${L('повторно не добавятся', 'won’t be added again')}</div>` : ''}
        <button class="btn" id="add" ${fresh ? '' : 'disabled'}>${fresh ? `${L('Добавить', 'Add')} ${fresh} ${plural(fresh, 'новую', 'новые', 'новых')}` : L('Новых операций нет', 'Nothing new')}</button>
      </div>`}
    </section>`;

  const close = () => { state.flow = null; state.imp = null; state.tab = 'profile'; render(); };
  app.querySelector('#back').onclick = close;
  app.querySelector('#more')?.addEventListener('click', () => { imp.expanded = !imp.expanded; haptic(); render(); });
  app.querySelectorAll('[data-sw]').forEach((el) => el.addEventListener('click', () => {
    imp[el.dataset.sw] = !imp[el.dataset.sw];
    haptic();
    render();
  }));
  app.querySelector('#add')?.addEventListener('click', async () => {
    const res = await store.importExpenses(imp.add);
    state.flow = null; state.imp = null; state.tab = 'home';
    const already = items.filter(isKnown).length;
    Promise.resolve(render()).then(() => keshSay(L(`Нашёл ${res.added} ${plural(res.added, 'операцию', 'операции', 'операций')}${already ? `, ${already} уже ${plural(already, 'была', 'были', 'было')} — не дублирую` : ''}.`, `Found ${res.added} ${plural(res.added, 'операцию', 'операции', 'операций')}${already ? `, ${already} already there — no duplicates` : ''}.`), 'Думает'));
    toast(importSummary(res));
  });
}

const MAX_FILE = 20 * 1024 * 1024;

function importData() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,.xlsx' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_FILE) return toast(L('Файл больше 20 МБ', 'File is larger than 20 MB'));
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const book = await readXlsx(await file.arrayBuffer());
        const n = Math.max(0, (book['Операции'] || []).length - 1);
        if (!(await dialog({ title: L('Загрузить из Excel?', 'Import from Excel?'), text: L(`В файле ${n} ${plural(n, 'строка', 'строки', 'строк')} операций. Текущие данные не удаляются, повторы не дублируются.`, `The file has ${n} transaction ${plural(n, 'строка', 'строки', 'строк')}. Current data stays; duplicates are skipped.`), ok: L('Загрузить', 'Import') }))) return;
        toast(importSummary(await importXlsx(book)));
        return render();
      }
      const check = checkBackup(JSON.parse(await file.text()));
      if (!check.ok) return toast(check.error);
      const d = check.exportedAt ? new Date(check.exportedAt) : null;
      const what = [
        `${check.transactions.length} ${plural(check.transactions.length, 'операция', 'операции', 'операций')}`,
        check.categories.length && `${check.categories.length} ${plural(check.categories.length, 'категория', 'категории', 'категорий')}`,
        Object.keys(check.budgets).length && `${Object.keys(check.budgets).length} ${plural(Object.keys(check.budgets).length, 'лимит', 'лимита', 'лимитов')}`,
        check.deposits.length && `${check.deposits.length} ${plural(check.deposits.length, 'вклад', 'вклада', 'вкладов')}`,
      ].filter(Boolean).join(', ');
      const text = `${d && !Number.isNaN(+d) ? `${L('Копия от', 'Backup from')} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}: ` : L('В копии: ', 'Backup contains: ')}${what}.`
        + `${check.dropped ? L(` Повреждённых записей: ${check.dropped} — они будут пропущены.`, ` Damaged records: ${check.dropped} — they’ll be skipped.`) : ''} ${L('Текущие данные не удаляются.', 'Current data stays.')}`;
      if (!(await dialog({ title: L('Восстановить копию?', 'Restore backup?'), text, ok: L('Восстановить', 'Restore') }))) return;
      const res = await restoreBackup(check);
      applySkin();
      render();
      toast(importSummary(res));
    } catch {
      toast(L('Не удалось прочитать файл', 'Couldn’t read the file'));
    }
  };
  input.click();
}

/* ---------- бюджет ---------- */
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const budgets = () => readJSON('budgets', {});
export async function limitHint(cat, added) {
  const lim = budgets()[cat];
  if (!(lim > 0)) return;
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const used = sum(spent(await store.expensesBetween(from, Date.now())).filter((i) => i.category === cat));
  const before = used - added;
  const name = CAT[cat]?.name || cat;
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  if (used > lim && before <= lim) {
    const up = Math.ceil(used / 100000) * 100000;
    return keshHint(null, L(`${name} вышли за лимит на ${money(used - lim)}. Поднять лимит или оставить?`, `${name} is over the limit by ${money(used - lim)}. Raise it or leave it?`), `${L('Поднять до', 'Raise to')} ${money(up)}`, () => {
      saveBudgets({ ...budgets(), [cat]: up });
      toast(L(`Лимит ${money(up)} в месяц`, `Limit ${money(up)} per month`));
      if (state.tab === 'budget') render();
    }, 'Переживает');
  }
  if (used >= lim * 0.8 && before < lim * 0.8) {
    return keshHint(null, L(`${name} — ${Math.round((used / lim) * 100)} % лимита. Осталось ${money(lim - used)} на ${days} ${plural(days, 'день', 'дня', 'дней')}.`, `${name} — ${Math.round((used / lim) * 100)}% of the limit. ${money(lim - used)} left for ${days} ${plural(days, 'день', 'дня', 'дней')}.`), null, null, 'Думает');
  }
  return false;
}

const saveBudgets = (b) => localStorage.setItem('budgets', JSON.stringify(b));
const toKop = (v) => Math.round(parseFloat(String(v).replace(/\s/g, '').replace(',', '.')) * 100);
const rub = (kop) => String(Math.round(kop / 100));

/* ---------- счета ---------- */
const accIcon = (a) => `<span class="acc-ico">${TYPES[a.type]?.icon || SYM}</span>`;
const accSub = (a, short) => a.type === 'credit'
  ? `${short ? L('лимит', 'limit') : TYPES.credit.sub} · ${money(a.balance)}`
  : short ? `${money(a.balance)} ${L('доступно', 'available')}` : `${TYPES[a.type]?.sub || ''} · ${money(a.balance)}`;
export { accSub };

function accountsCard(bal) {
  if (!bal.length && accountsOff()) {
    return `<button class="card acc-off" id="acc-on"><span class="tr-name">${L('Счета выключены', 'Accounts are off')}<small>${L('Включите, чтобы видеть остаток после каждой траты', 'Turn on to see the balance after each expense')}</small></span><span class="link">${L('Включить', 'Turn on')}</span></button>`;
  }
  if (!bal.length) {
    return `<div class="card acc-card"><div class="card-head"><b>${icons.wallet}${L('Счета', 'Accounts')}</b></div>
      <p class="month-sub">${L('Добавь наличные, карту или накопления — траты будут вычитаться из выбранного счёта.', 'Add cash, a card or savings — expenses will be subtracted from the chosen account.')}</p>
      <div class="dep-actions"><button class="btn alt" id="acc-add">${icons.plus} ${L('Добавить счёт', 'Add account')}</button><button class="btn alt" id="acc-skip">${L('Не нужно', 'Not needed')}</button></div></div>`;
  }
  return `<div class="card acc-card"><div class="card-head"><b>${icons.wallet}${L('Счета', 'Accounts')}</b><span class="acc-total ${ownTotal(bal) < 0 ? 'minus' : ''}">${money(ownTotal(bal))}</span></div>
    ${bal.map((a) => `<button class="acc-row" data-acc="${a.id}">${accIcon(a)}<span class="tr-name">${esc(a.name)}<small>${TYPES[a.type]?.name || ''}</small></span><b class="${a.balance < 0 ? 'minus' : ''}">${money(a.balance)}</b></button>`).join('')}
    <button class="link acc-new" id="acc-add">${icons.plus} ${L('Добавить счёт', 'Add account')}</button></div>`;
}

function bindAccountsCard() {
  app.querySelector('#acc-on')?.addEventListener('click', () => { haptic(); setAccountsOff(false); render(); });
  app.querySelector('#acc-skip')?.addEventListener('click', () => { haptic(); setAccountsOff(true); render(); toast(L('Счета скрыты. Включить можно здесь же', 'Accounts hidden. You can turn them on here')); });
  app.querySelector('#acc-add')?.addEventListener('click', () => { haptic(); openAddAccount(() => render()); });
  app.querySelector('.acc-card')?.addEventListener('click', async (e) => {
    const id = e.target.closest('[data-acc]')?.dataset.acc;
    if (!id) return;
    haptic();
    const a = (await balances()).find((x) => x.id === id);
    const act = await sheet(a.name, [
      { key: 'add', icon: icons.plus, label: L('Пополнить', 'Add money') },
      { key: 'sub', icon: icons.down_file, label: L('Списать', 'Take out') },
      { key: 'set', icon: icons.sync, label: L('Задать остаток', 'Set balance') },
      { key: 'rename', icon: icons.edit, label: L('Переименовать', 'Rename') },
      { key: 'del', icon: icons.trash, label: L('Удалить счёт', 'Delete account'), danger: true },
    ], accSub(a));
    const amount = async (title, value) => { const v = await askText(title, { mode: 'decimal', placeholder: L(`Сумма, ${SYM}`, `Amount, ${SYM}`), value }); const k = toKop(v || ''); return v === null || !(k >= 0) ? null : k; };
    if (act === 'add' || act === 'sub') {
      const k = await amount(act === 'add' ? L('Пополнить счёт', 'Add to account') : L('Списать со счёта', 'Take from account'));
      if (!k) return;
      updateAccount(id, { base: a.base + (act === 'add' ? k : -k) });
      render(); toast(`${act === 'add' ? '+' : '−'}${money(k)}`);
    }
    if (act === 'set') {
      const k = await amount(L('Сколько сейчас на счёте?', 'How much is on the account now?'), rub(a.balance));
      if (k === null) return;
      updateAccount(id, { base: a.base + (k - a.balance) });
      render();
    }
    if (act === 'rename') {
      const v = await askText(L('Название счёта', 'Account name'), { value: a.name });
      if (v && v.trim()) { updateAccount(id, { name: v.trim().slice(0, 40) }); render(); }
    }
    if (act === 'del' && await ask(L(`Удалить «${a.name}»?`, `Delete “${a.name}”?`), L('Операции останутся, пропадёт только остаток счёта.', 'Transactions stay; only the account balance goes away.'))) {
      removeAccount(id); render();
    }
  });
}

// Форма нового счёта в нижней панели; onDone(account)
export function openAddAccount(onDone) {
  let type = 'cash';
  const { panel, close } = bottomSheet(L('Новый счёт', 'New account'), `
    <div class="acc-types">${Object.entries(TYPES).map(([k, t]) => `<button class="${k === type ? 'on' : ''}" data-t="${k}"><span class="acc-ico">${t.icon}</span>${t.name}</button>`).join('')}</div>
    <label class="lbl">${L('Название', 'Name')}</label>
    <input class="field" id="acc-name" maxlength="40" placeholder="${TYPES.cash.name}">
    <label class="lbl" id="acc-lbl">${L(`Сколько сейчас, ${SYM}`, `Balance now, ${SYM}`)}</label>
    <input class="field" id="acc-sum" inputmode="decimal" placeholder="0">
    <button class="btn" id="acc-save">${L('Добавить счёт', 'Add account')}</button>`);
  panel.querySelector('.acc-types').onclick = (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t) return;
    type = t; haptic();
    panel.querySelectorAll('.acc-types button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    panel.querySelector('#acc-name').placeholder = TYPES[t].name;
    panel.querySelector('#acc-lbl').textContent = t === 'credit' ? L(`Доступный лимит, ${SYM}`, `Available credit, ${SYM}`) : L(`Сколько сейчас, ${SYM}`, `Balance now, ${SYM}`);
  };
  panel.querySelector('#acc-save').onclick = () => {
    const base = toKop(panel.querySelector('#acc-sum').value || '0') || 0;
    const a = addAccount({ name: panel.querySelector('#acc-name').value.trim().slice(0, 40), type, base: Math.max(0, base) });
    haptic(); close();
    onDone?.(a);
  };
  setTimeout(() => panel.querySelector('#acc-sum').focus(), 300);
}

// Выбор счёта для операции; onPick(id | '')
export async function openAccountPicker(current, income, onPick) {
  const bal = await balances();
  const title = income ? L('Зачислить на счёт', 'Deposit to') : L('Списать со счёта', 'Pay from');
  if (!bal.length) {
    const { panel, close } = bottomSheet(title, `
      <p class="bs-sub">${L('Счетов пока нет. Добавь наличные или карту — Кэш будет считать остаток после каждой траты.', 'No accounts yet. Add cash or a card and Kesh will track the balance after each expense.')}</p>
      <button class="btn" id="ap-add">${icons.plus} ${L('Добавить счёт', 'Add account')}</button>
      <button class="btn ghost" id="ap-off">${L('Мне не нужно', 'I don’t need this')}</button>`);
    panel.querySelector('#ap-add').onclick = () => { close(); openAddAccount((a) => onPick(a.id)); };
    panel.querySelector('#ap-off').onclick = () => { close(); setAccountsOff(true); onPick(''); toast(L('Счета скрыты. Включить можно в «Бюджете»', 'Accounts hidden. Turn them on in Budget')); };
    return;
  }
  const opt = (id, icon, name, sub) => `<button class="acc-opt${id === current ? ' on' : ''}" data-acc="${id}">${icon}<span class="tr-name">${esc(name)}<small>${sub}</small></span>${id === current ? icons.check : ''}</button>`;
  const { panel, close } = bottomSheet(title, `
    <p class="bs-sub">${L('Выберите один из ваших счетов.', 'Choose one of your accounts.')}</p>
    <div class="acc-list">${bal.map((a) => opt(a.id, accIcon(a), a.name, accSub(a))).join('')}
      ${opt('', '<span class="acc-ico">–</span>', L('Без счёта', 'No account'), L('Операция не меняет остатки', 'Doesn’t change balances'))}</div>
    <button class="link acc-new" id="ap-add">${icons.plus} ${L('Добавить счёт', 'Add account')}</button>`);
  panel.querySelector('.acc-list').onclick = (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    haptic(); close(); onPick(b.dataset.acc);
  };
  panel.querySelector('#ap-add').onclick = () => { close(); openAddAccount((a) => onPick(a.id)); };
}

export async function renderBudget() {
  const live = ticket();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [all, bal] = await Promise.all([store.expensesBetween(from.getTime(), to.getTime() - 1), balances()]);
  const items = spent(all);
  const bySpent = Object.fromEntries(byCategory(items));
  const b = budgets();
  const limited = CATEGORIES.filter(([id]) => b[id] > 0);
  const free = CATEGORIES.filter(([id]) => !(b[id] > 0)).sort(([x], [y]) => (bySpent[y] || 0) - (bySpent[x] || 0));
  const limit = limited.reduce((a, [id]) => a + b[id], 0);
  const used = limited.reduce((a, [id]) => a + (bySpent[id] || 0), 0);
  const left = limit - used;
  const daysLeft = Math.max(1, Math.ceil((to - now) / 864e5));
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar"><h1>${L('Бюджет', 'Budget')} · ${MONTHS_LOW[now.getMonth()]}</h1></header>
      <div class="scroll">
        ${accountsCard(bal)}
        <div class="card budget-card">
          ${limit ? `
            <div class="hero-label">${left < 0 ? L('Перерасход', 'Overspent') : L('Осталось на месяц', 'Left this month')}</div>
            <div class="hero-row"><div class="month-total${left < 0 ? ' over' : ''}">${money(Math.abs(left))}</div><small class="of">${L('из', 'of')} ${money(limit)}</small></div>
            <div class="days-bar${left < 0 ? ' over' : ''}" aria-hidden="true">${Array.from({ length: monthDays }, (_, n) =>
              `<i class="${n < Math.round(Math.min(1, used / limit) * monthDays) ? 'on' : ''}"></i>`).join('')}</div>
            <div class="budget-foot"><span class="month-sub">${L('Потрачено', 'Spent')} ${Math.round((used / limit) * 100)}%</span>${left > 0 ? `<b class="plus">≈ ${money(Math.floor(left / daysLeft / 100) * 100)} ${L('в день', 'a day')}</b>` : ''}</div>`
          : `<div class="hero-label">${L('Потрачено в этом месяце', 'Spent this month')}</div>
            <div class="month-total">${money(sum(items))}</div>
            <div class="month-sub">${L('Задайте лимит категории — предупрежу на 80 %', 'Set a category limit — I’ll warn you at 80%')}</div>`}
        </div>
        ${limited.length ? `
        <div class="card budget-list">
          <div class="card-head"><b>${L('Лимиты категорий', 'Category limits')}</b><span class="chip">${limited.length}</span></div>
          ${limited.map(([id, name], n) => {
            const v = bySpent[id] || 0;
            const rest = b[id] - v;
            return `<button class="cat-row limit-row" data-b="${id}" style="--i:${n}">
              <span class="tr-ico">${catIcon(id)}</span>
              <span class="cat-info">
                <span class="cat-top">${esc(name)}<b class="${rest < 0 ? 'minus' : ''}">${num(v)} / ${num(b[id])}</b></span>
                <span class="meter${rest < 0 ? ' over' : ''}"><i style="width:${Math.min(100, pct(v, b[id]))}%"></i></span>
              </span>
            </button>`;
          }).join('')}
        </div>` : ''}
        <button class="btn alt add-dep" id="addlimit">${icons.plus} ${L('Добавить лимит', 'Add limit')}</button>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.budget-card .month-total'), limit ? Math.abs(left) : sum(items));
  if (!limit) keshHint('budget-first', L('Задай лимит категории — предупрежу на 80 %.', 'Set a category limit — I’ll warn you at 80%.'));
  const askLimit = async (id) => {
    const val = await askText(`${L('Лимит', 'Limit')}: ${CAT[id].name}`, { mode: 'decimal', placeholder: L(`Сумма в месяц, ${SYM}`, `Monthly amount, ${SYM}`), value: b[id] ? rub(b[id]) : '' });
    if (val === null) return;
    const next = budgets();
    const kop = toKop(val);
    if (kop > 0) next[id] = kop; else delete next[id];
    saveBudgets(next);
    render();
    toast(kop > 0 ? L(`Лимит ${money(kop)} в месяц`, `Limit ${money(kop)} per month`) : L('Лимит убран', 'Limit removed'));
  };
  app.querySelector('#addlimit').onclick = async () => {
    haptic();
    const pick = await sheet(L('Лимит для категории', 'Limit for category'), [
      ...free.map(([id, name]) => ({ key: id, icon: `<span class="tr-ico sm">${catIcon(id)}</span>`, label: bySpent[id] ? `${name} · ${money(bySpent[id])}` : name })),
      { key: '__new', icon: icons.plus, label: L('Своя категория', 'Custom category') },
    ]);
    if (!pick) return;
    if (pick === '__new') {
      state.draft = { icon: 'star', name: '', color: PALETTE[customCategories().length % PALETTE.length], kind: 'out', from: 'budget' };
      state.flow = 'newcat';
      return render();
    }
    askLimit(pick);
  };
  bindAccountsCard();
  app.querySelector('.budget-list')?.addEventListener('click', async (e) => {
    const id = e.target.closest('[data-b]')?.dataset.b;
    if (!id) return;
    haptic();
    const own = customCategories().find((c) => c.id === id);
    const act = await sheet(CAT[id].name, [
      { key: 'limit', icon: icons.budget, label: b[id] ? `${L('Изменить лимит', 'Change limit')} · ${money(b[id])}` : L('Задать лимит', 'Set limit') },
      ...(b[id] ? [{ key: 'unlimit', icon: icons.trash, label: L('Убрать лимит', 'Remove limit') }] : []),
      { key: 'ops', icon: icons.chart, label: L('Операции категории', 'Category transactions') },
      ...(own ? [{ key: 'edit', icon: icons.edit, label: L('Изменить категорию', 'Edit category') },
        { key: 'del', icon: icons.trash, label: L('Удалить категорию', 'Delete category'), danger: true }] : []),
    ], bySpent[id] ? `${L('Потрачено в этом месяце', 'Spent this month')}: ${money(bySpent[id])}` : '');
    if (act === 'ops') return openCategory(id);
    if (act === 'edit') return editCategory(own, 'budget');
    if (act === 'del') return deleteCategory(own);
    if (act === 'unlimit') {
      const next = budgets(); delete next[id]; saveBudgets(next);
      render();
      return toast(L('Лимит убран', 'Limit removed'));
    }
    if (act === 'limit') askLimit(id);
  });
}

/* ---------- вклады ---------- */
const deposits = () => readJSON('deposits', []);
const saveDeposits = (list) => localStorage.setItem('deposits', JSON.stringify(list));
// Вклад: срочный (срок, капитализация или выплата в конце) или накопительный счёт (без срока)
const TERMS = [1, 2, 3, 6, 9, 12, 18, 24, 36];
const addMonths = (ts, m) => { const d = new Date(ts); d.setMonth(d.getMonth() + m); return +d; };
const depEnd = (d) => (d.kind === 'term' && d.months && d.opened ? addMonths(d.opened, d.months) : 0);
// доход к концу срока: ежемесячная капитализация — сложный процент, иначе простой по дням
const depIncome = (d) => {
  const r = (d.rate || 0) / 100;
  if (d.kind !== 'term' || !d.months) return Math.round((d.amount * r) / 12);
  if (d.cap === 'month') return Math.round(d.amount * ((1 + r / 12) ** d.months - 1));
  const days = d.opened ? Math.round((depEnd(d) - d.opened) / 864e5) : d.months * 30.4;
  return Math.round((d.amount * r * days) / 365);
};
const monthly = (d) => (d.kind === 'term' && d.months ? Math.round(depIncome(d) / d.months) : depIncome(d));
const dmy = (ts) => { const d = new Date(ts); return L(`${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`, `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`); };
const termLabel = (m) => (m % 12 === 0 ? `${m / 12} ${plural(m / 12, 'год', 'года', 'лет')}` : `${m} ${L('мес', 'mo')}`);
const depIcon = () => `<span class="tr-ico">${icons.safe.replace('<svg', '<svg class="ci"')}</span>`;

export function renderDeposits() {
  const list = deposits();
  const total = list.reduce((a, d) => a + d.amount, 0);
  const income = list.reduce((a, d) => a + monthly(d), 0);
  const ending = list.filter((d) => depEnd(d) > Date.now()).sort((a, b) => depEnd(a) - depEnd(b))[0];
  const daysTo = (ts) => Math.max(0, Math.ceil((ts - Date.now()) / 864e5));
  const sub = (d) => {
    const rate = d.rate ? `${String(d.rate).replace('.', ',')}%` : L('без %', 'no interest');
    if (d.kind !== 'term') return `${L('Накопительный', 'Savings')} · ${rate}`;
    const end = depEnd(d);
    return `${rate} · ${d.months ? termLabel(d.months) : ''}${end ? ` · ${end > Date.now() ? `${L('до', 'until')} ${dmy(end)}` : L('срок истёк', 'matured')}` : ''}`;
  };
  const prog = (d) => {
    const end = depEnd(d);
    if (!end) return '';
    const p = Math.min(1, Math.max(0, (Date.now() - d.opened) / (end - d.opened)));
    return `<span class="meter dep-meter"><i style="width:${Math.max(2, p * 100)}%"></i></span>`;
  };

  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar"><h1>${L('Вклады', 'Savings')}</h1><button class="icon-btn sm" id="add-top" aria-label="${L('Добавить вклад', 'Add account')}">${icons.plus}</button></header>
      <div class="scroll">
        <div class="hero">
          <div class="hero-label">${L('Всего на вкладах', 'Total savings')}</div>
          <div class="month-total">${money(total)}</div>
          <div class="month-sub">${income ? `<span class="delta down">≈ +${money(income)} / ${L('мес', 'mo')}</span> ${L('в среднем', 'on average')}` : list.length ? `${list.length} ${plural(list.length, 'вклад', 'вклада', 'вкладов')}` : L('Срочные вклады и накопительные счета', 'Term deposits and savings accounts')}</div>
        </div>
        ${ending ? `<div class="card dep-next"><span class="tr-name">${L('Ближайшее окончание', 'Next maturity')}<small>${esc(ending.name)} · ${dmy(depEnd(ending))}</small></span><span class="tr-right"><b>${daysTo(depEnd(ending))} ${plural(daysTo(depEnd(ending)), 'день', 'дня', 'дней')}</b><small class="plus">+${num(depIncome(ending))}</small></span></div>` : ''}
        ${list.length ? `<div class="card">
          <div class="card-head"><b>${L('Счета', 'Accounts')}</b><span class="chip">${L('по сумме', 'by amount')}</span></div>
          ${[...list].sort((a, b) => b.amount - a.amount).map((d) => `
          <button class="res dep-row" data-id="${d.id}">
            ${depIcon()}
            <span class="tr-name">${esc(d.name)}<small>${sub(d)}</small>${prog(d)}</span>
            <span class="tr-right"><span class="tr-sum">${num(d.amount)}</span>${d.rate ? `<small class="plus">+${num(depIncome(d))}${d.kind === 'term' && d.months ? ` ${L('к концу', 'at end')}` : ` / ${L('мес', 'mo')}`}</small>` : ''}</span>
          </button>`).join('')}</div>` : ''}
        ${income ? `<div class="imp-note dep-note">${L('Расчёт примерный, до налога. Капитализация — проценты добавляются к сумме каждый месяц; «в конце срока» — простые проценты.', 'Estimates before tax. Capitalization adds interest to the balance monthly; “at maturity” uses simple interest.')}</div>` : ''}
        <button class="btn alt add-dep" id="add">${L('Добавить вклад', 'Add account')}</button>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.month-total'), total);
  const open = (dep) => { haptic(); state.dep = dep; state.flow = 'deposit'; render(); };
  const blank = () => ({ name: '', amount: 0, rate: '', kind: 'term', months: 6, opened: Date.now(), cap: 'month' });
  app.querySelector('#add').onclick = () => open(blank());
  app.querySelector('#add-top').onclick = () => open(blank());
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (id) open({ kind: 'savings', cap: 'month', ...list.find((d) => d.id === id) });
  });
}

export function renderDeposit() {
  const d = state.dep;
  const close = () => { state.flow = null; state.dep = null; render(); };
  app.innerHTML = `
    <section class="screen">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
        <div class="pill">${d.id ? L('Вклад', 'Account') : L('Новый вклад', 'New account')}</div>
        <div style="width:40px"></div>
      </div>
      <div class="cats dep-form">
        ${d.id ? `<div class="info-hero"><div class="info-amount">${money(d.amount)}</div>
          <div class="month-sub">${d.rate ? (d.kind === 'term' && d.months ? `≈ +${money(depIncome(d))} ${L('к концу срока', 'at maturity')}` : `≈ +${money(monthly(d))} ${L('в месяц', 'per month')}`) : L('Без процентов', 'No interest')}</div></div>
          <div class="dep-actions">
            <button class="btn alt" id="topup">${icons.plus} ${L('Пополнить', 'Top up')}</button>
            <button class="btn alt" id="take">${L('Снять', 'Withdraw')}</button>
          </div>` : ''}
        <label class="lbl">${L('Название', 'Name')}</label>
        <input class="field" id="dname" placeholder="${L('Например, Накопительный Т-Банк', 'e.g. High-yield savings')}" maxlength="40" value="${esc(d.name)}">
        <label class="lbl">${L(`Сумма, ${SYM}`, `Amount, ${SYM}`)}</label>
        <input class="field" id="damount" inputmode="decimal" placeholder="0" value="${d.amount ? rub(d.amount) : ''}">
        <label class="lbl">${L('Ставка, % годовых', 'Rate, % APR')}</label>
        <input class="field" id="drate" inputmode="decimal" placeholder="${L('Например, 16', 'e.g. 16')}" value="${d.rate ? String(d.rate).replace('.', ',') : ''}">
        <label class="lbl">${L('Тип', 'Type')}</label>
        <div class="seg" id="dkind">
          <button class="${d.kind === 'term' ? 'on' : ''}" data-v="term">${L('Срочный вклад', 'Term deposit')}</button>
          <button class="${d.kind !== 'term' ? 'on' : ''}" data-v="savings">${L('Накопительный', 'Savings')}</button>
        </div>
        ${d.kind === 'term' ? `
          <label class="lbl">${L('Срок', 'Term')}</label>
          <div class="term-chips" id="dterm">${TERMS.map((m) => `<button class="${d.months === m ? 'on' : ''}" data-m="${m}">${termLabel(m)}</button>`).join('')}</div>
          <label class="lbl">${L('Дата открытия', 'Opened on')}</label>
          <input class="field" type="date" id="dopened" value="${new Date(d.opened || Date.now()).toISOString().slice(0, 10)}" max="${new Date().toISOString().slice(0, 10)}">
          <label class="lbl">${L('Проценты', 'Interest')}</label>
          <div class="seg" id="dcap">
            <button class="${d.cap !== 'end' ? 'on' : ''}" data-v="month">${L('Капитализация', 'Capitalized')}</button>
            <button class="${d.cap === 'end' ? 'on' : ''}" data-v="end">${L('В конце срока', 'At maturity')}</button>
          </div>` : `<div class="imp-note dep-hint">${L('Без срока: деньги можно снять в любой момент, проценты обычно начисляются на остаток каждый месяц.', 'No term: withdraw any time; interest is usually paid on the balance monthly.')}</div>`}
        <div class="dep-calc" id="dcalc"></div>
      </div>
      <div class="bottom">
        <button class="btn" id="save">${d.id ? L('Сохранить', 'Save') : L('Добавить вклад', 'Add account')}</button>
        ${d.id ? `<button class="btn ghost danger" id="del">${L('Удалить вклад', 'Delete account')}</button>` : ''}
      </div>
    </section>`;

  const persist = (dep) => {
    const list = deposits();
    const i = list.findIndex((x) => x.id === dep.id);
    i >= 0 ? (list[i] = dep) : list.push(dep);
    saveDeposits(list);
  };
  const read = () => ({
    ...d,
    name: app.querySelector('#dname').value.trim(),
    amount: Math.max(0, toKop(app.querySelector('#damount').value) || 0),
    rate: Math.min(100, Math.max(0, parseFloat(app.querySelector('#drate').value.replace(',', '.')) || 0)),
    opened: (() => { const v = app.querySelector('#dopened')?.value; if (!v) return d.opened || 0; const [y, m, dd] = v.split('-').map(Number); return +new Date(y, m - 1, dd, 12); })(),
  });
  // живой расчёт дохода
  const calc = () => {
    const x = read();
    const el = app.querySelector('#dcalc');
    if (!x.amount || !x.rate) { el.innerHTML = ''; return; }
    const inc = depIncome(x);
    const end = depEnd(x);
    el.innerHTML = x.kind === 'term' && x.months
      ? `<span>${end ? `${L('К', 'By')} ${dmy(end)}` : L('К концу срока', 'At maturity')}</span><b>${money(x.amount + inc)}</b><small class="plus">+${money(inc)}</small>`
      : `<span>${L('В месяц', 'Per month')}</span><b class="plus">+${money(inc)}</b><small>${L('в год', 'a year')} ≈ ${money(inc * 12)}</small>`;
  };
  ['#damount', '#drate', '#dopened'].forEach((q) => app.querySelector(q)?.addEventListener('input', calc));
  const keep = (patch) => { state.dep = { ...read(), ...patch }; render(); };
  app.querySelector('#dkind').onclick = (e) => { const v = e.target.closest('[data-v]')?.dataset.v; if (v) { haptic(); keep({ kind: v, months: v === 'term' ? (d.months || 6) : 0 }); } };
  app.querySelector('#dcap')?.addEventListener('click', (e) => { const v = e.target.closest('[data-v]')?.dataset.v; if (v) { haptic(); keep({ cap: v }); } });
  app.querySelector('#dterm')?.addEventListener('click', (e) => { const m = Number(e.target.closest('[data-m]')?.dataset.m); if (m) { haptic(); keep({ months: m }); } });
  calc();
  app.querySelector('#back').onclick = close;
  app.querySelector('#save').onclick = () => {
    const dep = read();
    if (!dep.name) return toast(L('Введите название', 'Enter a name'));
    persist({ ...dep, id: dep.id || `d${Date.now().toString(36)}` });
    haptic();
    close();
    toast(d.id ? L('Вклад сохранён', 'Account saved') : L('Вклад добавлен', 'Account added'));
  };
  const move = async (sign) => {
    const val = await askText(sign > 0 ? L('Пополнить вклад', 'Top up') : L('Снять со вклада', 'Withdraw'), { mode: 'decimal', placeholder: L(`Сумма, ${SYM}`, `Amount, ${SYM}`) });
    const kop = toKop(val || '');
    if (!(kop > 0)) return;
    const dep = { ...read(), name: read().name || d.name };
    dep.amount = Math.max(0, d.amount + sign * kop);
    persist(dep);
    state.dep = dep;
    render();
    toast(`${sign > 0 ? '+' : '−'}${money(kop)}`);
  };
  app.querySelector('#topup')?.addEventListener('click', () => move(1));
  app.querySelector('#take')?.addEventListener('click', () => move(-1));
  app.querySelector('#del')?.addEventListener('click', async () => {
    if (!(await ask(L('Удалить вклад?', 'Delete account?'), d.name))) return;
    saveDeposits(deposits().filter((x) => x.id !== d.id));
    close();
    toast(L('Вклад удалён', 'Account deleted'));
  });
}
