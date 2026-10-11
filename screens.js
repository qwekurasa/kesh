import * as store from './store.js';
import * as auth from './auth.js';
import {
  CAT, app, state, money, moneyShort, esc, haptic, icons,
  render, go, toast, dialog, tabbar, bindTabs, avatarHTML, openEdit, openRepeat, openInfo, openCategory, countUp, customCategories, removeCategory, catIcon, ask, askText, applySkin, SKINS, skinStyle, avatarSkin,
  CATEGORIES, catColor, isIncome, sumCell, reloadCategories, addCategory, ticket,
} from './ui.js';
import { writeXlsx, readXlsx } from './xlsx.js';
import { kittyOn, setKitty, COATS, kittyCoat, setCoat } from './kitty.js';
import { makeBackup, checkBackup, restoreBackup } from './backup.js';

export const BUILD = 'v27';


const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_LOW = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

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
export async function renderHome() {
  const live = ticket();
  const from = state.month.getTime();
  const next = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
  const items = await store.expensesBetween(from, next.getTime() - 1);
  const days = groupByDay(items);
  const total = sum(spent(items));
  const income = sum(items.filter(isIncome));
  const isCurrent = next > new Date();

  const row = (i) => `
    <div class="tr" data-id="${i.id}">
      <span class="tr-ico">${catIcon(i.category)}</span>
      <span class="tr-name">${esc(CAT[i.category]?.name || i.category)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</span>
      ${sumCell(i)}
    </div>`;

  const day = (d) => {
    const date = new Date(d.ts);
    const open = !state.collapsed.has(d.key);
    return `
      <section class="day${open ? ' open' : ''}" data-key="${d.key}" style="--i:${days.indexOf(d)}">
        <button class="day-head">
          <span class="day-date"><b>${date.getDate()}</b><small>${WEEKDAYS[date.getDay()]}</small></span>
          <span class="day-meta"><b>${money(sum(spent(d.items)))}</b><small>${d.items.length} ${plural(d.items.length, 'операция', 'операции', 'операций')}${d.items.some(isIncome) ? ` · <span class="plus">+${money(sum(d.items.filter(isIncome)))}</span>` : ''}</small></span>
          <span class="chev">${icons.down}</span>
        </button>
        <div class="day-items">${d.items.map(row).join('')}</div>
      </section>`;
  };

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="month-nav">
          <button class="icon-btn sm" id="prev" aria-label="Предыдущий месяц">${icons.left}</button>
          <label class="month-name">${MONTHS[state.month.getMonth()]} ${state.month.getFullYear()}
            <input type="month" id="mpick" value="${state.month.getFullYear()}-${String(state.month.getMonth() + 1).padStart(2, '0')}" max="${new Date().toISOString().slice(0, 7)}">
          </label>
          <button class="icon-btn sm" id="next" aria-label="Следующий месяц" ${isCurrent ? 'disabled' : ''}>${icons.right}</button>
          <button class="home-ava" id="me" aria-label="Профиль">${avatarHTML()}</button>
        </div>
        <div class="month-total">${money(total)}</div>
        <div class="month-sub">${items.length ? `Расходы за ${MONTHS_LOW[state.month.getMonth()]}` : 'Трат пока нет'}${income ? ` · <span class="plus">+${money(income)}</span>` : ''}</div>
      </header>
      <div class="scroll" id="list">
        ${days.length ? days.map(day).join('') : `<div class="empty">Нажмите <b>＋</b>, чтобы добавить первую трату</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#mpick').onchange = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    if (y) { state.month = new Date(y, m - 1, 1); render(); }
  };
  countUp(app.querySelector('.month-total'), total);
  app.querySelector('#me').onclick = () => { haptic(); go('profile'); };
  restoreScroll(app.querySelector('#list'));
  app.querySelector('#prev').onclick = () => { shiftMonth(-1); };
  app.querySelector('#next').onclick = () => { shiftMonth(1); };
  app.querySelector('#list').addEventListener('click', (e) => {
    const head = e.target.closest('.day-head');
    if (head) {
      const s = head.parentElement;
      state.collapsed.has(s.dataset.key) ? state.collapsed.delete(s.dataset.key) : state.collapsed.add(s.dataset.key);
      s.classList.toggle('open');
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
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + delta, 1);
  render();
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ---------- charts ---------- */
const PERIODS = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']];

function periodRange(period) {
  const now = new Date();
  if (period === 'day') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: new Date(+from + 864e5), label: `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]}`, bars: 24, step: 'hour' };
  }
  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { from: d, to: new Date(+d + 7 * 864e5), label: 'Эта неделя', bars: 7, step: 'day' };
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
  else if (r.step === 'hour') { from = new Date(+r.from - 864e5); label = 'Вчера'; }
  else if (r.bars === 7) { from = new Date(+r.from - 7 * 864e5); label = 'Прошлая неделя'; }
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
  const peak = Math.max(...buckets, 1);

  const cats = byCategory(items);
  const prevCats = Object.fromEntries(byCategory(prevItems));
  const days = Math.max(1, Math.ceil((Math.min(Date.now(), +r.to) - +r.from) / 864e5));

  const slices = cats.slice(0, 5);
  const restSum = sum(items) - slices.reduce((a, [, v]) => a + v, 0);
  const pie = [...slices.map(([id, v]) => [CAT[id]?.name || id, v, catColor(id), id]), ...(restSum > 0 ? [['Прочее', restSum, '#55535e', null]] : [])];
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = pie.map(([, v, c], n) => {
    const len = (v / total) * C;
    const off = (acc / total) * C; acc += v;
    return `<circle class="arc" style="--i:${n}" cx="64" cy="64" r="${R}" stroke="${c}" stroke-width="18"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
  }).join('');

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="seg">${PERIODS.map(([id, name]) =>
          `<button class="${state.period === id ? 'on' : ''}" data-p="${id}">${name}</button>`).join('')}</div>
        <div class="month-total${inc ? ' plus' : ''}">${money(total)}</div>
        <div class="month-sub">${inc
          ? `${r.label} · ${items.length} ${plural(items.length, 'поступление', 'поступления', 'поступлений')}`
          : `${r.label} · ${money(Math.round(total / days))} в день ${deltaChip(total, prevTotal)}`}</div>
      </header>
      <div class="scroll">
        <div class="flow-card">
          <button class="flow${inc ? '' : ' on'}" data-k="out"><small>Расходы</small><b>${money(outSum)}</b></button>
          <button class="flow${inc ? ' on' : ''}" data-k="in"><small>Поступления</small><b class="plus">+${money(inSum)}</b></button>
          ${inSum || outSum ? `<div class="flow-diff">
            <span class="flow-bar"><i style="width:${pct(outSum, Math.max(outSum, inSum))}%"></i><i class="in" style="width:${pct(inSum, Math.max(outSum, inSum))}%"></i></span>
            <span>Разница за период</span><b class="${diff >= 0 ? 'plus' : 'minus'}">${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</b>
          </div>` : ''}
        </div>
        <div class="card chart">
          <div class="bar-tip" id="tip"></div>
          <div class="bars${inc ? ' income' : ''}" style="--n:${r.bars}">
            ${buckets.map((v, i) => `
              <div class="bar-col" title="${money(v)}">
                <div class="bar" style="height:${Math.max(v ? 4 : 0, (v / peak) * 100)}%;--i:${i}"></div>
                <span>${barLabel(i, r)}</span>
              </div>`).join('')}
          </div>
        </div>

        ${total ? `
        <div class="section-label">${inc ? 'Откуда поступления' : 'Структура трат'}</div>
        <div class="card">
          <div class="donut-wrap">
            <div class="donut">
              <svg viewBox="0 0 128 128" style="--c:${C.toFixed(2)}">${arcs}</svg>
              <div class="donut-mid"><b>${moneyShort(total)} ₽</b><small>${items.length} ${inc ? plural(items.length, 'поступление', 'поступления', 'поступлений') : plural(items.length, 'трата', 'траты', 'трат')}</small></div>
            </div>
            <div class="legend">
              ${pie.map(([name, v, c, id]) => id
                ? `<button data-cat="${id}"><i style="background:${c}"></i><span>${esc(name)}</span><b>${Math.round((v / total) * 100)}%</b></button>`
                : `<div><i style="background:${c}"></i><span>${esc(name)}</span><b>${Math.round((v / total) * 100)}%</b></div>`).join('')}
            </div>
          </div>
        </div>

        ${inc ? '' : `<div class="section-label">Что заметно</div>
        <div class="tips">${tips(items, cats, prevCats, total, prevTotal, r, days).map((t, n) =>
          `<div class="tip" style="--i:${n}"><span class="tip-ico">${t[0]}</span><p>${t[1]}</p></div>`).join('')}</div>`}

        <div class="section-label">По категориям</div>
        <div class="card">
          ${cats.map(([id, v]) => {
            const pv = prevCats[id] || 0;
            const d = pv ? Math.round(((v - pv) / pv) * 100) : null;
            return `<button class="cat-row" data-cat="${id}" style="--i:${cats.findIndex(([c]) => c === id)}">
              <span class="tr-ico">${catIcon(id)}</span>
              <span class="cat-info">
                <span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
                <span class="meter"><i style="width:${pct(v, total)}%;background:${catColor(id)}"></i></span>
              </span>
              <span class="cat-pct">${d === null ? `${Math.round((v / total) * 100)}%` : `${d > 0 ? '+' : ''}${d}%`}</span>
              <span class="chev sm">${icons.right}</span>
            </button>`;
          }).join('')}
        </div>` : `<div class="empty">${inc ? 'За этот период поступлений нет' : 'За этот период трат нет'}</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.month-total'), total);
  scrubBars(buckets, r);
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

function deltaChip(now, before) {
  if (!before) return '';
  const d = Math.round(((now - before) / before) * 100);
  if (!d) return '<span class="delta">как раньше</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '↑' : '↓'} ${Math.abs(d)}%</span>`;
}

