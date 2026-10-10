let dbPromise = null;
const listeners = new Set();

export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

const uuid = () => crypto.randomUUID?.() ??
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

function open() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('tracker', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('expenses', { keyPath: 'id' }).createIndex('ts', 'ts');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction('expenses', mode);
    const out = fn(t.objectStore('expenses'));
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}

export async function addExpense({ amount, category, note }) {
  const item = { id: uuid(), amount, category, note: note || '', ts: Date.now() };
  await tx('readwrite', (s) => s.put(item));
  emit();
  return item;
}

export async function removeExpense(id) {
  await tx('readwrite', (s) => s.delete(id));
  emit();
}

export async function todayTotal() {
  const from = new Date().setHours(0, 0, 0, 0);
  const items = await tx('readonly', (s) => s.index('ts').getAll(IDBKeyRange.lowerBound(from)));
  return items.reduce((sum, i) => sum + i.amount, 0);
}

export async function recentCategories(limit = 4) {
  const found = [];
  await tx('readonly', (s) => {
    s.index('ts').openCursor(null, 'prev').onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (!found.includes(c.value.category)) found.push(c.value.category);
      if (found.length < limit) c.continue();
    };
  });
  return found;
}

export const allExpenses = () => tx('readonly', (s) => s.getAll());

export const expensesBetween = (from, to) =>
  tx('readonly', (s) => s.index('ts').getAll(IDBKeyRange.bound(from, to)));

export async function importExpenses(items) {
  const valid = items.filter((i) => typeof i.id === 'string' && Number.isInteger(i.amount) && typeof i.category === 'string' && Number.isFinite(i.ts));
  await tx('readwrite', (s) => valid.forEach((i) => s.put({ id: i.id, amount: i.amount, category: i.category, note: String(i.note || ''), ts: i.ts })));
  emit();
  return valid.length;
}

export const importedCount = () => tx('readonly', (s) => {
  let n = 0;
  s.openCursor(IDBKeyRange.bound('imp', 'imq', false, true)).onsuccess = (e) => {
    const c = e.target.result;
    if (c) { n++; c.continue(); }
  };
  return { get n() { return n; } };
}).then((r) => r.n);

export async function removeImported() {
  const n = await tx('readwrite', (s) => {
    let k = 0;
    s.openCursor(IDBKeyRange.bound('imp', 'imq', false, true)).onsuccess = (e) => {
      const c = e.target.result;
      if (c) { c.delete(); k++; c.continue(); }
    };
    return { get n() { return k; } };
  });
  emit();
  return n.n;
}

export async function wipe() {
  (await dbPromise)?.close();
  dbPromise = null;
  await new Promise((r) => { const d = indexedDB.deleteDatabase('tracker'); d.onsuccess = d.onerror = d.onblocked = r; });
}
