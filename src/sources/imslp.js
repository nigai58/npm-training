// IMSLP (Petrucci Music Library) アダプタ。
//
// IMSLP は著作権切れ譜面の最大級アーカイブだが、個々のファイルの再配布可否は
// 国・版により異なりグレーが残る。よって本アプリは **ファイルを再ホストせず**、
// メタデータと IMSLP 作品ページへの外部リンクのみを登録する（link-only）。
//
// 公式 JSON API:
//   https://imslp.org/imslpscripts/API.ISCR.php?account=worklist/disclaimer=accepted/
//     sort=id/type=2/start=<N>/retformat=json
//   type=1: 人物(作曲家) / type=2: 作品
//
// 注意: imslp.org は環境のネットワークポリシーで遮断されている場合がある。
// その場合 importer はエラーを表示するだけで他ソースには影響しない。

const API = 'https://imslp.org/imslpscripts/API.ISCR.php';

function apiUrl(type, start) {
  return `${API}?account=worklist/disclaimer=accepted/sort=id/type=${type}/start=${start}/retformat=json`;
}

/** IMSLP の作品レコード(オブジェクト)を正規化済み work に変換。 */
export function recordToWork(rec) {
  // API は { id, type, parent(作曲家), intvals:{ composer, worktitle, ... }, permlink }
  const meta = rec.intvals || {};
  const composer = meta.composer || rec.parent || 'Unknown';
  const title = meta.worktitle || rec.id || 'Untitled';
  const url = rec.permlink || (rec.id ? `https://imslp.org/wiki/${encodeURIComponent(rec.id)}` : null);

  return {
    title,
    composer: { name: composer },
    instrumentation: meta.instrumentation || null,
    opus: meta.opus || null,
    year: null,
    sourceUrl: url,
    license: 'Public Domain (IMSLP - 各ファイルのライセンス要確認)',
    licenseRedistributable: false, // 再ホストしない
    tags: ['IMSLP'],
    files: [
      {
        label: 'IMSLP ページ',
        instrument: null,
        format: 'link',
        storageKind: 'external',
        externalUrl: url,
        license: 'IMSLP',
      },
    ],
  };
}

export default {
  name: 'imslp',
  displayName: 'IMSLP / Petrucci Music Library',
  type: 'link-only',
  baseUrl: 'https://imslp.org',

  async *fetchWorks({ limit = 20, fetchImpl = fetch } = {}) {
    let start = 0;
    let count = 0;
    while (count < limit) {
      const res = await fetchImpl(apiUrl(2, start), {
        headers: { 'User-Agent': 'orchestra-sheet-library' },
      });
      if (!res.ok) throw new Error(`IMSLP API ${res.status} ${res.statusText}`);
      const data = await res.json();
      // API はオブジェクト({0:{},1:{},..,metadata:{}}) を返す。
      const records = Object.entries(data)
        .filter(([k]) => k !== 'metadata')
        .map(([, v]) => v)
        .filter((v) => v && (v.intvals || v.parent));
      if (records.length === 0) break;

      for (const rec of records) {
        if (count >= limit) break;
        const work = recordToWork(rec);
        if (!work.sourceUrl) continue;
        yield work;
        count++;
      }
      start += records.length;
    }
  },
};
