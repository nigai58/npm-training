// 認証ミドルウェア（Phase 3）。
// Cookie の sid からユーザーを解決し req.user に載せる。依存追加を避けるため
// Cookie ヘッダは手動でパースする。

import { userForToken } from '../services/auth.js';

export const SESSION_COOKIE = 'sid';

/** Cookie ヘッダを { name: value } に分解。 */
export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** 全リクエストで req.user を解決（未ログインなら null）。 */
export function attachUser(db) {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie).sid;
    req.sessionToken = token || null;
    req.user = userForToken(db, token);
    next();
  };
}

/** 認証必須エンドポイント用。未ログインは 401。 */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'ログインが必要です' });
  next();
}

/** Set-Cookie ヘッダ値を作る。HTTPS 配下では Secure を付与する。 */
export function sessionCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : 60 * 60 * 24 * 30;
  const secure =
    process.env.SECURE_COOKIES === '1' || process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${SESSION_COOKIE}=${clear ? '' : token}; HttpOnly; ${secure}Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}
