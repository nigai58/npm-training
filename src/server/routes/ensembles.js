// 合奏団・メンバー API（Phase 2）。

import { Router } from 'express';
import {
  createEnsemble,
  listEnsembles,
  getEnsemble,
  addMember,
  listMembers,
  removeMember,
} from '../services/ensembles.js';
import { listMemberInbox } from '../services/distribution.js';

export function ensemblesRouter(db) {
  const router = Router();

  router.get('/ensembles', (req, res) => res.json({ ensembles: listEnsembles(db) }));

  router.post('/ensembles', (req, res) => {
    try {
      res.status(201).json(createEnsemble(db, req.body?.name));
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  router.get('/ensembles/:id', (req, res) => {
    const ensemble = getEnsemble(db, Number(req.params.id));
    if (!ensemble) return res.status(404).json({ error: 'not found' });
    res.json(ensemble);
  });

  router.get('/ensembles/:id/members', (req, res) => {
    res.json({ members: listMembers(db, Number(req.params.id)) });
  });

  router.post('/ensembles/:id/members', (req, res) => {
    try {
      res.status(201).json(addMember(db, Number(req.params.id), req.body || {}));
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  router.delete('/members/:id', (req, res) => {
    const ok = removeMember(db, Number(req.params.id));
    res.status(ok ? 204 : 404).end();
  });

  // メンバーの受信箱（自分宛に届いた譜面）
  router.get('/members/:id/inbox', (req, res) => {
    res.json({ inbox: listMemberInbox(db, Number(req.params.id)) });
  });

  return router;
}