function tips(items, cats, prevCats, total, prevTotal, r, days) {
  const out = [];
  if (!items.length) return out;

  const grown = cats
    .map(([id, v]) => [id, v, prevCats[id] || 0])
    .filter(([, v, pv]) => pv > 0 && v > pv * 1.25 && v - pv >= 30000)
    .sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]))[0];
  if (grown) {
    out.push(['📈', `На категорию <b>${esc(CAT[grown[0]]?.name || grown[0])}</b> ушло на <b>${money(grown[1] - grown[2])}</b> больше, чем в прошлый период. Это главный источник роста трат.`]);
  }

  const saved = cats
    .map(([id, v]) => [id, v, prevCats[id] || 0])
    .filter(([, v, pv]) => pv > v * 1.25 && pv - v >= 30000)
    .sort((a, b) => (b[2] - b[1]) - (a[2] - a[1]))[0];
  if (saved) {
    out.push(['👏', `На категории <b>${esc(CAT[saved[0]]?.name || saved[0])}</b> вы сэкономили <b>${money(saved[2] - saved[1])}</b> по сравнению с прошлым периодом.`]);
  }

  const [topId, topV] = cats[0];
  const share = Math.round((topV / total) * 100);
  if (share >= 30) {
    out.push(['🎯', `<b>${esc(CAT[topId]?.name || topId)}</b> забирает <b>${share}%</b> всех трат. Сократив эту категорию на 10%, вы сбережёте <b>${money(Math.round(topV * 0.1))}</b> за период.`]);
  }

  const small = items.filter((i) => i.amount <= 50000);
  if (small.length >= 8) {
    out.push(['☕', `<b>${small.length}</b> мелких покупок до 500 ₽ сложились в <b>${money(sum(small))}</b> — это ${Math.round((sum(small) / total) * 100)}% всех трат за период.`]);
  }

  const byDay = new Map();
  items.forEach((i) => { const k = dayKey(i.ts); byDay.set(k, (byDay.get(k) || 0) + i.amount); });
  const worst = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worst && byDay.size > 2) {
    const d = new Date(items.find((i) => dayKey(i.ts) === worst[0]).ts);
    out.push(['📅', `Самый дорогой день — <b>${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</b>: <b>${money(worst[1])}</b>.`]);
    const free = days - byDay.size;
    if (free > 0) out.push(['🧘', `<b>${free}</b> ${plural(free, 'день', 'дня', 'дней')} без единой траты из ${days}. Так держать.`]);
  }

  if (state.period === 'month') {
    const inMonth = new Date(r.to - 1).getDate();
    const forecast = Math.round((total / days) * inMonth / 100) * 100;
    out.push(['🔮', `При таком темпе за месяц выйдет около <b>${money(forecast)}</b>${prevTotal ? `, за те же ${days} ${plural(days, 'день', 'дня', 'дней')} прошлого месяца было ${money(prevTotal)}` : ''}.`]);
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
    const k = i.note || 'Без описания';
    merchants.set(k, (merchants.get(k) || 0) + i.amount);
  });
  const top = [...merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="topbar">
          <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
          <div class="pill">${r.label}</div>
          <div style="width:40px"></div>
        </div>
        <div class="cat-hero">
          <span class="tr-ico lg">${catIcon(id)}</span>
          <div>
            <div class="month-total sm">${money(total)}</div>
            <div class="month-sub">${esc(CAT[id]?.name || id)} · ${Math.round((total / (periodTotal || 1)) * 100)}% ${CAT[id]?.kind === 'in' ? 'поступлений' : 'трат'} периода</div>
          </div>
        </div>
      </header>
      <div class="scroll">
        ${top.length > 1 ? `<div class="section-label">Куда уходит</div>
        <div class="card">
          ${top.map(([name, v]) => `<div class="cat-row">
            <span class="cat-info"><span class="cat-top">${esc(name)}<b>${money(v)}</b></span>
            <span class="meter"><i style="width:${pct(v, total)}%;background:${catColor(id)}"></i></span></span>
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
          }).join('') || '<div class="empty sm">Операций нет</div>'}
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
const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

