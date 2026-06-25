// シードアダプタ。
// 厳選した実在のパブリックドメイン作品(seed-data.json)を流し込む。
// 外部ネットワークに依存せず、どの環境でもアプリを end-to-end で動かせる。
// デモ初期データ兼、収集パイプラインの動作確認用。

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, 'seed-data.json');

export default {
  name: 'seed',
  displayName: 'Built-in seed (curated public-domain)',
  type: 'redistributable',
  baseUrl: null,

  async *fetchWorks({ limit = Infinity } = {}) {
    const works = JSON.parse(readFileSync(DATA, 'utf8'));
    let count = 0;
    for (const w of works) {
      if (count >= limit) break;
      yield w;
      count++;
    }
  },
};
