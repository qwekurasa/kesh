// Локальный аккаунт: имя и необязательный хеш пароля (PBKDF2) хранятся на устройстве
const KEY = 'account';
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (acc) => localStorage.setItem(KEY, JSON.stringify(acc));

export const account = read;

async function hash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200000 }, key, 256));
}

// Пароля при регистрации нет — он включается позже в профиле
export function register(login) {
  write({ login, salt: null, hash: null });
  navigator.storage?.persist?.();
}

export const hasPassword = () => !!read()?.hash;

// Приложение открыто без запроса, пока нет ни пароля, ни Face ID
export const isOpen = () => {
  const acc = read();
  return !!acc && !acc.hash;
};

export async function setPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write({ ...read(), salt: b64(salt), hash: await hash(password, salt) });
}

export function removePassword() {
  write({ ...read(), salt: null, hash: null });
}

export async function checkPassword(login, password) {
  const acc = read();
  if (!acc?.hash) return false;
  if (login && acc.login.toLowerCase() !== login.toLowerCase()) return false;
  return (await hash(password, unb64(acc.salt))) === acc.hash;
}

export async function changePassword(current, next) {
  if (!(await checkPassword(null, current))) return false;
  await setPassword(next);
  return true;
}

export function rename(login) {
  write({ ...read(), login });
}

export function restore(acc) {
  if (!acc?.login) throw new Error('bad backup');
  write({ login: acc.login, salt: acc.salt || null, hash: acc.hash || null });
  navigator.storage?.persist?.();
}

export function reset() {
  localStorage.removeItem(KEY);
}
