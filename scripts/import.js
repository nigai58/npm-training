#!/usr/bin/env node
// 譜面収集 CLI。
//
//   node scripts/import.js <source> [--limit N] [--download]
//
// 例:
//   node scripts/import.js seed            # バンドル済みPDデータ(ネット不要)
//   node scripts/import.js mutopia --limit 15
//   node scripts/import.js imslp --limit 20
//
// --download: 再配布可ソースの PDF を storage/ へ取得（オープンネットワーク時）。

import { getDb } from '../src/server/db.js';
import { importFromSource } from '../src/server/services/importer.js';
import { listSources } from '../src/sources/index.js';

function parseArgs(argv) {
  const args = { source: null, limit: undefined, download: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--download') args.download = true;
    else if (!a.startsWith('--') && !args.source) args.source = a;
  }
  return args;
}

async function main() {
  const { source, limit, download } = parseArgs(process.argv.slice(2));
  if (!source) {
    console.error('使い方: node scripts/import.js <source> [--limit N] [--download]');
    console.error('利用可能なソース:', listSources().map((s) => s.name).join(', '));
    process.exit(1);
  }

  console.log(`[import] ソース '${source}' から収集中... (limit=${limit ?? '既定'}, download=${download})`);
  try {
    const stats = await importFromSource(getDb(), source, { limit, download });
    console.log(`[import] 完了: 新規 ${stats.inserted} / 更新 ${stats.updated} / 合計 ${stats.total}`);
  } catch (err) {
    console.error('[import] 失敗:', err.message || err);
    process.exit(1);
  }
}

main();
