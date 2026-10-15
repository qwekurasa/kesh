// Полная резервная копия в JSON: проверка до восстановления, восстановление без удаления текущих данных
import * as store from './store.js';
import * as auth from './auth.js';
import { customCategories, cleanCategory, saveCategories, SKINS } from './ui.js';
import { CURRENCIES } from './i18n.js';
import { cleanLoan, BLOCKS } from './loans.js';

const FORMAT = 'nota-backup';
const SCHEMA = 1;
const PREFS = ['avatarSkin', 'avatar', 'kitty', 'kittyCoat', 'currency', 'lang', 'kesh', 'keshHints', 'keshCalm', 'keshCoat', 'accountsOff', 'blocks'];
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

export async function makeBackup(appVersion) {
  const preferences = {};
  PREFS.forEach((k) => { const v = localStorage.getItem(k); if (v !== null) preferences[k] = v; });
  return {
    format: FORMAT,
    schemaVersion: SCHEMA,
    appVersion,
    exportedAt: new Date().toISOString(),
    account: auth.account(),
    transactions: await store.allExpenses(),
    categories: customCategories(),
    budgets: read('budgets', {}),
    deposits: read('deposits', []),
    accounts: read('accounts', []),
    loans: read('loans', []),
    preferences,
  };
}

const cleanDeposit = (d) => (d && typeof d.id === 'string' && /^[\w-]{1,64}$/.test(d.id)
  && Number.isSafeInteger(d.amount) && d.amount >= 0 && d.amount <= 1e13
  ? {
    id: d.id, name: String(d.name ?? '').trim().slice(0, 60) || 'Вклад', amount: d.amount, rate: Math.min(100, Math.max(0, Number(d.rate) || 0)),
    kind: d.kind === 'term' ? 'term' : 'savings',
    months: Number.isInteger(d.months) && d.months > 0 && d.months <= 120 ? d.months : 0,
    opened: Number.isFinite(d.opened) && d.opened > 0 ? d.opened : 0,
    cap: d.cap === 'month' || d.cap === 'end' ? d.cap : 'month',
  }
  : null);
const cleanAccount = (a) => (a && typeof a.id === 'string' && /^[\w-]{1,64}$/.test(a.id) && Number.isSafeInteger(a.base) && Math.abs(a.base) <= 1e13 && Number.isFinite(a.from) && a.from > 0
  ? { id: a.id, name: String(a.name ?? '').trim().slice(0, 40) || 'Счёт', type: ['cash', 'card', 'savings', 'credit'].includes(a.type) ? a.type : 'cash', base: a.base, from: a.from, ...(a.all ? { all: true } : {}) }
  : null);
const cleanWallet = (w) => (w && Number.isSafeInteger(w.base) && Math.abs(w.base) <= 1e13 && Number.isFinite(w.from) && w.from > 0 ? { base: w.base, from: w.from } : null);

const cleanBudgets = (b) => Object.fromEntries(Object.entries(b && typeof b === 'object' && !Array.isArray(b) ? b : {})
  .filter(([id, v]) => /^[\w-]{1,64}$/.test(id) && Number.isSafeInteger(v) && v > 0 && v <= 1e13));

