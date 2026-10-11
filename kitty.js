// Котик: сидит на верхнем крае кнопок и перепрыгивает между ними по баллистике.
// Нажатие — сворачивается в клубок, повторное нажатие — просыпается.
import { haptic } from './ui.js';

const G = 2600; // ускорение свободного падения, px/s²
const S = 36; // размер котика, px
const FUR = '#ece9f1', SHADE = '#cfcbd8', PINK = '#f4a9bb', INK = '#1b1a20';

const POSES = {
  sit: `<svg viewBox="0 0 48 48">
    <path class="k-tail" d="M30 44c9 1 13-5 11-12" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
    <path d="M13 47c-2-10 2-18 11-18s13 8 11 18z" fill="${FUR}"/>
    <ellipse cx="18.5" cy="46" rx="3.2" ry="2" fill="#fff"/><ellipse cx="29.5" cy="46" rx="3.2" ry="2" fill="#fff"/>
    <path d="M14 12 15.5 2 22.5 8z M34 12 32.5 2 25.5 8z" fill="${FUR}"/>
    <circle cx="24" cy="18" r="11" fill="${FUR}"/>
    <path d="M15.9 8.6 16.6 4.8 19.4 7.2z M32.1 8.6 31.4 4.8 28.6 7.2z" fill="${PINK}"/>
    <g class="k-eyes"><ellipse cx="19.5" cy="18" rx="1.6" ry="2.2" fill="${INK}"/><ellipse cx="28.5" cy="18" rx="1.6" ry="2.2" fill="${INK}"/></g>
    <circle cx="16.4" cy="22" r="1.7" fill="${PINK}" opacity=".45"/><circle cx="31.6" cy="22" r="1.7" fill="${PINK}" opacity=".45"/>
    <path d="M22.6 21.4h2.8L24 23z" fill="${PINK}"/>
    <path d="M24 23c-.4 1.3-1.9 1.7-2.9 1M24 23c.4 1.3 1.9 1.7 2.9 1" stroke="#9c97a8" stroke-width=".9" fill="none" stroke-linecap="round"/>
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
    <path d="M14 33c3-5 8-7 12-7" stroke="#dcd8e4" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M12 41c4 6 18 7 25 1" fill="none" stroke="${SHADE}" stroke-width="4" stroke-linecap="round"/>
    <path d="M26 28l2-6.5 4.2 4.8z M33 29.5l3.6-5.4 1.4 6.4z" fill="${FUR}"/>
    <path d="M27.6 34q1.5 1.2 3 0M33.2 34.4q1.3 1 2.6 0" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <text class="k-z" x="38" y="17" font-size="9" font-weight="700" fill="#9a9aa4">z</text>
  </svg>`,
};

let el, flip, x = 0, y = 0, vx = 0, vy = 0, face = 1;
let mode = 'off'; // sit | crouch | fly | fall | ball
let perch = null, offX = 0, target = null, flyT = 0, flyDur = 0, sx = 0, sy = 0;
let timer = 0, pose = '', cache = [], cacheAt = 0, last = 0;

export const kittyOn = () => localStorage.getItem('kitty') !== '0';

export function setKitty(on) {
  localStorage.setItem('kitty', on ? '1' : '0');
  on ? spawn() : hide();
}

const floor = () => window.innerHeight - 2;
const rand = (a, b) => a + Math.random() * (b - a);

function platforms() {
  const out = [];
  const vh = window.innerHeight;
  document.querySelectorAll('#app button, .modal button').forEach((b) => {
    if (b.disabled) return;
    const r = b.getBoundingClientRect();
    if (r.width < 34 || r.height < 18 || r.top < 64 || r.top > vh - 6 || r.left < 0 || r.right > window.innerWidth) return;
    // верхний край должен быть виден, а не перекрыт шапкой или краем прокрутки
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 2);
    if (!hit || !b.contains(hit)) return;
    out.push({ el: b, r });
  });
  return out;
}

function setPose(p) {
  if (p === pose) return;
  pose = p;
  flip.innerHTML = `<div class="k-body">${POSES[p]}</div>`;
}

function draw() {
  el.style.transform = `translate(${x - S / 2}px, ${y - S}px)`;
  const tilt = mode === 'fly' || mode === 'fall' ? Math.max(-24, Math.min(24, vy * 0.013)) : 0;
  flip.style.transform = `scaleX(${face}) rotate(${tilt}deg)`;
}

function land(p, now) {
  perch = p?.el || null;
  y = p ? p.r.top : floor();
  if (p) x = Math.max(p.r.left + 12, Math.min(p.r.right - 12, x));
  offX = p ? x - p.r.left : 0;
  vx = vy = 0;
  mode = 'sit';
  setPose('sit');
  el.classList.remove('land');
  void el.offsetWidth;
  el.classList.add('land');
  timer = now + rand(perch ? 1800 : 600, perch ? 5200 : 1400);
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
      const tx = rand(p.r.left + 14, p.r.right - 14);
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
  if (!perch) { y = floor(); return; }
  if (!perch.isConnected) {
    // экран перерисовался — ищем кнопку на том же месте
    const hit = document.elementFromPoint(x, y + 3)?.closest('button');
    if (hit && !hit.disabled && Math.abs(hit.getBoundingClientRect().top - y) < 6) {
      perch = hit;
      offX = x - hit.getBoundingClientRect().left;
    } else return fall();
  }
  const r = perch.getBoundingClientRect();
  if (!r.width || r.top < 56 || r.top > window.innerHeight) return fall();
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
          x = Math.max(r.left + 12, Math.min(r.right - 12, sx + vx * flyDur));
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
    else if (y >= floor()) land(null, now);
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
