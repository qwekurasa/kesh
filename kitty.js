// Котик: сидит на видимых поверхностях (кнопки, иконки, карточки) и перепрыгивает между ними по баллистике.
// Нажатие — сворачивается в клубок, повторное нажатие — просыпается.
import { haptic } from './ui.js';

const G = 2600; // ускорение свободного падения, px/s²
const S = 36; // размер котика, px
export const COATS = {
  white: { name: 'Белый', fur: '#f1eff5', shade: '#d3cfdb', paw: '#ffffff', eye: '#1b1a20', line: '#9c97a8' },
  grey: { name: 'Серый', fur: '#a3a2ae', shade: '#80808c', paw: '#cfced8', eye: '#1b1a20', line: '#5f5e69' },
  black: { name: 'Чёрный', fur: '#3a3942', shade: '#26252c', paw: '#4a4953', eye: '#e3ee72', line: '#77768a' },
  orange: { name: 'Рыжий', fur: '#f3a54e', shade: '#d9822e', paw: '#ffe3c2', eye: '#1b1a20', line: '#a65e1c' },
};
const PINK = '#f4a9bb';
export const kittyCoat = () => (COATS[localStorage.getItem('kittyCoat')] ? localStorage.getItem('kittyCoat') : 'white');

const poses = ({ fur: FUR, shade: SHADE, paw: PAW, eye: INK, line: LINE }) => ({
  sit: `<svg viewBox="0 0 48 48">
    <path class="k-tail" d="M30 44c9 1 13-5 11-12" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
    <path d="M13 47c-2-10 2-18 11-18s13 8 11 18z" fill="${FUR}"/>
    <ellipse cx="18.5" cy="46" rx="3.2" ry="2" fill="${PAW}"/><ellipse cx="29.5" cy="46" rx="3.2" ry="2" fill="${PAW}"/>
    <path d="M14 12 15.5 2 22.5 8z M34 12 32.5 2 25.5 8z" fill="${FUR}"/>
    <circle cx="24" cy="18" r="11" fill="${FUR}"/>
    <path d="M15.9 8.6 16.6 4.8 19.4 7.2z M32.1 8.6 31.4 4.8 28.6 7.2z" fill="${PINK}"/>
    <g class="k-eyes"><ellipse cx="19.5" cy="18" rx="1.6" ry="2.2" fill="${INK}"/><ellipse cx="28.5" cy="18" rx="1.6" ry="2.2" fill="${INK}"/></g>
    <circle cx="16.4" cy="22" r="1.7" fill="${PINK}" opacity=".45"/><circle cx="31.6" cy="22" r="1.7" fill="${PINK}" opacity=".45"/>
    <path d="M22.6 21.4h2.8L24 23z" fill="${PINK}"/>
    <path d="M24 23c-.4 1.3-1.9 1.7-2.9 1M24 23c.4 1.3 1.9 1.7 2.9 1" stroke="${LINE}" stroke-width=".9" fill="none" stroke-linecap="round"/>
  </svg>`,
  jump: `<svg viewBox="0 0 48 48">
    <path d="M10 27c-6-1-9-6-8-11" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 31 7 39M33 31l8 6" stroke="${FUR}" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="22" cy="28" rx="14" ry="7" fill="${FUR}"/>
    <path d="M31 16l1-9 6 5z M38.5 14l3-7.5 3 7.5z" fill="${FUR}"/>
    <circle cx="37" cy="21" r="8.5" fill="${FUR}"/>
    <path d="M32.6 13.6l.6-4 3 2.6z" fill="${PINK}"/>
    <ellipse cx="40" cy="20" rx="1.4" ry="2" fill="${INK}"/>
    <path d="M44.4 22.4l1.5.3-1 1.1z" fill="${PINK}"/>
  </svg>`,
  ball: `<svg viewBox="0 0 48 48">
    <ellipse cx="24" cy="37" rx="14" ry="10.5" fill="${FUR}"/>
    <path d="M14 33c3-5 8-7 12-7" stroke="${SHADE}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M12 41c4 6 18 7 25 1" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
    <path d="M26 28l2-6.5 4.2 4.8z M33 29.5l3.6-5.4 1.4 6.4z" fill="${FUR}"/>
    <path d="M27.6 34q1.5 1.2 3 0M33.2 34.4q1.3 1 2.6 0" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <text class="k-z" x="38" y="17" font-size="9" font-weight="700" fill="#9a9aa4">z</text>
  </svg>`,
});

let el, flip, x = 0, y = 0, vx = 0, vy = 0, face = 1;
let mode = 'off'; // sit | crouch | fly | fall | ball
let perch = null, offX = 0, target = null, flyT = 0, flyDur = 0, sx = 0, sy = 0;
let checkAt = 0, timer = 0, pose = '', cache = [], cacheAt = 0, last = 0;

