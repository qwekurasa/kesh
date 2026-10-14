// Заставка-мультик: ночные холмы, Кэш скачет за клубком, потом перепрыгивает в угол интерфейса
// и живёт там тихо: сидит, иногда трогает клубок лапой.
import { keshSVG } from '../kesh.js';
import { L } from '../i18n.js';
import { createScene } from './scene.js';

const yarn = `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25" fill="#A6F0C0"/><g fill="none" stroke="#5FBF86" stroke-width="2.6" stroke-linecap="round"><path d="M9 22c10 4 31 4 42-2"/><path d="M7 33c12 6 33 6 46-2"/><path d="M13 45c10 2 25 0 35-8"/><path d="M22 7c-6 12-6 33 2 47"/><path d="M38 6c6 14 6 33-4 48"/></g></svg>`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Кэш в углу интерфейса: сидит, моргает, иногда бьёт клубок лапой
export function mountPet(slot) {
  if (!slot) return;
  slot.innerHTML = `<div class="pet-ground"></div><button class="pet-cat" aria-label="${L('Кэш', 'Kesh')}">${keshSVG('Ждёт')}</button><div class="pet-yarn">${yarn}</div><span class="pet-thread"></span>`;
  const cat = slot.querySelector('.pet-cat');
  const set = (p) => { cat.innerHTML = keshSVG(p); };
  let busy = false;
  const swat = () => {
    if (busy || document.hidden) return;
    busy = true;
    set('Думает');
    setTimeout(() => { slot.classList.add('swat'); set('Рад'); }, 500);
    setTimeout(() => { slot.classList.remove('swat'); set('Ждёт'); busy = false; }, 1700);
  };
  const nap = () => { if (busy) return; busy = true; set('Спит'); setTimeout(() => { set('Ждёт'); busy = false; }, 5000); };
  cat.onclick = () => { if (busy) return; busy = true; slot.classList.add('hop'); set('Ликует'); setTimeout(() => { slot.classList.remove('hop'); set('Ждёт'); busy = false; }, 900); };
  if (!reduced()) setInterval(() => (Math.random() < 0.75 ? swat() : nap()), 9000);
}

// Заставка: живая сцена, текст о трекере и Кэш на холме — нажмите на него, чтобы войти.
export function playIntro(getSlot) {
  const el = document.getElementById('loader');
  const first = !sessionStorage.getItem('kIntro');
  const enter = () => { el.classList.add('done'); mountPet(getSlot()); };
  if (!first) { el.classList.add('quick'); return new Promise((r) => setTimeout(() => { enter(); r(); }, 350)); }
  el.classList.add('intro');
  el.innerHTML = `<canvas class="gl"></canvas>
    <div class="iv-frame"><i class="x tl"></i><i class="x tr"></i><i class="x bl"></i><i class="x br"></i><i class="x mid"></i></div>
    <nav class="iv-nav"><span>${L('Без регистрации', 'No sign-up')}</span><span>${L('Офлайн', 'Offline')}</span><b class="iv-logo"><img src="../icon-180.png" alt=""></b><span>${L('Аналитика', 'Analytics')}</span><span>${L('Импорт банка', 'Bank import')}</span></nav>
    <div class="iv-title"><h1>${L('Кэш', 'Kesh')}</h1><p>${L('Траты под контролем.', 'Spending, under control.')}</p></div>
    <div class="iv-line"></div>
    <div class="iv-about"><p>${L('Трекер трат, который живёт у вас в телефоне: добавить расход — три касания, выписку банка — одним файлом.', 'A spending tracker that lives on your phone: an expense in three taps, a bank statement in one file.')}</p><p>${L('Здесь — аналитика на большом экране и установка на любые устройства. Данные никуда не уходят.', 'Here: analytics on a big screen and install guides for every device. Your data never leaves you.')}</p></div>
    <div class="iv-foot"><span>${L('Ясность начинается с первой траты.', 'Clarity starts with the first expense.')}</span><span>${L('Кэш', 'Kesh')} ©2026</span></div>
    <button class="iv-hint" aria-label="${L('Войти', 'Enter')}"><span class="ring"></span><span class="pill">${L('Нажмите на Кэша', 'Click Kesh')}<em>↵</em></span></button>`;
  const canvas = el.querySelector('.gl');
  const sc = createScene(canvas, { scale: 0.85 });
  if (!sc) { sessionStorage.setItem('kIntro', '1'); el.classList.add('quick'); return new Promise((r) => setTimeout(() => { enter(); r(); }, 300)); }
  sc.start();
  const hint = el.querySelector('.iv-hint');
  const place = () => {
    sc.size();
    const [x, y] = sc.catPoint(0.095);
    hint.style.left = `${x}px`;
    hint.style.top = `${y}px`;
  };
  place();
  addEventListener('resize', place);
  return new Promise((resolve) => {
    let going = false;
    const near = (e) => { const [x, y] = sc.catPoint(0.095); return Math.hypot(e.clientX - x, e.clientY - y) < canvas.clientHeight * 0.14; };
    const go = () => {
      if (going) return;
      going = true;
      sessionStorage.setItem('kIntro', '1');
      el.classList.add('going');
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 1300);
        sc.st.zoom = k * k * (3 - 2 * k);
        if (k < 1) requestAnimationFrame(step);
        else {
          el.classList.add('done');
          setTimeout(() => { sc.stop(); removeEventListener('resize', place); removeEventListener('keydown', key); }, 800);
          mountPet(getSlot());
          resolve();
        }
      };
      step();
    };
    const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    addEventListener('keydown', key);
    hint.onclick = go;
    el.addEventListener('click', (e) => { if (near(e)) go(); });
    el.addEventListener('mousemove', (e) => {
      sc.st.mouse = [(e.clientX / innerWidth - 0.5) * 2, (0.5 - e.clientY / innerHeight) * 2];
      const on = near(e);
      el.classList.toggle('on-cat', on);
      sc.st.hover += ((on ? 1 : 0.35) - sc.st.hover) * 0.25;
    });
  });
}
