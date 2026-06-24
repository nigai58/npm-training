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
  return db;
}

/** プロセス共有のシングルトン DB を返す。 */
export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
