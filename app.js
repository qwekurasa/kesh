import * as store from './store.js';
import * as auth from './auth.js';
import { renderHome, renderCharts, renderCategoryDetail, renderSearch, renderProfile, renderImport } from './screens.js';
import {
  CATEGORIES, CAT, app, state, money, esc, haptic, icons,
  setRender, render, go, toast, startOfMonth, matchCategory,
} from './ui.js';

const kopecks = () => Math.round(parseFloat(state.amt.replace(',', '.') || '0') * 100);

setRender(main);

function main() {
  const acc = auth.account();
  if (!acc && !state.authMode) return renderWelcome();
  if (!acc) return renderAuth(state.authMode);
  if (state.flow === 'faceid-offer') return renderFaceIdOffer();
  if (!state.unlocked) return renderAuth(acc.credId && !state.usePassword ? 'lock' : 'login');
  if (state.flow === 'add') return renderAmount();
  if (state.flow === 'category') return renderCategory();
  if (state.flow === 'import') return renderImport();
  if (state.flow === 'cat') return renderCategoryDetail();
  if (state.tab === 'charts') return renderCharts();
  if (state.tab === 'search') return renderSearch();
  if (state.tab === 'profile') return renderProfile();
  renderHome();
}

function unlock() {
  state.unlocked = true;
  state.usePassword = false;
  state.month = startOfMonth();
  localStorage.setItem('loggedIn', '1');
  render();
}

/* ---------- welcome ---------- */
function renderWelcome() {
  app.innerHTML = `
    <section class="screen auth welcome">
      <div class="aurora"></div>
      <div class="brand"><span class="orb"></span>NOTA</div>
      <div class="auth-body">
        <h1>Учёт расходов,<br>который не отнимает время</h1>
        <p>Одно касание, чтобы записать трату. Всё хранится только на вашем устройстве.</p>
        <button class="btn" id="reg">Создать аккаунт <span class="arr">→</span></button>
        <button class="btn alt" id="log">У меня уже есть аккаунт</button>
      </div>
    </section>`;
  app.querySelector('#reg').onclick = () => { state.authMode = 'register'; render(); };
  app.querySelector('#log').onclick = () => { state.authMode = 'login'; render(); };
}

/* ---------- auth ---------- */
function renderAuth(mode) {
  const acc = auth.account();
  const reg = mode === 'register';
  const head = {
    register: ['Создать аккаунт', 'Придумайте логин и пароль — они останутся на этом устройстве'],
    login: [acc ? 'С возвращением' : 'Вход', acc ? 'Введите пароль, чтобы открыть свои расходы' : 'На этом устройстве ещё нет аккаунта'],
    lock: ['С возвращением', esc(acc?.login || '')],
  }[mode];

  app.innerHTML = `
    <section class="screen auth">
      <div class="aurora"></div>
      <div class="brand"><span class="orb"></span>NOTA</div>
      <div class="auth-body">
        <h1>${head[0]}</h1>
        <p>${head[1]}</p>
        ${mode === 'login' && !acc ? `
          <div class="stack">
            <div class="hint-card">Аккаунты NOTA хранятся на устройстве, а не на сервере. Создайте новый аккаунт или восстановите данные из резервной копии.</div>
            <button class="btn" id="restore">Восстановить из копии</button>
            <button class="btn ghost" id="to-reg">Создать аккаунт</button>
          </div>` : mode === 'lock' ? `
          <div class="stack">
            <button class="btn with-icon" id="faceid">${icons.face} Войти с Face ID</button>
            <div class="error" id="err"></div>
            <button class="btn ghost" id="usepass">Войти по паролю</button>
          </div>` : `
          <form novalidate>
            <input class="field" name="login" placeholder="Логин" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(reg ? '' : acc.login)}">
            <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="${reg ? 'new-password' : 'current-password'}">
            ${reg ? '<input class="field" name="password2" type="password" placeholder="Повторите пароль" autocomplete="new-password">' : ''}
            <div class="error" id="err"></div>
            <button class="btn" type="submit">${reg ? 'Начать' : 'Войти'} <span class="arr">→</span></button>
          </form>
          ${reg ? '' : `<div class="switch">${acc.credId ? '<button id="back-faceid">Face ID</button> · ' : ''}<button id="reset" class="muted-link">Забыли пароль?</button></div>`}`}
      </div>
    </section>`;

  if (mode === 'login' && !acc) {
    app.querySelector('#to-reg').onclick = () => { state.authMode = 'register'; render(); };
    app.querySelector('#restore').onclick = restoreBackup;
    return;
  }

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
    localStorage.removeItem('avatar');
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
      state.flow = (await auth.faceIdAvailable()) ? 'faceid-offer' : 'add';
      return render();
    }
    if (await auth.checkPassword(login.trim(), password)) unlock();
    else fail('Неверный логин или пароль');
  };
}

