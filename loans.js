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

const kop = (v) => (Number.isSafeInteger(v) && v >= 0 && v <= 1e13 ? v : 0);
export const cleanLoan = (x) => (x && typeof x.id === 'string' && /^[\w-]{1,64}$/.test(x.id) && KINDS[x.kind]
  && Number.isSafeInteger(x.left) && x.left >= 0 && x.left <= 1e13
  ? {
    id: x.id, kind: x.kind, name: String(x.name ?? '').trim().slice(0, 60) || KINDS[x.kind].name,
    left: x.left, rate: Math.min(100, Math.max(0, Number(x.rate) || 0)),
    pay: kop(x.pay), total: kop(x.total),
    dir: x.dir === 'them' ? 'them' : 'me',
    due: Number.isFinite(x.due) && x.due > 0 ? x.due : 0,
    // досрочные: ежемесячно сверху и история разовых
    extra: kop(x.extra),
    hist: (Array.isArray(x.hist) ? x.hist : []).filter((h) => h && Number.isFinite(h.d) && kop(h.a) > 0).slice(-200)
      .map((h) => ({ d: h.d, a: h.a, m: h.m === 'pay' ? 'pay' : 'term', p: kop(h.p) })),
    // кредитная карта
    sub: x.kind === 'credit' && x.sub === 'card' ? 'card' : 'loan',
    limit: kop(x.limit), graceTo: Number.isFinite(x.graceTo) && x.graceTo > 0 ? x.graceTo : 0,
    minPct: Math.min(100, Math.max(0, Number(x.minPct) || 0)), fee: kop(x.fee),
  }
  : null);

// Кредитная карта. Льготный период: пока долг гасится полностью до даты, проценты не начисляются.
// Не успели — банк (и в РФ, и за рубежом) обычно начисляет проценты за весь период с даты покупок.
// Минимальный платёж: % от долга (РФ обычно 3–8%, за рубежом ~1%) + проценты, если льготы нет, + обслуживание
export function cardInfo(x, now = Date.now()) {
  const days = x.graceTo ? Math.ceil((x.graceTo - now) / 864e5) : null;
  const grace = days !== null && days >= 0;
  const interest = Math.round((x.left * (x.rate || 0)) / 1200);
  const min = x.left ? Math.min(x.left + (grace ? 0 : interest), Math.round((x.left * (x.minPct || 3)) / 100) + (grace ? 0 : interest)) + (x.fee || 0) : x.fee || 0;
  return {
    days, grace, interest, min,
    avail: x.limit ? Math.max(0, x.limit - x.left) : null,
    util: x.limit ? Math.min(1, x.left / x.limit) : null,
  };
}

// Погашение карты фиксированной суммой в месяц: льгота при частичных платежах теряется, проценты каждый месяц
export function cardPayoff(x, pay) {
  const r = (x.rate || 0) / 1200; const fee = x.fee || 0;
  let bal = x.left; let months = 0; let cost = 0;
  if (!bal) return { months: 0, cost: 0 };
  if (pay <= bal * r + fee) return null;
  while (bal > 0.5 && months < 1200) {
    const i = bal * r + fee;
    cost += i; bal = bal + i - Math.min(bal + i, pay); months++;
  }
  return { months, cost: Math.round(cost) };
}

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
