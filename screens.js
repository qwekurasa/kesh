import * as store from './store.js';
import * as auth from './auth.js';
import {
  CAT, app, state, money, moneyShort, esc, haptic, icons,
  render, go, toast, dialog, sheet, bottomSheet, PALETTE, tabbar, bindTabs, avatarHTML, openEdit, openRepeat, openInfo, openCategory, countUp, customCategories, removeCategory, catIcon, ask, askText, applySkin, SKINS, skinStyle, avatarSkin,
  CATEGORIES, catColor, isIncome, sumCell, num, SYM, reloadCategories, addCategory, ticket, DONATE, copyText,
} from './ui.js';
import { writeXlsx, readXlsx } from './xlsx.js';
import { keshOn, setKesh, hintsOn, setHints, keshHint, keshSay, calmMode, setCalm, keshCoat, setCoat, keshSVG, catAvatar } from './kesh.js';

import { makeBackup, checkBackup, restoreBackup } from './backup.js';
import { KINDS, loans, putLoan, removeLoan, monthsLeft, simulate, cardInfo, cardPayoff, blocks, setBlocks, BLOCKS } from './loans.js';
import { TYPES, accounts, balances, moneyLeft, addAccount, updateAccount, removeAccount, accountsOff, setAccountsOff } from './accounts.js';
import { L, LANG, setLang, plural as pl, CURRENCIES, CURRENCY, curSymbol, setCurrency } from './i18n.js';

