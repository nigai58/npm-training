// SQLite 接続の初期化とマイグレーション実行。
// DB ファイルは data/app.db（.gitignore 対象）。テスト用に in-memory も選べる。

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '../../data/app.db');
const MIGRATIONS = join(__dirname, 'migrations.sql');

let _db = null;

/**
 * DB ハンドルを生成する。
 * @param {string} [path] - DB ファイルパス。':memory:' でメモリDB。
 */
export function createDb(path = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(MIGRATIONS, 'utf8');
  db.exec(schema);
  applyColumnMigrations(db);
  return db;
}

/** 既存テーブルに不足カラムを冪等に追加する（既存DBの段階的移行用）。 */
function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function applyColumnMigrations(db) {
  // Phase 3: 所有者・既読・通知日時
  ensureColumn(db, 'ensembles', 'owner_user_id', 'owner_user_id INTEGER REFERENCES users(id)');
  ensureColumn(db, 'distribution_recipients', 'read_at', 'read_at TEXT');
  ensureColumn(db, 'distribution_recipients', 'notified_at', 'notified_at TEXT');
}

/** プロセス共有のシングルトン DB を返す。 */
export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
