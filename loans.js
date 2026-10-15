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
