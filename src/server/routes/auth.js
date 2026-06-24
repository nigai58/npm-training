// 認証 API（Phase 3）。

import { Router } from 'express';
import { registerUser, login, logout } from '../services/auth.js';
import { sessionCookie } from '../middleware/auth.js';

export function authRouter(db) {
  const router = Router();

  router.post('/auth/register', (req, res) => {
    try {
      const { token, user } = registerUser(db, req.body || {});
      res.setHeader('Set-Cookie', sessionCookie(token));
      res.status(201).json({ user });
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  router.post('/auth/login', (req, res) => {
    try {
      const { token, user } = login(db, req.body || {});
      res.setHeader('Set-Cookie', sessionCookie(token));
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: String(err.message || err) });
    }
  });

  router.post('/auth/logout', (req, res) => {
    logout(db, req.sessionToken);
    res.setHeader('Set-Cookie', sessionCookie('', { clear: true }));
    res.json({ ok: true });
  });

  router.get('/auth/me', (req, res) => {
    res.json({ user: req.user || null });
  });

  return router;
}
