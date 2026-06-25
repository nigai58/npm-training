// 譜面配布 API（Phase 2）。

import { Router } from 'express';
import {
  createDistribution,
  getDistribution,
  listEnsembleDistributions,
  markRead,
} from '../services/distribution.js';
import { requireAuth } from '../middleware/auth.js';

export function distributionsRouter(db) {
  const router = Router();

  // POST /api/distributions
  // body: { ensembleId, workId, senderMemberId, recipientMemberIds[], message }
  router.post('/distributions', requireAuth, (req, res) => {
    try {
      const b = req.body || {};
      const dist = createDistribution(db, {
        ensembleId: Number(b.ensembleId),
        workId: Number(b.workId),
        senderMemberId: Number(b.senderMemberId),
        recipientMemberIds: (b.recipientMemberIds || []).map(Number),
        message: b.message,
      });
      res.status(201).json(dist);
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  router.get('/distributions/:id', (req, res) => {
    const dist = getDistribution(db, Number(req.params.id));
    if (!dist) return res.status(404).json({ error: 'not found' });
    res.json(dist);
  });

  // 既読化（受信メンバー視点）。body: { memberId }
  router.post('/distributions/:id/read', (req, res) => {
    const memberId = Number(req.body?.memberId);
    if (!memberId) return res.status(400).json({ error: 'memberId is required' });
    const ok = markRead(db, Number(req.params.id), memberId);
    res.json({ updated: ok });
  });

  // 合奏団の配布履歴
  router.get('/ensembles/:id/distributions', (req, res) => {
    res.json({ distributions: listEnsembleDistributions(db, Number(req.params.id)) });
  });

  return router;
}
