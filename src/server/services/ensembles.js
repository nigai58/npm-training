// 合奏団とメンバーの管理（Phase 2）。
// リポジトリ層として DB アクセスを隔離する。

export const ROLES = ['conductor', 'part_leader', 'member'];
export const DISTRIBUTOR_ROLES = ['conductor', 'part_leader'];

export function createEnsemble(db, name, ownerUserId = null) {
  if (!name) throw new Error('name is required');
  const info = db
    .prepare('INSERT INTO ensembles (name, owner_user_id) VALUES (?, ?)')
    .run(name, ownerUserId);
  return getEnsemble(db, info.lastInsertRowid);
}

/** 合奏団一覧。ownerUserId 指定時はその所有分のみ。 */
export function listEnsembles(db, ownerUserId = null) {
  const where = ownerUserId != null ? 'WHERE e.owner_user_id = @owner' : '';
  return db
    .prepare(
      `SELECT e.*, COUNT(m.id) AS member_count
       FROM ensembles e LEFT JOIN members m ON m.ensemble_id = e.id
       ${where}
       GROUP BY e.id ORDER BY e.created_at DESC`
    )
    .all({ owner: ownerUserId });
}

/** 指定ユーザーが合奏団を操作できるか（所有者、または所有者未設定の旧データ）。 */
export function canManage(db, ensembleId, userId) {
  const e = db.prepare('SELECT owner_user_id FROM ensembles WHERE id = ?').get(ensembleId);
  if (!e) return false;
  return e.owner_user_id == null || e.owner_user_id === userId;
}

export function getEnsemble(db, id) {
  const ensemble = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(id);
  if (!ensemble) return null;
  ensemble.members = listMembers(db, id);
  return ensemble;
}

export function addMember(db, ensembleId, { name, instrument, role = 'member', contact } = {}) {
  if (!db.prepare('SELECT 1 FROM ensembles WHERE id = ?').get(ensembleId)) {
    throw new Error('ensemble not found');
  }
  if (!name) throw new Error('name is required');
  if (!ROLES.includes(role)) throw new Error(`invalid role: ${role}`);
  const info = db
    .prepare(
      `INSERT INTO members (ensemble_id, name, instrument, role, contact)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(ensembleId, name, instrument ?? null, role, contact ?? null);
  return db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
}

export function listMembers(db, ensembleId) {
  return db
    .prepare('SELECT * FROM members WHERE ensemble_id = ? ORDER BY role, name')
    .all(ensembleId);
}

export function getMember(db, id) {
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) || null;
}

export function removeMember(db, id) {
  return db.prepare('DELETE FROM members WHERE id = ?').run(id).changes > 0;
}
