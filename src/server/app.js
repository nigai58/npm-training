// Express アプリ生成。API ルータをマウントし、public/ を静的配信する。
// db を引数で受け取ることでテストから in-memory DB を注入できる。

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { worksRouter } from './routes/works.js';
import { filesRouter } from './routes/files.js';
import { sourcesRouter } from './routes/sources.js';
import { ensemblesRouter } from './routes/ensembles.js';
import { distributionsRouter } from './routes/distributions.js';
import { authRouter } from './routes/auth.js';
import { attachUser } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../../public');

export function createApp(db) {
  const app = express();
  app.set('trust proxy', 1); // nginx 等のリバースプロキシ配下で動かす前提
  app.use(express.json());
  app.use(attachUser(db)); // 全リクエストで req.user を解決

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api', authRouter(db));
  app.use('/api', worksRouter(db));
  app.use('/api', filesRouter(db));
  app.use('/api', sourcesRouter(db));
  app.use('/api', ensemblesRouter(db));
  app.use('/api', distributionsRouter(db));

  app.use(express.static(PUBLIC_DIR));
  return app;
}