export function renderInfo() {
  const i = state.info;
  const d = new Date(i.ts);
  const close = () => { state.info = null; render(); };

  app.innerHTML = `
    <section class="screen sheet-screen">
      <div class="glow-top"></div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <div class="pill">${isIncome(i) ? 'Пополнение' : 'Трата'}</div>
        <div style="width:40px"></div>
      </div>
      <div class="info-hero">
        <span class="tr-ico xl">${catIcon(i.category)}</span>
        <div class="info-amount${isIncome(i) ? ' plus' : ''}">${isIncome(i) ? '+' : ''}${money(i.amount)}</div>
        <div class="month-sub">${esc(CAT[i.category]?.name || i.category)}</div>
      </div>
      <div class="cats">
        <div class="card rows">
          <div class="row"><span>Дата</span><span class="row-extra">${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${WD_FULL[d.getDay()]}</span></div>
          <div class="row"><span>Время</span><span class="row-extra">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span></div>
          ${i.note ? `<div class="row"><span>Описание</span><span class="row-extra">${esc(i.note)}</span></div>` : ''}
          <div class="row"><span>Источник</span><span class="row-extra">${i.id.startsWith('imp') ? 'Выписка банка' : 'Добавлено вручную'}</span></div>
        </div>
      </div>
      <div class="bottom">
        <div class="dep-actions">
          <button class="btn alt" id="repeat">Повторить</button>
          <button class="btn alt" id="edit">Изменить</button>
        </div>
        <button class="btn ghost danger" id="del">Удалить операцию</button>
      </div>
    </section>`;

  app.querySelector('#back').onclick = close;
  app.querySelector('#edit').onclick = () => openEdit(i);
  app.querySelector('#repeat').onclick = () => { haptic(); openRepeat(i); };
  app.querySelector('#del').onclick = async () => {
    if (!(await ask('Удалить операцию?', `${money(i.amount)} · ${CAT[i.category]?.name || ''}`))) return;
    state.info = null;
    await store.removeExpense(i.id);
    render();
    toast('Операция удалена');
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

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="profile-head">
        <button class="ava-wrap" id="pick-ava" aria-label="Сменить фото">
          ${avatarHTML('lg')}
          <span class="ava-edit">${icons.camera}</span>
        </button>
        <div class="profile-name">${esc(acc.login)}</div>
        <div class="month-sub">${spent(all).length} ${plural(spent(all).length, 'трата', 'траты', 'трат')} · ${money(sum(spent(all)))}</div>
        <div class="skins">${SKINS.map((_, n) =>
          `<button class="skin${avatarSkin() === n ? ' on' : ''}" data-skin="${n}" style="${skinStyle(n)}" aria-label="Цвет ${n + 1}"></button>`).join('')}</div>
      </header>
      <div class="scroll">
        <div class="section-label">Настройки</div>
        <div class="card rows">
          ${item('cats', icons.tag, 'Свои категории', String(customCategories().length))}
          ${item('kitty', icons.paw, 'Котик', kittyOn() ? COATS[kittyCoat()].name : 'Выкл')}
          ${kittyOn() ? `<div class="coats">${Object.entries(COATS).map(([k, c]) =>
            `<button class="coat${kittyCoat() === k ? ' on' : ''}" data-coat="${k}" style="--fur:${c.fur};--shade:${c.shade}"><i></i><span>${c.name}</span></button>`).join('')}</div>` : ''}
        </div>
        <div class="section-label">Данные</div>
        <div class="card rows">
          ${item('statement', icons.bank, 'Импорт выписки банка', 'PDF, CSV')}
          ${item('backup', icons.down_file, 'Резервная копия', lastBackupLabel())}
          ${item('import', icons.up_file, 'Восстановить из копии', 'JSON, XLSX')}
          ${item('export', icons.chart, 'Отчёт в Excel')}
        </div>
        ${imported ? `<div class="card rows">${item('clear-imported', icons.trash, 'Удалить импортированные', String(imported))}</div>` : ''}
        <div class="card rows">
          ${item('wipe', icons.trash, 'Сбросить все данные')}
        </div>
        <div class="version">NOTA ${BUILD} · данные хранятся на этом устройстве</div>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#pick-ava').onclick = pickAvatar;
  app.querySelector('.skins').onclick = (e) => {
    const n = e.target.closest('[data-skin]')?.dataset.skin;
    if (n === undefined) return;
    haptic();
    localStorage.setItem('avatarSkin', n);
    localStorage.removeItem('avatar');
    applySkin(Number(n));
    render();
  };
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const coat = e.target.closest('[data-coat]')?.dataset.coat;
    if (coat) { haptic(); setCoat(coat); return render(); }
    const a = e.target.closest('.row')?.dataset.a;
    if (!a) return;
    if (a === 'kitty') { setKitty(!kittyOn()); haptic(); return render(); }
    if (a === 'cats') { state.flow = 'cats'; return render(); }
    if (a === 'statement') return pickStatement();
    if (a === 'export') return exportData();
    if (a === 'backup') return downloadBackup().then(render);
    if (a === 'import') return importData();
    if (a === 'clear-imported') {
      return ask(`Удалить ${imported} ${plural(imported, 'трату', 'траты', 'трат')}?`, 'Это траты из выписок. Внесённые вручную останутся.')
        .then(async (yes) => { if (yes) { toast(`Удалено трат: ${await store.removeImported()}`); render(); } });
    }
    if (a === 'wipe') return wipeAll();
  });
}

