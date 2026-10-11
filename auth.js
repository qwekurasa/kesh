// Локальный аккаунт: только имя, хранится на устройстве
const KEY = 'account';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export const account = read;

export function register(login) {
  localStorage.setItem(KEY, JSON.stringify({ login }));
  navigator.storage?.persist?.();
}

export function reset() {
  localStorage.removeItem(KEY);
}