export const BUILD = 'v64';


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
  const ml = await moneyLeft(wal);
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
  const dm = (ts) => { const d = new Date(ts); return L(`${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`); };
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
          <div class="hero-top"><span class="hero-label">${isMonth ? L('Расходы за месяц', 'Spent this month') : oneDay ? L('Расходы за день', 'Spent that day') : L('Расходы за период', 'Spent in period')}</span>${wal.length || (!accountsOff() && ml.v) ? `<button class="wallet-pill" id="wallet" aria-label="${L('Осталось денег', 'Money left')}">${icons.wallet}<span>${L('осталось', 'left')}</span><b class="${ml.v < 0 ? 'minus' : ''}">${money(ml.v)}</b></button>` : ''}</div>
          <div class="hero-row"><div class="month-total">${money(total)}</div>${deltaChip(total, prevTotal)}</div>
          <div class="month-sub">${sub}</div>
        </div>
        <div class="metrics">
          <div><small>${L('Сегодня', 'Today')}</small><b>${isCurrent ? money(today) : '—'}</b>${isCurrent ? deltaChip(today, yesterday) : ''}</div>
          <div><small>${L('Доходы', 'Income')}</small><b class="${income ? 'plus' : ''}">${income ? '+' : ''}${money(income)}</b>${deltaChip(income, prevIncome, true)}</div>
          <div><small>${L('В день', 'Per day')}</small><b>${money(Math.round(total / passed))}</b>${deltaChip(total / passed, prevTotal / prevPassed)}</div>
        </div>
        ${days.length ? days.map(day).join('') : `<div class="empty">${L('Нажмите <b>＋</b>, чтобы добавить первую трату', 'Tap <b>＋</b> to add your first expense')}</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#period').onclick = () => { haptic(); pickPeriod(); };
  app.querySelector('#wallet')?.addEventListener('click', () => { haptic(); go('budget'); });
  countUp(app.querySelector('.month-total'), total);
  app.querySelector('#me').onclick = () => { haptic(); go('profile'); };
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
          <div class="row"><span>${L('Источник', 'Source')}</span><span class="row-extra">${i.id.startsWith('imp') ? L('Выписка банка', 'Bank statement') : i.src === 'file' ? L('Файл копии', 'Backup file') : L('Добавлено вручную', 'Added manually')}</span></div>
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
          ${item('donate', icons.heart, L('Поддержать проект', 'Support the project'))}
        </div>
        ${installGuide()}
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
    if (a === 'donate') return openDonate();
    if (a === 'lang') return flipLang(e.target.closest('.row').querySelector('.lswitch'));
    if (a === 'cats') { state.flow = 'cats'; return render(); }
    if (a === 'statement') return pickStatement();
    if (a === 'export') return exportData();
    if (a === 'backup') return downloadBackup().then(render);
    if (a === 'import') return importData();
    if (a === 'clear-imported') {
      return ask(L(`Удалить ${imported} ${plural(imported, 'трату', 'траты', 'трат')}?`, `Delete ${imported} ${plural(imported, 'трату', 'траты', 'трат')}?`), L('Это операции из выписок и файлов копий. Внесённые вручную останутся.', 'These came from statements and backup files. Manual entries stay.'))
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
function openDonate() {
  const { panel } = bottomSheet(L('Поддержать проект', 'Support the project'), `
    <p class="bs-sub">${L('Нажмите на адрес или кнопку, чтобы скопировать.', 'Tap an address or the button to copy it.')}</p>
    <div class="acc-list">${DONATE.map(([n, a]) => `<button class="acc-opt" data-addr="${a}"><span class="tr-name">${n}<small class="addr">${a}</small></span><span class="don-copy" aria-label="${L('Копировать', 'Copy')}">${icons.copy}</span></button>`).join('')}</div>`);
  panel.querySelector('.acc-list').onclick = async (e) => {
    const b = e.target.closest('[data-addr]');
    if (!b) return;
    haptic();
    if (!(await copyText(b.dataset.addr))) return toast(L('Не удалось скопировать', 'Couldn’t copy'));
    toast(L('Адрес скопирован', 'Address copied'));
    const i = b.querySelector('.don-copy'); i.innerHTML = icons.check; i.classList.add('ok');
    setTimeout(() => { i.innerHTML = icons.copy; i.classList.remove('ok'); }, 1500);
  };
}

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
  if (window.KeshAndroid) {
    return file.arrayBuffer().then((buf) => {
      const u = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      window.KeshAndroid.share(file.name, file.type || 'application/octet-stream', btoa(s));
    });
  }
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
  return store.importExpenses(items, true);
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
// «Осталось денег»: со счетами — их остатки с учётом всех доходов и трат, без счетов — доходы − расходы за месяц
const leftChip = (ml) => `<span class="acc-left"><small>${ml.acc ? L('осталось', 'left') : L('осталось за месяц', 'left this month')}</small><b class="acc-total ${ml.v < 0 ? 'minus' : ''}">${money(ml.v)}</b></span>`;
const accIcon = (a) => `<span class="acc-ico">${TYPES[a.type]?.icon || SYM}</span>`;
const accSub = (a, short) => a.type === 'credit'
  ? `${short ? L('лимит', 'limit') : TYPES.credit.sub} · ${money(a.balance)}`
  : short ? `${money(a.balance)} ${L('доступно', 'available')}` : `${TYPES[a.type]?.sub || ''} · ${money(a.balance)}`;
export { accSub };

function accountsCard(bal, ml) {
  if (!bal.length && accountsOff()) {
    return `<button class="card acc-off" id="acc-on"><span class="tr-name">${L('Счета выключены', 'Accounts are off')}<small>${L('Включите, чтобы видеть остаток после каждой траты', 'Turn on to see the balance after each expense')}</small></span><span class="link">${L('Включить', 'Turn on')}</span></button>`;
  }
  if (!bal.length) {
    return `<div class="card acc-card"><div class="card-head"><b>${icons.wallet}${L('Счета', 'Accounts')}</b>${leftChip(ml)}</div>
      <p class="month-sub">${L('Добавь наличные, карту или накопления — траты будут вычитаться из выбранного счёта.', 'Add cash, a card or savings — expenses will be subtracted from the chosen account.')}</p>
      <div class="dep-actions"><button class="btn alt" id="acc-add">${icons.plus} ${L('Добавить счёт', 'Add account')}</button><button class="btn alt" id="acc-skip">${L('Не нужно', 'Not needed')}</button></div></div>`;
  }
  return `<div class="card acc-card"><div class="card-head"><b>${icons.wallet}${L('Счета', 'Accounts')}</b>${leftChip(ml)}</div>
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
  const ml = await moneyLeft(bal);
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
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${L('Бюджет', 'Budget')} · ${MONTHS_LOW[now.getMonth()]}</h1></button></header>
      <div class="scroll">
        ${accountsCard(bal, ml)}
        <div class="card budget-card">
          ${limit ? `
            <div class="hero-label">${left < 0 ? L('Перерасход', 'Overspent') : L('Осталось по лимитам', 'Left within limits')}</div>
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
  app.querySelector("#back").onclick = () => { haptic(); go("more"); };
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
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${L('Вклады', 'Savings')}</h1></button><button class="icon-btn sm" id="add-top" aria-label="${L('Добавить вклад', 'Add account')}">${icons.plus}</button></header>
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
  app.querySelector('#back').onclick = () => { haptic(); go('more'); };
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

/* ---------- Финансы: разделы, которые можно включать и выключать ---------- */
const BLOCK_INFO = {
  budget: [L('Бюджет и счета', 'Budget & accounts'), L('лимиты, счета, сколько осталось', 'limits, accounts, money left')],
  deposits: [L('Вклады', 'Savings'), L('срочные и накопительные', 'term and savings accounts')],
  mortgage: [L('Ипотека', 'Mortgage'), L('остаток, платёж, срок', 'balance, payment, term')],
  credit: [L('Кредиты', 'Loans'), L('остаток, платёж, срок', 'balance, payment, term')],
  debt: [L('Долги', 'Debts'), L('кому я должен и кто мне', 'who owes whom')],
};

export async function renderMore() {
  const live = ticket();
  const on = blocks();
  const bal = on.includes('budget') ? await balances() : [];
  const ml = on.includes('budget') ? await moneyLeft(bal) : null;
  // счета выключены — показываем траты за месяц, а не «осталось»
  const m0 = new Date(); const monthSpent = on.includes('budget') && !bal.length && accountsOff()
    ? spent(await store.expensesBetween(+new Date(m0.getFullYear(), m0.getMonth(), 1), Date.now() + 864e5)).reduce((a, i) => a + i.amount, 0) : null;
  if (!live()) return;
  const card = (id, value, sub) => `<button class="card fin-card" data-go="${id}"><span class="tr-ico">${FIN_ICONS[id].replace('<svg', '<svg class="ci"')}</span><span class="tr-name">${BLOCK_INFO[id][0]}<small>${sub}</small></span><span class="tr-right"><span class="tr-sum">${value}</span>${icons.right}</span></button>`;
  const sumLeft = (k) => loans(k).reduce((a, x) => a + x.left, 0);
  const sumPay = (k) => loans(k).reduce((a, x) => a + monthPay(x), 0);
  const view = {
    budget: () => (monthSpent !== null ? card('budget', money(monthSpent), L('потрачено за месяц', 'spent this month')) : card('budget', money(ml.v), ml.acc ? L('осталось на счетах', 'left in accounts') : L('доходы − расходы за месяц', 'income − spending this month'))),
    deposits: () => { const d = deposits(); return card('deposits', money(d.reduce((a, x) => a + x.amount, 0)), d.length ? `${d.length} ${plural(d.length, 'вклад', 'вклада', 'вкладов')}` : L('пока пусто', 'empty')); },
    mortgage: () => card('mortgage', money(sumLeft('mortgage')), sumPay('mortgage') ? `${money(sumPay('mortgage'))} / ${L('мес', 'mo')}` : L('пока пусто', 'empty')),
    credit: () => card('credit', money(sumLeft('credit')), sumPay('credit') ? `${money(sumPay('credit'))} / ${L('мес', 'mo')}` : L('пока пусто', 'empty')),
    debt: () => {
      const d = loans('debt'); const me = d.filter((x) => x.dir === 'me').reduce((a, x) => a + x.left, 0); const them = d.filter((x) => x.dir === 'them').reduce((a, x) => a + x.left, 0);
      return card('debt', money(them - me), d.length ? `${L('я должен', 'I owe')} ${money(me)} · ${L('мне', 'owed')} ${money(them)}` : L('пока пусто', 'empty'));
    },
  };
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar"><h1>${L('Финансы', 'Finance')}</h1><button class="icon-btn sm" id="setup" aria-label="${L('Настроить разделы', 'Customize')}">${icons.edit}</button></header>
      <div class="scroll">
        ${on.length ? on.map((id) => view[id]()).join('') : `<div class="empty">${L('Все разделы скрыты.', 'All sections are hidden.')}</div>`}
        <button class="btn alt add-dep" id="setup2">${icons.plus} ${L('Добавить или убрать раздел', 'Add or remove sections')}</button>
      </div>
      ${tabbar()}
    </section>`;
  bindTabs();
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-go]')?.dataset.go;
    if (!id) return;
    haptic();
    if (id === 'budget' || id === 'deposits') return go(id);
    state.loanKind = id; go('loans');
  });
  const setup = () => {
    haptic();
    const cur = blocks();
    const { panel } = bottomSheet(L('Разделы', 'Sections'), `<p class="bs-sub">${L('Включите то, что нужно. Данные выключенных разделов не удаляются.', 'Turn on what you need. Hidden sections keep their data.')}</p>
      ${BLOCKS.map((id) => `<button class="switch-row" data-s="${id}"><span>${BLOCK_INFO[id][0]}<small>${BLOCK_INFO[id][1]}</small></span><span class="sw${cur.includes(id) ? ' on' : ''}"></span></button>`).join('')}`, () => render());
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      haptic();
      const now = blocks();
      const next = now.includes(b.dataset.s) ? now.filter((x) => x !== b.dataset.s) : BLOCKS.filter((x) => now.includes(x) || x === b.dataset.s);
      setBlocks(next);
      b.querySelector('.sw').classList.toggle('on', next.includes(b.dataset.s));
    });
  };
  app.querySelector('#setup').onclick = setup;
  app.querySelector('#setup2').onclick = setup;
}

