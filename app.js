import * as store from './store.js';
import { L, LANG, setLang } from './i18n.js';
import * as auth from './auth.js';
import { renderHome, renderCharts, renderCategoryDetail, renderProfile, renderImport, renderCustomCats, renderInfo, renderBudget, renderDeposits, renderDeposit, limitHint, renderKeshSettings, langSwitch, flipLang } from './screens.js';
import {
  CATEGORIES, INCOME_CATEGORIES, CAT, app, state, money, esc, haptic, icons, PALETTE, updateCategory,
  setRender, render, ticket, go, toast, startOfMonth, matchCategory, addCategory, catIcon, rawIcon, SKINS, skinStyle, applySkin, ask,
} from './ui.js';
import { catAvatar, coatSVG, startKesh, keshSVG, keshOn, keshReact, amountPose, calmMode, keshHint, keshSay } from './kesh.js';

const kopecks = () => Math.round(parseFloat(state.amt.replace(',', '.') || '0') * 100);

setRender(main);

function main() {
  const acc = auth.account();
  if (!acc && !state.authMode) return renderWelcome();
  if (!acc) return renderOnboarding();
  if (state.info) return renderInfo();
  if (state.flow === 'add') return renderAmount();
  if (state.flow === 'category') return renderCategory();
  if (state.flow === 'newcat') return renderNewCategory();
  if (state.flow === 'cats') return renderCustomCats();
  if (state.flow === 'import') return renderImport();
  if (state.flow === 'cat') return renderCategoryDetail();
  if (state.flow === 'deposit') return renderDeposit();
  if (state.flow === 'keshset') return renderKeshSettings();
  if (state.tab === 'budget') return renderBudget();
  if (state.tab === 'deposits') return renderDeposits();
  if (state.tab === 'charts') return renderCharts();
  if (state.tab === 'profile') return renderProfile();
  return renderHome();
}

