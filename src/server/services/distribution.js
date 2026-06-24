// 譜面配布（Phase 2）。
//
// 指揮者・パートリーダーが、登録メンバーへ「どの譜面を送るか」を指定して配布する。
// ライブラリは PD/CC 譜面のみで構成されるため、配布は構造上「著作権の許す範囲」に
// 収まる。再配布可(license_redistributable)の曲は実ファイル('file')、リンクのみの曲は
// 外部リンク参照('link')として共有する。

import { getMember, DISTRIBUTOR_ROLES } from './ensembles.js';
import { getWork } from './library.js';

/** 曲の再配布可否から共有モードを決める。 */
export function shareModeFor(work) {
  return work.redistributable ? 'file' : 'link';
}

/**
 * 配布を作成する。
 * @param {object} input - { ensembleId, workId, senderMemberId, recipientMemberIds[], message }
 * @returns 作成された配布（宛先・共有モード込み）
 */
export function createDistribution(db, input) {
  const { ensembleId, workId, senderMemberId, recipientMemberIds = [], message } = input;

  const sender = getMember(db, senderMemberId);
  if (!sender) throw new Error('sender not found');
  if (sender.ensemble_id !== ensembleId) throw new Error('sender is not in this ensemble');
  if (!DISTRIBUTOR_ROLES.includes(sender.role)) {
    throw new Error('配布できるのは指揮者またはパートリーダーのみです');
  }

  const work = getWork(db, workId);
  if (!work) throw new Error('work not found');

  const recipients = [...new Set(recipientMemberIds)]
    .map((id) => getMember(db, id))
    .filter((m) => m && m.ensemble_id === ensembleId);
  if (recipients.length === 0) throw new Error('宛先メンバーを 1 人以上指定してください');

  const shareMode = shareModeFor(work);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO distributions (ensemble_id, work_id, sender_member_id, share_mode, message)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(ensembleId, workId, senderMemberId, shareMode, message ?? null);
    const distId = info.lastInsertRowid;
    const link = db.prepare(
      'INSERT INTO distribution_recipients (distribution_id, member_id) VALUES (?, ?)'
    );
    for (const r of recipients) link.run(distId, r.id);
    return distId;
  });

  return getDistribution(db, tx());
}

export function getDistribution(db, id) {
  const dist = db
    .prepare(
      `SELECT d.*, w.title AS work_title, w.license, c.name AS composer,
              m.name AS sender_name, m.role AS sender_role
       FROM distributions d
       JOIN works w ON w.id = d.work_id
       LEFT JOIN composers c ON c.id = w.composer_id
       LEFT JOIN members m ON m.id = d.sender_member_id
       WHERE d.id = ?`
    )
    .get(id);
  if (!dist) return null;
  dist.recipients = db
    .prepare(
      `SELECT m.id, m.name, m.instrument, m.role
       FROM distribution_recipients dr JOIN members m ON m.id = dr.member_id
       WHERE dr.distribution_id = ? ORDER BY m.name`
    )
    .all(id);
  return dist;
}

/** 合奏団の配布履歴（送信ログ）。 */
export function listEnsembleDistributions(db, ensembleId) {
  return db
    .prepare(
      `SELECT d.id, d.work_id, d.share_mode, d.message, d.created_at,
              w.title AS work_title, c.name AS composer,
              m.name AS sender_name, m.role AS sender_role,
              (SELECT COUNT(*) FROM distribution_recipients dr WHERE dr.distribution_id = d.id) AS recipient_count
       FROM distributions d
       JOIN works w ON w.id = d.work_id
       LEFT JOIN composers c ON c.id = w.composer_id
       LEFT JOIN members m ON m.id = d.sender_member_id
       WHERE d.ensemble_id = ? ORDER BY d.created_at DESC`
    )
    .all(ensembleId);
}

/** あるメンバー宛に届いた配布（受信箱）。 */
export function listMemberInbox(db, memberId) {
  return db
    .prepare(
      `SELECT d.id, d.work_id, d.share_mode, d.message, d.created_at,
              w.title AS work_title, c.name AS composer,
              sender.name AS sender_name, sender.role AS sender_role
       FROM distribution_recipients dr
       JOIN distributions d ON d.id = dr.distribution_id
       JOIN works w ON w.id = d.work_id
       LEFT JOIN composers c ON c.id = w.composer_id
       LEFT JOIN members sender ON sender.id = d.sender_member_id
       WHERE dr.member_id = ? ORDER BY d.created_at DESC`
    )
    .all(memberId);
}