const FIN_ICONS = {
  budget: icons.budget, deposits: icons.safe, mortgage: icons.home, credit: icons.bank, debt: icons.sync,
};

// Ипотека, кредиты, долги — один экран, вид задаёт state.loanKind
const isCard = (x) => x.kind === 'credit' && x.sub === 'card';
const termText = (m) => (m >= 12 ? `${Math.floor(m / 12)} ${plural(Math.floor(m / 12), 'год', 'года', 'лет')}${m % 12 ? ` ${m % 12} ${L('мес', 'mo')}` : ''}` : `${m} ${L('мес', 'mo')}`);
// платёж в месяц для итогов: у карты — минимальный, у кредита — обязательный + досрочный сверху
const monthPay = (x) => (isCard(x) ? (x.left ? cardInfo(x).min : 0) : x.pay + (x.extra || 0));
const ratePct = (r) => `${String(r || 0).replace('.', ',')}%`;

export function renderLoans() {
  const kind = KINDS[state.loanKind] ? state.loanKind : 'credit';
  const list = loans(kind);
  const debt = kind === 'debt';
  const me = list.filter((x) => x.dir === 'me').reduce((a, x) => a + x.left, 0);
  const them = list.filter((x) => x.dir === 'them').reduce((a, x) => a + x.left, 0);
  const total = list.reduce((a, x) => a + x.left, 0);
  const pay = list.reduce((a, x) => a + monthPay(x), 0);
  const term = (x) => {
    const s = simulate(x, { extra: x.extra || 0 });
    if (!s) return x.pay && monthsLeft(x) === Infinity ? L('платёж не покрывает проценты', 'payment doesn’t cover interest') : '';
    return `≈ ${termText(s.months)}`;
  };
  const sub = (x) => {
    if (debt) return [x.dir === 'me' ? L('я должен', 'I owe') : L('должны мне', 'owed to me'), x.due ? `${L('до', 'by')} ${dmy(x.due)}` : ''].filter(Boolean).join(' · ');
    if (isCard(x)) {
      const c = cardInfo(x);
      return [L('карта', 'card'), c.avail !== null ? `${L('доступно', 'available')} ${num(c.avail)}` : '',
        c.grace && x.left ? `${L('без % до', 'interest-free to')} ${dmy(x.graceTo)}` : x.left && x.rate ? `${ratePct(x.rate)}` : ''].filter(Boolean).join(' · ');
    }
    return [x.rate ? ratePct(x.rate) : '', x.pay ? `${num(x.pay)}${x.extra ? ` + ${num(x.extra)}` : ''} / ${L('мес', 'mo')}` : '', term(x), x.total > x.left ? `${L('выплачено', 'paid')} ${Math.round(((x.total - x.left) / x.total) * 100)}%` : ''].filter(Boolean).join(' · ');
  };
  const ico = (x) => (isCard(x) ? icons.card : FIN_ICONS[kind]).replace('<svg', '<svg class="ci"');
  app.innerHTML = `
    <section class="screen tabbed">
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${KINDS[kind].name}</h1></button><button class="icon-btn sm" id="add-top" aria-label="${L('Добавить', 'Add')}">${icons.plus}</button></header>
      <div class="scroll">
        <div class="hero">
          <div class="hero-label">${debt ? L('Итог по долгам', 'Debt balance') : L('Осталось выплатить', 'Left to pay')}</div>
          <div class="month-total${debt && them - me < 0 ? ' over' : ''}">${money(debt ? them - me : total)}</div>
          <div class="month-sub">${debt ? `${L('Я должен', 'I owe')} ${money(me)} · ${L('мне должны', 'owed to me')} ${money(them)}` : pay ? `${L('Платежи', 'Payments')}: ${money(pay)} / ${L('мес', 'mo')}` : L('Добавьте, чтобы видеть остаток и срок', 'Add one to see balance and term')}</div>
        </div>
        ${list.length ? `<div class="card">${list.map((x) => `
          <button class="res dep-row" data-id="${x.id}"><span class="tr-ico">${ico(x)}</span>
            <span class="tr-name">${esc(x.name)}<small>${sub(x)}</small></span>
            <span class="tr-right"><span class="tr-sum${debt && x.dir === 'them' ? ' plus' : ''}">${num(x.left)}</span></span>
          </button>`).join('')}</div>` : ''}
        <button class="btn alt add-dep" id="add">${kind === 'credit' ? L('Добавить кредит или карту', 'Add a loan or card') : `${L('Добавить', 'Add')} ${KINDS[kind].one}`}</button>
      </div>
      ${tabbar()}
    </section>`;
  bindTabs();
  countUp(app.querySelector('.month-total'), debt ? them - me : total);
  app.querySelector('#back').onclick = () => { haptic(); go('more'); };
  const open = (x) => openLoan(kind, x);
  app.querySelector('#add').onclick = () => open(null);
  app.querySelector('#add-top').onclick = () => open(null);
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (!id) return;
    haptic();
    if (debt) return open(list.find((x) => x.id === id));
    state.loanId = id; state.calc = null; state.flow = 'loan'; render();
  });
}

const loanBack = () => { haptic(); state.flow = null; state.loanId = null; render(); };
const kopIn = (v) => Math.max(0, toKop(v || '0') || 0);

