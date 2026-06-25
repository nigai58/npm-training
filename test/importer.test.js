import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';

test('seed: 取り込みでwork/composer/files/tagsが作られる', async () => {
  const db = createDb(':memory:');
  const stats = await importFromSource(db, 'seed');
  assert.ok(stats.total >= 6, '6件以上取り込まれる');
  assert.equal(stats.inserted, stats.total);

  const works = db.prepare('SELECT COUNT(*) AS n FROM works').get().n;
  const files = db.prepare('SELECT COUNT(*) AS n FROM score_files').get().n;
  const tags = db.prepare('SELECT COUNT(*) AS n FROM tags').get().n;
  assert.equal(works, stats.total);
  assert.ok(files > works, 'ファイルはwork数以上');
  assert.ok(tags > 0);
});

test('seed: 再実行しても重複せず updated になる（冪等）', async () => {
  const db = createDb(':memory:');
  const first = await importFromSource(db, 'seed');
  const second = await importFromSource(db, 'seed');
  assert.equal(second.inserted, 0);
  assert.equal(second.updated, first.total);
  const works = db.prepare('SELECT COUNT(*) AS n FROM works').get().n;
  assert.equal(works, first.total, 'work数が増えていない');
});

test('未知のソースはエラー', async () => {
  const db = createDb(':memory:');
  await assert.rejects(() => importFromSource(db, 'nope'), /Unknown source/);
});

test('license_redistributable が正しく保存される', async () => {
  const db = createDb(':memory:');
  await importFromSource(db, 'seed');
  const mutopia = db.prepare("SELECT license_redistributable FROM works WHERE title LIKE 'Cello Suite%'").get();
  const imslp = db.prepare("SELECT license_redistributable FROM works WHERE title LIKE 'Symphony No. 5%'").get();
  assert.equal(mutopia.license_redistributable, 1);
  assert.equal(imslp.license_redistributable, 0);
});
