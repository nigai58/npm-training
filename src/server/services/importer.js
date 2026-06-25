// 収集パイプライン。
// ソースアダプタが yield する正規化済み work を受け取り、
// composers / works / score_files / tags へ upsert する。
// 重複は (source_id, source_url) で判定し、再実行しても増えない。

import { mkdirSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getSource } from '../../sources/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = join(__dirname, '../../../storage/scores');

/** ソースを sources テーブルへ登録/更新し id を返す。 */
function upsertSource(db, adapter) {
  db.prepare(
    `INSERT INTO sources (name, display_name, type, base_url, last_synced_at)
     VALUES (@name, @display_name, @type, @base_url, datetime('now'))
     ON CONFLICT(name) DO UPDATE SET
       display_name = excluded.display_name,
       type = excluded.type,
       base_url = excluded.base_url,
       last_synced_at = datetime('now')`
  ).run({
    name: adapter.name,
    display_name: adapter.displayName,
    type: adapter.type,
    base_url: adapter.baseUrl ?? null,
  });
  return db.prepare('SELECT id FROM sources WHERE name = ?').get(adapter.name).id;
}

function upsertComposer(db, composer) {
  if (!composer?.name) return null;
  db.prepare(
    `INSERT INTO composers (name, birth_year, death_year, era)
     VALUES (@name, @birth_year, @death_year, @era)
     ON CONFLICT(name) DO UPDATE SET
       birth_year = COALESCE(excluded.birth_year, composers.birth_year),
       death_year = COALESCE(excluded.death_year, composers.death_year),
       era = COALESCE(excluded.era, composers.era)`
  ).run({
    name: composer.name,
    birth_year: composer.birthYear ?? null,
    death_year: composer.deathYear ?? null,
    era: composer.era ?? null,
  });
  return db.prepare('SELECT id FROM composers WHERE name = ?').get(composer.name).id;
}

function upsertTags(db, workId, tags = []) {
  const insTag = db.prepare(`INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING`);
  const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const link = db.prepare(
    `INSERT INTO work_tags (work_id, tag_id) VALUES (?, ?)
     ON CONFLICT(work_id, tag_id) DO NOTHING`
  );
  for (const name of tags) {
    if (!name) continue;
    insTag.run(name);
    link.run(workId, getTag.get(name).id);
  }
}

/** 1 件の正規化済み work を保存。新規なら 'inserted'、既存なら 'updated'。 */
function saveWork(db, sourceId, work) {
  const composerId = upsertComposer(db, work.composer);
  const existing = db
    .prepare('SELECT id FROM works WHERE source_id = ? AND source_url IS ?')
    .get(sourceId, work.sourceUrl ?? null);

  let workId;
  if (existing) {
    workId = existing.id;
    db.prepare(
      `UPDATE works SET title=@title, composer_id=@composer_id, instrumentation=@instrumentation,
         opus=@opus, year=@year, license=@license, license_redistributable=@redist
       WHERE id=@id`
    ).run({
      id: workId,
      title: work.title,
      composer_id: composerId,
      instrumentation: work.instrumentation ?? null,
      opus: work.opus ?? null,
      year: work.year ?? null,
      license: work.license ?? null,
      redist: work.licenseRedistributable ? 1 : 0,
    });
    // 既存ファイルは作り直す（シンプルな冪等化）。
    db.prepare('DELETE FROM score_files WHERE work_id = ?').run(workId);
  } else {
    const info = db
      .prepare(
        `INSERT INTO works (title, composer_id, instrumentation, opus, year,
            source_id, source_url, license, license_redistributable)
         VALUES (@title,@composer_id,@instrumentation,@opus,@year,@source_id,@source_url,@license,@redist)`
      )
      .run({
        title: work.title,
        composer_id: composerId,
        instrumentation: work.instrumentation ?? null,
        opus: work.opus ?? null,
        year: work.year ?? null,
        source_id: sourceId,
        source_url: work.sourceUrl ?? null,
        license: work.license ?? null,
        redist: work.licenseRedistributable ? 1 : 0,
      });
    workId = info.lastInsertRowid;
  }

  const insFile = db.prepare(
    `INSERT INTO score_files (work_id, label, instrument, format, storage_kind, local_path, external_url, license)
     VALUES (@work_id,@label,@instrument,@format,@storage_kind,@local_path,@external_url,@license)
     ON CONFLICT(work_id, label, format, external_url) DO NOTHING`
  );
  for (const f of work.files || []) {
    insFile.run({
      work_id: workId,
      label: f.label ?? null,
      instrument: f.instrument ?? null,
      format: f.format ?? 'pdf',
      storage_kind: f.storageKind ?? 'external',
      local_path: f.localPath ?? null,
      external_url: f.externalUrl ?? null,
      license: f.license ?? work.license ?? null,
    });
  }
  upsertTags(db, workId, work.tags);
  return existing ? 'updated' : 'inserted';
}

/**
 * 再配布可能な PDF をローカルへ取得（オープンネットワーク環境向け）。
 * 失敗時は外部リンクのまま据え置く。
 */
async function downloadFile(file, fetchImpl) {
  if (!file.externalUrl || file.format !== 'pdf') return file;
  mkdirSync(STORAGE_DIR, { recursive: true });
  const name = file.externalUrl.replace(/[^a-z0-9]+/gi, '_').slice(-80) + '.pdf';
  const dest = join(STORAGE_DIR, name);
  try {
    const res = await fetchImpl(file.externalUrl);
    if (!res.ok || !res.body) return file;
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return { ...file, storageKind: 'local', localPath: `scores/${name}`, externalUrl: file.externalUrl };
  } catch {
    return file; // ネットワーク不可なら外部リンク維持
  }
}

/**
 * 指定ソースから収集して DB に保存する。
 * @param {Database} db
 * @param {string} sourceName
 * @param {object} [opts] - { limit, download, fetchImpl, ...adapterOpts }
 * @returns {Promise<{source:string, inserted:number, updated:number, total:number}>}
 */
export async function importFromSource(db, sourceName, opts = {}) {
  const adapter = getSource(sourceName);
  if (!adapter) throw new Error(`Unknown source: ${sourceName}`);
  const fetchImpl = opts.fetchImpl || fetch;
  const sourceId = upsertSource(db, adapter);

  const stats = { source: sourceName, inserted: 0, updated: 0, total: 0 };
  for await (const work of adapter.fetchWorks({ ...opts, fetchImpl })) {
    if (opts.download && adapter.type === 'redistributable') {
      work.files = await Promise.all((work.files || []).map((f) => downloadFile(f, fetchImpl)));
    }
    const result = saveWork(db, sourceId, work);
    stats[result] += 1;
    stats.total += 1;
  }
  return stats;
}
