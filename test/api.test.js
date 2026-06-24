import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { createDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';

/** テスト用にアプリを 0 番ポートで起動し base URL を返す。 */
async function startApp() {
  const db = createDb(':memory:');
  await importFromSource(db, 'seed');
  const app = createApp(db);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
}

test('GET /api/health', async () => {
  const { base, close } = await startApp();
  try {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  } finally {
    close();
  }
});

test('GET /api/works は一覧を返す', async () => {
  const { base, close } = await startApp();
  try {
    const res = await fetch(`${base}/api/works`);
    const body = await res.json();
    assert.ok(body.works.length >= 6);
    assert.ok('title' in body.works[0]);
  } finally {
    close();
  }
});

test('GET /api/works?search= でフィルタ', async () => {
  const { base, close } = await startApp();
  try {
    const res = await fetch(`${base}/api/works?search=Vivaldi`);
    const body = await res.json();
    assert.ok(body.works.length >= 1);
    assert.ok(body.works.every((w) => /Vivaldi/.test(w.composer)));
  } finally {
    close();
  }
});

test('GET /api/works/:id 詳細と 404', async () => {
  const { base, close } = await startApp();
  try {
    const list = await (await fetch(`${base}/api/works`)).json();
    const id = list.works[0].id;
    const ok = await fetch(`${base}/api/works/${id}`);
    assert.equal(ok.status, 200);
    const detail = await ok.json();
    assert.ok(Array.isArray(detail.files));

    const missing = await fetch(`${base}/api/works/99999`);
    assert.equal(missing.status, 404);
  } finally {
    close();
  }
});

test('GET /api/files/:id は外部リンクへリダイレクト', async () => {
  const { base, close } = await startApp();
  try {
    const list = await (await fetch(`${base}/api/works`)).json();
    const detail = await (await fetch(`${base}/api/works/${list.works[0].id}`)).json();
    const fileId = detail.files[0].id;
    const res = await fetch(`${base}/api/files/${fileId}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.ok(res.headers.get('location'));
  } finally {
    close();
  }
});

test('POST /api/sources/seed/sync は認証必須・冪等', async () => {
  const { base, close } = await startApp();
  try {
    // 未ログインは 401
    const unauth = await fetch(`${base}/api/sources/seed/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(unauth.status, 401);

    // 登録してCookieを得る
    const reg = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', name: 'A', password: 'secret1' }),
    });
    const cookie = reg.headers.get('set-cookie').split(';')[0];

    const res = await fetch(`${base}/api/sources/seed/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    });
    const stats = await res.json();
    assert.equal(stats.inserted, 0, '既にseed済みなので新規0');
    assert.ok(stats.updated >= 6);
  } finally {
    close();
  }
});
