// 合奏団・メンバー API（Phase 2 / 3）。
// 変更系は認証必須。所有者(owner_user_id)のみ操作できる。

import { Router } from 'express';
import {
  createEnsemble,
  listEnsembles,
  getEnsemble,
  addMember,
  listMembers,
  removeMember,
  getMember,
  canManage,
} from '../services/ensembles.js';
import { listMemberInbox, unreadCount, recommendForMember } from '../services/distribution.js';
import { requireAuth } from '../middleware/auth.js';

export function ensemblesRouter(db) {
  const router = Router();

  // ログイン中は自分の所有合奏団のみ、未ログインは全件（閲覧）。
  router.get('/ensembles', (req, res) =>
    res.json({ ensembles: listEnsembles(db, req.user?.id ?? null) })
  );

  router.post('/ensembles', requireAuth, (req, res) => {
    try {
      res.status(201).json(createEnsemble(db, req.body?.name, req.user.id));
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

  router.post('/ensembles/:id/members', requireAuth, (req, res) => {
    const ensembleId = Number(req.params.id);
    if (!canManage(db, ensembleId, req.user.id)) {
      return res.status(403).json({ error: 'この合奏団を操作する権限がありません' });
    }
    try {
      res.status(201).json(addMember(db, ensembleId, req.body || {}));
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  router.delete('/members/:id', requireAuth, (req, res) => {
    const member = getMember(db, Number(req.params.id));
    if (!member) return res.status(404).end();
    if (!canManage(db, member.ensemble_id, req.user.id)) {
      return res.status(403).json({ error: 'この合奏団を操作する権限がありません' });
    }
    removeMember(db, member.id);
    res.status(204).end();
  });

  // メンバーの受信箱（自分宛に届いた譜面）＋未読数
  router.get('/members/:id/inbox', (req, res) => {
    const id = Number(req.params.id);
    res.json({ inbox: listMemberInbox(db, id), unread: unreadCount(db, id) });
  });

  // 楽器に応じた譜面提案
  router.get('/members/:id/recommendations', (req, res) => {
    res.json({ recommendations: recommendForMember(db, Number(req.params.id)) });
  });

  return router;
}
