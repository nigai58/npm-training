// 曲一覧/検索・詳細・ファセット API。

import { Router } from 'express';
import { searchWorks, getWork, getFacets } from '../services/library.js';

export function worksRouter(db) {
  const router = Router();

  // GET /api/works?search=&composer=&instrument=&tag=&source=&redistributable=
  router.get('/works', (req, res) => {
    res.json({ works: searchWorks(db, req.query) });
  });

  // GET /api/works/:id
  router.get('/works/:id', (req, res) => {
    const work = getWork(db, Number(req.params.id));
    if (!work) return res.status(404).json({ error: 'not found' });
    res.json(work);
  });

  // GET /api/facets  （フィルタ UI 用の候補一覧）
  router.get('/facets', (req, res) => {
    res.json(getFacets(db));
  });

  return router;
}
