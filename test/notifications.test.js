import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';
import { createEnsemble, addMember } from '../src/server/services/ensembles.js';
import {
  createDistribution,
  markRead,
  unreadCount,
  recommendForMember,
  listMemberInbox,
} from '../src/server/services/distribution.js';
import { searchWorks } from '../src/server/services/library.js';
import { registerNotifier, getNotifier } from '../src/notifications/index.js';
import { registerUser } from '../src/server/services/auth.js';

async function setup() {
  const db = createDb(':memory:');
  await importFromSource(db, 'seed');
  const { user } = registerUser(db, { email: 'o@b.com', name: 'owner', password: 'secret1' });
  const ens = createEnsemble(db, 'オケ', user.id);
  const cond = addMember(db, ens.id, { name: '指揮', role: 'conductor' });
  const cello = addMember(db, ens.id, { name: 'チェロ奏者', instrument: 'Cello', role: 'member' });
  return { db, ens, cond, cello };
}
const workByTitle = (db, like) => searchWorks(db, { search: like })[0];

test('既読管理: 配布直後は未読、markReadで既読', async () => {
  const { db, ens, cond, cello } = await setup();
  const work = workByTitle(db, 'Canon in D');
  const dist = createDistribution(db, {
    ensembleId: ens.id,
    workId: work.id,
    senderMemberId: cond.id,
    recipientMemberIds: [cello.id],
  });
  assert.equal(unreadCount(db, cello.id), 1);
  assert.equal(listMemberInbox(db, cello.id)[0].read_at, null);

  assert.equal(markRead(db, dist.id, cello.id), true);
  assert.equal(unreadCount(db, cello.id), 0);
  assert.ok(listMemberInbox(db, cello.id)[0].read_at);

  // 二重既読は false
  assert.equal(markRead(db, dist.id, cello.id), false);
});

test('通知アダプタが各宛先に呼ばれる', async () => {
  const { db, ens, cond, cello } = await setup();
  const calls = [];
  registerNotifier({
    name: 'console', // 既定を一時的に差し替え
    async notify(payload) {
      calls.push(payload.recipient.name);
      return true;
    },
  });
  const work = workByTitle(db, 'Canon in D');
  createDistribution(db, {
    ensembleId: ens.id,
    workId: work.id,
    senderMemberId: cond.id,
    recipientMemberIds: [cello.id],
  });
  await new Promise((r) => setImmediate(r)); // 通知は非同期
  assert.deepEqual(calls, ['チェロ奏者']);
  assert.equal(getNotifier().name, 'console');
});

test('提案: 楽器に合い、未配布の曲のみ', async () => {
  const { db, ens, cond, cello } = await setup();
  const recs = recommendForMember(db, cello.id);
  assert.ok(recs.length >= 1, 'Cello曲が提案される');
  assert.ok(recs.every((r) => r.title));

  // Cello曲を1つ配布したら、それは提案から消える
  const target = recs[0];
  createDistribution(db, {
    ensembleId: ens.id,
    workId: target.id,
    senderMemberId: cond.id,
    recipientMemberIds: [cello.id],
  });
  const after = recommendForMember(db, cello.id);
  assert.ok(!after.some((r) => r.id === target.id), '配布済みは提案されない');
});

test('提案: 楽器未設定なら空', async () => {
  const { db, ens } = await setup();
  const noInst = addMember(db, ens.id, { name: '未設定', role: 'member' });
  assert.deepEqual(recommendForMember(db, noInst.id), []);
});
