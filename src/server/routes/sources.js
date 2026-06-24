// ソース一覧と同期トリガ API。

import { Router } from 'express';
import { listSources } from '../../sources/index.js';
import { importFromSource } from '../services/importer.js';

export function sourcesRouter(db) {
  const router = Router();

  // GET /api/sources  登録済み収集元アダプタ一覧
  router.get('/sources', (req, res) => {
    res.json({
      sources: listSources().map((s) => ({
        name: s.name,
        displayName: s.displayName,
        type: s.type,
        baseUrl: s.baseUrl ?? null,
      })),
    });
  });

  // POST /api/sources/:name/sync  { limit?, download? }
  router.post('/sources/:name/sync', async (req, res) => {
    try {
      const { limit, download } = req.body || {};
      const stats = await importFromSource(db, req.params.name, {
        limit: limit ? Number(limit) : undefined,
        download: !!download,
      });
      res.json(stats);
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  return router;
}
