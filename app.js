import * as store from './store.js';
import * as auth from './auth.js';
import { renderHome, renderCharts, renderCategoryDetail, renderSearch, renderProfile, renderImport, renderCustomCats, renderInfo } from './screens.js';
import {
  CATEGORIES, CAT, app, state, money, esc, haptic, icons,
  setRender, render, go, toast, startOfMonth, matchCategory, addCategory, catIcon, rawIcon, SKINS, skinStyle, applySkin, ask,
} from './ui.js';

const kopecks = () => Math.round(parseFloat(state.amt.replace(',', '.') || '0') * 100);

setRender(main);

function main() {
  const acc = auth.account();
  if (!acc && !state.authMode) return renderWelcome();
  if (!acc) return renderOnboarding();
  if (!state.unlocked) {
    if (!auth.hasPassword()) { state.unlocked = true; return main(); }
    return renderAuth('login');
  }
  if (state.info) return renderInfo();
  if (state.flow === 'add') return renderAmount();
  if (state.flow === 'category') return renderCategory();
  if (state.flow === 'newcat') return renderNewCategory();
  if (state.flow === 'cats') return renderCustomCats();
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

/* ---------- приветствие и онбординг ---------- */
function renderWelcome() {
  app.innerHTML = `
    <section class="screen auth welcome">
      <div class="aurora"></div>
      <div class="brand">NOTA</div>
      <div class="auth-body">
        <h1>Записывайте траты<br>в одно касание</h1>
        <button class="btn breathe" id="reg">Создать аккаунт <span class="arr">→</span></button>
      </div>
    </section>`;
  app.querySelector('#reg').onclick = () => { state.authMode = 'register'; state.step = 0; state.draft = {}; render(); };
}

/* ---------- регистрация ---------- */
function renderAuth() {
  const acc = auth.account();
  app.innerHTML = `
    <section class="screen auth">
      <div class="aurora"></div>
      <div class="brand">NOTA</div>
      <div class="auth-body">
        <h1>С возвращением</h1>
        <p>${esc(acc?.login || '')}</p>
        <form novalidate>
          <input class="field" name="password" type="password" placeholder="Пароль" autocomplete="current-password">
          <div class="error" id="err"></div>
          <button class="btn" type="submit">Войти <span class="arr">→</span></button>
        </form>
        <div class="switch"><button id="reset" class="muted-link">Забыли пароль?</button></div>
      </div>
    </section>`;

  app.querySelector('#reset').onclick = async () => {
    if (!(await ask('Сбросить аккаунт?', 'Пароль восстановить нельзя. Все траты на этом устройстве будут удалены.', 'Сбросить'))) return;
    await store.wipe();
    auth.reset();
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('avatar');
    render();
  };
  app.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const { password = '' } = Object.fromEntries(new FormData(e.target));
    if (await auth.checkPassword(null, password)) unlock();
    else app.querySelector('#err').textContent = 'Неверный пароль';
  };
}

