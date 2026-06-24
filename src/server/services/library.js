// ライブラリ参照ロジック（検索・フィルタ・詳細）。
// ルータからクエリ条件を受け取り SQL を組み立てる。リポジトリ層として
// DB アクセスをここに隔離し、将来の Postgres 移行や Phase 2 機能追加に備える。

/**
 * 曲を検索・フィルタする。
 * @param {Database} db
 * @param {object} q - { search, composer, instrument, tag, source, redistributable }
 */
export function searchWorks(db, q = {}) {
  const where = [];
  const params = {};

  if (q.search) {
    where.push('(w.title LIKE @search OR c.name LIKE @search)');
    params.search = `%${q.search}%`;
  }
  if (q.composer) {
    where.push('c.name = @composer');
    params.composer = q.composer;
  }
  if (q.source) {
    where.push('s.name = @source');
    params.source = q.source;
  }
  if (q.redistributable != null && q.redistributable !== '') {
    where.push('w.license_redistributable = @redist');
    params.redist = q.redistributable === 'true' || q.redistributable === true ? 1 : 0;
  }
  if (q.instrument) {
    where.push(
      `EXISTS (SELECT 1 FROM score_files sf WHERE sf.work_id = w.id AND sf.instrument = @instrument)`
    );
    params.instrument = q.instrument;
  }
  if (q.tag) {
    where.push(
      `EXISTS (SELECT 1 FROM work_tags wt JOIN tags t ON t.id = wt.tag_id
               WHERE wt.work_id = w.id AND t.name = @tag)`
    );
    params.tag = q.tag;
  }

  const sql = `
    SELECT w.id, w.title, w.instrumentation, w.opus, w.year,
           w.license, w.license_redistributable AS redistributable,
           c.name AS composer, s.name AS source, s.display_name AS source_label
    FROM works w
    LEFT JOIN composers c ON c.id = w.composer_id
    LEFT JOIN sources s ON s.id = w.source_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.name, w.title
    LIMIT @limit`;
  params.limit = Number(q.limit) || 200;

  const rows = db.prepare(sql).all(params);
  return rows.map((r) => ({ ...r, redistributable: !!r.redistributable, tags: tagsFor(db, r.id) }));
}

function tagsFor(db, workId) {
  return db
    .prepare(
      `SELECT t.name FROM tags t JOIN work_tags wt ON wt.tag_id = t.id WHERE wt.work_id = ? ORDER BY t.name`
    )
    .all(workId)
    .map((t) => t.name);
}

/** 曲 1 件の詳細（紐づくファイル・タグ込み）。無ければ null。 */
export function getWork(db, id) {
  const work = db
    .prepare(
      `SELECT w.*, c.name AS composer, c.birth_year, c.death_year, c.era,
              s.name AS source, s.display_name AS source_label, s.type AS source_type
       FROM works w
       LEFT JOIN composers c ON c.id = w.composer_id
       LEFT JOIN sources s ON s.id = w.source_id
       WHERE w.id = ?`
    )
    .get(id);
  if (!work) return null;
  work.redistributable = !!work.license_redistributable;
  work.files = db.prepare('SELECT * FROM score_files WHERE work_id = ? ORDER BY label').all(id);
  work.tags = tagsFor(db, id);
  return work;
}

/** フィルタ UI 用のファセット（作曲家・楽器・タグ・ソース一覧）。 */
export function getFacets(db) {
  return {
    composers: db
      .prepare(
        `SELECT c.name, COUNT(w.id) AS count FROM composers c
         JOIN works w ON w.composer_id = c.id GROUP BY c.name ORDER BY c.name`
      )
      .all(),
    instruments: db
      .prepare(
        `SELECT instrument AS name, COUNT(*) AS count FROM score_files
         WHERE instrument IS NOT NULL GROUP BY instrument ORDER BY instrument`
      )
      .all(),
    tags: db
      .prepare(
        `SELECT t.name, COUNT(wt.work_id) AS count FROM tags t
         JOIN work_tags wt ON wt.tag_id = t.id GROUP BY t.name ORDER BY t.name`
      )
      .all(),
    sources: db.prepare('SELECT name, display_name, type FROM sources ORDER BY display_name').all(),
  };
}