async function pickAvatar() {
  if (localStorage.getItem('avatar')) {
    if (await ask('Убрать фото?', 'Вернётся градиентный аватар.', 'Убрать')) {
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
      toast('Не удалось открыть изображение');
    }
  };
  input.click();
}

export function renderCustomCats() {
  const list = customCategories();
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="topbar">
          <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
          <div class="pill">Свои категории</div>
          <div style="width:40px"></div>
        </div>
      </header>
      <div class="scroll">
        ${list.length ? `<div class="card rows">${list.map((c) => `
          <div class="row" data-edit="${c.id}"><span class="tr-ico">${catIcon(c.id)}</span><span>${esc(c.name)}<small class="row-sub">${c.kind === 'in' ? 'Пополнение' : 'Расход'}</small></span>
            <button class="icon-btn sm" data-edit="${c.id}" aria-label="Изменить">${icons.edit}</button>
            <button class="icon-btn sm" data-del="${c.id}" aria-label="Удалить">${icons.trash}</button></div>`).join('')}</div>`
          : '<div class="empty">Своих категорий пока нет.<br>Их можно добавить при создании траты.</div>'}
      </div>
      ${tabbar()}
    </section>`;
  bindTabs();
  app.querySelector('#back').onclick = () => { state.flow = null; render(); };
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    const edit = !id && e.target.closest('[data-edit]')?.dataset.edit;
    if (edit) {
      const c = list.find((x) => x.id === edit);
      haptic();
      state.draft = { id: c.id, name: c.name, icon: c.icon || 'star', color: CAT[c.id]?.color, kind: c.kind || 'out', from: 'cats' };
      state.flow = 'newcat';
      return render();
    }
    if (!id) return;
    const cat = list.find((x) => x.id === id);
    const to = cat.kind === 'in' ? 'in_other' : 'other';
    ask(`Удалить «${cat.name}»?`, 'Операции из неё перейдут в «Другое», лимит категории будет снят.').then(async (yes) => {
      if (!yes) return;
      const n = await store.recategorize(id, to);
      const b = budgets();
      if (b[id]) { delete b[id]; saveBudgets(b); }
      removeCategory(id);
      render();
      toast(n ? `Категория удалена, ${n} ${plural(n, 'операция перенесена', 'операции перенесены', 'операций перенесено')} в «Другое»` : 'Категория удалена');
    });
  });
}

/* ---------- резервная копия ---------- */
function lastBackupLabel() {
  const t = Number(localStorage.getItem('lastBackup'));
  if (!t) return 'ещё нет';
  const d = new Date(t);
  return new Date().toDateString() === d.toDateString() ? 'сегодня' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
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
  toast(`Копия сохранена: ${data.transactions.length} ${plural(data.transactions.length, 'операция', 'операции', 'операций')}`);
}

const importSummary = (r) => [
  `Добавлено ${r.added}`,
  r.updated && `обновлено ${r.updated}`,
  r.unchanged && `уже были ${r.unchanged}`,
  r.skipped && `ваши правки сохранены: ${r.skipped}`,
  r.invalid && `отброшено ${r.invalid}`,
].filter(Boolean).join(' · ');

async function wipeAll() {
  const fresh = Date.now() - Number(localStorage.getItem('lastBackup') || 0) < 10 * 6e4;
  if (!fresh) {
    const want = await dialog({ title: 'Сначала сохранить копию?', text: 'Данные хранятся только на этом устройстве. После сброса их не вернуть без копии.', ok: 'Скачать копию', cancel: 'Без копии' });
    if (want === null) return;
    if (want) await downloadBackup();
  }
  if (!(await ask('Сбросить все данные?', 'Имя, настройки, категории, лимиты, вклады и все операции на этом устройстве будут удалены.', 'Сбросить'))) return;
  try {
    await store.wipe();
  } catch (e) {
    return toast(e.message === 'blocked' ? 'NOTA открыта в другой вкладке — закройте её и повторите' : 'Не удалось удалить данные');
  }
  auth.reset();
  ['loggedIn', 'avatar', 'avatarSkin', 'customCats', 'budgets', 'deposits', 'lastBackup', 'kitty', 'kittyCoat'].forEach((k) => localStorage.removeItem(k));
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
      rows: [['Дата', 'Тип', 'Категория', 'Описание', 'Сумма, ₽', 'ID'],
        ...all.map((i) => [{ v: toSerial(i.ts), f: 'date' }, kind(i), CAT[i.category]?.name || i.category, i.note, rubles(i.amount), i.id])] },
    { name: 'Категории', cols: [22, 13, 11, 14],
      rows: [['Категория', 'Тип', 'Операций', 'Сумма, ₽'],
        ...[...byCat].sort((x, y) => y[1].sum - x[1].sum).map(([id, c]) => [CAT[id]?.name || id, c.kind, c.n, rubles(c.sum)])] },
    { name: 'Бюджет', cols: [22, 16, 16, 14],
      rows: [['Категория', 'Лимит в месяц, ₽', `Потрачено (${MONTHS[now.getMonth()].toLowerCase()}), ₽`, 'Осталось, ₽'],
        ...Object.entries(b).filter(([id]) => CAT[id]).map(([id, v]) => [CAT[id].name, rubles(v), rubles(monthSpent[id] || 0), rubles(v - (monthSpent[id] || 0))])] },
    { name: 'Вклады', cols: [28, 14, 11, 16],
      rows: [['Название', 'Сумма, ₽', 'Ставка, %', 'Доход в месяц, ₽'],
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
      if (!state.imp.items.length) state.imp.error = 'В файлах не нашлось операций списания';
    } catch {
      state.imp.loading = false;
      state.imp.error = 'Не удалось разобрать файл. Подойдёт PDF «Справка о движении средств» или CSV-выписка.';
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
      <div class="glow-top"></div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <div class="pill">${esc(imp.name)}</div>
        <div style="width:40px"></div>
      </div>
      ${imp.loading ? '<div class="spinner"></div><div class="empty">Читаем выписку…</div>' : imp.error ? `<div class="empty">${esc(imp.error)}</div>` : `
      <div class="imp-head">
        <h2 class="cat-title">Найдено ${items.length} ${plural(items.length, 'трата', 'траты', 'трат')}</h2>
        <div class="month-sub">${from ? `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} — ${to.getDate()} ${MONTHS_SHORT[to.getMonth()]}` : ''}${imp.extra > 0 ? ` · взяли первые 5 файлов` : ''}</div>
        <div class="imp-sum">
          <div><b>${money(sum(items))}</b><small>Сумма</small></div>
          <div><b>${cats.length}</b><small>Категорий</small></div>
        </div>
      </div>
      <div class="cats">
        ${ext.length ? `<div class="switch-row" data-sw="external"><span>Переводы людям<small>${ext.length} · ${money(sum(ext))}</small></span><span class="sw${imp.external ? ' on' : ''}"></span></div>` : ''}
        ${twins.size ? `<div class="switch-row" data-sw="manual"><span>Похожи на внесённые вручную<small>${twins.size} · та же сумма в тот же день — по умолчанию не добавляются</small></span><span class="sw${imp.manual ? ' on' : ''}"></span></div>` : ''}
        ${int.length ? `<div class="switch-row" data-sw="internal"><span>Между своими счетами<small>${int.length} · ${money(sum(int))}</small></span><span class="sw${imp.internal ? ' on' : ''}"></span></div>` : ''}
        <div class="section-label">Распределение</div>
        <div class="card">
          ${cats.map(([id, v]) => `<div class="cat-row">
            <span class="tr-ico">${catIcon(id)}</span>
            <span class="cat-info"><span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
            <span class="meter"><i style="width:${pct(v, sum(items))}%"></i></span></span>
          </div>`).join('')}
        </div>
        <div class="section-label">Операции</div>
        <div class="card">
          ${(imp.expanded ? items : items.slice(0, 10)).map((i) => {
            const d = new Date(i.ts);
            return `<div class="res">
              <span class="tr-ico">${catIcon(i.category)}</span>
              <span class="tr-name">${esc(i.note || CAT[i.category]?.name || '')}<small>${CAT[i.category]?.name} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</small></span>
              <span class="tr-sum">${money(i.amount)}</span>
            </div>`;
          }).join('')}
          ${items.length > 10 ? `<button class="more" id="more">${imp.expanded ? 'Свернуть' : `Ещё ${items.length - 10} ${plural(items.length - 10, 'операция', 'операции', 'операций')}`}<span class="chev${imp.expanded ? ' up' : ''}">${icons.down}</span></button>` : ''}
        </div>
      </div>
      <div class="bottom">
        ${known.size ? `<div class="imp-note">Уже в приложении: ${items.filter(isKnown).length} — повторно не добавятся</div>` : ''}
        <button class="btn" id="add" ${fresh ? '' : 'disabled'}>${fresh ? `Добавить ${fresh} ${plural(fresh, 'новую', 'новые', 'новых')}` : 'Новых операций нет'}</button>
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
    render();
    toast(importSummary(res));
  });
}

