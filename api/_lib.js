'use strict';

// Shared helpers for LUKE'S Design Studio serverless functions.

// Media we accept on the Free tier (photos + short videos of the space).
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
];
const MAX_BYTES = 75 * 1024 * 1024; // 75 MB per file
const MAX_FILES = 10;

function sanitizeText(s, max = 500) {
  if (s == null) return '';
  return String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// Only keep media refs that actually live in OUR Vercel Blob store — never an
// arbitrary external URL a client could inject into the RFQ record.
function cleanMedia(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const m of input.slice(0, MAX_FILES)) {
    if (!m || typeof m.url !== 'string') continue;
    let u;
    try { u = new URL(m.url); } catch { continue; }
    if (u.protocol !== 'https:' || !/\.public\.blob\.vercel-storage\.com$/i.test(u.hostname)) continue;
    const ct = typeof m.contentType === 'string' ? m.contentType : '';
    const kind = ct.startsWith('video/') ? 'video' : 'image';
    out.push({
      url: u.href,
      kind,
      contentType: ct.slice(0, 80),
      name: sanitizeText(m.name, 160),
      // HONEST provenance flags — see the note in api/rfq.js. These files are
      // accepted on the user's self-declaration; they are NOT yet machine-scanned
      // for malware or AI-generation. Marked for manual review by the owner.
      scanned: false,
      aiChecked: false,
      review: 'manual',
    });
  }
  return out;
}

// Read a JSON body from a Vercel Node request whether or not the platform has
// already parsed it.
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// Fire-and-forget owner notification. Works with zero setup (logs), and POSTs a
// compact summary to RFQ_NOTIFY_WEBHOOK when that env var is set (Slack / Zapier
// / Make / your own endpoint). Email delivery would need a provider and is left
// as a follow-up.
async function notifyOwner(rfq) {
  try {
    console.log('[RFQ]', rfq.id, rfq.space || '-', (rfq.media || []).length + ' files', rfq.contact || '-');
  } catch {}
  const hook = process.env.RFQ_NOTIFY_WEBHOOK;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `New LUKE'S Design Studio RFQ ${rfq.id} — ${rfq.space || 'space'} — ${(rfq.media || []).length} file(s) — ${rfq.name || ''} ${rfq.contact || ''}`.trim(),
        rfq,
      }),
    });
  } catch (e) {
    try { console.error('[RFQ] notify webhook failed:', e && e.message); } catch {}
  }
}

module.exports = { ALLOWED_TYPES, MAX_BYTES, MAX_FILES, sanitizeText, cleanMedia, readJsonBody, notifyOwner };
