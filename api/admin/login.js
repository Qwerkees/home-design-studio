'use strict';

const L = require('../_lib.js');
const A = require('../_admin.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!L.sameOrigin(req.headers)) return res.status(403).json({ error: 'Blocked cross-site request.' });
  if (!A.configReady(process.env)) return res.status(503).json({ error: 'Owner login is not configured yet.' });
  if (L.rateLimit('admin-login:' + L.clientIp(req.headers), 8, 15 * 60_000)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  const body = await L.readJsonBody(req);
  if (!A.passwordMatches(body.password, process.env.LDS_ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  A.setSessionCookie(res, A.createSession(process.env));
  return res.status(200).json({ ok: true });
};
