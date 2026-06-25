// サーバ起動エントリ。

import { createApp } from './app.js';
import { getDb } from './db.js';

const PORT = process.env.PORT || 3000;
const app = createApp(getDb());

app.listen(PORT, () => {
  console.log(`オーケストラ譜面ライブラリ: http://localhost:${PORT}`);
});