function renderOnboarding() {
  const step = state.step;
  const name = state.draft.name || '';
  const pick = state.draft.skin ?? null;

  app.innerHTML = `
    <section class="screen auth onb">
      <div class="aurora"></div>
      <div class="brand">NOTA</div>
      <div class="dots">${[0, 1].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="auth-body">
        ${step === 0 ? `
          <h1>Как вас зовут?</h1>
          <p>Имя видно только на этом устройстве</p>
          <input class="field big" id="name" placeholder="Например, Артём" maxlength="32" value="${esc(name)}" autocapitalize="words" spellcheck="false">
          <div class="error" id="err"></div>
          <button class="btn" id="next" ${name.trim().length >= 2 ? '' : 'disabled'}>Дальше <span class="arr">→</span></button>
        ` : `
          <div class="onb-ava"><span class="ava xl" style="${skinStyle(pick ?? 0)}"></span></div>
          <h1>Выберите аватар</h1>
          <p>Потом можно поставить своё фото</p>
          <div class="ava-grid">
            ${SKINS.map((_, i) => `<button class="ava-pick${pick === i ? ' on' : ''}" data-e="${i}" style="--i:${i};${skinStyle(i)}"></button>`).join('')}
          </div>
          <button class="btn" id="done">Поехали <span class="arr">→</span></button>
        `}
      </div>
    </section>`;

  if (step === 0) {
    const input = app.querySelector('#name');
    const next = app.querySelector('#next');
    input.oninput = () => {
      state.draft.name = input.value;
      next.disabled = input.value.trim().length < 2;
    };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !next.disabled) next.click(); };
    next.onclick = () => {
      if (!/^[\p{L}\d _.-]{2,32}$/u.test(input.value.trim())) {
        app.querySelector('#err').textContent = 'Имя: 2–32 символа';
        return;
      }
      state.draft.name = input.value.trim();
      state.step = 1;
      haptic();
      render();
    };
    if (name) input.focus();
    return;
  }

  app.querySelector('.ava-grid').onclick = (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    haptic();
    state.draft.skin = Number(b.dataset.e);
    applySkin(state.draft.skin);
    render();
  };
  app.querySelector('#done').onclick = () => {
    auth.register(state.draft.name);
    localStorage.setItem('avatarSkin', String(state.draft.skin ?? 0));
    state.unlocked = true;
    state.authMode = null;
    state.flow = 'add';
    localStorage.setItem('loggedIn', '1');
    render();
    toast(`Привет, ${state.draft.name}!`);
  };
}