// Ипотека или кредит: остаток, досрочные платежи и калькулятор «что если»
export function renderLoan() {
  const x = loans().find((y) => y.id === state.loanId);
  if (!x) { state.flow = null; return render(); }
  if (isCard(x)) return renderCard(x);
  const c = state.calc ||= { extra: '', lump: '', mode: 'term' };
  const base = simulate(x, { extra: x.extra || 0 });
  const paid = x.total > x.left ? x.total - x.left : 0;
  const p = x.total ? Math.min(1, paid / x.total) : 0;
  const hist = [...(x.hist || [])].reverse();
  app.innerHTML = `
    <section class="screen">
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${esc(x.name)}</h1></button><button class="icon-btn sm" id="edit" aria-label="${L('Изменить', 'Edit')}">${icons.edit}</button></header>
      <div class="scroll">
        <div class="hero">
          <div class="hero-label">${L('Актуальный долг', 'Current balance')}</div>
          <div class="month-total">${money(x.left)}</div>
          <div class="month-sub">${x.total ? `${L('из', 'of')} ${money(x.total)} · ${L('выплачено', 'paid')} ${Math.round(p * 100)}%` : L('Укажите сумму, чтобы видеть прогресс', 'Add the original amount to see progress')}</div>
          ${x.total ? `<span class="meter dep-meter loan-meter"><i style="width:${Math.max(2, p * 100)}%"></i></span>` : ''}
        </div>
        <div class="card loan-facts">
          <div><small>${L('Ставка', 'Rate')}</small><b>${ratePct(x.rate)}</b></div>
          <div><small>${L('Платёж', 'Payment')}</small><b>${num(x.pay)}${x.extra ? `<i class="plus"> + ${num(x.extra)}</i>` : ''}</b></div>
          <div><small>${L('Осталось', 'Left')}</small><b>${base ? termText(base.months) : '—'}</b></div>
          <div><small>${L('Проценты впереди', 'Interest ahead')}</small><b>${base ? num(base.interest) : '—'}</b></div>
        </div>
        ${base ? `<div class="section-label">${L('Досрочное погашение', 'Early repayment')}</div>
        <div class="card early">
          ${x.extra ? `<button class="early-row" id="e-monthly"><span>${L('Каждый месяц сверху', 'Every month on top')}<small>${L('срок сокращается, платёж прежний', 'shorter term, same payment')}</small></span><b class="plus">+${num(x.extra)}</b></button>` : ''}
          ${hist.map((h, i) => `<div class="early-row"><span>${L('Разово', 'One-time')} · ${dmy(h.d)}<small>${h.m === 'pay' ? L('уменьшили платёж', 'payment lowered') : L('сократили срок', 'term shortened')}</small></span><b>−${num(h.a)}</b>${i === 0 ? `<button class="early-undo" id="e-undo" aria-label="${L('Отменить', 'Undo')}">${icons.trash}</button>` : ''}</div>`).join('')}
          ${!x.extra && !hist.length ? `<p class="calc-hint early-empty">${L('Вносите деньги сверх платежа — разово или каждый месяц. Долг, срок и проценты пересчитаются.', 'Pay above the schedule — once or monthly. Balance, term and interest update.')}</p>` : ''}
          <button class="btn" id="e-add">${icons.plus} ${L('Внести досрочно', 'Pay early')}</button>
        </div>
        <div class="section-label">${L('Что если', 'What if')}</div>
        <div class="card calc">
          <div class="seg kind full" id="c-mode"><button class="${c.mode === 'term' ? 'on' : ''}" data-m="term">${L('Сократить срок', 'Shorter term')}</button><button class="${c.mode === 'pay' ? 'on' : ''}" data-m="pay">${L('Уменьшить платёж', 'Lower payment')}</button></div>
          <div class="two">
            <label><span class="lbl">${L(`Каждый месяц сверху, ${SYM}`, `Extra monthly, ${SYM}`)}</span><input class="field" id="c-extra" inputmode="decimal" placeholder="0" value="${esc(c.extra)}"></label>
            <label><span class="lbl">${L(`Разово сейчас, ${SYM}`, `One-time now, ${SYM}`)}</span><input class="field" id="c-lump" inputmode="decimal" placeholder="0" value="${esc(c.lump)}"></label>
          </div>
          <div id="c-out"></div>
        </div>` : `<div class="imp-note dep-note">${x.pay ? L('Платёж не покрывает проценты — проверьте ставку и платёж.', 'The payment doesn’t cover interest — check rate and payment.') : L('Укажите ставку и платёж в месяц, чтобы посчитать срок и досрочное погашение.', 'Add the rate and monthly payment to see the term and early repayment.')}</div>`}
      </div>
    </section>`;
  countUp(app.querySelector('.month-total'), x.left);
  app.querySelector('#back').onclick = loanBack;
  app.querySelector('#edit').onclick = () => openLoan(x.kind, x);
  if (!base) return;
  app.querySelector('#e-add').onclick = () => openEarly(x, 'once');
  app.querySelector('#e-monthly')?.addEventListener('click', () => openEarly(x, 'monthly'));
  app.querySelector('#e-undo')?.addEventListener('click', async () => {
    const h = x.hist[x.hist.length - 1];
    if (!(await ask(L(`Отменить платёж ${money(h.a)}?`, `Undo the ${money(h.a)} payment?`), L('Долг и платёж вернутся как были.', 'Balance and payment go back.')))) return;
    putLoan({ ...x, left: x.left + h.a, pay: h.m === 'pay' && h.p ? h.p : x.pay, hist: x.hist.slice(0, -1) });
    haptic(); render();
  });
  const out = app.querySelector('#c-out');
  const calc = () => {
    const extra = kopIn(c.extra);
    const lump = Math.min(x.left, kopIn(c.lump));
    if (!extra && !lump) { out.innerHTML = `<p class="calc-hint">${L('Прикиньте без записи: покажу, насколько сократится срок или платёж и сколько сэкономите на процентах.', 'Try it without saving: see the new term or payment and the interest you save.')}</p>`; return; }
    const r = simulate(x, { extra: (x.extra || 0) + extra, lump, mode: c.mode });
    if (!r) return;
    const save = base.interest - r.interest;
    const rows = [
      c.mode === 'term'
        ? [L('Новый срок', 'New term'), termText(r.months), `−${termText(Math.max(0, base.months - r.months))}`]
        : [L('Новый платёж', 'New payment'), `${num(r.pay)}${(x.extra || 0) + extra ? ` + ${num((x.extra || 0) + extra)}` : ''}`, `−${num(Math.max(0, x.pay - r.pay))} / ${L('мес', 'mo')}`],
      [L('Проценты', 'Interest'), num(r.interest), `${L('было', 'was')} ${num(base.interest)}`],
      [L('Срок', 'Term'), termText(r.months), `${L('было', 'was')} ${termText(base.months)}`],
    ];
    out.innerHTML = `<div class="calc-save"><small>${L('Экономия на процентах', 'Interest saved')}</small><b>${money(Math.max(0, save))}</b></div>
      ${rows.slice(0, c.mode === 'term' ? 2 : 3).map(([a, b, d]) => `<div class="calc-row"><span>${a}</span><b>${b}</b><small>${d}</small></div>`).join('')}`;
  };
  app.querySelector('#c-mode').onclick = (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (!m || m === c.mode) return;
    c.mode = m; haptic();
    app.querySelectorAll('#c-mode button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    calc();
  };
  app.querySelector('#c-extra').oninput = (e) => { c.extra = e.target.value; calc(); };
  app.querySelector('#c-lump').oninput = (e) => { c.lump = e.target.value; calc(); };
  calc();
}

// Записать досрочный платёж: разово (с выбором — срок или платёж) или каждый месяц сверху
function openEarly(x, start) {
  let how = start; let mode = 'term';
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const { panel, close } = bottomSheet(L('Досрочное погашение', 'Early repayment'), `
    <div class="seg kind full" id="ea-how"><button data-h="once">${L('Разово', 'One-time')}</button><button data-h="monthly">${L('Каждый месяц', 'Every month')}</button></div>
    <label class="lbl">${L(`Сумма сверх платежа, ${SYM}`, `Amount above the payment, ${SYM}`)}</label>
    <input class="field" id="ea-sum" inputmode="decimal" placeholder="0" value="">
    <div class="ea-once"><label class="lbl">${L('Дата', 'Date')}</label><input class="field" id="ea-date" type="date" value="${today}" max="${today}">
    <div class="seg kind full" id="ea-mode"><button class="on" data-m="term">${L('Сократить срок', 'Shorter term')}</button><button data-m="pay">${L('Уменьшить платёж', 'Lower payment')}</button></div></div>
    <p class="calc-hint" id="ea-hint"></p>
    <button class="btn" id="ea-save">${L('Записать', 'Save')}</button>
    ${x.extra ? `<button class="btn alt danger" id="ea-stop">${L('Убрать ежемесячный платёж', 'Remove monthly payment')}</button>` : ''}`);
  const f = (q) => panel.querySelector(q);
  const base = simulate(x, { extra: x.extra || 0 });
  const preview = () => {
    const a = kopIn(f('#ea-sum').value);
    if (!a || !base) { f('#ea-hint').textContent = how === 'monthly' ? L('Будет прибавляться к платежу каждый месяц: срок короче, проценты меньше.', 'Added to every payment: shorter term, less interest.') : L('Банк обычно спрашивает, что уменьшить: срок выгоднее по процентам, платёж — легче каждый месяц.', 'Banks usually ask what to reduce: a shorter term saves more interest, a lower payment is easier monthly.'); return; }
    const r = how === 'monthly' ? simulate(x, { extra: a }) : simulate(x, { extra: x.extra || 0, lump: Math.min(a, x.left), mode });
    if (!r) return;
    f('#ea-hint').textContent = `${how === 'once' && mode === 'pay' ? `${L('Новый платёж', 'New payment')} ${money(r.pay)} · ` : ''}${L('срок', 'term')} ${termText(r.months)} · ${L('экономия', 'saved')} ${money(Math.max(0, base.interest - r.interest))}`;
  };
  const sync = () => {
    f('#ea-how').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.h === how));
    f('.ea-once').hidden = how !== 'once';
    if (how === 'monthly' && x.extra && !f('#ea-sum').value) f('#ea-sum').value = String(x.extra / 100).replace('.', ',');
    preview();
  };
  f('#ea-how').onclick = (e) => { const h = e.target.closest('[data-h]')?.dataset.h; if (h && h !== how) { how = h; haptic(); sync(); } };
  f('#ea-mode').onclick = (e) => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; mode = m; haptic(); f('#ea-mode').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); preview(); };
  f('#ea-sum').oninput = preview;
  f('#ea-save').onclick = () => {
    const a = kopIn(f('#ea-sum').value);
    if (!a) { f('#ea-sum').focus(); return; }
    if (how === 'monthly') putLoan({ ...x, extra: a });
    else {
      const lump = Math.min(a, x.left);
      const r = simulate(x, { extra: x.extra || 0, lump, mode });
      const d = f('#ea-date').value;
      putLoan({ ...x, left: x.left - lump, pay: mode === 'pay' && r ? r.pay : x.pay, hist: [...(x.hist || []), { d: d ? +new Date(`${d}T12:00`) : Date.now(), a: lump, m: mode, p: x.pay }] });
    }
    haptic(); toast(L('Записал', 'Saved')); close(); render();
  };
  f('#ea-stop')?.addEventListener('click', () => { putLoan({ ...x, extra: 0 }); haptic(); close(); render(); });
  sync();
  setTimeout(() => f('#ea-sum').focus(), 300);
}

