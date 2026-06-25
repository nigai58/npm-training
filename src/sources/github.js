// GitHub API / raw コンテンツ取得の薄いヘルパ。
// Mutopia のデータは GitHub 上にあり、ネットワーク許可リストに含まれるため
// ここ経由で実データを収集できる。未認証だとレート制限(60/h)があるので
// GITHUB_TOKEN があればヘッダに付与する。

const API = 'https://api.github.com';

function authHeaders() {
  const h = { 'User-Agent': 'orchestra-sheet-library', Accept: 'application/vnd.github+json' };
  // 'proxy-injected' は実トークンをプロキシ側が差し込むためのプレースホルダなので送らない。
  const token = process.env.GITHUB_TOKEN;
  if (token && token !== 'proxy-injected') h.Authorization = `Bearer ${token}`;
  return h;
}

/** GitHub API へ GET して JSON を返す。 */
export async function ghJson(path, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json();
}

/** raw.githubusercontent.com から生テキストを返す。 */
export async function ghRaw(owner, repo, ref, path, fetchImpl = fetch) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'orchestra-sheet-library' } });
  if (!res.ok) throw new Error(`raw ${res.status} for ${url}`);
  return res.text();
}

/**
 * あるツリー SHA 配下の全パスを再帰取得（1 リクエスト）。
 * @returns {{ tree: Array<{path:string,type:string}>, truncated:boolean }}
 */
export async function ghTree(owner, repo, sha, fetchImpl = fetch) {
  const data = await ghJson(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, fetchImpl);
  return { tree: data.tree || [], truncated: !!data.truncated };
}