/* ---------- приветствие и онбординг ---------- */
function renderWelcome() {
  app.innerHTML = `
    <section class="screen auth welcome" data-phase="empty">
      <div class="grain"></div>
      <button class="lang-pick" aria-label="Language">${langSwitch()}</button>
      <div class="stage">
        <div class="peek">${keshSVG('Ждёт')}</div>
        <div class="horizon"></div>
        <p class="hello" aria-live="polite"></p>
      </div>
      <div class="auth-body">
        <button class="btn trap" id="reg"><span class="trap-kesh">${keshSVG('Переживает', true)}</span><span class="tuk l">${L('тук', 'knock')}</span><span class="tuk r">${L('тук', 'knock')}</span><span class="trap-label">${L('Начать', 'Start')}</span></button>
      </div>
    </section>`;
  const scr = app.querySelector('.welcome');
  const btn = app.querySelector('#reg');
  const peek = app.querySelector('.peek');
  const hello = app.querySelector('.hello');
  const TEXT = L('Привет! Я Кэш.', 'Hi! I’m Kesh.');
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(() => scr.isConnected && fn(), ms));
  const phase = (p) => { scr.dataset.phase = p; };
  const pose = (p) => { peek.innerHTML = keshSVG(p); };
  const caught = () => { btn.classList.add('caught'); btn.style.setProperty('--w', `${btn.offsetWidth}px`); phase('trap'); };

  // 5. Кэш прыгает по дуге в кнопку, кнопка проминается
  const jumpIn = () => {
    const a = peek.querySelector('svg').getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'flyer';
    fly.innerHTML = keshSVG('Рад');
    Object.assign(fly.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px` });
    document.body.appendChild(fly);
    phase('trap');
    const s = 36 / a.width;
    const dx = b.left + 10 - a.left - (a.width - 36) / 2;
    const dy = b.bottom - 6 - a.bottom + (a.height * (1 - s)) / 2;
    fly.animate([
      { transform: 'none' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(${(1 + s) / 2}) rotate(-10deg)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], { duration: 360, easing: 'cubic-bezier(.4,0,.4,1)', fill: 'forwards' }).onfinish = () => {
      fly.remove();
      btn.classList.add('landed');
      caught();
      haptic();
    };
  };

  const typeHello = () => {
    hello.classList.add('typing');
    [...TEXT].forEach((_, n) => at(60 * n, () => { hello.textContent = TEXT.slice(0, n + 1); }));
    at(60 * TEXT.length + 200, () => hello.classList.remove('typing'));
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pose('Привет'); hello.textContent = TEXT; phase('button');
  } else {
    at(250, () => phase('ears'));                       // 1. из-за горизонта поднимаются уши
    at(900, () => { phase('hello'); pose('Привет'); typeHello(); }); // 2. машет лапой, текст по буквам
    at(2000, () => { phase('button'); pose('Показывает'); });       // 3. снизу выезжает кнопка, лапа на «Начать»
    at(3300, jumpIn);                                    // 4. прыгает в кнопку и оказывается заперт
  }
  // всё пропускается тапом по экрану
  scr.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#reg, .lang-pick') || scr.dataset.phase === 'trap') return;
    timers.forEach(clearTimeout);
    hello.classList.remove('typing');
    hello.textContent = TEXT;
    pose('Привет');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) phase('button'); else caught();
  });
  app.querySelector('.lang-pick').onclick = (e) => flipLang(e.currentTarget.querySelector('.lswitch'));
  btn.onclick = () => {
    timers.forEach(clearTimeout);
    haptic();
    btn.classList.add('free');
    btn.querySelector('.trap-kesh').innerHTML = keshSVG('Рад', true);
    setTimeout(() => { state.authMode = 'register'; state.step = 0; state.draft = {}; state.jumpOut = true; render(); }, 220);
  };
}

function renderOnboarding() {
  const step = state.step;
  const name = state.draft.name || '';
  const pick = state.draft.skin ?? null;
  const jumped = state.jumpOut;
  state.jumpOut = false;

  app.innerHTML = `
    <section class="screen auth onb">
      <div class="brand">${L('Кэш', 'Kesh')}</div>
      <div class="dots">${[0, 1].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="auth-body">
        ${step === 0 ? `
          <h1>${L('Как тебя зовут?', 'What’s your name?')}</h1>
          <p>${L('Имя видно только на этом устройстве', 'Your name stays on this device')}</p>
          <div class="field-wrap">
            <div class="field-kesh${jumped ? ' jump' : ''}">${keshSVG(name.trim().length >= 2 ? 'Рад' : 'Ждёт')}</div>
            <input class="field big" id="name" placeholder="${L('Например, Артём', 'e.g. Alex')}" maxlength="32" value="${esc(name)}" autocapitalize="words" spellcheck="false">
          </div>
          <div class="error" id="err"></div>
          <button class="btn" id="next" ${name.trim().length >= 2 ? '' : 'disabled'}>${L('Дальше', 'Next')} <span class="arr">→</span></button>
        ` : `
          <div class="onb-ava"><span class="ava xl cat">${catAvatar(pick ?? 0)}</span></div>
          <h1>${L('Выберите аватар', 'Pick an avatar')}</h1>
          <p>${L('Потом можно поставить своё фото', 'You can set a photo later')}</p>
          <div class="ava-grid">
            ${SKINS.map((_, i) => `<button class="ava-pick${pick === i ? ' on' : ''}" data-e="${i}" style="--i:${i}" aria-label="${L('Аватар', 'Avatar')} ${i + 1}">${catAvatar(i)}</button>`).join('')}
          </div>
          <button class="btn" id="done">${L('Поехали', 'Let’s go')} <span class="arr">→</span></button>
        `}
      </div>
    </section>`;

  if (step === 0) {
    const input = app.querySelector('#name');
    const next = app.querySelector('#next');
    input.oninput = () => {
      state.draft.name = input.value;
      next.disabled = input.value.trim().length < 2;
      const pose = next.disabled ? 'Ждёт' : 'Рад';
      const fk = app.querySelector('.field-kesh');
      if (fk.dataset.pose !== pose) {
        fk.dataset.pose = pose; fk.innerHTML = keshSVG(pose);
        app.querySelector('.praise')?.remove();
        if (pose === 'Рад') fk.insertAdjacentHTML('afterend', `<span class="praise">${L('Красивое имя!', 'Nice name!')}</span>`);
      }
    };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !next.disabled) next.click(); };
    next.onclick = () => {
      if (!/^[\p{L}\d _.-]{2,32}$/u.test(input.value.trim())) {
        app.querySelector('#err').textContent = L('Имя: 2–32 символа', 'Name: 2–32 characters');
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
    state.authMode = null;
    state.flow = 'add';
    render();
    toast(`${L('Привет', 'Hi')}, ${state.draft.name}!`);
  };
}

/* ---------- amount ---------- */
const MONTHS_GEN = L(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateLabel = (ts) => {
  const d = new Date(ts);
  const k = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 864e5);
  return `${k === 0 ? L('Сегодня · ', 'Today · ') : k === 1 ? L('Вчера · ', 'Yesterday · ') : ''}${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
};
const dateInput = () => `<label class="icon-btn date-pick" aria-label="${L('Дата операции', 'Date')}">${icons.calendar}
  <input type="date" id="date" value="${isoDay(new Date(state.date))}" max="${isoDay(new Date())}"></label>`;
function bindDate() {
  app.querySelector('#date').onchange = (e) => {
    const [y, m, dd] = e.target.value.split('-').map(Number);
    if (!y) return;
    const picked = new Date(y, m - 1, dd);
    state.date = picked.toDateString() === new Date().toDateString() ? Date.now() : new Date(y, m - 1, dd, 12, 0).getTime();
    render();
  };
}

// Частые категории: по последним операциям, добиваем первыми из списка
async function frequent(income) {
  const list = (income ? INCOME_CATEGORIES : CATEGORIES).map(([id]) => id);
  const recent = (await store.recentCategories(16)).filter((id) => CAT[id] && (CAT[id].kind === 'in') === income);
  const out = [...new Set([...(state.cat && list.includes(state.cat) ? [state.cat] : []), ...recent, ...list])];
  return out.slice(0, 4);
}

async function renderAmount() {
  const live = ticket();
  const editing = !!state.edit;
  const income = state.kind === 'in';
  const top = await frequent(income);
  if (!live()) return;
  app.innerHTML = `
    <section class="screen add-screen">
      <div class="topbar">
        <button class="icon-btn" id="close" aria-label="${L('Закрыть', 'Close')}">${icons.back}</button>
        <div class="seg kind" id="kind">
          <button class="${income ? '' : 'on'}" data-k="out">${L('Расход', 'Expense')}</button>
          <button class="${income ? 'on' : ''}" data-k="in">${L('Доход', 'Income')}</button>
        </div>
        ${editing ? `<button class="icon-btn" id="del" aria-label="${L('Удалить операцию', 'Delete')}">${icons.trash}</button>` : dateInput()}
      </div>
      <div class="amount-wrap${income ? ' income' : ''}">
        <div class="amount" id="amount"><span class="val"></span><span class="cur">₽</span></div>
        <div class="amount-kesh" id="kesh-amt" aria-hidden="true"></div>
        <div class="amount-hint" id="hint"></div>
      </div>
      <div class="quick-head"><span class="section-label">${L('Частые', 'Frequent')}</span><button class="link" id="all">${L('Все категории', 'All categories')}</button></div>
      <div class="quick">${top.map((id) => `<button class="cat${state.cat === id ? ' on' : ''}" data-id="${id}"><div class="ico">${catIcon(id)}</div><span>${esc(CAT[id].name)}</span></button>`).join('')}</div>
      <input class="field" id="note" placeholder="${L('Комментарий', 'Note')}" maxlength="200" value="${esc(state.note)}">
      <div class="pad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) =>
          `<button class="key" data-k="${k}" aria-label="${k === 'del' ? L('Стереть', 'Erase') : k}">${k === 'del' ? icons.del : k}</button>`).join('')}
      </div>
      <button class="btn" id="next">${L('Сохранить', 'Save')}</button>
    </section>`;

  updateAmount();
  if (!editing) bindDate();
  app.querySelector('#close').onclick = () => { if (state.edit) Object.assign(state, { amt: '', cat: null, note: '' }); state.edit = null; go(state.tab || 'home'); };
  app.querySelector('#next').onclick = () => (state.cat && kopecks() > 0 ? save() : goCategory());
  app.querySelector('#all').onclick = () => { state.flow = 'category'; render(); };
  app.querySelector('#note').oninput = (e) => { state.note = e.target.value; };
  app.querySelector('.quick').onclick = (e) => {
    const b = e.target.closest('.cat');
    if (!b) return;
    haptic();
    state.cat = state.cat === b.dataset.id ? null : b.dataset.id;
    app.querySelectorAll('.quick .cat').forEach((c) => c.classList.toggle('on', c.dataset.id === state.cat));
    updateAmount();
  };
  app.querySelector('#del')?.addEventListener('click', removeEdited);
  app.querySelector('#kind').onclick = (e) => {
    const b = e.target.closest('[data-k]');
    if (!b || b.dataset.k === state.kind) return;
    haptic();
    state.kind = b.dataset.k;
    state.cat = null;
    render();
  };

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

async function removeEdited() {
  if (!(await ask(L('Удалить операцию?', 'Delete this transaction?'), ''))) return;
  const { id } = state.edit;
  Object.assign(state, { flow: null, edit: null, amt: '', cat: null, note: '' });
  await store.removeExpense(id);
  render();
  toast(L('Операция удалена', 'Transaction deleted'));
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
  el.style.setProperty('--size', `${Math.max(40, 72 - Math.max(0, text.length - 5) * 6)}px`);
  const [pose, line] = amountPose(state.kind, kopecks());
  const k = app.querySelector('#kesh-amt');
  if (k.dataset.pose !== pose) { k.dataset.pose = pose; k.innerHTML = keshOn() && !calmMode() ? coatSVG(pose) : ''; }
  app.querySelector('#hint').textContent = (state.amt && line) || dateLabel(state.date);
  const btn = app.querySelector('#next');
  const kop = kopecks();
  btn.disabled = kop <= 0;
  btn.textContent = kop > 0 ? `${state.cat ? L('Сохранить', 'Save') : L('Выбрать категорию', 'Pick category')} · ${state.kind === 'in' ? '+' : '−'}${money(kop)}` : L('Сохранить', 'Save');
}

function goCategory() {
  if (kopecks() <= 0) return shake();
  state.flow = 'category';
  render();
}

/* ---------- category ---------- */
async function renderCategory() {
  const live = ticket();
  const income = state.kind === 'in';
  const list = income ? INCOME_CATEGORIES : CATEGORIES;
  const recent = (await store.recentCategories(12)).filter((id) => CAT[id] && (CAT[id].kind === 'in') === income).slice(0, 4);
  const q = state.catQuery.trim().toLowerCase();
  const found = q ? list.filter(([id, name]) => matchCategory(id, name, q)) : list;
  const tile = ([id, name]) =>
    `<button class="cat${state.cat === id ? ' on' : ''}" data-id="${id}"><div class="ico">${catIcon(id)}</div><span>${esc(name)}</span></button>`;
  if (!live()) return;
  app.innerHTML = `
    <section class="screen">
      <div class="topbar cat-bar">
        <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
        <button class="amount-chip center${income ? ' income' : ''}" id="edit">${income ? '+' : ''}${money(kopecks())} ${icons.edit}</button>
        ${dateInput()}
      </div>
      <h2 class="cat-title">${income ? L('Откуда пришли деньги?', 'Where did it come from?') : L('На что потратили?', 'What was it for?')}</h2>
      <label class="search-bar sm">${icons.search}<input id="cq" placeholder="${L('Поиск категории', 'Search categories')}" value="${esc(state.catQuery)}" autocapitalize="none" spellcheck="false"></label>
      <div class="cats">
        ${!q && recent.length ? `<div class="section-label">${L('Недавние', 'Recent')}</div><div class="grid">${recent.map((id) => tile([id, CAT[id].name])).join('')}</div>` : ''}
        <div class="section-label">${q ? `${L('Найдено', 'Found')}: ${found.length}` : L('Все категории', 'All categories')}</div>
        <div class="grid">${found.map(tile).join('')}${q ? '' : `<button class="cat new" id="newcat"><div class="ico">${icons.plus}</div><span>${L('Своя', 'Custom')}</span></button>`}</div>
        ${q && !found.length ? `<div class="empty sm">${L('Такой категории нет', 'No such category')}</div>` : ''}
      </div>
      <div class="bottom">
        <input class="field" id="note" placeholder="${L('Комментарий (необязательно)', 'Note (optional)')}" maxlength="200" value="${esc(state.note)}">
        <button class="btn" id="save" ${state.cat ? '' : 'disabled'}>${L('Сохранить', 'Save')}</button>
        ${state.edit ? `<button class="btn ghost danger" id="del">${L('Удалить операцию', 'Delete transaction')}</button>` : ''}
      </div>
    </section>`;

  const back = () => { state.flow = 'add'; state.catQuery = ''; render(); };
  app.querySelector('#back').onclick = back;
  app.querySelector('#edit').onclick = back;
  app.querySelector('#note').oninput = (e) => { state.note = e.target.value; };
  bindDate();
  const cq = app.querySelector('#cq');
  cq.oninput = () => { state.catQuery = cq.value; render(); };
  if (q) { cq.focus(); cq.setSelectionRange(q.length, q.length); }
  app.querySelector('#newcat')?.addEventListener('click', () => {
    state.flow = 'newcat';
    state.draft = { icon: 'star', name: '', color: PALETTE[customCount() % PALETTE.length], kind: state.kind, from: 'category' };
    render();
  });
  app.querySelector('.cats').onclick = (e) => {
    const btn = e.target.closest('.cat');
    if (!btn || btn.id === 'newcat') return;
    haptic();
    state.cat = btn.dataset.id;
    app.querySelectorAll('.cat').forEach((c) => c.classList.toggle('on', c.dataset.id === state.cat));
    app.querySelector('#save').disabled = false;
  };
  app.querySelector('#save').onclick = save;
  app.querySelector('#del')?.addEventListener('click', removeEdited);
}

const customCount = () => CATEGORIES.length + INCOME_CATEGORIES.length; // для чередования цвета новой категории

async function save() {
  if (!state.cat) return;
  if (kopecks() <= 0) { state.flow = 'add'; render(); return; } // сумма не введена — назад к вводу
  const amount = kopecks();
  const category = state.cat;
  const note = state.note.trim();
  const type = state.kind === 'in' ? 'in' : undefined;
  if (state.edit) {
    const { id } = state.edit;
    Object.assign(state, { flow: null, edit: null, amt: '', cat: null, note: '', catQuery: '' });
    await store.updateExpense(id, { amount, category, note, ts: state.date, type });
    render();
    return toast(L('Изменения сохранены', 'Changes saved'));
  }
  const item = await store.addExpense({ amount, category, note, ts: state.date, type });
  Object.assign(state, { flow: null, tab: 'home', amt: '', cat: null, note: '', catQuery: '', month: startOfMonth(new Date(state.date)), date: Date.now(), kind: 'out' });
  // средняя трата за 30 дней — для реакции «Ого, крупная»
  const month = (await store.expensesBetween(Date.now() - 30 * 864e5, Date.now())).filter((i) => i.type !== 'in' && i.id !== item.id);
  const avg = month.length >= 5 ? month.reduce((x, i) => x + i.amount, 0) / month.length : Infinity;
  Promise.resolve(render()).then(async () => {
    if (type) return keshSay(`+${money(item.amount)} — ${L('отмечу в статистике.', 'noted in your stats.')}`, item.amount >= 500000 ? 'Ликует' : 'Рад');
    keshReact('Рад');
    if (await limitHint(item.category, item.amount)) return;
    if (item.amount > avg * 3) keshSay(L('Ого, крупная трата. Запомню.', 'Whoa, a big one. Noted.'), 'Удивлён');
  });
  toast(`${type ? '+' : ''}${money(item.amount)} · ${CAT[item.category].name}`, async () => {
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
  const { icon = 'star', name = '', color = PALETTE[0], id } = state.draft;
  app.innerHTML = `
    <section class="screen">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="${L('Назад', 'Back')}">${icons.back}</button>
        <div class="pill">${id ? L('Категория', 'Category') : L('Новая категория', 'New category')}</div>
        <div style="width:40px"></div>
      </div>
      <div class="newcat-head">
        <div class="ico preview" style="--cc:${color}">${rawIcon(icon)}</div>
        <input class="field big" id="cname" placeholder="${L('Название', 'Name')}" maxlength="24" value="${esc(name)}" autocapitalize="words">
      </div>
      <div class="cats">
        <div class="section-label">${L('Цвет', 'Color')}</div>
        <div class="color-grid">
          ${PALETTE.map((c) => `<button class="color-pick${c === color ? ' on' : ''}" data-c="${c}" style="--cc:${c}" aria-label="${L('Цвет', 'Color')}"></button>`).join('')}
        </div>
        <div class="section-label">${L('Иконка', 'Icon')}</div>
        <div class="emoji-grid">
          ${PICKABLE.map((e, i) => `<button class="emoji-pick${e === icon ? ' on' : ''}" data-e="${e}" style="--i:${i}">${rawIcon(e)}</button>`).join('')}
        </div>
      </div>
      <div class="bottom">
        <button class="btn" id="create" ${name.trim().length >= 2 ? '' : 'disabled'}>${id ? L('Сохранить', 'Save') : L('Создать категорию', 'Create category')}</button>
      </div>
    </section>`;

  const back = () => { state.flow = state.draft.from === 'budget' ? null : state.draft.from; render(); };
  app.querySelector('#back').onclick = back;
  app.querySelector('.color-grid').onclick = (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    haptic();
    state.draft.color = b.dataset.c;
    app.querySelectorAll('.color-pick').forEach((n) => n.classList.toggle('on', n === b));
    app.querySelector('.ico.preview').style.setProperty('--cc', b.dataset.c);
  };
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
    const d = state.draft;
    haptic();
    if (d.id) {
      updateCategory(d.id, { name: d.name.trim(), icon: d.icon, color: d.color });
      state.flow = d.from === 'budget' ? null : d.from;
      render();
      return toast(L('Категория сохранена', 'Category saved'));
    }
    const created = addCategory(d.name.trim(), d.icon, d.color, d.kind);
    if (d.from === 'budget') state.flow = null; // из бюджета — обратно в бюджет
    else { state.cat = created; state.flow = 'category'; }
    render();
    toast(L(`Категория «${d.name.trim()}» создана`, `Category “${d.name.trim()}” created`));
  };
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (!auth.account() || e.target.matches('input')) {
    if (e.key === 'Enter' && e.target.id === 'note') save();
    return;
  }
  if (state.flow === 'add') {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === ',' || e.key === '.') press(',');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') { if (state.cat && kopecks() > 0) save(); else goCategory(); }
  } else if (state.flow === 'category') {
    if (e.key === 'Escape') { state.flow = 'add'; render(); }
    else if (e.key === 'Enter') save();
  }
});

store.onChange(() => { if (!state.flow) render(); });

// Сбой где угодно: понятное сообщение вместо пустого экрана
function fail(err) {
  console.error(err);
  const quota = err?.name === 'QuotaExceededError';
  if (!app.querySelector('.screen')) {
    app.innerHTML = `<section class="screen"><div class="empty">${L('Не удалось открыть экран.', 'Couldn’t open this screen.')}<br><br>
      <button class="btn" id="retry">${L('Перезапустить', 'Restart')}</button></div></section>`;
    app.querySelector('#retry').onclick = () => location.reload();
  } else toast(quota ? L('Нет места в хранилище браузера — освободите память и повторите', 'Browser storage is full — free some space and retry') : L('Что-то пошло не так, попробуйте ещё раз', 'Something went wrong, please try again'));
}
window.addEventListener('error', (e) => fail(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => fail(e.reason));

// Жест «назад»: свайп от левого края вправо
function goBack() {
  if (state.info) { state.info = null; return render(); }
  if (state.flow === 'newcat') { state.flow = state.draft.from === 'budget' ? null : state.draft.from; return render(); }
  if (state.flow === 'keshset') { state.flow = null; state.tab = 'profile'; return render(); }
  if (state.flow === 'deposit') { state.flow = null; state.dep = null; return render(); }
  if (state.flow === 'category') { state.flow = 'add'; return render(); }
  if (state.flow === 'import' || state.flow === 'cats') { state.flow = null; state.tab = 'profile'; return render(); }
  if (state.flow === 'cat') { state.flow = null; state.catId = null; return render(); }
  if (state.flow === 'add') { if (state.edit) Object.assign(state, { amt: '', cat: null, note: '' }); state.edit = null; return go(state.tab || 'home'); }
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
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const far = t.clientX - swipe.x > 70;
  const quick = Date.now() - swipe.t < 700;
  swipe = null;
  if (far && quick) { haptic(); goBack(); }
}, { passive: true });

applySkin();
startKesh(app, () => go('profile'));
store.fixOrphans(new Set(Object.keys(CAT))).catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