// По умолчанию включён, но не при системной настройке «уменьшить движение» — тогда только по явному выбору
export const kittyOn = () => {
  const v = localStorage.getItem('kitty');
  return v === null ? !matchMedia('(prefers-reduced-motion: reduce)').matches : v !== '0';
};

export function setCoat(coat) {
  localStorage.setItem('kittyCoat', coat);
  if (el) { pose = ''; setPose(mode === 'ball' ? 'ball' : mode === 'fly' || mode === 'fall' ? 'jump' : 'sit'); }
}

export function setKitty(on) {
  localStorage.setItem('kitty', on ? '1' : '0');
  on ? spawn() : hide();
}

const rand = (a, b) => a + Math.random() * (b - a);

const SURFACES = '#app .tabbar, #app .btn, #app .icon-btn, #app .chip, #app .tab.add, #app .seg, #app .pill, #app .card, #app .day, '
  + '#app .field, #app .amount-chip, #app .search-bar, #app .tr-ico, #app .cat .ico, #app .tab svg, #app .row > svg, .modal';
const seen = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);

// Поверхность: у элемента видна верхняя граница (заливка, рамка или это сама иконка)
function visible(n) {
  if (n instanceof SVGElement) return true;
  const cs = getComputedStyle(n);
  return seen(cs.backgroundColor) || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && seen(cs.borderTopColor));
}

function platforms() {
  const out = [];
  const vh = window.innerHeight;
  document.querySelectorAll(SURFACES).forEach((n) => {
    if (n.disabled || n.closest('[disabled]')) return;
    const r = n.getBoundingClientRect();
    if (r.width < 18 || r.height < 14 || r.top < 64 || r.top > vh - 6 || r.left < 0 || r.right > window.innerWidth) return;
    if (!visible(n)) return;
    // верхний край не должен быть перекрыт шапкой или срезан прокруткой
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 2);
    if (!hit || !(hit === n || n.contains(hit) || hit === n.parentElement)) return;
    out.push({ el: n, r });
  });
  return out;
}

function setPose(p) {
  if (p === pose) return;
  pose = p;
  flip.innerHTML = `<div class="k-body">${poses(COATS[kittyCoat()])[p]}</div>`;
  el.dataset.coat = kittyCoat();
}

function draw() {
  el.style.transform = `translate(${x - S / 2}px, ${y - S}px)`;
  const tilt = mode === 'fly' || mode === 'fall' ? Math.max(-24, Math.min(24, vy * 0.013)) : 0;
  flip.style.transform = `scaleX(${face}) rotate(${tilt}deg)`;
}

// узкую поверхность (иконку) котик занимает по центру
const seat = (r, px) => (r.width < 40 ? r.left + r.width / 2 : Math.max(r.left + 12, Math.min(r.right - 12, px)));

function land(p, now) {
  perch = p.el;
  y = p.r.top;
  x = seat(p.r, x);
  offX = x - p.r.left;
  vx = vy = 0;
  mode = 'sit';
  setPose('sit');
  el.classList.remove('land');
  void el.offsetWidth;
  el.classList.add('land');
  timer = now + rand(1800, 5200);
  checkAt = now + 400;
}

function fall() {
  perch = null;
  mode = 'fall';
  setPose('jump');
  cacheAt = 0;
}

function pickTarget() {
  const list = platforms()
    .filter((p) => p.el !== perch)
    .map((p) => {
      const tx = p.r.width < 40 ? p.r.left + p.r.width / 2 : rand(p.r.left + 14, p.r.right - 14);
      const dx = tx - x, dy = p.r.top - y;
      return { p, tx, dx, dy, d: Math.hypot(dx, dy) };
    })
    .filter((c) => Math.abs(c.dx) < 280 && c.dy > -300 && c.dy < 460 && c.d > 36);
  if (!list.length) return null;
  // ближние кнопки вероятнее дальних
  const w = list.map((c) => 1 / (c.d + 80));
  let k = Math.random() * w.reduce((a, b) => a + b, 0);
  return list.find((_, i) => (k -= w[i]) <= 0) || list[0];
}

function jump(c) {
  target = c;
  sx = x; sy = y;
  flyDur = Math.max(0.42, Math.min(0.78, 0.36 + c.d / 1400));
  // скорость выбирается так, чтобы ровно через flyDur оказаться на цели
  vx = c.dx / flyDur;
  vy = (c.dy - 0.5 * G * flyDur * flyDur) / flyDur;
  face = c.dx >= 0 ? 1 : -1;
  flyT = 0;
  mode = 'fly';
  perch = null;
  setPose('jump');
}

