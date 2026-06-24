// 譜面ファイルの取得。ローカル保存(再配布可)は配信し、外部リンクは URL を返す。

import { Router } from 'express';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = join(__dirname, '../../../storage');

export function filesRouter(db) {
  const router = Router();

  // GET /api/files/:id  -> ローカルPDFを配信、または外部URLへ 302
  router.get('/files/:id', (req, res) => {
    const file = db.prepare('SELECT * FROM score_files WHERE id = ?').get(Number(req.params.id));
    if (!file) return res.status(404).json({ error: 'not found' });

    if (file.storage_kind === 'local' && file.local_path) {
      const abs = join(STORAGE_DIR, file.local_path);
      if (!existsSync(abs)) return res.status(410).json({ error: 'file missing on disk' });
      return res.sendFile(abs);
    }
    if (file.external_url) return res.redirect(302, file.external_url);
    return res.status(404).json({ error: 'no content' });
  });

  return router;
}
