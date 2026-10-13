// Кэш — маскот. Сидит на кромке таббара, реагирует на события, даёт разовые подсказки.
import { haptic } from './ui.js';

const HEAD = 'M217.7 149.9C218.3 154.7 216.9 155.4 216.7 157.6C216.5 159.8 216.8 161.4 216.5 163C216.2 164.7 215.3 166.1 214.8 167.6C214.2 169 213.5 170.3 213.2 171.7C212.8 173.2 213.1 175 212.6 176.4C212.1 177.8 211.4 179.3 210.3 180.2C209.1 181.2 206.8 181.1 205.7 182.1C204.6 183.2 204.6 185.2 203.6 186.4C202.6 187.6 201.4 188.7 200 189.3C198.5 190 196.3 189.4 194.8 190.2C193.3 190.9 192.5 193 191 193.8C189.5 194.6 187.5 194.3 185.8 195C184.1 195.7 182.7 197.2 180.9 197.8C179.1 198.5 177 198.4 175 199C173.1 199.7 171.3 201.3 169.1 201.8C167 202.2 164.6 201.6 162.2 201.6C159.9 201.6 157.5 201.5 154.9 201.8C152.4 202.1 149.9 203.2 147.1 203.4C144.2 203.7 141.7 203.2 138 203.2C134.3 203.2 129.3 203.2 125 203.5C120.7 203.8 115.7 205.2 112 205.1C108.3 205 105.8 203.2 103 202.8C100.1 202.3 97.5 202.6 95 202.6C92.4 202.6 90 202.6 87.6 202.5C85.3 202.4 82.9 202.8 80.8 202.1C78.7 201.4 77.1 199.1 75.1 198.4C73.2 197.7 71 198.4 69.1 197.8C67.3 197.3 65.7 196.1 64.1 195.3C62.5 194.5 61 193.5 59.5 192.8C57.9 192 56.2 191.7 54.8 190.8C53.5 190 52.5 188.6 51.2 187.8C49.8 187 47.8 187 46.6 186.1C45.5 185.2 45.2 183.3 44.2 182.2C43.2 181.1 41.5 180.7 40.7 179.5C39.9 178.3 40 176.5 39.5 175.2C39 173.8 38.4 172.7 37.5 171.5C36.5 170.3 34.6 169.3 33.9 168C33.1 166.6 33.1 164.8 32.9 163.1C32.6 161.4 32.2 159.8 32.4 157.7C32.7 155.5 33.7 154.9 34.3 150.1C34.9 145.4 35.4 133 35.9 129.1C36.4 125.2 36.9 136.8 37.4 127C37.8 117.1 37.2 84.8 38.4 70C39.7 55.1 42.3 45.4 45 38C47.8 30.6 51.3 25.1 55.1 25.7C58.8 26.3 62.4 35.3 67.3 41.7C72.3 48.1 78.9 55 84.8 64.1C90.7 73.3 99.7 91 102.8 96.6C105.9 102.2 103 97.6 103.6 97.6C104.2 97.6 105.6 96.9 106.6 96.8C107.6 96.8 108.7 97.4 109.7 97.4C110.7 97.4 111.7 97.1 112.8 97.1C113.8 97.1 114.8 97.5 115.8 97.4C116.8 97.3 117.9 96.9 118.9 96.5C119.9 96.1 120.9 95 121.9 95.1C123 95.1 124 96.6 125 97C126 97.4 127 97.3 128.1 97.3C129.1 97.3 130.1 97.3 131.1 97.2C132.1 97 133.2 96.3 134.2 96.2C135.2 96.2 136.2 96.9 137.3 96.7C138.3 96.6 139.3 95.3 140.4 95.4C141.4 95.5 142.3 97 143.4 97.2C144.4 97.5 145.9 96.9 146.5 96.7C147 96.5 143.6 102.1 146.5 96.2C149.4 90.3 158.8 69.6 163.9 61.4C169.1 53.2 174.6 47.4 177.2 47C179.9 46.5 178.2 56.8 180 58.9C181.7 61 185 64.5 188 59.5C190.9 54.4 194.4 31.5 197.6 28.6C200.8 25.7 204.5 35 207.2 41.9C210 48.8 212.9 55.8 214 69.9C215 84.1 213.7 117.1 213.6 127C213.4 136.8 212.5 125.4 213.2 129.3C213.9 133.1 217.2 145.2 217.7 149.9Z';
const NOSE = '<path d="M119 177H131L125 184Z" fill="#9BE7B4"/>';
const SMILE = '<path d="M116 186Q120.5 191 125 186Q129.5 191 134 186" fill="none" stroke="E" stroke-width="2.6" stroke-linecap="round"/>';
const paw = (x) => `<ellipse cx="${x}" cy="206" rx="15" ry="11.7" fill="B"/><path d="M${x - 5} 214.7V208.7M${x + 5} 214.7V208.7" stroke="E" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
const PAWS = paw(88) + paw(162);
const eyes = (dx = 0, dy = 0, rx = 16, ry = 19, pr = 7.5) => `<g class="k-eyes">${[91, 159].map((x) => `<ellipse cx="${x}" cy="154" rx="${rx}" ry="${ry}" fill="E"/><circle cx="${x + dx}" cy="${154 + dy}" r="${pr}" fill="B"/><circle cx="${x + dx + 2.6}" cy="${151.2 + dy}" r="2.1" fill="E"/>`).join('')}</g>`;
const arcs = (w = 7) => [91, 159].map((x) => `<path d="M${x - 14} 160Q${x} 138 ${x + 14} 160" fill="none" stroke="E" stroke-width="${w}" stroke-linecap="round"/>`).join('');
const star = (x, y, r) => { const k = r * 0.28; return `<path d="M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z" fill="#9BE7B4"/>`; };

const POSES = {
  'Ждёт': eyes() + NOSE + PAWS,
  'Привет': arcs() + NOSE + SMILE + paw(88) + '<path d="M184.2 150C183.6 144.3 196 133.8 200.3 126.2C204.7 118.6 207.7 110.1 210.4 104.2C213.1 98.3 213.2 93.2 216.4 90.6C219.7 87.9 227 86.4 229.8 88.3C232.6 90.2 234.5 95.2 233.3 101.9C232.2 108.5 227.6 118.6 222.7 128.3C217.8 138 210.4 156.4 204 160C197.6 163.7 184.8 155.6 184.2 150Z" fill="B"/><path d="M228 72l4-10M240 80l8-6M244 94h9" stroke="B" stroke-width="3" stroke-linecap="round"/>',
  'Рад': arcs() + NOSE + SMILE + PAWS,
  'Думает': eyes(5, -6) + NOSE + PAWS + '<circle cx="230" cy="104" r="5" fill="B"/><circle cx="248" cy="80" r="9" fill="B"/>',
  'Переживает': eyes() + '<path d="M69 128H113V146Z" fill="B"/><path d="M137 128H181L137 146Z" fill="B"/>' + NOSE + PAWS,
  'Удивлён': eyes(0, 0, 19, 22, 5.5) + NOSE + PAWS + '<path d="M12 70l12 10M250 66l-12 12M18 106l12 2M244 104l-12 3" stroke="B" stroke-width="4" stroke-linecap="round"/>',
  'Спит': [91, 159].map((x) => `<path d="M${x - 13} 152Q${x} 165 ${x + 13} 152" fill="none" stroke="E" stroke-width="6" stroke-linecap="round"/>`).join('') + NOSE + PAWS + '<path class="k-z" d="M226 96h14l-14 16h14" fill="none" stroke="B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path class="k-z k-z2" d="M246 64h10l-10 11h10" fill="none" stroke="B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>',
  'Ликует': arcs(7.5) + NOSE + '<path d="M113 187Q125 203 137 187Z" fill="E"/>' + PAWS + star(244, 58, 9) + star(10, 64, 7) + star(232, 128, 5) + star(22, 124, 5),
  'Сомневается': '<ellipse cx="91" cy="154" rx="16" ry="19" fill="E"/><circle cx="97" cy="156" r="7.5" fill="B"/><circle cx="99.6" cy="153.2" r="2.1" fill="E"/><ellipse cx="159" cy="154" rx="16" ry="19" fill="E"/><circle cx="165" cy="156" r="7.5" fill="B"/><circle cx="167.6" cy="153.2" r="2.1" fill="E"/><rect x="137" y="128" width="44" height="26" fill="B"/><path d="M76 122Q92 112 106 120" fill="none" stroke="E" stroke-width="4" stroke-linecap="round"/>' + NOSE + '<path d="M113 191q4-4 8 0t8 0 8 0" fill="none" stroke="E" stroke-width="2.6" stroke-linecap="round"/>' + PAWS,
  'Грустит': eyes(0, 6) + '<path d="M69 128H113L69 150Z" fill="B"/><path d="M137 128H181V150Z" fill="B"/>' + NOSE + '<path d="M115 194Q125 185 135 194" fill="none" stroke="E" stroke-width="2.6" stroke-linecap="round"/><path d="M78 172C81 178 82 181 79 183.5C76 185 73.5 182 75.5 178Z" fill="E"/>' + PAWS,
};

// Белый Кэш для тёмного интерфейса: тело светлое, глаза тёмные
export const keshSVG = (pose = 'Ждёт') =>
  `<svg viewBox="-6 -4 276 256" aria-hidden="true"><path d="${HEAD}" fill="#ECECEE"/>${(POSES[pose] || POSES['Ждёт']).replaceAll('"B"', '"#ECECEE"').replaceAll('"E"', '"#0B0B0C"')}</svg>`;

export const keshOn = () => localStorage.getItem('kesh') !== '0';
export const hintsOn = () => localStorage.getItem('keshHints') !== '0';
export const setKesh = (on) => { localStorage.setItem('kesh', on ? '1' : '0'); place(); };
export const setHints = (on) => localStorage.setItem('keshHints', on ? '1' : '0');
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let el, bubble, bubbleScreen, pose = '', revertTimer, idleTimer, bubbleTimer, curled = false;
const night = () => { const h = new Date().getHours(); return h >= 23 || h < 7; };
const restPose = () => (night() ? 'Спит' : 'Ждёт');

function draw(p) {
  if (!el || p === pose) return;
  pose = p;
  el.innerHTML = keshSVG(p);
  el.dataset.pose = p;
  if (!calm()) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

function resetIdle() {
  clearTimeout(idleTimer);
  if (curled) return;
  if (pose === 'Спит' && !night()) draw('Ждёт');
  idleTimer = setTimeout(() => { if (!revertTimer) draw('Спит'); }, 30000);
}

// Реакция на событие: поза на время, потом обратно в покой
export function keshReact(p, ms = 1600) {
  if (!el || curled) return;
  clearTimeout(revertTimer);
  draw(p);
  revertTimer = setTimeout(() => { revertTimer = null; draw(restPose()); }, ms);
  resetIdle();
}

const seen = () => { try { return new Set(JSON.parse(localStorage.getItem('keshSeen')) || []); } catch { return new Set(); } };

// Разовая подсказка: одна на экран, закрывается тапом или через 6 с
export function keshHint(key, text, action, onAction, p = 'Показывает') {
  if (el) place(); // экран мог смениться только что
  if (!el || !keshOn() || !hintsOn() || el.hidden || bubble) return false;
  const s = seen();
  if (key && s.has(key)) return false;
  if (key) { s.add(key); localStorage.setItem('keshSeen', JSON.stringify([...s].slice(-200))); }
  keshReact(p === 'Показывает' ? 'Думает' : p, 6000);
  bubble = document.createElement('div');
  bubble.className = 'kesh-bubble';
  bubble.setAttribute('role', 'status');
  bubble.innerHTML = '<p></p>' + (action ? '<button></button>' : '');
  bubble.querySelector('p').textContent = text;
  if (action) bubble.querySelector('button').textContent = action;
  bubbleScreen = document.querySelector('#app .screen');
  document.body.appendChild(bubble);
  positionBubble();
  const close = () => { clearTimeout(bubbleTimer); bubble?.remove(); bubble = null; };
  bubble.onclick = (e) => { if (action && e.target.closest('button')) onAction?.(); close(); };
  bubbleTimer = setTimeout(close, action ? 9000 : 6000);
  return true;
}

function positionBubble() {
  if (!bubble || !el) return;
  const r = el.getBoundingClientRect();
  bubble.style.bottom = `${window.innerHeight - r.top + 62}px`; // выше тоста
}

// Кэш виден только на экранах с таббаром: сидит на его верхней кромке справа
function place() {
  if (!el) return;
  const bar = document.querySelector('#app .tabbar');
  const show = keshOn() && !!bar;
  el.hidden = !show;
  // подсказка относится к своему экрану — при смене экрана убираем
  if (bubble && (!show || !bubbleScreen?.isConnected)) { clearTimeout(bubbleTimer); bubble.remove(); bubble = null; }
  if (!show) return;
  const b = bar.getBoundingClientRect();
  const h = el.offsetHeight || 48;
  el.style.top = `${b.top - h * 0.8}px`;
  el.style.left = `${Math.min(b.right, window.innerWidth) - el.offsetWidth - 22}px`;
  positionBubble();
}

function poke(e) {
  e.stopPropagation();
  haptic();
  clearTimeout(revertTimer); revertTimer = null;
  if (curled) { curled = false; draw('Рад'); revertTimer = setTimeout(() => { revertTimer = null; draw(restPose()); }, 1200); resetIdle(); return; }
  curled = true; draw('Спит');
  setTimeout(() => { if (curled) { curled = false; draw(restPose()); resetIdle(); } }, 5000);
}

export function startKesh(appEl) {
  el = document.createElement('button');
  el.id = 'kesh';
  el.type = 'button';
  el.setAttribute('aria-label', 'Кэш');
  el.addEventListener('click', poke);
  document.body.appendChild(el);
  draw(restPose());
  new MutationObserver(() => requestAnimationFrame(place)).observe(appEl, { childList: true });
  window.addEventListener('resize', place);
  document.addEventListener('pointerdown', resetIdle, { passive: true });
  place();
  resetIdle();
}

// Кэш на экране ввода: поза зависит от суммы
export function amountPose(kind, kop) {
  if (kind === 'in') return kop >= 500000 ? ['Ликует', 'Вот это поступление!'] : ['Ждёт', ''];
  if (kop >= 1500000) return ['Грустит', 'Ну ладно… записываю.'];
  if (kop >= 500000) return ['Сомневается', 'Хм… уверен?'];
  return ['Ждёт', ''];
}
