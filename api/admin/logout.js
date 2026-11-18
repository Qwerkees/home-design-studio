'use strict';

const L = require('../_lib.js');
const A = require('../_admin.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!L.sameOrigin(req.headers)) return res.status(403).json({ error: 'Blocked cross-site request.' });
  A.clearSessionCookie(res);
  return res.status(200).json({ ok: true });
};