const MAX_FILE = 20 * 1024 * 1024;

function importData() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,.xlsx' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_FILE) return toast('Файл больше 20 МБ');
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const book = await readXlsx(await file.arrayBuffer());
        const n = Math.max(0, (book['Операции'] || []).length - 1);
        if (!(await dialog({ title: 'Загрузить из Excel?', text: `В файле ${n} ${plural(n, 'строка', 'строки', 'строк')} операций. Текущие данные не удаляются, повторы не дублируются.`, ok: 'Загрузить' }))) return;
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
      const text = `${d && !Number.isNaN(+d) ? `Копия от ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}: ` : 'В копии: '}${what}.`
        + `${check.dropped ? ` Повреждённых записей: ${check.dropped} — они будут пропущены.` : ''} Текущие данные не удаляются.`;
      if (!(await dialog({ title: 'Восстановить копию?', text, ok: 'Восстановить' }))) return;
      const res = await restoreBackup(check);
      applySkin();
      render();
      toast(importSummary(res));
    } catch {
      toast('Не удалось прочитать файл');
    }
  };
  input.click();
}

/* ---------- бюджет ---------- */
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const budgets = () => readJSON('budgets', {});
const saveBudgets = (b) => localStorage.setItem('budgets', JSON.stringify(b));
const toKop = (v) => Math.round(parseFloat(String(v).replace(/\s/g, '').replace(',', '.')) * 100);
const rub = (kop) => String(Math.round(kop / 100));

