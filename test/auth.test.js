import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/server/db.js';
import {
  registerUser,
  login,
  logout,
  userForToken,
  hashPassword,
  verifyPassword,
} from '../src/server/services/auth.js';

test('パスワードハッシュは検証できる', () => {
  const h = hashPassword('hunter2');
  assert.ok(verifyPassword('hunter2', h));
  assert.equal(verifyPassword('wrong', h), false);
});

test('登録 → トークンで本人を引ける', () => {
  const db = createDb(':memory:');
  const { token, user } = registerUser(db, { email: 'a@b.com', name: '太郎', password: 'secret1' });
  assert.equal(user.name, '太郎');
  assert.ok(!('password_hash' in user));
  const me = userForToken(db, token);
  assert.equal(me.email, 'a@b.com');
});

test('重複メールは弾く', () => {
  const db = createDb(':memory:');
  registerUser(db, { email: 'a@b.com', name: 'x', password: 'secret1' });
  assert.throws(() => registerUser(db, { email: 'a@b.com', name: 'y', password: 'secret1' }), /登録済み/);
});

test('短いパスワード・不正メールは弾く', () => {
  const db = createDb(':memory:');
  assert.throws(() => registerUser(db, { email: 'a@b.com', name: 'x', password: '123' }), /6文字/);
  assert.throws(() => registerUser(db, { email: 'bad', name: 'x', password: 'secret1' }), /メールアドレス/);
});

test('ログイン成功/失敗', () => {
  const db = createDb(':memory:');
  registerUser(db, { email: 'a@b.com', name: 'x', password: 'secret1' });
  assert.ok(login(db, { email: 'a@b.com', password: 'secret1' }).token);
  assert.throws(() => login(db, { email: 'a@b.com', password: 'nope' }), /違います/);
});

test('ログアウトでトークン無効化', () => {
  const db = createDb(':memory:');
  const { token } = registerUser(db, { email: 'a@b.com', name: 'x', password: 'secret1' });
  logout(db, token);
  assert.equal(userForToken(db, token), null);
});
