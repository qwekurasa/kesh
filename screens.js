import * as store from './store.js';
import * as auth from './auth.js';
import {
  CAT, app, state, money, moneyShort, esc, haptic, icons,
  render, toast, tabbar, bindTabs, avatarHTML,
} from './ui.js';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const sum = (items) => items.reduce((a, i) => a + i.amount, 0);

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
  const from = state.month.getTime();
  const next = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
  const items = await store.expensesBetween(from, next.getTime() - 1);
  const days = groupByDay(items);
  const total = sum(items);
  const isCurrent = next > new Date();

  const row = (i) => `
    <div class="tr" data-id="${i.id}">
      <span class="tr-ico">${CAT[i.category]?.emoji || '📦'}</span>
      <span class="tr-name">${esc(CAT[i.category]?.name || i.category)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</span>
      <span class="tr-sum">${money(i.amount)}</span>
    </div>`;

  const day = (d) => {
    const date = new Date(d.ts);
    const open = !state.collapsed.has(d.key);
    return `
      <section class="day${open ? ' open' : ''}" data-key="${d.key}">
        <button class="day-head">
          <span class="day-date"><b>${date.getDate()}</b><small>${WEEKDAYS[date.getDay()]}</small></span>
          <span class="day-meta"><b>${money(sum(d.items))}</b><small>${d.items.length} ${plural(d.items.length, 'трата', 'траты', 'трат')}</small></span>
          <span class="chev">${icons.down}</span>
        </button>
        <div class="day-items">${d.items.map(row).join('')}</div>
      </section>`;
  };

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="month-nav">
          <button class="icon-btn sm" id="prev" aria-label="Предыдущий месяц">${icons.left}</button>
          <span class="month-name">${MONTHS[state.month.getMonth()]}${state.month.getFullYear() !== new Date().getFullYear() ? ` ${state.month.getFullYear()}` : ''}</span>
          <button class="icon-btn sm" id="next" aria-label="Следующий месяц" ${isCurrent ? 'disabled' : ''}>${icons.right}</button>
        </div>
        <div class="month-total">${money(total)}</div>
        <div class="month-sub">${items.length ? `${days.length} ${plural(days.length, 'день', 'дня', 'дней')} с тратами` : 'Трат пока нет'}</div>
      </header>
      <div class="scroll" id="list">
        ${days.length ? days.map(day).join('') : `<div class="empty">Нажмите <b>＋</b>, чтобы добавить первую трату</div>`}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
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
    if (tr && confirm('Удалить эту трату?')) store.removeExpense(tr.dataset.id).then(() => toast('Трата удалена'));
  });
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
  const r = periodRange(state.period);
  const elapsed = Math.min(Date.now(), +r.to) - +r.from;
  const prev = prevRange(r, elapsed);
  const [items, prevItems] = await Promise.all([
    store.expensesBetween(r.from.getTime(), r.to.getTime() - 1),
    store.expensesBetween(prev.from.getTime(), prev.to.getTime() - 1),
  ]);
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
  const pie = [...slices.map(([id, v], n) => [CAT[id]?.name || id, v, SHADES[n]]), ...(restSum > 0 ? [['Прочее', restSum, SHADES[5]]] : [])];
  let acc = 0;
  const stops = pie.map(([, v, c]) => {
    const from = (acc / total) * 100; acc += v;
    return `${c} ${from.toFixed(2)}% ${((acc / total) * 100).toFixed(2)}%`;
  }).join(',');

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="seg">${PERIODS.map(([id, name]) =>
          `<button class="${state.period === id ? 'on' : ''}" data-p="${id}">${name}</button>`).join('')}</div>
        <div class="month-total">${money(total)}</div>
        <div class="month-sub">${r.label} · ${money(Math.round(total / days))} в день ${deltaChip(total, prevTotal)}</div>
      </header>
      <div class="scroll">
        <div class="card chart">
          <div class="bars" style="--n:${r.bars}">
            ${buckets.map((v, i) => `
              <div class="bar-col" title="${money(v)}">
                <div class="bar" style="height:${Math.max(v ? 4 : 0, (v / peak) * 100)}%"></div>
                <span>${barLabel(i, r)}</span>
              </div>`).join('')}
          </div>
        </div>

        ${total ? `
        <div class="section-label">Структура трат</div>
        <div class="card">
          <div class="donut-wrap">
            <div class="donut" style="background:conic-gradient(${stops})">
              <div class="donut-mid"><b>${moneyShort(total)} ₽</b><small>${items.length} ${plural(items.length, 'трата', 'траты', 'трат')}</small></div>
            </div>
            <div class="legend">
              ${pie.map(([name, v, c]) => `<div><i style="background:${c}"></i><span>${esc(name)}</span><b>${Math.round((v / total) * 100)}%</b></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="section-label">${prev.label} и сейчас${prev.clipped ? ` · за те же ${days} ${plural(days, 'день', 'дня', 'дней')}` : ''}</div>
        <div class="card compare">
          <div class="cmp-row"><span>${r.label}</span><div class="cmp-bar"><i style="width:${pct(total, Math.max(total, prevTotal))}%"></i></div><b>${money(total)}</b></div>
          <div class="cmp-row prev"><span>${prev.label}</span><div class="cmp-bar"><i style="width:${pct(prevTotal, Math.max(total, prevTotal))}%"></i></div><b>${money(prevTotal)}</b></div>
        </div>

        <div class="section-label">Что заметно</div>
        <div class="tips">${tips(items, cats, prevCats, total, prevTotal, r, days).map((t) =>
          `<div class="tip"><span class="tip-ico">${t[0]}</span><p>${t[1]}</p></div>`).join('')}</div>

        <div class="section-label">По категориям</div>
        <div class="card">
          ${cats.map(([id, v]) => {
            const pv = prevCats[id] || 0;
            const d = pv ? Math.round(((v - pv) / pv) * 100) : null;
            return `<div class="cat-row">
              <span class="tr-ico">${CAT[id]?.emoji || '📦'}</span>
              <span class="cat-info">
                <span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
                <span class="meter"><i style="width:${pct(v, total)}%"></i></span>
              </span>
              <span class="cat-pct">${d === null ? `${Math.round((v / total) * 100)}%` : `${d > 0 ? '+' : ''}${d}%`}</span>
            </div>`;
          }).join('')}
        </div>` : '<div class="empty">За этот период трат нет</div>'}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('.seg').onclick = (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    state.period = b.dataset.p;
    haptic();
    render();
  };
}

const SHADES = ['#eceaf2', '#c6c3d1', '#a19eac', '#7d7a88', '#5c5966', '#403e49'];
const pct = (v, max) => (max ? Math.max(2, (v / max) * 100) : 0);

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

/* ---------- search ---------- */
export async function renderSearch() {
  const all = (await store.allExpenses()).sort((a, b) => b.ts - a.ts);
  const used = [...new Set(all.map((i) => i.category))];
  const q = state.query.trim().toLowerCase();
  const found = all.filter((i) =>
    (!state.filter || i.category === state.filter)
    && (!q || CAT[i.category]?.name.toLowerCase().includes(q) || i.note.toLowerCase().includes(q) || String(Math.round(i.amount / 100)).includes(q)));

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <label class="search-bar">
          ${icons.search}
          <input id="q" placeholder="Поиск по тратам" value="${esc(state.query)}" autocapitalize="none" spellcheck="false">
        </label>
        <div class="chips">
          <button class="chip${state.filter ? '' : ' on'}" data-c="">Все</button>
          ${used.map((id) => `<button class="chip${state.filter === id ? ' on' : ''}" data-c="${id}">${CAT[id]?.emoji || '📦'} ${esc(CAT[id]?.name || id)}</button>`).join('')}
        </div>
      </header>
      <div class="scroll">
        <div class="section-label">${found.length ? `Найдено: ${found.length} · ${money(sum(found))}` : 'Ничего не найдено'}</div>
        ${found.length ? `<div class="card">${found.slice(0, 200).map((i) => {
          const d = new Date(i.ts);
          return `<div class="res">
            <span class="tr-ico">${CAT[i.category]?.emoji || '📦'}</span>
            <span class="tr-name">${esc(CAT[i.category]?.name || i.category)}<small>${i.note ? `${esc(i.note)} · ` : ''}${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</small></span>
            <span class="tr-sum">${money(i.amount)}</span>
          </div>`;
        }).join('')}</div>` : '<div class="empty sm">Измените запрос или категорию</div>'}
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  const input = app.querySelector('#q');
  input.oninput = debounce(() => { state.query = input.value; render(); }, 220);
  app.querySelector('.chips').onclick = (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    state.filter = c.dataset.c || null;
    haptic();
    render();
  };
  if (document.activeElement !== input && state.query) {
    input.focus();
    input.setSelectionRange(state.query.length, state.query.length);
  }
}

let timer;
function debounce(fn, ms) {
  return (...a) => { clearTimeout(timer); timer = setTimeout(() => fn(...a), ms); };
}

/* ---------- profile ---------- */
export async function renderProfile() {
  const acc = auth.account();
  const all = await store.allExpenses();
  const faceId = await auth.faceIdAvailable();

  const item = (id, icon, label, extra = '') =>
    `<button class="row" data-a="${id}">${icon}<span>${label}</span><span class="row-extra">${extra}</span></button>`;

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="profile-head">
        <button class="ava-wrap" id="pick-ava" aria-label="Сменить аватар">
          ${avatarHTML('lg')}
          <span class="ava-edit">${icons.camera}</span>
        </button>
        <div class="profile-name">${esc(acc.login)}</div>
        <div class="month-sub">${all.length} ${plural(all.length, 'трата', 'траты', 'трат')} · ${money(sum(all))}</div>
      </header>
      <div class="scroll">
        <div class="section-label">Аккаунт</div>
        <div class="card rows">
          ${item('password', icons.lock, 'Сменить пароль')}
          ${faceId ? item('faceid', icons.face, 'Face ID', acc.credId ? 'Вкл' : 'Выкл') : ''}
        </div>
        <div class="section-label">Данные</div>
        <div class="card rows">
          ${item('statement', icons.bank, 'Импорт выписки банка', 'PDF, CSV')}
          ${item('export', icons.down_file, 'Экспорт копии')}
          ${item('import', icons.up_file, 'Импорт копии')}
        </div>
        <div class="card rows">
          ${item('logout', icons.out, 'Выйти')}
        </div>
        <div class="version">NOTA · данные хранятся на этом устройстве</div>
      </div>
      ${tabbar()}
    </section>`;

  bindTabs();
  app.querySelector('#pick-ava').onclick = pickAvatar;
  app.querySelector('.scroll').addEventListener('click', (e) => {
    const a = e.target.closest('.row')?.dataset.a;
    if (!a) return;
    if (a === 'password') return changePassword();
    if (a === 'faceid') return toggleFaceId(acc);
    if (a === 'statement') return pickStatement();
    if (a === 'export') return exportData();
    if (a === 'import') return importData();
    if (a === 'logout') {
      state.unlocked = false;
      localStorage.removeItem('loggedIn');
      render();
    }
  });
}

