// 認証 UI（Phase 3）。ログイン／登録モーダルと現在ユーザー表示を管理する。

const $ = (s) => document.querySelector(s);
let currentUser = null;
const listeners = [];

export function onAuthChange(fn) {
  listeners.push(fn);
}
export function getUser() {
  return currentUser;
}

function setUser(user) {
  currentUser = user;
  $('#auth-user').textContent = user ? `${user.name} さん` : '';
  $('#auth-user').classList.toggle('hidden', !user);
  $('#auth-logout').classList.toggle('hidden', !user);
  $('#auth-open').classList.toggle('hidden', !!user);
  listeners.forEach((fn) => fn(user));
}

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラー (${res.status})`);
  return data;
}

let mode = 'login';
function setMode(m) {
  mode = m;
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === m));
  $('#auth-name-field').classList.toggle('hidden', m === 'login');
  $('#auth-submit').textContent = m === 'login' ? 'ログイン' : '登録する';
  $('#auth-error').textContent = '';
}

export async function initAuth() {
  // 現在のログイン状態
  try {
    const { user } = await (await fetch('/api/auth/me')).json();
    setUser(user);
  } catch {
    setUser(null);
  }

  $('#auth-open').addEventListener('click', () => $('#auth-modal').classList.remove('hidden'));
  $('#auth-close').addEventListener('click', () => $('#auth-modal').classList.add('hidden'));
  document.querySelectorAll('.auth-tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  $('#auth-logout').addEventListener('click', async () => {
    await api('/api/auth/logout');
    setUser(null);
  });

  $('#auth-submit').addEventListener('click', async () => {
    try {
      const email = $('#auth-email').value.trim();
      const password = $('#auth-password').value;
      const payload = mode === 'register' ? { email, password, name: $('#auth-name').value.trim() } : { email, password };
      const { user } = await api(`/api/auth/${mode}`, payload);
      setUser(user);
      $('#auth-modal').classList.add('hidden');
      $('#auth-password').value = '';
    } catch (err) {
      $('#auth-error').textContent = err.message;
    }
  });

  setMode('login');
}