function follow(now) {
  if (!perch) return fall();
  if (!perch.isConnected) {
    // экран перерисовался — ищем поверхность на том же месте
    const p = platforms().find((q) => Math.abs(q.r.top - y) < 6 && x >= q.r.left - 2 && x <= q.r.right + 2);
    if (!p) return fall();
    perch = p.el;
    offX = x - p.r.left;
  }
  const r = perch.getBoundingClientRect();
  if (!r.width || r.top < 56 || r.top > window.innerHeight) return fall();
  if (now > checkAt) {
    // поверхность уехала под шапку или за край прокрутки — котик падает
    checkAt = now + 400;
    const hit = document.elementFromPoint(r.left + Math.min(offX, r.width - 2), r.top + 2);
    if (!hit || !(hit === perch || perch.contains(hit) || hit === perch.parentElement || hit.closest('#kitty'))) return fall();
  }
  x = r.left + Math.min(offX, r.width - 10);
  y = r.top;
  if (perch.disabled && mode === 'sit') timer = Math.min(timer, now + 300);
}

function step(now) {
  if (mode === 'off') return;
  const dt = Math.min(0.033, (now - (last || now)) / 1000);
  last = now;

  if (mode === 'sit' || mode === 'ball' || mode === 'crouch') follow(now);

  if (mode === 'sit' && now > timer) {
    const c = pickTarget();
    if (c) {
      mode = 'crouch';
      el.classList.add('crouch');
      face = c.dx >= 0 ? 1 : -1;
      setTimeout(() => {
        el.classList.remove('crouch');
        if (mode === 'crouch') jump(c);
      }, 160);
    } else timer = now + 1500;
  } else if (mode === 'ball' && now > timer) {
    mode = 'sit';
    setPose('sit');
    el.classList.remove('ball');
    timer = now + rand(900, 1800);
  } else if (mode === 'fly') {
    flyT += dt;
    if (flyT >= flyDur) {
      const t = target.p;
      if (t.el.isConnected && !t.el.disabled) {
        const r = t.el.getBoundingClientRect();
        if (r.width && Math.abs(r.top - t.r.top) < 120) {
          x = seat(r, sx + vx * flyDur);
          land({ el: t.el, r }, now);
          return draw();
        }
      }
      vy += G * flyT; // текущая скорость в момент, когда цель пропала
      return fall();
    }
    x = sx + vx * flyT;
    y = sy + (vy + 0.5 * G * flyT) * flyT;
    // мгновенная вертикальная скорость — для наклона корпуса
    const v = vy + G * flyT;
    flip.style.transform = `scaleX(${face}) rotate(${Math.max(-24, Math.min(24, v * 0.013))}deg)`;
    el.style.transform = `translate(${x - S / 2}px, ${y - S}px)`;
    return;
  } else if (mode === 'fall') {
    if (now - cacheAt > 200) { cache = platforms(); cacheAt = now; }
    const py = y;
    vy += G * dt;
    x = Math.max(S / 2, Math.min(window.innerWidth - S / 2, x + vx * dt));
    y += vy * dt;
    const hit = vy > 0 && cache.find((p) => {
      const r = p.el.getBoundingClientRect();
      return py <= r.top && y >= r.top && x > r.left + 6 && x < r.right - 6 && (p.r = r);
    });
    if (hit) land(hit, now);
    else if (y > window.innerHeight + 60) { x = rand(60, window.innerWidth - 60); y = -20; vx = 0; vy = 0; }
  }
  draw();
}

function loop(now) {
  step(now);
  if (mode !== 'off') requestAnimationFrame(loop);
}

function poke(e) {
  e.preventDefault();
  e.stopPropagation();
  if (mode === 'ball') {
    haptic();
    timer = 0;
  } else if (mode === 'sit' || mode === 'crouch') {
    haptic();
    el.classList.remove('crouch');
    mode = 'ball';
    setPose('ball');
    el.classList.add('ball');
    timer = performance.now() + 5000;
  }
}

function spawn() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'kitty';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="k-flip"></div>';
    flip = el.firstChild;
    el.addEventListener('pointerdown', poke);
    el.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(el);
  }
  if (mode !== 'off') return;
  el.hidden = false;
  pose = '';
  x = rand(60, window.innerWidth - 60);
  y = 0;
  vx = 0; vy = 0;
  last = 0;
  fall();
  requestAnimationFrame(loop);
}

function hide() {
  mode = 'off';
  perch = null;
  if (el) el.hidden = true;
}

export function startKitty() {
  if (kittyOn()) setTimeout(spawn, 1200);
}