export async function renderBudget() {
  const live = ticket();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const items = spent(await store.expensesBetween(from.getTime(), to.getTime() - 1));
  const bySpent = Object.fromEntries(byCategory(items));
  const b = budgets();
  const limited = CATEGORIES.filter(([id]) => b[id] > 0);
  const free = CATEGORIES.filter(([id]) => !(b[id] > 0)).sort(([x], [y]) => (bySpent[y] || 0) - (bySpent[x] || 0));
  const limit = limited.reduce((a, [id]) => a + b[id], 0);
  const used = limited.reduce((a, [id]) => a + (bySpent[id] || 0), 0);
  const left = limit - used;
  const daysLeft = Math.max(1, Math.ceil((to - now) / 864e5));

  if (!live()) return;
  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="page-title">Бюджет · ${MONTHS[now.getMonth()]}</div>
        ${limit ? `
          <div class="month-total${left < 0 ? ' over' : ''}">${money(Math.abs(left))}</div>
          <div class="month-sub">${left < 0 ? 'Перерасход' : `Осталось · ≈ ${money(Math.floor(left / daysLeft / 100) * 100)} в день`} · потрачено ${money(used)} из ${money(limit)}</div>
          <div class="meter big"><i style="width:${Math.min(100, pct(used, limit))}%"${left < 0 ? ' class="over"' : ''}></i></div>`
        : `<div class="month-total">${money(sum(items))}</div>
          <div class="month-sub">Потрачено в этом месяце · задайте лимит категории</div>`}
      </header>
      <div class="scroll">
        ${limited.length ? `<div class="section-label">Лимиты на месяц</div>
        <div class="card">${limited.map(([id, name], n) => {
          const v = bySpent[id] || 0;
          const rest = b[id] - v;
          return `<button class="cat-row" data-b="${id}" style="--i:${n}">
            <span class="tr-ico">${catIcon(id)}</span>
            <span class="cat-info">
              <span class="cat-top">${esc(name)}<b>${moneyShort(v)} / ${moneyShort(b[id])} ₽</b></span>
              <span class="meter"><i style="width:${Math.min(100, pct(v, b[id]))}%;background:${rest < 0 ? 'var(--danger)' : catColor(id)}"></i></span>
              <small class="budget-left${rest < 0 ? ' over' : ''}">${rest < 0 ? `Перерасход ${money(-rest)}` : `Осталось ${money(rest)}`}</small>
            </span>
          </button>`;
        }).join('')}</div>` : ''}
        <div class="section-label">${limited.length ? 'Без лимита' : 'Категории'}</div>
        <div class="card rows">${free.map(([id, name]) => `
          <button class="row" data-b="${id}"><span class="tr-ico">${catIcon(id)}</span><span>${esc(name)}</span>
            <span class="row-extra">${bySpent[id] ? money(bySpent[id]) : ''}</span>${icons.plus}</button>`).join('')}
        </div>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.month-total'), limit ? Math.abs(left) : sum(items));
  app.querySelector('.scroll').addEventListener('click', async (e) => {
    const id = e.target.closest('[data-b]')?.dataset.b;
    if (!id) return;
    haptic();
    const val = await askText(`Лимит: ${CAT[id].name}`, { mode: 'decimal', placeholder: 'Сумма в месяц, ₽', value: b[id] ? rub(b[id]) : '' });
    if (val === null) return;
    const next = budgets();
    const kop = toKop(val);
    if (kop > 0) next[id] = kop; else delete next[id];
    saveBudgets(next);
    render();
    toast(kop > 0 ? `Лимит ${money(kop)} в месяц` : 'Лимит убран');
  });
}