function restoreBackup() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (!data.account) return toast('В файле нет аккаунта — создайте новый');
      auth.restore(data.account);
      state.unlocked = true;
      localStorage.setItem('loggedIn', '1');
      const n = await store.importExpenses(data.expenses || []);
      state.flow = 'add';
      render();
      toast(`Восстановлено трат: ${n}`);
    } catch {
      toast('Не удалось прочитать файл');
    }
  };
  input.click();
}

function renderFaceIdOffer() {
  app.innerHTML = `
    <section class="screen auth">
      <div class="aurora"></div>
      <div class="brand"><span class="orb"></span>NOTA</div>
      <div class="auth-body">
        <div class="big-ico">${icons.face}</div>
        <h1>Включить Face ID?</h1>
        <p>Приложение будет открываться по лицу, а не по паролю</p>
        <div class="stack">
          <button class="btn" id="yes">Включить</button>
          <div class="error" id="err"></div>
          <button class="btn ghost" id="no">Не сейчас</button>
        </div>
      </div>
    </section>`;
  const done = () => { state.flow = 'add'; render(); };
  app.querySelector('#no').onclick = done;
  app.querySelector('#yes').onclick = async () => {
    try { await auth.enableFaceId(); done(); } catch { app.querySelector('#err').textContent = 'Не удалось включить Face ID'; }
  };
}

