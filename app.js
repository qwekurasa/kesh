import * as store from './store.js';
import * as auth from './auth.js';

const CATEGORIES = [
  ['groceries', 'Продукты', '🛒'], ['cafe', 'Кафе', '🍽️'], ['coffee', 'Кофе', '☕'], ['delivery', 'Доставка', '🥡'],
  ['transport', 'Транспорт', '🚇'], ['taxi', 'Такси', '🚕'], ['car', 'Авто', '⛽'], ['home', 'Дом и ЖКХ', '🏠'],
  ['mobile', 'Связь', '📱'], ['subs', 'Подписки', '🔁'], ['clothes', 'Одежда', '👕'], ['health', 'Здоровье', '💊'],
  ['beauty', 'Красота', '💅'], ['sport', 'Спорт', '🏋️'], ['fun', 'Развлечения', '🎬'], ['travel', 'Путешествия', '✈️'],
  ['education', 'Обучение', '📚'], ['gifts', 'Подарки', '🎁'], ['pets', 'Питомцы', '🐾'], ['kids', 'Дети', '🧸'],
  ['tech', 'Техника', '💻'], ['household', 'Хозтовары', '🧴'], ['transfers', 'Переводы', '💸'], ['other', 'Другое', '📦'],
];
const CAT = Object.fromEntries(CATEGORIES.map(([id, name, emoji]) => [id, { id, name, emoji }]));

const icons = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m17 9-5 5M12 9l5 5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
};

const app = document.getElementById('app');
const state = {
  screen: 'amount', amt: '', cat: null, note: '', usePassword: false,
  unlocked: !auth.account()?.credId && localStorage.getItem('loggedIn') === '1',
};

