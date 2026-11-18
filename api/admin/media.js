'use strict';

const A = require('../_admin.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!A.isAdmin(req, process.env)) return res.status(401).json({ error: 'Owner login required.' });
  const pathname = String((req.query && req.query.pathname) || '');
  if (!pathname.startsWith('uploads/') || pathname.includes('..') || pathname.indexOf(String.fromCharCode(92)) !== -1) {
    return res.status(400).json({ error: 'Invalid media path.' });
  }
  try {
    const { get } = require('@vercel/blob');
    const item = await get(pathname, { access: 'private' });
    if (!item || !item.stream) return res.status(404).json({ error: 'File not found.' });
    res.setHeader('Content-Type', item.blob.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(item.blob.size || ''));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const { Readable } = require('node:stream');
    return Readable.fromWeb(item.stream).pipe(res);
  } catch (e) {
    try { console.error('[admin-media] private media read failed', e && e.message); } catch {}
    return res.status(503).json({ error: 'Private media is temporarily unavailable.' });
  }
};