// Кредитная карта: лимит, льготный период, минимальный платёж, план погашения
function renderCard(x) {
  const ci = cardInfo(x);
  const c = state.calc ||= { pay: '' };
  const tip = !x.left ? L('Долга нет — проценты не начисляются.', 'No balance — no interest.')
    : ci.grace ? L(`Без процентов ещё ${ci.days} ${plural(ci.days, 'день', 'дня', 'дней')} — до ${dmy(x.graceTo)}. Внесите ${money(x.left)} до этой даты, и проценты не начислят.`, `Interest-free for ${ci.days} more days — until ${dmy(x.graceTo)}. Pay ${money(x.left)} by then to avoid interest.`)
      : x.graceTo ? L(`Льготный период закончился ${dmy(x.graceTo)}. Если долг не погашен полностью, банк обычно начисляет проценты за весь период с даты покупок — сейчас ≈ ${money(ci.interest)} в месяц.`, `The grace period ended ${dmy(x.graceTo)}. If the balance wasn’t paid in full, banks usually charge interest back to the purchase date — now ≈ ${money(ci.interest)} a month.`)
        : L('Укажите, до какой даты действует льготный период — покажу, сколько дней осталось и сколько внести, чтобы не платить проценты.', 'Add the grace period end date to see days left and how much to pay to avoid interest.');
  app.innerHTML = `
    <section class="screen">
      <header class="appbar"><button class="back-title" id="back">${icons.back}<h1>${esc(x.name)}</h1></button><button class="icon-btn sm" id="edit" aria-label="${L('Изменить', 'Edit')}">${icons.edit}</button></header>
      <div class="scroll">
        <div class="hero">
          <div class="hero-label">${L('Долг по карте', 'Card balance')}</div>
          <div class="month-total">${money(x.left)}</div>
          <div class="month-sub">${x.limit ? `${L('Лимит', 'Limit')} ${money(x.limit)} · ${L('доступно', 'available')} ${money(ci.avail)}` : L('Укажите лимит, чтобы видеть доступную сумму', 'Add the limit to see what’s available')}</div>
          ${x.limit ? `<span class="meter dep-meter loan-meter${ci.util > 0.3 ? ' warn' : ''}"><i style="width:${Math.max(2, ci.util * 100)}%"></i></span>` : ''}
        </div>
        <div class="card card-grace${ci.grace && x.left ? ' ok' : !ci.grace && x.graceTo && x.left ? ' late' : ''}">${icons.clock}<p>${tip}</p></div>
        <div class="card loan-facts">
          <div><small>${L('Мин. платёж', 'Min. payment')}</small><b>${x.left ? `≈ ${num(ci.min)}` : '—'}</b></div>
          <div><small>${L('Ставка вне льготы', 'Rate after grace')}</small><b>${ratePct(x.rate)}</b></div>
          <div><small>${L('Проценты в месяц', 'Interest a month')}</small><b>${ci.grace || !x.left ? '0' : num(ci.interest)}</b></div>
          <div><small>${L('Обслуживание', 'Fee')}</small><b>${x.fee ? `${num(x.fee)} / ${L('мес', 'mo')}` : L('бесплатно', 'free')}</b></div>
        </div>
        ${ci.util > 0.3 ? `<div class="imp-note dep-note">${L(`Использовано ${Math.round(ci.util * 100)}% лимита. Ниже 30% — лучше для кредитной истории и спокойнее при форс-мажоре.`, `${Math.round(ci.util * 100)}% of the limit used. Under 30% is better for your credit score.`)}</div>` : ''}
        <div class="two-btn"><button class="btn alt" id="k-pay">${L('Внёс платёж', 'Paid')}</button><button class="btn alt" id="k-spend">${L('Покупка по карте', 'Card purchase')}</button></div>
        ${x.left ? `<div class="section-label">${L('План погашения', 'Payoff plan')}</div>
        <div class="card calc">
          <label><span class="lbl">${L(`Буду вносить в месяц, ${SYM}`, `I’ll pay a month, ${SYM}`)}</span><input class="field" id="k-plan" inputmode="decimal" placeholder="${String(Math.round(ci.min / 100))}" value="${esc(c.pay)}"></label>
          <div id="k-out"></div>
        </div>` : ''}
        <p class="calc-hint card-note">${L('Как устроены кредитки: льготный период (в РФ обычно 50–120 дней, бывает до 365; за рубежом 21–25 дней после выписки) действует, только если вернуть всю сумму до даты. Минимальный платёж — 3–8% долга в РФ, около 1% за рубежом, плюс проценты; если платить только его, долг тянется годами. Снятие наличных и переводы с кредитки часто сразу без льготы и с комиссией — смотрите условия в приложении банка.', 'How cards work: the grace period (often 21–25 days after the statement abroad, 50–120 days in Russia) applies only if you repay in full by the date. The minimum payment is about 1% abroad and 3–8% in Russia, plus interest; paying only that drags the debt on for years. Cash withdrawals and transfers usually have no grace and a fee — check your bank’s terms.')}</p>
      </div>
    </section>`;
  countUp(app.querySelector('.month-total'), x.left);
  app.querySelector('#back').onclick = loanBack;
  app.querySelector('#edit').onclick = () => openLoan(x.kind, x);
  const change = async (sign) => {
    const v = await askText(sign < 0 ? L('Сколько внесли на карту?', 'How much did you pay?') : L('Сумма покупки', 'Purchase amount'), { mode: 'decimal', placeholder: L(`Сумма, ${SYM}`, `Amount, ${SYM}`) });
    const k = kopIn(v);
    if (v === null || !k) return;
    const left = Math.max(0, x.left + sign * k);
    putLoan({ ...x, left });
    haptic();
    toast(sign < 0 && !left && ci.grace ? L('Долг погашен в льготный период — без процентов', 'Paid off within the grace period — no interest') : L('Долг обновлён', 'Balance updated'));
    render();
  };
  app.querySelector('#k-pay').onclick = () => change(-1);
  app.querySelector('#k-spend').onclick = () => change(1);
  const out = app.querySelector('#k-out');
  if (!out) return;
  const calc = () => {
    const p = kopIn(c.pay) || ci.min;
    const r = cardPayoff(x, p); const rm = cardPayoff(x, ci.min);
    if (!r) { out.innerHTML = `<p class="calc-hint">${L('Этого не хватит даже на проценты и обслуживание — долг будет расти.', 'Not enough to cover interest and fees — the balance will grow.')}</p>`; return; }
    out.innerHTML = `<div class="calc-row"><span>${L('Погасите за', 'Paid off in')}</span><b>${termText(r.months)}</b><small>${L('при', 'at')} ${num(p)} / ${L('мес', 'mo')}</small></div>
      <div class="calc-row"><span>${L('Переплата', 'Total interest & fees')}</span><b>${num(r.cost)}</b><small>${L('проценты и обслуживание', 'interest and fees')}</small></div>
      ${rm && p > ci.min ? `<div class="calc-row"><span>${L('Только минимальным', 'Minimum only')}</span><b>${termText(rm.months)}</b><small>${L('переплата', 'cost')} ${num(rm.cost)}</small></div>` : ''}
      ${ci.grace ? `<p class="calc-hint">${L(`Выгоднее всего — внести ${money(x.left)} до ${dmy(x.graceTo)}: тогда переплаты не будет совсем.`, `Best option: pay ${money(x.left)} by ${dmy(x.graceTo)} — no interest at all.`)}</p>` : ''}`;
  };
  app.querySelector('#k-plan').oninput = (e) => { c.pay = e.target.value; calc(); };
  calc();
}

