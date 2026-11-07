'use strict';

// Receives a Free-tier Request-For-Quote: the chosen space, the customer's
// contact details, their uploaded media refs, and their self-declaration that
// the media is real and theirs. Stores the RFQ in Vercel Blob and notifies the
// owner so the 3-option / 36-hour flow can begin.
//
// PROVENANCE / SAFETY — honest state:
//   • Content type + size are capped when the upload token is minted
//     (api/blob-upload.js), and only media that lives in our own Blob store is
//     accepted here (see cleanMedia).
//   • Malware scanning and AI-generated-image detection are NOT yet performed by
//     a machine. The gate is the mandatory self-declaration below, and every RFQ
//     is flagged review:"manual" for the owner. Wiring a real scanner
//     (e.g. a VirusTotal / image-provenance service) is a tracked follow-up.
//
// Needs BLOB_READ_WRITE_TOKEN to persist. Optional LDS_DATA_KEY (base64, 32
// bytes) encrypts the stored record at rest (AES-256-GCM) so customer PII is
// not readable from the blob even though blob URLs are public-by-link.

const crypto = require('node:crypto');
const { sanitizeText, cleanMedia, readJsonBody, notifyOwner, MAX_FILES } = require('./_lib.js');

function rfqId() {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
  return 'RFQ-' + stamp + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function maybeEncrypt(jsonString) {
  const keyB64 = process.env.LDS_DATA_KEY;
  if (!keyB64) return { body: jsonString, encrypted: false };
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) return { body: jsonString, encrypted: false };
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(jsonString, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return {
    body: JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), ct: ct.toString('base64') }),
    encrypted: true,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = await readJsonBody(req);

  // Mandatory self-declaration — no RFQ without it.
  if (body.declaredReal !== true) {
    return res.status(400).json({ error: 'Please confirm the photos/videos are real and yours before submitting.' });
  }

  const name = sanitizeText(body.name, 120);
  const contact = sanitizeText(body.contact, 160); // phone or email
  const space = sanitizeText(body.space, 60);
  const style = sanitizeText(body.style, 60);
  const notes = sanitizeText(body.notes, 1200);
  const media = cleanMedia(body.media);

  if (!contact) return res.status(400).json({ error: 'Add a phone number or email so we can send your options.' });
  if (media.length === 0) return res.status(400).json({ error: 'Add at least one photo or video of the space.' });
  if (media.length > MAX_FILES) return res.status(400).json({ error: 'Too many files — ' + MAX_FILES + ' max.' });

  const rfq = {
    id: rfqId(),
    createdAt: new Date().toISOString(),
    tier: 'free',
    space, style, name, contact, notes,
    declaredReal: true,
    media,
    status: 'received',
    review: 'manual',
    sla: '36h',
  };

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    // Still notify (logs/webhook) so nothing is lost, but tell the client storage
    // isn't connected yet.
    await notifyOwner(rfq);
    return res.status(501).json({ error: 'Storage is not connected yet — your request was logged but not saved. Please try again shortly.', id: rfq.id });
  }

  try {
    const { put } = require('@vercel/blob');
    const { body: stored, encrypted } = maybeEncrypt(JSON.stringify(rfq));
    await put('rfqs/' + rfq.id + '.json', stored, {
      access: 'public',
      token,
      contentType: 'application/json',
      addRandomSuffix: true, // unguessable URL; PII also encrypted when LDS_DATA_KEY set
    });
    rfq.stored = true;
    rfq.encryptedAtRest = encrypted;
  } catch (e) {
    try { console.error('[rfq] store failed:', e && e.message); } catch {}
    return res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }

  await notifyOwner(rfq);

  return res.status(200).json({
    ok: true,
    id: rfq.id,
    sla: '36 HRS',
    message: "Got it — we'll prepare 3 design options and reach out within 36 hours.",
  });
};
