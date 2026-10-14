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
    r.onsuccess = () => {
      // другая вкладка удаляет базу — отпускаем соединение, чтобы не блокировать сброс
      r.result.onversionchange = () => { r.result.close(); dbPromise = null; };
      resolve(r.result);
    };
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

export async function addExpense({ amount, category, note, ts, type, acc }) {
  const item = { id: uuid(), amount, category, note: note || '', ts: ts || Date.now() };
  if (type === 'in') item.type = 'in';
  if (typeof acc === 'string') item.acc = acc; // '' — сознательно без счёта
  await tx('readwrite', (s) => s.put(item));
  emit();
  return item;
}

export async function updateExpense(id, patch) {
  await tx('readwrite', (s) => {
    s.get(id).onsuccess = (e) => {
      const item = e.target.result;
      if (item) s.put({ ...item, ...patch, edited: 1 });
    };
  });
  emit();
}

export async function removeExpense(id) {
  await tx('readwrite', (s) => s.delete(id));
  emit();
}

export async function todayTotal() {
  const from = new Date().setHours(0, 0, 0, 0);
  const items = await tx('readonly', (s) => s.index('ts').getAll(IDBKeyRange.lowerBound(from)));
  return items.reduce((sum, i) => sum + (i.type === 'in' ? 0 : i.amount), 0);
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

// Проверка операции из внешнего источника (выписка, копия, Excel)
const ID = /^[\w#.:-]{1,80}$/;
const MAX_AMOUNT = 1e13; // 100 млрд ₽ в копейках
export function cleanItem(i) {
  if (!i || typeof i !== 'object') return null;
  const ok = typeof i.id === 'string' && ID.test(i.id)
    && Number.isSafeInteger(i.amount) && i.amount > 0 && i.amount <= MAX_AMOUNT
    && typeof i.category === 'string' && /^[\w-]{1,64}$/.test(i.category)
    && Number.isFinite(i.ts) && i.ts > 946684800000 && i.ts < Date.now() + 366 * 864e5;
  if (!ok) return null;
  const out = { id: i.id, amount: i.amount, category: i.category, note: String(i.note ?? '').slice(0, 500), ts: Math.round(i.ts) };
  if (i.type === 'in') out.type = 'in';
  if (i.edited) out.edited = 1;
  if (typeof i.acc === 'string' && /^[\w-]{0,64}$/.test(i.acc)) out.acc = i.acc;
  if (i.src === 'file') out.src = 'file';
  return out;
}

const same = (a, b) => a.amount === b.amount && a.category === b.category && a.note === b.note && a.ts === b.ts && (a.type === 'in') === (b.type === 'in');

// Возвращает реальный результат: сколько добавлено, обновлено, совпало, пропущено и отброшено
// fromFile: операции из файла копии помечаются src:'file', чтобы их можно было удалить кнопкой «Удалить импортированные»
export async function importExpenses(items, fromFile = false) {
  const list = Array.isArray(items) ? items : [];
  const valid = list.map(cleanItem).filter(Boolean);
  if (fromFile) valid.forEach((i) => { i.src = 'file'; });
  const res = { added: 0, updated: 0, unchanged: 0, skipped: 0, invalid: list.length - valid.length };
  await tx('readwrite', (s) => valid.forEach((i) => {
    s.get(i.id).onsuccess = (e) => {
      const cur = e.target.result;
      if (!cur) { s.put(i); res.added++; return; }
      // трату, которую пользователь поправил руками, импорт не перезаписывает
      if (cur.edited && !i.edited) { res.skipped++; return; }
      if (same(cur, i)) { res.unchanged++; return; }
      s.put(i);
      res.updated++;
    };
  }));
  emit();
  return res;
}

// Перенос всех операций из одной категории в другую (при удалении категории)
export async function recategorize(from, to) {
  let n = 0;
  await tx('readwrite', (s) => {
    s.openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (c.value.category === from) { c.update({ ...c.value, category: to }); n++; }
      c.continue();
    };
  });
  emit();
  return n;
}

// Операции с несуществующей категорией (после старых удалений) переносятся в «Другое»
export async function fixOrphans(known) {
  let n = 0;
  await tx('readwrite', (s) => {
    s.openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (!known.has(c.value.category)) { c.update({ ...c.value, category: c.value.type === 'in' ? 'in_other' : 'other' }); n++; }
      c.continue();
    };
  });
  if (n) emit();
  return n;
}

// Какие из этих ID уже есть в базе — для предпросмотра импорта
export async function existingIds(ids) {
  const found = new Set();
  await tx('readonly', (s) => ids.forEach((id) => { s.getKey(id).onsuccess = (e) => { if (e.target.result !== undefined) found.add(id); }; }));
  return found;
}

// Импортированные: из банковских выписок (id с imp) и из файлов копий (src:'file')
const isImported = (i) => i.id.startsWith('imp') || i.src === 'file';
export const importedCount = () => tx('readonly', (s) => {
  let n = 0;
  s.openCursor().onsuccess = (e) => {
    const c = e.target.result;
    if (c) { if (isImported(c.value)) n++; c.continue(); }
  };
  return { get n() { return n; } };
}).then((r) => r.n);

export async function removeImported() {
  const n = await tx('readwrite', (s) => {
    let k = 0;
    s.openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (c) { if (isImported(c.value)) { c.delete(); k++; } c.continue(); }
    };
    return { get n() { return k; } };
  });
  emit();
  return n.n;
}

// Удаление базы: успех только при реальном onsuccess; блокировка другой вкладкой — ошибка
export async function wipe() {
  (await dbPromise)?.close();
  dbPromise = null;
  await new Promise((resolve, reject) => {
    const d = indexedDB.deleteDatabase('tracker');
    d.onsuccess = () => resolve();
    d.onerror = () => reject(d.error || new Error('delete failed'));
    // даём другим вкладкам шанс закрыть соединение (onversionchange), иначе сообщаем об ошибке
    d.onblocked = () => setTimeout(() => reject(new Error('blocked')), 3000);
  });
}