function openLoan(kind, x) {
  const debt = kind === 'debt';
  let dir = x?.dir || 'me';
  let sub = x?.sub === 'card' ? 'card' : 'loan';
  const v = (k) => (k ? String(k / 100).replace('.', ',') : '');
  const dayVal = (ts) => (ts ? new Date(ts - new Date(ts).getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : '');
  const yearsLeft = x && !debt && x.sub !== 'card' && monthsLeft(x) && monthsLeft(x) !== Infinity ? String(Math.round((monthsLeft(x) / 12) * 10) / 10).replace('.', ',') : '';
  const title = x ? x.name : kind === 'credit' ? L('Добавить кредит', 'Add a loan') : `${L('Добавить', 'Add')} ${KINDS[kind].one}`;
  const { panel, close } = bottomSheet(title, `
    ${debt ? `<div class="seg kind full" id="ln-dir"><button class="${dir === 'me' ? 'on' : ''}" data-d="me">${L('Я должен', 'I owe')}</button><button class="${dir === 'them' ? 'on' : ''}" data-d="them">${L('Мне должны', 'Owed to me')}</button></div>` : ''}
    ${kind === 'credit' ? `<div class="seg kind full" id="ln-sub"><button class="${sub === 'loan' ? 'on' : ''}" data-s="loan">${L('Кредит', 'Loan')}</button><button class="${sub === 'card' ? 'on' : ''}" data-s="card">${L('Кредитная карта', 'Credit card')}</button></div>` : ''}
    <label class="lbl" id="ln-name-l">${debt ? (dir === 'me' ? L('Кому', 'To whom') : L('Кто', 'Who')) : L('Название', 'Name')}</label>
    <input class="field" id="ln-name" maxlength="60" value="${esc(x?.name || '')}" placeholder="${debt ? L('Например, Саша', 'e.g. Alex') : kind === 'mortgage' ? L('Например, Сбербанк', 'e.g. Bank') : L('Например, Т-Банк', 'e.g. Bank')}">
    ${debt ? `<label class="lbl">${L(`Сумма, ${SYM}`, `Amount, ${SYM}`)}</label><input class="field" id="ln-left" inputmode="decimal" value="${v(x?.left)}" placeholder="0">
      <label class="lbl">${L('Вернуть до (необязательно)', 'Due date (optional)')}</label><input class="field" id="ln-due" type="date" value="${dayVal(x?.due)}">` : `
    <div class="ln-loan"${sub === 'card' ? ' hidden' : ''}>
      <label class="lbl">${kind === 'mortgage' ? L(`Сумма ипотеки, ${SYM}`, `Mortgage amount, ${SYM}`) : L(`Сумма кредита, ${SYM}`, `Loan amount, ${SYM}`)}</label>
      <input class="field" id="ln-total" inputmode="decimal" value="${v(x?.total)}" placeholder="0">
      <label class="lbl">${L(`Актуальный долг, ${SYM}`, `Current balance, ${SYM}`)}</label>
      <input class="field" id="ln-left" inputmode="decimal" value="${x?.sub === 'card' ? '' : v(x?.left)}" placeholder="${L('как сумма', 'same as amount')}">
      <div class="two"><div><label class="lbl">${L('Ставка, % годовых', 'Rate, % a year')}</label><input class="field" id="ln-rate" inputmode="decimal" value="${x?.rate && x.sub !== 'card' ? String(x.rate).replace('.', ',') : ''}" placeholder="0"></div>
      <div><label class="lbl">${L('Осталось лет', 'Years left')}</label><input class="field" id="ln-term" inputmode="decimal" value="${yearsLeft}" placeholder="${kind === 'mortgage' ? 20 : 5}"></div></div>
      <label class="lbl">${L(`Обязательный платёж в месяц, ${SYM}`, `Required monthly payment, ${SYM}`)}</label><input class="field" id="ln-pay" inputmode="decimal" value="${x?.sub === 'card' ? '' : v(x?.pay)}" placeholder="0">
      <p class="calc-hint" id="ln-hint">${L('Считается сам по долгу, ставке и сроку. Впишите свой — посчитаю срок.', 'Calculated from balance, rate and term. Type your own and I’ll work out the term.')}</p>
    </div>
    ${kind === 'credit' ? `<div class="ln-card"${sub === 'card' ? '' : ' hidden'}>
      <div class="two"><div><label class="lbl">${L(`Кредитный лимит, ${SYM}`, `Credit limit, ${SYM}`)}</label><input class="field" id="cd-limit" inputmode="decimal" value="${v(x?.limit)}" placeholder="0"></div>
      <div><label class="lbl">${L(`Долг сейчас, ${SYM}`, `Balance now, ${SYM}`)}</label><input class="field" id="cd-left" inputmode="decimal" value="${x?.sub === 'card' ? v(x?.left) : ''}" placeholder="0"></div></div>
      <label class="lbl">${L('Без процентов до (льготный период)', 'Interest-free until (grace period)')}</label><input class="field" id="cd-grace" type="date" value="${dayVal(x?.graceTo)}">
      <div class="day-chips" id="cd-days">${[55, 100, 120, 200].map((d) => `<button class="dchip" data-days="${d}">+${d} ${L('дн', 'd')}</button>`).join('')}</div>
      <div class="two"><div><label class="lbl">${L('Ставка вне льготы, %', 'Rate after grace, %')}</label><input class="field" id="cd-rate" inputmode="decimal" value="${x?.sub === 'card' && x.rate ? String(x.rate).replace('.', ',') : ''}" placeholder="40"></div>
      <div><label class="lbl">${L('Мин. платёж, % долга', 'Min. payment, % of balance')}</label><input class="field" id="cd-min" inputmode="decimal" value="${x?.minPct ? String(x.minPct).replace('.', ',') : ''}" placeholder="3"></div></div>
      <label class="lbl">${L(`Обслуживание в месяц, ${SYM}`, `Monthly fee, ${SYM}`)}</label><input class="field" id="cd-fee" inputmode="decimal" value="${v(x?.fee)}" placeholder="0">
      <p class="calc-hint">${L('Всё есть в приложении банка: «Условия» или выписка по карте. «+55 дн» — посчитать дату от сегодня.', 'Find these in your bank app: card terms or statement. “+55 d” counts the date from today.')}</p>
    </div>` : ''}`}
    <button class="btn" id="ln-save">${L('Сохранить', 'Save')}</button>
    ${x ? `<button class="btn alt danger" id="ln-del">${L('Удалить', 'Delete')}</button>` : ''}`);
  const f = (id) => panel.querySelector(id);
  const n = (id) => parseFloat((f(id)?.value || '').replace(/\s/g, '').replace(',', '.')) || 0;
  // Аннуитетный платёж: пересчитывается при любом изменении суммы, долга, ставки или срока;
  // свой платёж — пересчёт срока, дальше платёж снова считается от этого срока
  if (!debt) {
    const fmt = (k) => String(Math.round(k) / 100).replace('.', ',');
    const debtNow = () => kopIn(f('#ln-left').value) || kopIn(f('#ln-total').value);
    const fromTerm = () => {
      const left = debtNow(); const r = n('#ln-rate') / 1200; const m = Math.round((n('#ln-term') || Number(f('#ln-term').placeholder)) * 12);
      if (!(left > 0) || !(m > 0)) { f('#ln-pay').value = ''; return; }
      f('#ln-pay').value = fmt(r ? (left * r) / (1 - (1 + r) ** -m) : left / m);
      f('#ln-hint').textContent = L('Считается сам по долгу, ставке и сроку. Впишите свой — посчитаю срок.', 'Calculated from balance, rate and term. Type your own and I’ll work out the term.');
    };
    const fromPay = () => {
      if (!f('#ln-pay').value.trim()) return fromTerm();
      const m = monthsLeft({ left: debtNow(), rate: n('#ln-rate'), pay: kopIn(f('#ln-pay').value) });
      f('#ln-term').value = m && m !== Infinity ? String(Math.round((m / 12) * 10) / 10).replace('.', ',') : '';
      f('#ln-hint').textContent = m === Infinity ? L('Платёж меньше процентов — долг не уменьшится.', 'Payment is below interest — the balance won’t go down.') : '';
    };
    // новая запись: долг повторяет сумму, пока его не поменяли руками
    let lastTotal = f('#ln-total').value;
    f('#ln-total').addEventListener('input', () => {
      if (!f('#ln-left').value || f('#ln-left').value === lastTotal) f('#ln-left').value = f('#ln-total').value;
      lastTotal = f('#ln-total').value;
      fromTerm();
    });
    ['#ln-left', '#ln-rate', '#ln-term'].forEach((id) => f(id).addEventListener('input', fromTerm));
    f('#ln-pay').addEventListener('input', fromPay);
    if (!x?.pay || x.sub === 'card') fromTerm();
    f('#cd-days')?.addEventListener('click', (e) => {
      const d = Number(e.target.closest('[data-days]')?.dataset.days);
      if (!d) return;
      haptic(); f('#cd-grace').value = dayVal(Date.now() + d * 864e5);
    });
  }
  f('#ln-sub')?.addEventListener('click', (e) => {
    const s = e.target.closest('[data-s]')?.dataset.s;
    if (!s || s === sub) return;
    sub = s; haptic();
    f('#ln-sub').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
    f('.ln-loan').hidden = s === 'card'; f('.ln-card').hidden = s !== 'card';
    panel.querySelector('.bs-head h3').textContent = x ? x.name : s === 'card' ? L('Добавить кредитную карту', 'Add a credit card') : L('Добавить кредит', 'Add a loan');
  });
  f('#ln-dir')?.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]')?.dataset.d;
    if (!d) return;
    dir = d; haptic();
    f('#ln-dir').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.d === d));
    f('#ln-name-l').textContent = d === 'me' ? L('Кому', 'To whom') : L('Кто', 'Who');
  });
  f('#ln-save').onclick = () => {
    const card = !debt && sub === 'card';
    const keep = { extra: x?.extra || 0, hist: x?.hist || [] };
    const name = f('#ln-name').value.trim().slice(0, 60);
    if (card) {
      const limit = kopIn(f('#cd-limit').value); const left = kopIn(f('#cd-left').value);
      if (!limit && !left) { f('#cd-limit').focus(); return; }
      const g = f('#cd-grace').value;
      putLoan({ id: x?.id || '', kind, sub: 'card', name: name || L('Кредитная карта', 'Credit card'), left, limit, total: 0, pay: 0, extra: 0, hist: [],
        rate: Math.min(100, n('#cd-rate')), minPct: Math.min(100, n('#cd-min')), fee: kopIn(f('#cd-fee').value), graceTo: g ? +new Date(`${g}T23:00`) : 0, dir: 'me', due: 0 });
    } else {
      const left = debt ? kopIn(f('#ln-left').value) : kopIn(f('#ln-left').value) || kopIn(f('#ln-total').value);
      if (!(left > 0)) { f(debt || !f('#ln-total').value ? '#ln-left' : '#ln-total').focus(); return; }
      const due = f('#ln-due')?.value;
      putLoan({
        id: x?.id || '', kind, sub: 'loan', name: name || KINDS[kind].name, left,
        rate: debt ? 0 : Math.min(100, n('#ln-rate')),
        pay: debt ? 0 : kopIn(f('#ln-pay').value),
        total: debt ? 0 : kopIn(f('#ln-total').value),
        dir: debt ? dir : 'me', due: due ? +new Date(`${due}T12:00`) : 0, ...(debt ? {} : keep),
      });
    }
    haptic(); close(); render();
  };
  f('#ln-del')?.addEventListener('click', async () => {
    if (!(await ask(L('Удалить запись?', 'Delete this entry?'), ''))) return;
    removeLoan(x.id); close(); if (state.flow === 'loan') { state.flow = null; state.loanId = null; } render();
  });
  if (!x) setTimeout(() => f(debt ? '#ln-left' : kind === 'credit' ? '#ln-name' : '#ln-total').focus(), 300);
}

