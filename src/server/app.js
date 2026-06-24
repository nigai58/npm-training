// Express アプリ生成。API ルータをマウントし、public/ を静的配信する。
// db を引数で受け取ることでテストから in-memory DB を注入できる。

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { worksRouter } from './routes/works.js';
import { filesRouter } from './routes/files.js';
import { sourcesRouter } from './routes/sources.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../../public');

export function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api', worksRouter(db));
  app.use('/api', filesRouter(db));
  app.use('/api', sourcesRouter(db));

  app.use(express.static(PUBLIC_DIR));
  return app;
}