/* ---------- amount ---------- */
async function renderAmount() {
  const today = await store.todayTotal();
  const editing = !!state.edit;
  app.innerHTML = `
    <section class="screen add-screen">
      <div class="glow-top"></div>
      <div class="heat l"></div>
      <div class="heat r"></div>
      <div class="topbar">
        <div class="pill">${editing ? 'Изменение траты' : `Сегодня <b>${money(today)}</b>`}</div>
        <button class="icon-btn" id="close" aria-label="Закрыть">${icons.back}</button>
      </div>
      <div class="amount-wrap">
        <div class="amount" id="amount"><span class="val"></span><span class="cur">₽</span></div>
        <div class="amount-hint" id="hint"></div>
      </div>
      <div class="pad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) =>
          `<button class="key" data-k="${k}" aria-label="${k === 'del' ? 'Стереть' : k}">${k === 'del' ? icons.del : k}</button>`).join('')}
      </div>
      <button class="btn" id="next">${editing ? 'Далее' : 'Продолжить'}</button>
    </section>`;

  updateAmount();
  app.querySelector('#close').onclick = () => { state.edit = null; go(state.tab || 'home'); };
  app.querySelector('#next').onclick = goCategory;

  let holdTimer;
  const pad = app.querySelector('.pad');
  pad.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.key');
    if (!key) return;
    haptic();
    press(key.dataset.k);
    if (key.dataset.k === 'del') holdTimer = setTimeout(() => { state.amt = ''; updateAmount(); haptic(); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => pad.addEventListener(ev, () => clearTimeout(holdTimer)));
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
  const big = Math.min(1, Math.max(0, (kopecks() - 200000) / 1800000));
  app.querySelector('.screen').style.setProperty('--heat', big.toFixed(3));
  app.querySelector('#hint').textContent = state.amt ? (big > .45 ? 'Крупная трата' : '') : 'Сколько потратили?';
  app.querySelector('#next').disabled = kopecks() <= 0;
}

function goCategory() {
  if (kopecks() <= 0) return shake();
  state.flow = 'category';
  render();
}

/* ---------- category ---------- */
async function renderCategory() {
  const recent = await store.recentCategories();
  const q = state.catQuery.trim().toLowerCase();
  const found = q ? CATEGORIES.filter(([id, name]) => matchCategory(id, name, q)) : CATEGORIES;
  const tile = ([id, name, emoji]) =>
    `<button class="cat${state.cat === id ? ' on' : ''}" data-id="${id}"><div class="ico">${emoji}</div><span>${name}</span></button>`;
  const d = new Date(state.date);
  const today = new Date().toDateString() === d.toDateString();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  app.innerHTML = `
    <section class="screen">
      <div class="glow-top"></div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <button class="amount-chip" id="edit">${money(kopecks())} ${icons.edit}</button>
        <label class="amount-chip date-chip">${today ? 'Сегодня' : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`}
          <input type="date" id="date" value="${iso}" max="${new Date().toISOString().slice(0, 10)}">
        </label>
      </div>
      <h2 class="cat-title">На что потратили?</h2>
      <label class="search-bar sm">${icons.search}<input id="cq" placeholder="Поиск категории" value="${esc(state.catQuery)}" autocapitalize="none" spellcheck="false"></label>
      <div class="cats">
        ${!q && recent.length ? `<div class="section-label">Недавние</div><div class="grid">${recent.filter((id) => CAT[id]).map((id) => tile([id, CAT[id].name, CAT[id].emoji])).join('')}</div>` : ''}
        <div class="section-label">${q ? `Найдено: ${found.length}` : 'Все категории'}</div>
        <div class="grid">${found.map(tile).join('')}</div>
        ${q && !found.length ? '<div class="empty sm">Такой категории нет</div>' : ''}
      </div>
      <div class="bottom">
        <input class="field" id="note" placeholder="Комментарий (необязательно)" maxlength="200" value="${esc(state.note)}">
        <button class="btn" id="save" ${state.cat ? '' : 'disabled'}>Сохранить</button>
        ${state.edit ? '<button class="btn ghost danger" id="del">Удалить трату</button>' : ''}
      </div>
    </section>`;

  const back = () => { state.flow = 'add'; state.catQuery = ''; render(); };
  app.querySelector('#back').onclick = back;
  app.querySelector('#edit').onclick = back;
  app.querySelector('#note').oninput = (e) => { state.note = e.target.value; };
  app.querySelector('#date').onchange = (e) => {
    const [y, m, dd] = e.target.value.split('-').map(Number);
    if (!y) return;
    const now = new Date();
    const picked = new Date(y, m - 1, dd);
    const isToday = picked.toDateString() === now.toDateString();
    state.date = isToday ? Date.now() : new Date(y, m - 1, dd, 12, 0).getTime();
    render();
  };
  const cq = app.querySelector('#cq');
  cq.oninput = () => { state.catQuery = cq.value; render(); };
  if (q) { cq.focus(); cq.setSelectionRange(q.length, q.length); }
  app.querySelector('.cats').onclick = (e) => {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    haptic();
    state.cat = btn.dataset.id;
    app.querySelectorAll('.cat').forEach((c) => c.classList.toggle('on', c.dataset.id === state.cat));
    app.querySelector('#save').disabled = false;
  };
  app.querySelector('#save').onclick = save;
  app.querySelector('#del')?.addEventListener('click', async () => {
    if (!confirm('Удалить эту трату?')) return;
    const { id } = state.edit;
    Object.assign(state, { flow: null, edit: null, amt: '', cat: null, note: '' });
    await store.removeExpense(id);
    render();
    toast('Трата удалена');
  });
}

async function save() {
  if (!state.cat) return;
  const amount = kopecks();
  const category = state.cat;
  const note = state.note.trim();
  if (state.edit) {
    const { id } = state.edit;
    Object.assign(state, { flow: null, edit: null, amt: '', cat: null, note: '', catQuery: '' });
    await store.updateExpense(id, { amount, category, note, ts: state.date });
    render();
    return toast('Изменения сохранены');
  }
  const item = await store.addExpense({ amount, category, note, ts: state.date });
  Object.assign(state, { flow: null, tab: 'home', amt: '', cat: null, note: '', catQuery: '', month: startOfMonth(new Date(state.date)), date: Date.now() });
  render();
  toast(`${CAT[item.category].emoji} ${money(item.amount)} · ${CAT[item.category].name}`, async () => {
    await store.removeExpense(item.id);
    render();
  });
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (!state.unlocked || e.target.matches('input')) {
    if (e.key === 'Enter' && e.target.id === 'note') save();
    return;
  }
  if (state.flow === 'add') {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === ',' || e.key === '.') press(',');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') goCategory();
  } else if (state.flow === 'category') {
    if (e.key === 'Escape') { state.flow = 'add'; render(); }
    else if (e.key === 'Enter') save();
  }
});

store.onChange(() => { if (!state.flow) render(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
