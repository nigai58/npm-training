// 認証（Phase 3）。
// 外部依存なしで scrypt によるパスワードハッシュとセッショントークンを扱う。

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

/** パスワードを scrypt でハッシュ化（salt:hash hex）。 */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** 平文パスワードを保存済みハッシュと定数時間比較。 */
export function verifyPassword(password, stored) {
  const [saltHex, hashHex] = (stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** ユーザー登録 → セッショントークンを返す。 */
export function registerUser(db, { email, name, password } = {}) {
  if (!email || !EMAIL_RE.test(email)) throw new Error('有効なメールアドレスを入力してください');
  if (!name) throw new Error('名前は必須です');
  if (!password || password.length < 6) throw new Error('パスワードは6文字以上にしてください');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    throw new Error('このメールアドレスは登録済みです');
  }
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(email, name, hashPassword(password));
  return createSession(db, info.lastInsertRowid);
}

/** ログイン → セッショントークンを返す。 */
export function login(db, { email, password } = {}) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('メールアドレスまたはパスワードが違います');
  }
  return createSession(db, user.id);
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expires
  );
  return { token, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) };
}

/** トークンから有効なユーザーを引く（期限切れは破棄）。無ければ null。 */
export function userForToken(db, token) {
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return user ? publicUser(user) : null;
}

export function logout(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** パスワードハッシュを除いた公開ユーザー情報。 */
export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name };
}
