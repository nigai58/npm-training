-- スキーマ定義。ライセンス/著作権を第一級の属性として保持する。

PRAGMA foreign_keys = ON;

-- 収集元ソース（Mutopia, IMSLP など）
CREATE TABLE IF NOT EXISTS sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,        -- アダプタ名 (例: 'mutopia')
  display_name  TEXT NOT NULL,
  type          TEXT NOT NULL,               -- 'redistributable' | 'link-only'
  base_url      TEXT,
  last_synced_at TEXT
);

-- 作曲家
CREATE TABLE IF NOT EXISTS composers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  birth_year  INTEGER,
  death_year  INTEGER,
  era         TEXT
);

-- 曲（作品）
CREATE TABLE IF NOT EXISTS works (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  composer_id   INTEGER REFERENCES composers(id) ON DELETE SET NULL,
  instrumentation TEXT,                       -- 編成の説明文
  opus          TEXT,
  year          INTEGER,
  source_id     INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  source_url    TEXT,                         -- 一意性判定に使用
  license       TEXT,
  license_redistributable INTEGER NOT NULL DEFAULT 0,  -- BOOL: 実ファイル再配布可否
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_works_composer ON works(composer_id);
CREATE INDEX IF NOT EXISTS idx_works_title ON works(title);

-- 譜面ファイル（パート譜・総譜・MIDI 等）
CREATE TABLE IF NOT EXISTS score_files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id       INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  label         TEXT,                         -- 例: 'Full Score', 'Violin I'
  instrument    TEXT,                         -- 楽器絞り込み用
  format        TEXT NOT NULL DEFAULT 'pdf',  -- 'pdf' | 'midi' | 'ly'
  storage_kind  TEXT NOT NULL DEFAULT 'external', -- 'local' | 'external'
  local_path    TEXT,                         -- storage_kind='local' のとき
  external_url  TEXT,                         -- storage_kind='external' のとき
  license       TEXT,
  UNIQUE(work_id, label, format, external_url)
);

CREATE INDEX IF NOT EXISTS idx_files_work ON score_files(work_id);
CREATE INDEX IF NOT EXISTS idx_files_instrument ON score_files(instrument);

-- タグ（散らかり解消用の自由ラベル）
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS work_tags (
  work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);
