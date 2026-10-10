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
  const items = await store.expensesBetween(r.from.getTime(), r.to.getTime() - 1);
  const total = sum(items);

  const buckets = Array(r.bars).fill(0);
  items.forEach((i) => { buckets[bucketOf(i.ts, r)] += i.amount; });
  const peak = Math.max(...buckets, 1);

  const byCat = new Map();
  items.forEach((i) => byCat.set(i.category, (byCat.get(i.category) || 0) + i.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  const days = Math.max(1, Math.ceil((Math.min(Date.now(), +r.to) - +r.from) / 864e5));

  app.innerHTML = `
    <section class="screen tabbed">
      <div class="glow-top"></div>
      <header class="month-head">
        <div class="seg">${PERIODS.map(([id, name]) =>
          `<button class="${state.period === id ? 'on' : ''}" data-p="${id}">${name}</button>`).join('')}</div>
        <div class="month-total">${money(total)}</div>
        <div class="month-sub">${r.label} · в среднем ${money(Math.round(total / days))} в день</div>
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
        <div class="section-label">По категориям</div>
        <div class="card">
          ${cats.length ? cats.map(([id, v]) => `
            <div class="cat-row">
              <span class="tr-ico">${CAT[id]?.emoji || '📦'}</span>
              <span class="cat-info">
                <span class="cat-top">${esc(CAT[id]?.name || id)}<b>${money(v)}</b></span>
                <span class="meter"><i style="width:${(v / total) * 100}%"></i></span>
              </span>
              <span class="cat-pct">${Math.round((v / total) * 100)}%</span>
            </div>`).join('') : '<div class="empty sm">За этот период трат нет</div>'}
        </div>
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
  const file = new File([JSON.stringify({ app: 'nota', version: 1, expenses })], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(() => {});
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