function restoreBackup() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (!data.account) return toast('В файле нет аккаунта');
      auth.restore(data.account);
      state.unlocked = auth.isOpen();
      state.authMode = null;
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
  const tile = ([id, name]) =>
    `<button class="cat${state.cat === id ? ' on' : ''}" data-id="${id}"><div class="ico">${catIcon(id)}</div><span>${name}</span></button>`;
  const d = new Date(state.date);
  const today = new Date().toDateString() === d.toDateString();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  app.innerHTML = `
    <section class="screen">
      <div class="glow-top"></div>
      <div class="topbar cat-bar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <button class="amount-chip center" id="edit">${money(kopecks())} ${icons.edit}</button>
        <label class="icon-btn date-chip${today ? '' : ' set'}" aria-label="Дата траты">
          ${icons.calendar}${today ? '' : `<b>${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}</b>`}
          <input type="date" id="date" value="${iso}" max="${new Date().toISOString().slice(0, 10)}">
        </label>
      </div>
      <h2 class="cat-title">На что потратили?</h2>
      <label class="search-bar sm">${icons.search}<input id="cq" placeholder="Поиск категории" value="${esc(state.catQuery)}" autocapitalize="none" spellcheck="false"></label>
      <div class="cats">
        ${!q && recent.length ? `<div class="section-label">Недавние</div><div class="grid">${recent.filter((id) => CAT[id]).map((id) => tile([id, CAT[id].name])).join('')}</div>` : ''}
        <div class="section-label">${q ? `Найдено: ${found.length}` : 'Все категории'}</div>
        <div class="grid">${found.map(tile).join('')}${q ? '' : `<button class="cat new" id="newcat"><div class="ico">${icons.plus}</div><span>Своя</span></button>`}</div>
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
  app.querySelector('#newcat')?.addEventListener('click', () => { state.flow = 'newcat'; state.draft = { icon: 'star', name: '' }; render(); });
  app.querySelector('.cats').onclick = (e) => {
    const btn = e.target.closest('.cat');
    if (!btn || btn.id === 'newcat') return;
    haptic();
    state.cat = btn.dataset.id;
    app.querySelectorAll('.cat').forEach((c) => c.classList.toggle('on', c.dataset.id === state.cat));
    app.querySelector('#save').disabled = false;
  };
  app.querySelector('#save').onclick = save;
  app.querySelector('#del')?.addEventListener('click', async () => {
    if (!(await ask('Удалить трату?', '', 'Удалить'))) return;
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
  toast(`${money(item.amount)} · ${CAT[item.category].name}`, async () => {
    await store.removeExpense(item.id);
    render();
  });
}

/* ---------- своя категория ---------- */
const PICKABLE = ['star', 'heart', 'music_notes', 'camera', 'game_controller', 'bicycle', 'wrench', 'leaf', 'sun', 'moon',
  'key', 'bell', 'clock', 'map_pin', 'shield_check', 'wifi_high', 'bus', 'boat', 'rocket', 'palette',
  'microphone', 'television', 'envelope', 'chat_circle', 'briefcase', 'basketball', 'graduation_cap', 'pencil',
  'credit_card', 'wallet', 'receipt', 'handshake', 'umbrella', 'lightning', 'fire', 'planet', 'headphones',
  'watch', 'scissors', 'dog', 'cat', 'fish', 'flower_tulip', 'first_aid_kit', 'tooth',
  'groceries', 'cafe', 'fastfood', 'coffee', 'travel', 'home', 'health', 'sport', 'fun', 'education', 'gifts', 'tech'];

function renderNewCategory() {
  const { icon = 'star', name = '' } = state.draft;
  app.innerHTML = `
    <section class="screen">
      <div class="glow-top"></div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="Назад">${icons.back}</button>
        <div class="pill">Новая категория</div>
        <div style="width:40px"></div>
      </div>
      <div class="newcat-head">
        <div class="ico preview">${rawIcon(icon)}</div>
        <input class="field big" id="cname" placeholder="Название" maxlength="24" value="${esc(name)}" autocapitalize="words">
      </div>
      <div class="cats">
        <div class="section-label">Иконка</div>
        <div class="emoji-grid">
          ${PICKABLE.map((e, i) => `<button class="emoji-pick${e === icon ? ' on' : ''}" data-e="${e}" style="--i:${i}">${rawIcon(e)}</button>`).join('')}
        </div>
      </div>
      <div class="bottom">
        <button class="btn" id="create" ${name.trim().length >= 2 ? '' : 'disabled'}>Создать категорию</button>
      </div>
    </section>`;

  const back = () => { state.flow = 'category'; render(); };
  app.querySelector('#back').onclick = back;
  const input = app.querySelector('#cname');
  input.oninput = () => {
    state.draft.name = input.value;
    app.querySelector('#create').disabled = input.value.trim().length < 2;
  };
  app.querySelector('.emoji-grid').onclick = (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    haptic();
    state.draft.icon = b.dataset.e;
    app.querySelectorAll('.emoji-pick').forEach((n) => n.classList.toggle('on', n.dataset.e === b.dataset.e));
    app.querySelector('.ico.preview').innerHTML = rawIcon(b.dataset.e);
  };
  app.querySelector('#create').onclick = () => {
    const id = addCategory(state.draft.name.trim(), state.draft.icon);
    state.cat = id;
    state.flow = 'category';
    haptic();
    render();
    toast(`Категория «${state.draft.name.trim()}» создана`);
  };
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

// Жест «назад»: свайп от левого края вправо
function goBack() {
  if (state.info) { state.info = null; return render(); }
  if (state.flow === 'newcat') { state.flow = 'category'; return render(); }
  if (state.flow === 'category') { state.flow = 'add'; return render(); }
  if (state.flow === 'import' || state.flow === 'cats') { state.flow = null; state.tab = 'profile'; return render(); }
  if (state.flow === 'cat') { state.flow = null; state.catId = null; return render(); }
  if (state.flow === 'add') { state.edit = null; return go(state.tab || 'home'); }
  if (state.tab !== 'home') return go('home');
}

let swipe = null;
document.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  swipe = t.clientX <= 28 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (!swipe) return;
  const t = e.touches[0];
  if (Math.abs(t.clientY - swipe.y) > 60) swipe = null;
  else document.body.style.setProperty('--swipe', `${Math.min(1, Math.max(0, (t.clientX - swipe.x) / 110))}`);
}, { passive: true });
document.addEventListener('touchend', (e) => {
  document.body.style.removeProperty('--swipe');
  if (!swipe) return;
  const t = e.changedTouches[0];
  const far = t.clientX - swipe.x > 70;
  const quick = Date.now() - swipe.t < 700;
  swipe = null;
  if (far && quick) { haptic(); goBack(); }
}, { passive: true });

applySkin();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
