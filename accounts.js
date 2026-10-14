// Счета: наличные, карта, накопления, кредитка. Остаток = старт + доходы − расходы с даты создания счёта
import * as store from './store.js';
import { L, SYM } from './i18n.js';

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* хранилище недоступно */ } };
const parse = (k) => { try { return JSON.parse(get(k)); } catch { return null; } };

export const TYPES = {
  cash: { name: L('Наличные', 'Cash'), sub: L('Доступный остаток', 'Available balance'), icon: SYM },
  card: { name: L('Карта', 'Card'), sub: L('Остаток на карте', 'Card balance'), icon: '▭' },
  savings: { name: L('Накопления', 'Savings'), sub: L('Сберегательный счёт', 'Savings account'), icon: '◇' },
  credit: { name: L('Кредитная карта', 'Credit card'), sub: L('Доступный кредитный лимит', 'Available credit'), icon: '▣' },
};

export function accounts() {
  let list = parse('accounts');
  if (!Array.isArray(list)) {
    // переход со старого «кошелька»: он учитывал все операции — счёт помечается all
    const w = parse('wallet');
    list = w && Number.isFinite(w.base) ? [{ id: `a${w.from.toString(36)}`, name: L('Кошелёк', 'Wallet'), type: 'cash', base: w.base, from: w.from, all: true }] : [];
    saveAccounts(list);
    put('wallet', null);
  }
  return list;
}
export const saveAccounts = (list) => put('accounts', JSON.stringify(list));
export const accountsOff = () => get('accountsOff') === '1';
export const setAccountsOff = (off) => put('accountsOff', off ? '1' : null);
// счёт по умолчанию для новой операции: последний выбранный, иначе первый; '' — без счёта
export function defaultAccount() {
  const list = accounts();
  const last = get('lastAcc');
  if (last === '') return '';
  if (last && list.some((a) => a.id === last)) return last;
  return list[0]?.id || '';
}
export const rememberAccount = (id) => put('lastAcc', id ?? '');

export function addAccount({ name, type, base }) {
  const a = { id: `a${Date.now().toString(36)}`, name: name || TYPES[type].name, type, base, from: Date.now() };
  saveAccounts([...accounts(), a]);
  setAccountsOff(false);
  return a;
}
export const updateAccount = (id, patch) => saveAccounts(accounts().map((a) => (a.id === id ? { ...a, ...patch } : a)));
export const removeAccount = (id) => { saveAccounts(accounts().filter((a) => a.id !== id)); if (get('lastAcc') === id) put('lastAcc', null); };

// явно привязанные к счёту операции считаются всегда (даже задним числом); старый «кошелёк» — все без счёта с даты создания
const mine = (a, i) => i.acc === a.id || (a.all && i.acc === undefined && i.ts >= a.from);
export async function balances() {
  const list = accounts();
  if (!list.length) return [];
  const items = await store.expensesBetween(0, Date.now() + 366 * 864e5);
  return list.map((a) => {
    const own = items.filter((i) => mine(a, i));
    const out = own.filter((i) => i.type !== 'in').reduce((s, i) => s + i.amount, 0);
    const inc = own.filter((i) => i.type === 'in').reduce((s, i) => s + i.amount, 0);
    return { ...a, out, inc, balance: a.base + inc - out };
  });
}
// свои деньги: кредитный лимит в сумму не входит
export const ownTotal = (bal) => bal.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);

// Сколько денег осталось. Без счетов: доходы − расходы за текущий месяц.
// Со счетами: их остатки + операции без счёта с момента заведения первого счёта (время операций — с точностью до минуты).
export async function moneyLeft(bal) {
  const net = (l) => l.reduce((s, i) => s + (i.type === 'in' ? i.amount : -i.amount), 0);
  const end = Date.now() + 366 * 864e5;
  if (!bal.length) {
    const d = new Date(); const from = +new Date(d.getFullYear(), d.getMonth(), 1);
    return { v: net(await store.expensesBetween(from, end)), from, acc: false };
  }
  const from = Math.floor(Math.min(...bal.map((a) => a.from || Date.now())) / 6e4) * 6e4;
  const loose = (await store.expensesBetween(from, end)).filter((i) => !i.acc && !bal.some((a) => a.all && i.ts >= a.from));
  return { v: ownTotal(bal) + net(loose), from, acc: true };
}