const money = (kop) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(kop / 100)} ₽`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const kopecks = () => Math.round(parseFloat(state.amt.replace(',', '.') || '0') * 100);
const haptic = () => navigator.vibrate?.(8);

const finger = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0"/></svg>';

function render() {
  const acc = auth.account();
  if (!acc) return renderAuth('register');
  if (state.screen === 'faceid-offer') return renderFaceIdOffer();
  if (!state.unlocked) return renderAuth(acc.credId && !state.usePassword ? 'lock' : 'login');
  if (state.screen === 'category') return renderCategory();
  renderAmount();
}

function unlock() {
  state.unlocked = true;
  state.usePassword = false;
  localStorage.setItem('loggedIn', '1');
  render();
}

/* ---------- auth ---------- */
function renderAuth(mode) {
  const acc = auth.account();
  const reg = mode === 'register';
  const head = {
    register: ['Создать аккаунт', 'Данные хранятся только на этом устройстве'],
    login: ['С возвращением', 'Введите пароль, чтобы продолжить'],
    lock: ['Траты', acc?.login],
  }[mode];

  app.innerHTML = `
    <section class="screen auth">
      <div class="auth-head">
        <div class="logo">₽</div>
        <h1>${esc(head[0])}</h1>
        <p>${esc(head[1])}</p>
      </div>
      ${mode === 'lock' ? `
        <div class="stack">
          <button class="btn with-icon" id="faceid">${finger} Войти с Face ID</button>
          <div class="error" id="err"></div>
          <button class="btn ghost" id="usepass">Войти по паролю</button>
        </div>` : `
      <form novalidate>
        <input class="field" name="login" placeholder="Логин" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(reg ? '' : acc.login)}">
        <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="${reg ? 'new-password' : 'current-password'}">
        ${reg ? '<input class="field" name="password2" type="password" placeholder="Повторите пароль" autocomplete="new-password">' : ''}
        <div class="error" id="err"></div>
        <button class="btn" type="submit">${reg ? 'Создать' : 'Войти'}</button>
      </form>
      ${reg ? '' : `<div class="switch">${acc.credId ? '<button id="back-faceid">Face ID</button> · ' : ''}<button id="reset" class="muted-link">Забыли пароль?</button></div>`}`}
    </section>`;

  const err = app.querySelector('#err');
  const fail = (msg) => { err.textContent = msg; };

  if (mode === 'lock') {
    app.querySelector('#faceid').onclick = async () => {
      try { (await auth.verifyFaceId()) ? unlock() : fail('Не удалось подтвердить'); } catch { fail('Face ID отменён'); }
    };
    app.querySelector('#usepass').onclick = () => { state.usePassword = true; render(); };
    return;
  }

  const form = app.querySelector('form');
  app.querySelector('#back-faceid')?.addEventListener('click', () => { state.usePassword = false; render(); });
  app.querySelector('#reset')?.addEventListener('click', async () => {
    if (!confirm('Пароль восстановить нельзя. Сбросить аккаунт? Все траты на этом устройстве будут удалены.')) return;
    await store.wipe();
    auth.reset();
    localStorage.removeItem('loggedIn');
    render();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const { login = '', password = '', password2 } = Object.fromEntries(new FormData(form));
    if (reg) {
      if (!/^[\p{L}\d_.-]{2,32}$/u.test(login.trim())) return fail('Логин: 2–32 символа, буквы, цифры, _ . -');
      if (password.length < 4) return fail('Пароль: минимум 4 символа');
      if (password !== password2) return fail('Пароли не совпадают');
      await auth.register(login.trim(), password);
      state.unlocked = true;
      localStorage.setItem('loggedIn', '1');
      if (await auth.faceIdAvailable()) state.screen = 'faceid-offer';
      return render();
    }
    if (await auth.checkPassword(login.trim(), password)) unlock();
    else fail('Неверный логин или пароль');
  };
}

function renderFaceIdOffer() {
  app.innerHTML = `
    <section class="screen auth">
      <div class="auth-head">
        <div class="logo">${finger}</div>
        <h1>Включить Face ID?</h1>
        <p>Приложение будет открываться по лицу, а не по паролю</p>
      </div>
      <div class="stack">
        <button class="btn" id="yes">Включить</button>
        <div class="error" id="err"></div>
        <button class="btn ghost" id="no">Не сейчас</button>
      </div>
    </section>`;
  const done = () => { state.screen = 'amount'; render(); };
  app.querySelector('#no').onclick = done;
  app.querySelector('#yes').onclick = async () => {
    try { await auth.enableFaceId(); done(); } catch { app.querySelector('#err').textContent = 'Не удалось включить Face ID'; }
  };
}

/* ---------- amount ---------- */
function renderAmount() {
  const user = auth.account();
  app.innerHTML = `
    <section class="screen">
      <div class="topbar">
        <div class="pill">Сегодня <b id="today">…</b></div>
        <div class="rel">
          <button class="icon-btn avatar" id="avatar" aria-label="Меню">${esc(user.login[0])}</button>
        </div>
      </div>
      <div class="amount-wrap">
        <div class="amount" id="amount"><span class="val"></span><span class="cur">₽</span></div>
        <div class="amount-hint" id="hint"></div>
      </div>
      <div class="pad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) =>
          `<button class="key" data-k="${k}" aria-label="${k === 'del' ? 'Стереть' : k}">${k === 'del' ? icons.del : k}</button>`).join('')}
      </div>
      <button class="btn" id="next">Продолжить</button>
    </section>`;

  updateAmount();
  refreshToday();
  app.querySelector('#avatar').onclick = openMenu;
  app.querySelector('#next').onclick = goCategory;

  let holdTimer;
  app.querySelector('.pad').addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.key');
    if (!key) return;
    haptic();
    press(key.dataset.k);
    if (key.dataset.k === 'del') holdTimer = setTimeout(() => { state.amt = ''; updateAmount(); haptic(); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    app.querySelector('.pad').addEventListener(ev, () => clearTimeout(holdTimer)));
}

function press(k) {
  let a = state.amt;
  const [int, dec] = a.split(',');
  if (k === 'del') a = a.slice(0, -1);
  else if (k === ',') { if (!a.includes(',')) a = (a || '0') + ','; }
  else if (dec !== undefined) { if (dec.length < 2) a += k; else return shake(); }
  else if (int === '0') a = k;
  else if (int.length < 9) a += k;
  else return shake();
  state.amt = a;
  updateAmount();
}

function shake() {
  const el = app.querySelector('#amount');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function updateAmount() {
  const el = app.querySelector('#amount');
  if (!el) return;
  const [int, dec] = state.amt.split(',');
  const text = state.amt ? (int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (dec !== undefined ? `,${dec}` : '') : '0';
  el.querySelector('.val').textContent = text;
  el.classList.toggle('empty', !state.amt);
  el.style.setProperty('--size', `${Math.max(44, 88 - Math.max(0, text.length - 5) * 7)}px`);
  app.querySelector('#hint').textContent = state.amt ? '' : 'Сколько потратили?';
  app.querySelector('#next').disabled = kopecks() <= 0;
}

async function refreshToday() {
  const el = app.querySelector('#today');
  if (el) el.textContent = money(await store.todayTotal());
}

async function openMenu() {
  const wrap = app.querySelector('#avatar').parentElement;
  const acc = auth.account();
  const count = (await store.allExpenses()).length;
  const faceId = await auth.faceIdAvailable();
  wrap.insertAdjacentHTML('beforeend', `
    <div class="menu-backdrop"></div>
    <div class="menu">
      <div class="menu-head"><b>${esc(acc.login)}</b><small>Трат на устройстве: ${count}</small></div>
      ${faceId ? `<button data-a="faceid">${acc.credId ? 'Отключить Face ID' : 'Включить Face ID'}</button>` : ''}
      <button data-a="export">Экспорт копии</button>
      <button data-a="import">Импорт копии</button>
      <button data-a="logout" class="danger">Выйти</button>
    </div>`);
  const close = () => wrap.querySelectorAll('.menu, .menu-backdrop').forEach((n) => n.remove());
  wrap.querySelector('.menu-backdrop').onclick = close;
  wrap.querySelector('.menu').onclick = async (e) => {
    const a = e.target.dataset.a;
    if (!a) return;
    close();
    if (a === 'faceid') {
      if (acc.credId) { auth.disableFaceId(); toast('Face ID отключён'); return; }
      try { await auth.enableFaceId(); toast('Face ID включён'); } catch { toast('Не удалось включить Face ID'); }
    }
    if (a === 'export') exportData();
    if (a === 'import') importData();
    if (a === 'logout') {
      state.unlocked = false;
      localStorage.removeItem('loggedIn');
      render();
    }
  };
}

async function exportData() {
  const expenses = await store.allExpenses();
  const name = `traty-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify({ app: 'traty', version: 1, expenses })], name, { type: 'application/json' });
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
      const n = await store.importExpenses(data.expenses || data);
      toast(`Импортировано трат: ${n}`);
    } catch {
      toast('Не удалось прочитать файл');
    }
  };
  input.click();
}