/* ---------- вклады ---------- */
const deposits = () => readJSON('deposits', []);
const saveDeposits = (list) => localStorage.setItem('deposits', JSON.stringify(list));
const monthly = (d) => Math.round((d.amount * (d.rate || 0)) / 100 / 12);
const depIcon = (d, n) => {
  const c = ['#66d9a6', '#6ad1ff', '#ffd84d', '#b38cff', '#ff9f5a', '#ff8ac2'][n % 6];
  return `<span class="tr-ico"><i class="cbg" style="background:${c}"></i>${icons.safe.replace('<svg', `<svg class="ci" style="color:${c}"`)}</span>`;
};

export function renderDeposits() {
  const list = deposits();
  const total = list.reduce((a, d) => a + d.amount, 0);
  const income = list.reduce((a, d) => a + monthly(d), 0);

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="page-title">Вклады</div>
        <div class="month-total">${money(total)}</div>
        <div class="month-sub">${list.length
          ? `${list.length} ${plural(list.length, 'вклад', 'вклада', 'вкладов')}${income ? ` · <span class="plus">≈ +${money(income)} в месяц</span>` : ''}`
          : 'Добавьте вклад или накопительный счёт'}</div>
      </header>
      <div class="scroll">
        ${list.length ? `<div class="card">${list.map((d, n) => `
          <button class="res" data-id="${d.id}">
            ${depIcon(d, n)}
            <span class="tr-name">${esc(d.name)}<small>${d.rate ? `${String(d.rate).replace('.', ',')}% годовых · +${money(monthly(d))}/мес` : 'Без процентов'}</small></span>
            <span class="tr-sum">${money(d.amount)}</span>
          </button>`).join('')}</div>` : ''}
        ${income ? '<div class="imp-note dep-note">Доход — примерная оценка: сумма × ставка ÷ 12, без капитализации и налогов</div>' : ''}
        <button class="btn alt add-dep" id="add">${icons.plus} Добавить вклад</button>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  countUp(app.querySelector('.month-total'), total);
  const open = (dep) => { haptic(); state.dep = dep; state.flow = 'deposit'; render(); };
  app.querySelector('#add').onclick = () => open({ name: '', amount: 0, rate: '' });
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (id) open({ ...list.find((d) => d.id === id) });
  });
}

