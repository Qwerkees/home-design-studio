'use strict';

// Hardened shared helpers for LUKE'S Design Studio serverless functions.
// Everything here is pure/injectable so it can be unit-tested offline.

const crypto = require('node:crypto');

// ---- Policy ---------------------------------------------------------------
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
];
const MAX_BYTES = 75 * 1024 * 1024; // 75 MB/file
const MAX_FILES = 10;
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/i;

// ---- Text -----------------------------------------------------------------
function sanitizeText(s, max = 500) {
  if (s == null) return '';
  return String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ---- Magic-byte sniffing (never trust the client-declared content type) ----
// Returns a canonical media type from the first bytes, or null if unrecognized.
function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  const b = buf;
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  const ascii = (i, n) => b.slice(i, i + n).toString('latin1');
  // WebP: RIFF....WEBP
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  // WebM / Matroska (EBML)
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  // ISO-BMFF: 'ftyp' at offset 4, brand at offset 8
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4).toLowerCase();
    if (/^(heic|heix|heif|hevc|hevx|mif1|msf1)$/.test(brand)) return 'image/heic';
    if (brand === 'qt  ' || brand === 'qt') return 'video/quicktime';
    return 'video/mp4'; // isom/mp41/mp42/iso2/avc1/m4v/dash/…
  }
  return null;
}
function typeFamily(t) { return typeof t === 'string' && t.indexOf('/') > 0 ? t.split('/')[0] : ''; }
function sniffAllowed(buf) {
  const t = sniffType(buf);
  if (!t) return null;
  // image/heif declared files sniff as image/heic (same ISO-BMFF family) — accept.
  const norm = t === 'image/heic' ? 'image/heic' : t;
  return ALLOWED_TYPES.indexOf(norm) !== -1 || (norm === 'image/heic' && ALLOWED_TYPES.indexOf('image/heif') !== -1)
    ? norm : null;
}

// ---- Media refs -----------------------------------------------------------
// Keep only refs that live in OUR Blob store (never an arbitrary external URL).
function cleanMedia(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const m of input.slice(0, MAX_FILES)) {
    if (!m || typeof m.url !== 'string') continue;
    let u;
    try { u = new URL(m.url); } catch { continue; }
    if (u.protocol !== 'https:' || !BLOB_HOST_RE.test(u.hostname)) continue;
    const ct = typeof m.contentType === 'string' ? m.contentType.slice(0, 80) : '';
    out.push({ url: u.href, contentType: ct, name: sanitizeText(m.name, 160) });
  }
  return out;
}

// Server-side verification of an uploaded blob: HEAD for size + content-type,
// ranged GET for magic bytes. Rejects spoofed types / oversize / non-media.
// `fetchFn` is injected for tests.
async function verifyBlobMedia(ref, fetchFn) {
  const f = fetchFn || globalThis.fetch;
  // Size + declared content type from the store.
  const head = await f(ref.url, { method: 'HEAD' });
  if (!head || !head.ok) throw httpErr(400, 'A file could not be verified.');
  const len = Number(head.headers.get('content-length') || '0');
  if (!(len > 0) || len > MAX_BYTES) throw httpErr(400, 'A file is missing or over 75 MB.');
  const storeType = (head.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  // Magic bytes.
  const range = await f(ref.url, { headers: { Range: 'bytes=0-31' } });
  if (!range || !range.ok) throw httpErr(400, 'A file could not be read.');
  const ab = await range.arrayBuffer();
  const sniffed = sniffAllowed(Buffer.from(ab));
  if (!sniffed) throw httpErr(415, 'A file is not an accepted photo/video type.');
  // The store's own content type must also be in policy and the same family.
  if (ALLOWED_TYPES.indexOf(storeType) === -1 || typeFamily(storeType) !== typeFamily(sniffed)) {
    throw httpErr(415, 'A file type did not match its contents.');
  }
  return { url: ref.url, name: ref.name, size: len, contentType: storeType, sniffed, kind: typeFamily(sniffed) === 'video' ? 'video' : 'image' };
}

// ---- Malware scan (real when a provider key is configured) ----------------
// VirusTotal URL scan. No key -> {scanned:false} and the self-declaration gate
// remains the control. A positive detection throws (RFQ rejected).
async function scanMedia(items, env, fetchFn) {
  const key = env.VIRUSTOTAL_API_KEY;
  const f = fetchFn || globalThis.fetch;
  if (!key) return items.map((it) => ({ ...it, scanned: false }));
  const out = [];
  for (const it of items) {
    try {
      const submit = await f('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: { 'x-apikey': key, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(it.url),
      });
      const sj = await submit.json();
      const id = sj && sj.data && sj.data.id;
      let malicious = 0;
      if (id) {
        const an = await f('https://www.virustotal.com/api/v3/analyses/' + id, { headers: { 'x-apikey': key } });
        const aj = await an.json();
        const stats = aj && aj.data && aj.data.attributes && aj.data.attributes.stats;
        malicious = stats ? (stats.malicious || 0) : 0;
      }
      if (malicious > 0) throw httpErr(422, 'A file failed the security scan and was rejected.');
      out.push({ ...it, scanned: true, malicious: 0 });
    } catch (e) {
      if (e && e.httpStatus) throw e; // a real malicious verdict
      out.push({ ...it, scanned: false, scanError: true }); // provider hiccup -> manual review
    }
  }
  return out;
}

