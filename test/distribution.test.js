import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';
import { createEnsemble, addMember } from '../src/server/services/ensembles.js';
import {
  createDistribution,
  listMemberInbox,
  listEnsembleDistributions,
} from '../src/server/services/distribution.js';
import { searchWorks } from '../src/server/services/library.js';

async function setup() {
  const db = createDb(':memory:');
  await importFromSource(db, 'seed');
  const ensemble = createEnsemble(db, 'テスト交響楽団');
  const conductor = addMember(db, ensemble.id, { name: '指揮 太郎', role: 'conductor' });
  const leader = addMember(db, ensemble.id, { name: 'コンマス 花子', instrument: 'Violin', role: 'part_leader' });
  const player = addMember(db, ensemble.id, { name: '団員 次郎', instrument: 'Cello', role: 'member' });
  return { db, ensemble, conductor, leader, player };
}

function workByTitle(db, like) {
  return searchWorks(db, { search: like })[0];
}

test('指揮者は配布を作成できる', async () => {
  const { db, ensemble, conductor, leader, player } = await setup();
  const work = workByTitle(db, 'Beethoven'); // redistributable=false -> link
  const dist = createDistribution(db, {
    ensembleId: ensemble.id,
    workId: work.id,
    senderMemberId: conductor.id,
    recipientMemberIds: [leader.id, player.id],
  });
  assert.equal(dist.share_mode, 'link');
  assert.equal(dist.recipients.length, 2);
});

test('再配布可の曲は share_mode=file になる', async () => {
  const { db, ensemble, leader, player } = await setup();
  const work = workByTitle(db, 'Canon in D'); // redistributable=true
  const dist = createDistribution(db, {
    ensembleId: ensemble.id,
    workId: work.id,
    senderMemberId: leader.id,
    recipientMemberIds: [player.id],
  });
  assert.equal(dist.share_mode, 'file');
});

test('一般団員は配布できない', async () => {
  const { db, ensemble, player, leader } = await setup();
  const work = workByTitle(db, 'Canon in D');
  assert.throws(
    () =>
      createDistribution(db, {
        ensembleId: ensemble.id,
        workId: work.id,
        senderMemberId: player.id,
        recipientMemberIds: [leader.id],
      }),
    /指揮者またはパートリーダー/
  );
});

test('宛先が空だとエラー', async () => {
  const { db, ensemble, conductor } = await setup();
  const work = workByTitle(db, 'Canon in D');
  assert.throws(
    () =>
      createDistribution(db, {
        ensembleId: ensemble.id,
        workId: work.id,
        senderMemberId: conductor.id,
        recipientMemberIds: [],
      }),
    /宛先メンバー/
  );
});

test('受信箱と配布履歴に反映される', async () => {
  const { db, ensemble, conductor, leader, player } = await setup();
  const work = workByTitle(db, 'Canon in D');
  createDistribution(db, {
    ensembleId: ensemble.id,
    workId: work.id,
    senderMemberId: conductor.id,
    recipientMemberIds: [player.id],
    message: 'パート譜です',
  });

  const inbox = listMemberInbox(db, player.id);
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].message, 'パート譜です');
  assert.equal(inbox[0].sender_name, '指揮 太郎');

  assert.equal(listMemberInbox(db, leader.id).length, 0, 'leaderには届いていない');

  const log = listEnsembleDistributions(db, ensemble.id);
  assert.equal(log.length, 1);
  assert.equal(log[0].recipient_count, 1);
});

test('他団体の送信者は弾かれる', async () => {
  const { db, conductor } = await setup();
  const other = createEnsemble(db, '別オケ');
  const otherMember = addMember(db, other.id, { name: 'よそ者', role: 'member' });
  const work = workByTitle(db, 'Canon in D');
  assert.throws(
    () =>
      createDistribution(db, {
        ensembleId: other.id,
        workId: work.id,
        senderMemberId: conductor.id, // 別団体のメンバー
        recipientMemberIds: [otherMember.id],
      }),
    /not in this ensemble/
  );
});

test('役割バリデーション', async () => {
  const { db, ensemble } = await setup();
  assert.throws(() => addMember(db, ensemble.id, { name: 'x', role: 'boss' }), /invalid role/);
});