export function renderDeposit() {
  const d = state.dep;
  const close = () => { state.flow = null; state.dep = null; render(); };
  app.innerHTML = `
    <section class="screen">
      <div class="glow-top"></div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <div class="pill">${d.id ? 'Вклад' : 'Новый вклад'}</div>
        <div style="width:40px"></div>
      </div>
      <div class="cats dep-form">
        ${d.id ? `<div class="info-hero"><div class="info-amount">${money(d.amount)}</div>
          <div class="month-sub">${d.rate ? `≈ +${money(monthly(d))} в месяц, примерно` : 'Без процентов'}</div></div>
          <div class="dep-actions">
            <button class="btn alt" id="topup">${icons.plus} Пополнить</button>
            <button class="btn alt" id="take">Снять</button>
          </div>` : ''}
        <label class="lbl">Название</label>
        <input class="field" id="dname" placeholder="Например, Накопительный Т-Банк" maxlength="40" value="${esc(d.name)}">
        <label class="lbl">Сумма, ₽</label>
        <input class="field" id="damount" inputmode="decimal" placeholder="0" value="${d.amount ? rub(d.amount) : ''}">
        <label class="lbl">Ставка, % годовых</label>
        <input class="field" id="drate" inputmode="decimal" placeholder="Необязательно" value="${d.rate ? String(d.rate).replace('.', ',') : ''}">
      </div>
      <div class="bottom">
        <button class="btn" id="save">${d.id ? 'Сохранить' : 'Добавить вклад'}</button>
        ${d.id ? '<button class="btn ghost danger" id="del">Удалить вклад</button>' : ''}
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
    rate: Math.max(0, parseFloat(app.querySelector('#drate').value.replace(',', '.')) || 0),
  });
  app.querySelector('#back').onclick = close;
  app.querySelector('#save').onclick = () => {
    const dep = read();
    if (!dep.name) return toast('Введите название');
    persist({ ...dep, id: dep.id || `d${Date.now().toString(36)}` });
    haptic();
    close();
    toast(d.id ? 'Вклад сохранён' : 'Вклад добавлен');
  };
  const move = async (sign) => {
    const val = await askText(sign > 0 ? 'Пополнить вклад' : 'Снять со вклада', { mode: 'decimal', placeholder: 'Сумма, ₽' });
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
    if (!(await ask('Удалить вклад?', d.name))) return;
    saveDeposits(deposits().filter((x) => x.id !== d.id));
    close();
    toast('Вклад удалён');
  });
}
