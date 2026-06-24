import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';
import { searchWorks, getWork, getFacets } from '../src/server/services/library.js';

async function seeded() {
  const db = createDb(':memory:');
  await importFromSource(db, 'seed');
  return db;
}

test('検索: キーワードで曲名/作曲家を絞り込める', async () => {
  const db = await seeded();
  const beethoven = searchWorks(db, { search: 'Beethoven' });
  assert.ok(beethoven.length >= 1);
  assert.ok(beethoven.every((w) => /Beethoven/.test(w.composer)));
});

test('フィルタ: 楽器で絞り込める', async () => {
  const db = await seeded();
  const cello = searchWorks(db, { instrument: 'Cello' });
  assert.ok(cello.length >= 1);
});

test('フィルタ: 再配布可能のみ', async () => {
  const db = await seeded();
  const redist = searchWorks(db, { redistributable: 'true' });
  assert.ok(redist.length >= 1);
  assert.ok(redist.every((w) => w.redistributable === true));
});

test('詳細: ファイルとタグが付く', async () => {
  const db = await seeded();
  const list = searchWorks(db, { search: 'Cello Suite' });
  const work = getWork(db, list[0].id);
  assert.ok(work.files.length >= 1);
  assert.ok(Array.isArray(work.tags));
  assert.equal(work.redistributable, true);
});

test('ファセット: 候補一覧が取れる', async () => {
  const db = await seeded();
  const f = getFacets(db);
  assert.ok(f.composers.length > 0);
  assert.ok(f.instruments.length > 0);
  assert.ok(f.tags.length > 0);
  assert.ok(f.sources.length >= 1);
});

test('存在しない id は null', async () => {
  const db = await seeded();
  assert.equal(getWork(db, 99999), null);
});