function goCategory() {
  if (kopecks() <= 0) return shake();
  state.screen = 'category';
  render();
}

/* ---------- category ---------- */
async function renderCategory() {
  const recent = await store.recentCategories();
  const tile = ([id, name, emoji]) =>
    `<button class="cat${state.cat === id ? ' on' : ''}" data-id="${id}"><div class="ico">${emoji}</div><span>${name}</span></button>`;
  app.innerHTML = `
    <section class="screen">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <button class="amount-chip" id="edit">${money(kopecks())} ${icons.edit}</button>
        <div style="width:40px"></div>
      </div>
      <h2 class="cat-title">На что потратили?</h2>
      <div class="cats">
        ${recent.length ? `<div class="section-label">Недавние</div><div class="grid">${recent.filter((id) => CAT[id]).map((id) => tile([id, CAT[id].name, CAT[id].emoji])).join('')}</div>` : ''}
        <div class="section-label">Все категории</div>
        <div class="grid">${CATEGORIES.map(tile).join('')}</div>
      </div>
      <div class="bottom">
        <input class="field" id="note" placeholder="Комментарий (необязательно)" maxlength="200" value="${esc(state.note)}">
        <button class="btn" id="save" ${state.cat ? '' : 'disabled'}>Сохранить</button>
      </div>
    </section>`;

  const back = () => { state.screen = 'amount'; render(); };
  app.querySelector('#back').onclick = back;
  app.querySelector('#edit').onclick = back;
  app.querySelector('#note').oninput = (e) => (state.note = e.target.value);
  app.querySelector('.cats').onclick = (e) => {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    haptic();
    state.cat = btn.dataset.id;
    app.querySelectorAll('.cat').forEach((c) => c.classList.toggle('on', c.dataset.id === state.cat));
    app.querySelector('#save').disabled = false;
  };
  app.querySelector('#save').onclick = save;
}

async function save() {
  if (!state.cat) return;
  const item = await store.addExpense({ amount: kopecks(), category: state.cat, note: state.note.trim() });
  Object.assign(state, { screen: 'amount', amt: '', cat: null, note: '' });
  render();
  toast(`${CAT[item.category].emoji} ${money(item.amount)} · ${CAT[item.category].name}`, async () => {
    await store.removeExpense(item.id);
    refreshToday();
  });
}

/* ---------- toast ---------- */
let toastTimer;
function toast(text, undo) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(text)}</span>${undo ? '<button>Отменить</button>' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
  if (undo) el.querySelector('button').onclick = () => { el.hidden = true; undo(); };
}

/* ---------- keyboard (desktop) ---------- */
document.addEventListener('keydown', (e) => {
  if (!state.unlocked || e.target.matches('input')) {
    if (e.key === 'Enter' && e.target.id === 'note') save();
    return;
  }
  if (state.screen === 'amount') {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === ',' || e.key === '.') press(',');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') goCategory();
  } else if (state.screen === 'category') {
    if (e.key === 'Escape') { state.screen = 'amount'; render(); }
    else if (e.key === 'Enter') save();
  }
});

store.onChange(refreshToday);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
