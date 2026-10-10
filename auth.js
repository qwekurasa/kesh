// Локальный аккаунт: логин и хеш пароля (PBKDF2) хранятся на устройстве, Face ID — через WebAuthn (passkey)
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

export async function register(login, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write({ login, salt: b64(salt), hash: await hash(password, salt), credId: null });
  navigator.storage?.persist?.();
}

export async function checkPassword(login, password) {
  const acc = read();
  return !!acc && acc.login.toLowerCase() === login.toLowerCase() && (await hash(password, unb64(acc.salt))) === acc.hash;
}

export async function changePassword(current, next) {
  const acc = read();
  if (!(await checkPassword(acc.login, current))) return false;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write({ ...acc, salt: b64(salt), hash: await hash(next, salt) });
  return true;
}

export function rename(login) {
  write({ ...read(), login });
}

export async function faceIdAvailable() {
  try { return !!(await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}

export async function enableFaceId() {
  const acc = read();
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Траты' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: acc.login, displayName: acc.login },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    },
  });
  write({ ...acc, credId: b64(cred.rawId) });
}

export function disableFaceId() {
  write({ ...read(), credId: null });
}

export async function verifyFaceId() {
  const acc = read();
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(acc.credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  // бит UV (0x04) во флагах authenticatorData — пользователь подтверждён биометрией или кодом
  return (new Uint8Array(res.response.authenticatorData)[32] & 0x04) !== 0;
}

export function reset() {
  localStorage.removeItem(KEY);
}
