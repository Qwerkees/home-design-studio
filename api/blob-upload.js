'use strict';

// Authorizes a direct browser -> Vercel Blob upload for the Free-tier media.
// The file never passes through this function (that is how we accept videos
// larger than the serverless body limit). We only mint a short-lived, scoped
// upload token, capping the content type and size.
//
// Needs BLOB_READ_WRITE_TOKEN (set automatically when a Vercel Blob store is
// connected to the project). Without it we return 501 so the UI can degrade
// gracefully instead of erroring opaquely.

const { handleUpload } = require('@vercel/blob/client');
const { ALLOWED_TYPES, MAX_BYTES, readJsonBody } = require('./_lib.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(501).json({ error: 'Uploads are not configured yet (no Blob store connected).' });
  }
  try {
    const body = await readJsonBody(req);
    const json = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        // Keep Free-tier uploads in their own prefix.
        // (pathname is provided by the client; Blob stores it under this key.)
      }),
      onUploadCompleted: async () => {
        // The URL is attached to the RFQ by the client in a follow-up POST to
        // /api/rfq, so no server-side bookkeeping is needed here.
      },
    });
    return res.status(200).json(json);
  } catch (e) {
    try { console.error('[blob-upload]', e && e.message); } catch {}
    return res.status(400).json({ error: 'Upload authorization failed' });
  }
};
