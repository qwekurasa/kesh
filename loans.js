// Ипотека, кредиты и долги: хранятся локально, как вклады
import { L } from './i18n.js';

export const KINDS = {
  mortgage: { name: L('Ипотека', 'Mortgage'), one: L('ипотеку', 'mortgage'), icon: '⌂' },
  credit: { name: L('Кредиты', 'Loans'), one: L('кредит', 'loan'), icon: '%' },
  debt: { name: L('Долги', 'Debts'), one: L('долг', 'debt'), icon: '⇄' },
};

const read = () => { try { const v = JSON.parse(localStorage.getItem('loans')); return Array.isArray(v) ? v : []; } catch { return []; } };
export const loans = (kind) => read().filter((x) => !kind || x.kind === kind);
export const saveLoans = (list) => localStorage.setItem('loans', JSON.stringify(list));

export function putLoan(x) {
  const list = read();
  const i = list.findIndex((y) => y.id === x.id);
  if (i >= 0) list[i] = x; else list.push({ ...x, id: `l${Date.now().toString(36)}` });
  saveLoans(list);
}
export const removeLoan = (id) => saveLoans(read().filter((x) => x.id !== id));

// Сколько месяцев до погашения при ежемесячном платеже (аннуитет); Infinity — платёж не покрывает проценты
export function monthsLeft(x) {
  if (!x.pay || !x.left) return 0;
  const r = (x.rate || 0) / 1200;
  if (!r) return Math.ceil(x.left / x.pay);
  if (x.pay <= x.left * r) return Infinity;
  return Math.ceil(-Math.log(1 - (r * x.left) / x.pay) / Math.log(1 + r));
}

export const cleanLoan = (x) => (x && typeof x.id === 'string' && /^[\w-]{1,64}$/.test(x.id) && KINDS[x.kind]
  && Number.isSafeInteger(x.left) && x.left >= 0 && x.left <= 1e13
  ? {
    id: x.id, kind: x.kind, name: String(x.name ?? '').trim().slice(0, 60) || KINDS[x.kind].name,
    left: x.left, rate: Math.min(100, Math.max(0, Number(x.rate) || 0)),
    pay: Number.isSafeInteger(x.pay) && x.pay >= 0 && x.pay <= 1e13 ? x.pay : 0,
    total: Number.isSafeInteger(x.total) && x.total >= 0 && x.total <= 1e13 ? x.total : 0,
    dir: x.dir === 'them' ? 'them' : 'me',
    due: Number.isFinite(x.due) && x.due > 0 ? x.due : 0,
  }
  : null);

// Разделы экрана «Финансы»: какие включены
export const BLOCKS = ['budget', 'deposits', 'mortgage', 'credit', 'debt'];
export function blocks() {
  try { const v = JSON.parse(localStorage.getItem('blocks')); if (Array.isArray(v)) return v.filter((b) => BLOCKS.includes(b)); } catch { /* по умолчанию */ }
  return ['budget', 'deposits'];
}
export const setBlocks = (list) => localStorage.setItem('blocks', JSON.stringify(list.filter((b) => BLOCKS.includes(b))));

// Досрочное погашение: lump — разово сейчас, extra — каждый месяц сверху платежа.
// mode 'term' — платёж прежний, срок короче; 'pay' — срок прежний, платёж пересчитывается.
// Возвращает месяцы, проценты, первый платёж после пересчёта; null — платёж не покрывает проценты
export function simulate({ left, rate, pay }, { lump = 0, extra = 0, mode = 'term' } = {}) {
  const r = (rate || 0) / 1200;
  const n0 = monthsLeft({ left, rate, pay });
  if (!pay || n0 === Infinity || !n0) return null;
  const ann = (L, n) => (r ? (L * r) / (1 - (1 + r) ** -n) : L / n);
  let bal = Math.max(0, left - lump);
  let p = mode === 'pay' && bal > 0 ? ann(bal, n0) : pay;
  const first = p;
  let months = 0; let interest = 0;
  while (bal > 0.5 && months < 1200) {
    const i = bal * r;
    interest += i;
    bal = bal + i - Math.min(bal + i, p + extra);
    months++;
    if (mode === 'pay' && bal > 0 && n0 - months > 0) p = ann(bal, n0 - months);
  }
  return { months, interest: Math.round(interest), pay: Math.round(first) };
}

// Операция с категорией «Долг» → запись во вкладке «Долги».
// Расход: я дал в долг (или вернул свой долг), доход: мне дали в долг (или вернули мой).
// Имя берётся из комментария; возвращает текст для подсказки
export function applyDebt(note, amount, income) {
  const name = String(note || '').trim().slice(0, 60) || L('Без имени', 'No name');
  const list = read();
  const key = name.toLowerCase();
  const same = (x, dir) => x.kind === 'debt' && x.dir === dir && x.name.toLowerCase() === key;
  // сначала гасим встречный долг с этим человеком
  const back = list.find((x) => same(x, income ? 'them' : 'me'));
  let rest = amount;
  if (back) {
    const k = Math.min(back.left, rest);
    back.left -= k; rest -= k;
    if (!back.left) list.splice(list.indexOf(back), 1);
  }
  if (rest > 0) {
    const dir = income ? 'me' : 'them';
    const cur = list.find((x) => same(x, dir));
    if (cur) cur.left += rest;
    else list.push({ id: `l${Date.now().toString(36)}`, kind: 'debt', name, left: rest, rate: 0, pay: 0, total: 0, dir, due: 0 });
  }
  saveLoans(list);
  if (!blocks().includes('debt')) setBlocks([...blocks(), 'debt']);
  if (back && rest === 0) return L(`${name}: долг уменьшен`, `${name}: debt reduced`);
  return income ? L(`Записал: я должен — ${name}`, `Saved: I owe ${name}`) : L(`Записал: ${name} должен мне`, `Saved: ${name} owes me`);
}
