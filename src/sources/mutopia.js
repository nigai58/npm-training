// Mutopia Project アダプタ。
//
// Mutopia の譜面はすべて Creative Commons / Public Domain で「複製・配布・改変・
// 演奏」が明示的に許可されている（要・原典クレジット）。本アプリで再配布可能な
// 一次ソース。データは GitHub リポジトリ MutopiaProject/MutopiaProject 上にあり、
// 各曲の LilyPond ヘッダ(header.ily)にメタデータが埋め込まれている。
//
// レンダリング済み PDF は本家サイト(www.mutopiaproject.org)で配信されるため、
// score_files はそのページ/PDF への外部リンクとして登録する（オープンネットワーク
// 環境では importer 側で storage/ へダウンロードも可能）。

import { ghJson, ghRaw, ghTree } from './github.js';

const OWNER = 'MutopiaProject';
const REPO = 'MutopiaProject';
const REF = 'master';

// デモ既定。orchestral/室内楽を含む代表的作曲家。limit で総数を制限する。
const DEFAULT_COMPOSERS = ['VivaldiA', 'BachJS', 'MozartWA', 'BeethovenLv', 'SchubertF'];

/** header.ily 等の `key = "value"` 形式フィールドを抽出する。 */
export function parseLilyHeader(text) {
  const fields = {};
  const re = /^\s*([A-Za-z]+)\s*=\s*"((?:[^"\\]|\\.)*)"/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    fields[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return fields;
}

/** "Schirmer, 1916" のような文字列から年号を拾う。 */
function yearFrom(str) {
  const m = (str || '').match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/** footer "Mutopia-2018/01/19-517" から作品ページ ID を取る。 */
function pieceIdFrom(footer) {
  const m = (footer || '').match(/-(\d+)\s*$/);
  return m ? m[1] : null;
}

/** LilyPond ヘッダフィールド群を正規化済み work に変換。 */
export function headerToWork(fields, { composerKey, headerPath } = {}) {
  const license = fields.license || 'Public Domain';
  const redistributable = /public\s*domain|creative\s*commons|^cc[\s-]/i.test(license);
  const id = pieceIdFrom(fields.footer);
  const sourceUrl = id
    ? `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=${id}`
    : `https://github.com/${OWNER}/${REPO}/blob/${REF}/${headerPath}`;
  const tags = [];
  if (fields.style) tags.push(fields.style);
  if (fields.mutopiainstrument) tags.push(fields.mutopiainstrument);

  return {
    title: fields.mutopiatitle || fields.title || 'Untitled',
    composer: { name: fields.composer || composerKey || 'Unknown' },
    instrumentation: fields.mutopiainstrument || fields.instrument || null,
    opus: fields.mutopiaopus || fields.opus || null,
    year: yearFrom(fields.source),
    sourceUrl,
    license,
    licenseRedistributable: redistributable,
    tags,
    files: [
      {
        label: fields.mutopiainstrument || 'Full Score',
        instrument: fields.mutopiainstrument || null,
        format: 'pdf',
        storageKind: 'external',
        externalUrl: sourceUrl,
        license,
      },
    ],
  };
}

export default {
  name: 'mutopia',
  displayName: 'Mutopia Project',
  type: 'redistributable',
  baseUrl: 'https://www.mutopiaproject.org',

  /**
   * 正規化済み work を順次 yield する。
   * @param {object} opts
   * @param {number} [opts.limit=20]
   * @param {string[]} [opts.composers]
   * @param {typeof fetch} [opts.fetchImpl]
   */
  async *fetchWorks({ limit = 20, composers = DEFAULT_COMPOSERS, fetchImpl = fetch } = {}) {
    // 全作曲家ディレクトリを 1 回で取得し SHA を引く。
    const ftp = await ghJson(`/repos/${OWNER}/${REPO}/contents/ftp`, fetchImpl);
    const shaByName = new Map(ftp.filter((e) => e.type === 'dir').map((e) => [e.name, e.sha]));

    let count = 0;
    for (const composerKey of composers) {
      if (count >= limit) break;
      const sha = shaByName.get(composerKey);
      if (!sha) continue;

      const { tree } = await ghTree(OWNER, REPO, sha, fetchImpl);
      const headers = tree.filter((t) => t.type === 'blob' && t.path.endsWith('header.ily'));

      for (const h of headers) {
        if (count >= limit) break;
        const headerPath = `ftp/${composerKey}/${h.path}`;
        let text;
        try {
          text = await ghRaw(OWNER, REPO, REF, headerPath, fetchImpl);
        } catch {
          continue; // 取得失敗はスキップ
        }
        const fields = parseLilyHeader(text);
        if (!fields.mutopiatitle && !fields.title) continue;
        yield headerToWork(fields, { composerKey, headerPath });
        count++;
      }
    }
  },
};