// ---- AI-generated detection (real when a provider key is configured) ------
// Sightengine "genai" model. No creds -> {aiChecked:false}. Over threshold ->
// flagged (not auto-rejected; the owner decides) and recorded.
async function detectAIGen(items, env, fetchFn) {
  const user = env.SIGHTENGINE_USER, secret = env.SIGHTENGINE_SECRET;
  const f = fetchFn || globalThis.fetch;
  if (!user || !secret) return items.map((it) => ({ ...it, aiChecked: false }));
  const out = [];
  for (const it of items) {
    if (it.kind !== 'image') { out.push({ ...it, aiChecked: false }); continue; }
    try {
      const url = 'https://api.sightengine.com/1.0/check.json?models=genai&url=' +
        encodeURIComponent(it.url) + '&api_user=' + encodeURIComponent(user) + '&api_secret=' + encodeURIComponent(secret);
      const r = await f(url);
      const j = await r.json();
      const score = j && j.type && typeof j.type.ai_generated === 'number' ? j.type.ai_generated : null;
      out.push({ ...it, aiChecked: score != null, aiGenScore: score, aiGenFlag: score != null && score >= 0.5 });
    } catch {
      out.push({ ...it, aiChecked: false });
    }
  }
  return out;
}

// ---- Encryption at rest (AES-256-GCM when LDS_DATA_KEY is set) -------------
function maybeEncrypt(jsonString, env) {
  const keyB64 = env.LDS_DATA_KEY;
  if (!keyB64) return { body: jsonString, encrypted: false };
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    // Key is set but malformed. RFQ blobs are stored with public access, so a
    // silent plaintext downgrade would expose PII. Keep the funnel working
    // (don't brick submissions over a typo) but make the misconfig impossible
    // to miss in the logs so it gets fixed immediately.
    try { console.error('[rfq] LDS_DATA_KEY is set but is not 32 bytes after base64 decode (got ' + key.length + '); storing WITHOUT encryption. Regenerate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'); } catch {}
    return { body: jsonString, encrypted: false };
  }
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(jsonString, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return { body: JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), ct: ct.toString('base64') }), encrypted: true };
}
function decrypt(text, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const { iv, tag, ct } = JSON.parse(text);
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8'));
}

// ---- Request guards -------------------------------------------------------
function httpErr(status, message) { const e = new Error(message); e.httpStatus = status; return e; }

// Same-origin enforcement for state-changing POSTs (blocks cross-site abuse).
function sameOrigin(headers) {
  const host = (headers.host || headers[':authority'] || '').toLowerCase();
  if (!host) return false;
  const src = headers.origin || headers.referer || '';
  if (!src) return false; // require an Origin/Referer on POST
  try { return new URL(src).host.toLowerCase() === host; } catch { return false; }
}

// Best-effort in-memory rate limiter (per warm lambda). Durable limiting needs
// a KV/Upstash store; this still blunts bursts from a single IP.
const _hits = new Map();
function rateLimit(key, max, windowMs, now = Date.now()) {
  const arr = (_hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  _hits.set(key, arr);
  if (_hits.size > 5000) { for (const k of _hits.keys()) { _hits.delete(k); if (_hits.size <= 2500) break; } }
  return arr.length > max;
}
function clientIp(headers) {
  const xf = headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf) return xf.split(',')[0].trim();
  return headers['x-real-ip'] || 'unknown';
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function notifyOwner(rfq, env, fetchFn) {
  try { console.log('[RFQ]', rfq.id, rfq.space || '-', (rfq.media || []).length + ' files'); } catch {}
  const hook = env.RFQ_NOTIFY_WEBHOOK;
  if (!hook) return;
  const f = fetchFn || globalThis.fetch;
  try {
    await f(hook, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `New RFQ ${rfq.id} — ${rfq.space || 'space'} — ${(rfq.media || []).length} file(s)`, rfq }),
    });
  } catch (e) { try { console.error('[RFQ] notify failed', e && e.message); } catch {} }
}

module.exports = {
  ALLOWED_TYPES, MAX_BYTES, MAX_FILES, BLOB_HOST_RE,
  sanitizeText, sniffType, sniffAllowed, typeFamily, cleanMedia, verifyBlobMedia,
  scanMedia, detectAIGen, maybeEncrypt, decrypt,
  httpErr, sameOrigin, rateLimit, clientIp, readJsonBody, notifyOwner,
};
