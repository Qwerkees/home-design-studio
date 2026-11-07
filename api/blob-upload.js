'use strict';

// Authorizes a direct browser -> Vercel Blob upload for Free-tier media. The
// file never passes through this function (that is how large videos work); we
// only mint a short-lived, scoped token capping content type + size. Every
// uploaded file is independently re-verified server-side in api/rfq.js before
// an RFQ is accepted, so a token alone proves nothing.
//
// Guards: POST-only, same-origin, per-IP rate limit. Needs BLOB_READ_WRITE_TOKEN.

const { handleUpload } = require('@vercel/blob/client');
const L = require('./_lib.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!L.sameOrigin(req.headers)) return res.status(403).json({ error: 'Blocked cross-site request.' });
  if (L.rateLimit('upload:' + L.clientIp(req.headers), 30, 60_000)) {
    return res.status(429).json({ error: 'Too many uploads — slow down a moment.' });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(501).json({ error: 'Uploads are not configured yet (no Blob store connected).' });

  try {
    const body = await L.readJsonBody(req);
    const json = await handleUpload({
      body, request: req, token,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: L.ALLOWED_TYPES,
        maximumSizeInBytes: L.MAX_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => { /* RFQ is attached client-side via /api/rfq */ },
    });
    return res.status(200).json(json);
  } catch (e) {
    try { console.error('[blob-upload]', e && e.message); } catch {}
    return res.status(400).json({ error: 'Upload authorization failed' });
  }
};