// Проверка без записи: что внутри и что будет отброшено
export function checkBackup(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Файл не похож на копию NOTA' };
  // старый формат: { expenses, customCats, budgets, deposits }
  const legacy = data.format !== FORMAT;
  if (!legacy && data.schemaVersion > SCHEMA) return { ok: false, error: 'Копия сделана более новой версией NOTA — обновите приложение' };
  const tx = legacy ? (data.expenses || (Array.isArray(data) ? data : [])) : data.transactions;
  if (!Array.isArray(tx)) return { ok: false, error: 'В копии нет списка операций' };
  const transactions = tx.map(store.cleanItem).filter(Boolean);
  const categories = (Array.isArray(legacy ? data.customCats : data.categories) ? (legacy ? data.customCats : data.categories) : [])
    .map(cleanCategory).filter(Boolean);
  const deposits = (Array.isArray(data.deposits) ? data.deposits : []).map(cleanDeposit).filter(Boolean);
  const budgets = cleanBudgets(data.budgets);
  const preferences = {};
  const p = !legacy && data.preferences && typeof data.preferences === 'object' ? data.preferences : {};
  if (/^\d{1,2}$/.test(p.avatarSkin) && Number(p.avatarSkin) < SKINS.length) preferences.avatarSkin = p.avatarSkin;
  if (typeof p.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 3e6) preferences.avatar = p.avatar;
  if (p.kitty === '0' || p.kitty === '1') preferences.kitty = p.kitty;
  if (/^(white|grey|black|orange)$/.test(p.kittyCoat)) preferences.kittyCoat = p.kittyCoat;
  if (CURRENCIES.some(([c]) => c === p.currency)) preferences.currency = p.currency;
  if (p.lang === 'ru' || p.lang === 'en') preferences.lang = p.lang;
  ['kesh', 'keshHints', 'keshCalm', 'accountsOff'].forEach((k) => { if (p[k] === '0' || p[k] === '1') preferences[k] = p[k]; });
  if (p.keshCoat === 'white' || p.keshCoat === 'black') preferences.keshCoat = p.keshCoat;
  try { const b = JSON.parse(p.blocks); if (Array.isArray(b) && b.every((x) => BLOCKS.includes(x))) preferences.blocks = JSON.stringify(b); } catch { /* нет разделов */ }
  const login = !legacy && data.account && typeof data.account.login === 'string' ? data.account.login.trim().slice(0, 40) : '';
  return {
    ok: true,
    exportedAt: legacy ? null : String(data.exportedAt || ''),
    transactions, categories, deposits, budgets, preferences, login,
    loans: (Array.isArray(data.loans) ? data.loans : []).map(cleanLoan).filter(Boolean),
    // старые копии хранили один «кошелёк» — превращаем в счёт
    accounts: Array.isArray(data.accounts) ? data.accounts.map(cleanAccount).filter(Boolean)
      : (cleanWallet(data.wallet) ? [{ id: `a${data.wallet.from.toString(36)}`, name: 'Кошелёк', type: 'cash', base: data.wallet.base, from: data.wallet.from, all: true }] : []),
    dropped: tx.length - transactions.length,
  };
}

// Восстановление: недостающее добавляется, текущие данные не удаляются
// одинаковые id — берём версию из копии (она свежее), новые добавляем
const upsert = (list, incoming) => {
  const map = new Map(list.map((x) => [x.id, x]));
  let added = 0;
  incoming.forEach((x) => { if (!map.has(x.id)) added++; map.set(x.id, x); });
  return { list: [...map.values()], added };
};
export async function restoreBackup(c) {
  const cats = upsert(customCategories(), c.categories);
  if (c.categories.length) saveCategories(cats.list);
  const deps = upsert(read('deposits', []), c.deposits);
  if (c.deposits.length) localStorage.setItem('deposits', JSON.stringify(deps.list));
  const newBudgets = Object.keys(c.budgets).filter((id) => !(id in read('budgets', {})));
  if (Object.keys(c.budgets).length) localStorage.setItem('budgets', JSON.stringify({ ...read('budgets', {}), ...c.budgets }));
  const lns = upsert(read('loans', []), c.loans || []);
  if ((c.loans || []).length) localStorage.setItem('loans', JSON.stringify(lns.list));
  const accs = upsert(read('accounts', []), c.accounts || []);
  if ((c.accounts || []).length) localStorage.setItem('accounts', JSON.stringify(accs.list));
  if (c.login && !auth.account()) auth.register(c.login);
  Object.entries(c.preferences).forEach(([k, v]) => localStorage.setItem(k, v));
  const tx = await store.importExpenses(c.transactions, true);
  return { ...tx, categories: cats.added, deposits: deps.added, budgets: newBudgets.length };
}