/* ---------- инструкция по установке (раскрывающиеся блоки в профиле) ---------- */
const DL_URL = 'https://keshi-ik.vercel.app/dl/';
function installGuide() {
  const sec = (title, sub, steps, extra = '') => `<details class="guide"><summary><span class="tr-name">${title}<small>${sub}</small></span>${icons.down}</summary>
    <ol>${steps.map((x) => `<li>${x}</li>`).join('')}</ol>${extra}</details>`;
  const dl = (file, label) => `<a class="btn alt guide-dl" href="${DL_URL}${file}" download>${icons.down} ${label}</a>`;
  return `<details class="card guide-card guide-all"><summary><span class="tr-name">${L('Установка на другие устройства', 'Install on other devices')}<small>iPhone · Android · ${L('компьютер · виджет', 'computer · widget')}</small></span>${icons.down}</summary>
      ${sec(L('iPhone — с сайта', 'iPhone — from Safari'), L('просто, без компьютера', 'easy, no computer'), [
        L('Откройте <b>keshi-ik.vercel.app</b> в Safari.', 'Open <b>keshi-ik.vercel.app</b> in Safari.'),
        L('«Поделиться» → «На экран „Домой“».', 'Share → Add to Home Screen.'),
        L('Данные перенесите копией: Профиль → Резервная копия.', 'Move data with a backup: Profile → Backup.')])}
      ${sec(L('iPhone — приложение с виджетом', 'iPhone — app with widget'), L('через AltStore и компьютер', 'via AltStore and a computer'), [
        L('На компьютер: iTunes и iCloud с сайта Apple, затем AltServer с altstore.io.', 'On a computer: iTunes and iCloud from Apple, then AltServer from altstore.io.'),
        L('iPhone по кабелю → «Доверять». AltServer в трее → Install AltStore → Apple ID.', 'iPhone via cable → Trust. AltServer tray → Install AltStore → Apple ID.'),
        L('Настройки → Основные → VPN и управление устройством → ваш Apple ID → «Доверять». Включите «Режим разработчика».', 'Settings → General → VPN & Device Management → your Apple ID → Trust. Turn on Developer Mode.'),
        L('Скачайте Kesh.ipa в «Файлы», в AltStore: My Apps → «+» → Kesh.ipa.', 'Download Kesh.ipa to Files, then AltStore: My Apps → + → Kesh.ipa.'),
        L('Раз в 7 дней: AltStore → My Apps → Refresh All.', 'Every 7 days: AltStore → My Apps → Refresh All.')], dl('Kesh.ipa', L('Скачать Kesh.ipa', 'Download Kesh.ipa')))}
      ${sec(L('Виджет на iPhone', 'iPhone widget'), L('только в приложении из Kesh.ipa', 'only in the Kesh.ipa app'), [
        L('Долгое нажатие на экране «Домой» → «Изменить» → «Добавить виджет».', 'Long-press the Home Screen → Edit → Add Widget.'),
        L('Найдите Kesh, выберите размер → «Добавить виджет».', 'Find Kesh, pick a size → Add Widget.')])}
      ${sec('Android', L('приложение или с сайта', 'app or from Chrome'), [
        L('Скачайте Kesh.apk, откройте и разрешите установку.', 'Download Kesh.apk, open it and allow the install.'),
        L('Или в Chrome: меню ⋮ → «Установить приложение».', 'Or in Chrome: menu ⋮ → Install app.')], dl('Kesh.apk', L('Скачать Kesh.apk', 'Download Kesh.apk')))}
      ${sec(L('Компьютер', 'Computer'), L('сайт с отчётами и Excel', 'site with reports and Excel'), [
        L('Откройте <b>keshi-ik.vercel.app</b> на компьютере.', 'Open <b>keshi-ik.vercel.app</b> on a computer.'),
        L('Перенесите копию с телефона во вкладке «Экспорт и импорт».', 'Bring your phone backup in “Export & import”.')])}
    </details>`;
}