function pickAvatar() {
  if (localStorage.getItem('avatar') && confirm('Убрать текущий аватар?')) {
    localStorage.removeItem('avatar');
    return render();
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

async function changePassword() {
  const current = prompt('Текущий пароль');
  if (current === null) return;
  const next = prompt('Новый пароль (минимум 4 символа)');
  if (next === null) return;
  if (next.length < 4) return toast('Пароль: минимум 4 символа');
  if (next !== prompt('Повторите новый пароль')) return toast('Пароли не совпадают');
  toast((await auth.changePassword(current, next)) ? 'Пароль изменён' : 'Текущий пароль неверный');
}

async function toggleFaceId(acc) {
  if (acc.credId) {
    auth.disableFaceId();
    toast('Face ID отключён');
    return render();
  }
  try {
    await auth.enableFaceId();
    toast('Face ID включён');
    render();
  } catch {
    toast('Не удалось включить Face ID');
  }
}

async function exportData() {
  const expenses = await store.allExpenses();
  const name = `nota-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify({ app: 'nota', version: 2, account: auth.account(), expenses })], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(() => {});
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- импорт выписки ---------- */
function pickStatement() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.pdf,.csv,application/pdf,text/csv' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    state.flow = 'import';
    state.imp = { loading: true, items: [], withTransfers: false, name: file.name };
    render();
    try {
      const { parseStatement } = await import('./statement.js');
      state.imp.items = await parseStatement(file);
      state.imp.loading = false;
      if (!state.imp.items.length) state.imp.error = 'В файле не нашлось операций списания';
    } catch (e) {
      state.imp.loading = false;
      state.imp.error = 'Не удалось разобрать файл. Подойдёт PDF «Справка о движении средств» или CSV-выписка.';
    }
    render();
  };
  input.click();
}

export async function renderImport() {
  const imp = state.imp;
  const items = imp.withTransfers ? imp.items : imp.items.filter((i) => i.category !== 'transfers');
  const cats = byCategory(items);
  const from = items.length ? new Date(Math.min(...items.map((i) => i.ts))) : null;
  const to = items.length ? new Date(Math.max(...items.map((i) => i.ts))) : null;
  const transfers = imp.items.filter((i) => i.category === 'transfers').length;

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
        <div class="month-sub">${from ? `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} — ${to.getDate()} ${MONTHS_SHORT[to.getMonth()]}` : ''}</div>
        <div class="imp-sum">
          <div><b>${money(sum(items))}</b><small>Сумма</small></div>
          <div><b>${cats.length}</b><small>Категорий</small></div>
        </div>
      </div>
      <div class="cats">
        ${transfers ? `<div class="switch-row" id="tr-toggle"><span>Включить переводы людям (${transfers})</span><span class="sw${imp.withTransfers ? ' on' : ''}"></span></div>` : ''}
        <div class="section-label">Распределение</div>
        <div class="card">
          ${cats.map(([id, v]) => `<div class="cat-row">
            <span class="tr-ico">${CAT[id]?.emoji || '📦'}</span>
            <span class="cat-info"><span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
            <span class="meter"><i style="width:${pct(v, sum(items))}%"></i></span></span>
          </div>`).join('')}
        </div>
        <div class="section-label">Операции</div>
        <div class="card">
          ${items.slice(0, 60).map((i) => {
            const d = new Date(i.ts);
            return `<div class="res">
              <span class="tr-ico">${CAT[i.category]?.emoji || '📦'}</span>
              <span class="tr-name">${esc(i.note || CAT[i.category]?.name || '')}<small>${CAT[i.category]?.name} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</small></span>
              <span class="tr-sum">${money(i.amount)}</span>
            </div>`;
          }).join('')}
          ${items.length > 60 ? `<div class="empty sm">…и ещё ${items.length - 60}</div>` : ''}
        </div>
      </div>
      <div class="bottom">
        <button class="btn" id="add" ${items.length ? '' : 'disabled'}>Добавить ${items.length} ${plural(items.length, 'трату', 'траты', 'трат')}</button>
      </div>`}
    </section>`;

  const close = () => { state.flow = null; state.imp = null; state.tab = 'profile'; render(); };
  app.querySelector('#back').onclick = close;
  app.querySelector('#tr-toggle')?.addEventListener('click', () => {
    imp.withTransfers = !imp.withTransfers;
    haptic();
    render();
  });
  app.querySelector('#add')?.addEventListener('click', async () => {
    const n = await store.importExpenses(items);
    state.flow = null; state.imp = null; state.tab = 'home';
    render();
    toast(`Добавлено трат: ${n}`);
  });
}

function importData() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      toast(`Импортировано трат: ${await store.importExpenses(data.expenses || data)}`);
    } catch {
      toast('Не удалось прочитать файл');
    }
  };
  input.click();
}
