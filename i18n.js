// Язык интерфейса: ru / en. Смена языка перезагружает страницу, поэтому строки вычисляются при загрузке модулей.
const get = () => { try { return localStorage.getItem('lang'); } catch { return null; } };
const hasAccount = () => { try { return !!localStorage.getItem('account'); } catch { return false; } };
// Старые пользователи остаются на русском; новые — по языку браузера
export const LANG = get() || (hasAccount() || /^(ru|uk|be|kk)\b/i.test(navigator.language || '') ? 'ru' : 'en');
export const EN = LANG === 'en';
export const L = (ru, en) => (EN ? en : ru);
export function setLang(l) {
  try { localStorage.setItem('lang', l); } catch { /* хранилище недоступно */ }
  location.reload();
}
// plural(n, ['трата', 'траты', 'трат'], ['expense', 'expenses'])
export function plural(n, ru, en) {
  if (EN) return n === 1 ? en[0] : en[1];
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return ru[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return ru[1];
  return ru[2];
}
document.documentElement.lang = LANG;
if (EN) document.title = 'Kesh';
document.documentElement.dataset.lang = LANG;
