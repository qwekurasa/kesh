// Заставка-мультик: ночные холмы, Кэш скачет за клубком, потом перепрыгивает в угол интерфейса
// и живёт там тихо: сидит, иногда трогает клубок лапой.
import { keshSVG } from '../kesh.js';
import { L } from '../i18n.js';

const W = 1600;
const rnd = (a, b) => a + Math.random() * (b - a);

// Холм как замкнутая волна; ширина 2W, чтобы бесшовно прокручивать
function hill(y, amp, waves, seed) {
  let d = `M0 ${y}`;
  const n = waves * 2;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * W * 2;
    const k = Math.sin(i * 1.7 + seed) * amp;
    d += ` Q${x - W / n} ${y - amp - k} ${x} ${y + (i % waves === 0 ? 0 : k * 0.3)}`;
  }
  return `${d} V900 H0 Z`;
}

function flowers(y, count, colors) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = rnd(0, W * 2);
    const yy = y + rnd(0, 120);
    s += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="${rnd(1.6, 4.2).toFixed(1)}" fill="${colors[i % colors.length]}" opacity="${rnd(0.45, 0.95).toFixed(2)}"/>`;
  }
  return s;
}

export function scene(fit = 'xMidYMid slice', vb = `0 0 ${W} 900`) {
  const stars = Array.from({ length: 90 }, () => `<circle class="st" cx="${rnd(0, W).toFixed(0)}" cy="${rnd(0, 420).toFixed(0)}" r="${rnd(0.6, 1.8).toFixed(1)}" style="animation-delay:${rnd(0, 4).toFixed(2)}s"/>`).join('');
  const river = 'M-100 430C200 360 420 300 700 330S1150 420 1400 300S1700 170 1800 200';
  const motes = Array.from({ length: 70 }, (_, i) => `<circle class="mote" r="${rnd(1, 2.6).toFixed(1)}" style="offset-distance:${((i / 70) * 100).toFixed(1)}%;animation-delay:-${rnd(0, 9).toFixed(2)}s"/>`).join('');
  return `<svg class="sc" viewBox="${vb}" preserveAspectRatio="${fit}" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a16"/><stop offset=".55" stop-color="#151c38"/><stop offset="1" stop-color="#2b3260"/></linearGradient>
      <linearGradient id="riv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fe3ff" stop-opacity="0"/><stop offset=".45" stop-color="#ffd6f0" stop-opacity=".85"/><stop offset="1" stop-color="#a6f0c0" stop-opacity="0"/></linearGradient>
      <radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7e0"/><stop offset=".35" stop-color="#ffe9b8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0"/></filter>
    </defs>
    <rect width="${W}" height="900" fill="url(#sky)"/>
    <g class="stars">${stars}</g>
    <circle cx="1270" cy="150" r="120" fill="url(#moon)" opacity=".55"/>
    <circle cx="1270" cy="150" r="34" fill="#fff4dc"/>
    <path d="${river}" fill="none" stroke="url(#riv)" stroke-width="70" filter="url(#blur)" opacity=".55"/>
    <path d="${river}" fill="none" stroke="url(#riv)" stroke-width="6" filter="url(#soft)" opacity=".8"/>
    <g class="motes" style="--path:path('${river}')">${motes}</g>
    <g class="cloud c1"><ellipse cx="300" cy="470" rx="380" ry="40" fill="#8d8fc4" opacity=".22" filter="url(#blur)"/><ellipse cx="1300" cy="440" rx="420" ry="46" fill="#a49ad0" opacity=".2" filter="url(#blur)"/></g>
    <g class="hl h1"><path d="${hill(560, 40, 4, 1)}" fill="#1b2a3a"/></g>
    <g class="hl h2"><path d="${hill(640, 36, 5, 3)}" fill="#1a3532"/>${flowers(650, 60, ['#8f86c9', '#6f7fb8'])}</g>
    <g class="hl h3"><path d="${hill(735, 26, 3, 5)}" fill="#203f33"/>${flowers(745, 220, ['#c9a7ef', '#e8c6ff', '#9fb2ff', '#ffd1ec'])}</g>
    <rect width="${W}" height="900" filter="url(#grain)" opacity=".9"/>
  </svg>`;
}

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

// Заставка. Возвращает промис, который завершается, когда Кэш долетел до своего места.
export function playIntro(getSlot) {
  const first = !sessionStorage.getItem('kIntro');
  const el = document.getElementById('loader');
  if (reduced() || !first) {
    el.classList.add('quick');
    return new Promise((r) => setTimeout(() => { el.classList.add('done'); mountPet(getSlot()); r(); }, first ? 300 : 450));
  }
  sessionStorage.setItem('kIntro', '1');
  el.innerHTML = `${scene()}
    <div class="ld-title"><h1>${L('Кэш', 'Kesh')}</h1><p>${L('Траты под контролем.', 'Spending, under control.')}</p></div>
    <div class="ld-run"><span class="ld-thread"></span><div class="ld-yarn">${yarn}</div><div class="ld-cat">${keshSVG('Рад')}</div><span class="ld-shadow"></span></div>
    <div class="ld-foot"><span>${L('Без регистрации. Данные только у вас.', 'No sign-up. Your data stays with you.')}</span><div class="ld-bar"><i></i></div><button class="ld-skip">${L('Пропустить', 'Skip')}</button></div>`;
  return new Promise((resolve) => {
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      const cat = el.querySelector('.ld-cat');
      const slot = getSlot();
      const target = slot?.getBoundingClientRect();
      el.classList.add('leaving');
      if (cat && target && target.width) {
        // Последний прыжок — в уголок интерфейса
        const from = cat.getBoundingClientRect();
        const dx = target.left + 8 - from.left;
        const dy = target.top + target.height - 50 - from.top;
        const s = 44 / from.width;
        cat.style.animation = 'none';
        await cat.animate([
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 220}px) scale(${(1 + s) / 2}) rotate(-12deg)`, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        ], { duration: 900, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' }).finished.catch(() => {});
      }
      el.classList.add('done');
      mountPet(slot);
      resolve();
    };
    el.querySelector('.ld-skip').onclick = finish;
    setTimeout(finish, 3400);
  });
}
