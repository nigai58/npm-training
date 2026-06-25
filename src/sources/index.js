// ソースアダプタのレジストリ。
// 新しい収集元はここに登録するだけで importer / CLI / API から使えるようになる。

import seed from './seed.js';
import mutopia from './mutopia.js';
import imslp from './imslp.js';

const adapters = new Map();

/** アダプタを登録する。 */
export function registerSource(adapter) {
  if (!adapter?.name) throw new Error('adapter.name is required');
  adapters.set(adapter.name, adapter);
}

[seed, mutopia, imslp].forEach(registerSource);

/** 名前でアダプタを取得（無ければ undefined）。 */
export function getSource(name) {
  return adapters.get(name);
}

/** 登録済みアダプタ一覧。 */
export function listSources() {
  return [...adapters.values()];
}
