'use strict';

// Free-tier Request-For-Quote intake. Hardened + testable: the core logic is
// `processRfq`, which takes injected deps (env, fetchFn, blobPut) so it runs in
// unit tests offline. The default export wires a real Vercel request to it.
//
// SAFETY PIPELINE (server-side, never trusts the browser):
//   1. Same-origin + rate-limit + method guards.
//   2. Mandatory "real & mine, not AI-generated" self-declaration.
//   3. Media refs must live in our own Blob store.
//   4. verifyBlobMedia: HEAD (size) + ranged GET (magic bytes) — rejects
//      spoofed/oversize/non-media files.
//   5. scanMedia: VirusTotal scan when VIRUSTOTAL_API_KEY is set (malicious ->
//      reject); otherwise flagged for manual review.
//   6. detectAIGen: Sightengine genai when configured (records a score/flag).
//   7. Store (optionally AES-256-GCM encrypted) + notify owner.

const crypto = require('node:crypto');
const L = require('./_lib.js');

function rfqId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return 'RFQ-' + stamp + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function processRfq({ body, headers, env, fetchFn, blobPut }) {
  if (!L.sameOrigin(headers)) return { status: 403, json: { error: 'Blocked cross-site request.' } };
  if (L.rateLimit('rfq:' + L.clientIp(headers), 8, 60_000)) {
    return { status: 429, json: { error: 'Too many requests — give it a minute.' } };
  }

  body = body || {};
  if (body.declaredReal !== true) {
    return { status: 400, json: { error: 'Please confirm the photos/videos are real and yours before submitting.' } };
  }

  const name = L.sanitizeText(body.name, 120);
  const contact = L.sanitizeText(body.contact, 160);
  const space = L.sanitizeText(body.space, 60);
  const style = L.sanitizeText(body.style, 60);
  const notes = L.sanitizeText(body.notes, 1200);
  if (body.company) return { status: 400, json: { error: 'Rejected.' } }; // honeypot
  if (!contact) return { status: 400, json: { error: 'Add a phone number or email so we can send your options.' } };

  const refs = L.cleanMedia(body.media);
  if (refs.length === 0) return { status: 400, json: { error: 'Add at least one photo or video of the space.' } };
  if (refs.length > L.MAX_FILES) return { status: 400, json: { error: 'Too many files — ' + L.MAX_FILES + ' max.' } };

  // 4) Verify every file against its actual bytes.
  let media = [];
  try {
    for (const r of refs) media.push(await L.verifyBlobMedia(r, fetchFn));
  } catch (e) {
    return { status: e.httpStatus || 400, json: { error: e.message || 'A file could not be verified.' } };
  }

  // 5) Malware scan (throws on a malicious verdict).
  try { media = await L.scanMedia(media, env, fetchFn); }
  catch (e) { return { status: e.httpStatus || 422, json: { error: e.message || 'A file failed the security scan.' } }; }

  // 6) AI-generated detection (records a score/flag; does not auto-reject).
  media = await L.detectAIGen(media, env, fetchFn);

  const rfq = {
    id: rfqId(), createdAt: new Date().toISOString(), tier: 'free',
    space, style, name, contact, notes, declaredReal: true,
    media, status: 'received', review: 'manual', sla: '36h',
  };

  if (!env.BLOB_READ_WRITE_TOKEN || !blobPut) {
    await L.notifyOwner(rfq, env, fetchFn);
    return { status: 501, json: { error: 'Storage is not connected yet — your request was logged but not saved. Please try again shortly.', id: rfq.id } };
  }

  try {
    const { body: stored, encrypted } = L.maybeEncrypt(JSON.stringify(rfq), env);
    await blobPut('rfqs/' + rfq.id + '.json', stored, {
      access: 'public', token: env.BLOB_READ_WRITE_TOKEN, contentType: 'application/json', addRandomSuffix: true,
    });
    rfq.stored = true; rfq.encryptedAtRest = encrypted;
  } catch (e) {
    try { console.error('[rfq] store failed', e && e.message); } catch {}
    return { status: 500, json: { error: 'Could not save your request. Please try again.' } };
  }

  await L.notifyOwner(rfq, env, fetchFn);
  const flagged = rfq.media.some((m) => m.aiGenFlag);
  return {
    status: 200,
    json: { ok: true, id: rfq.id, sla: '36 HRS', flagged, message: "Got it — we'll prepare 3 design options and reach out within 36 hours." },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  let body;
  try { body = await L.readJsonBody(req); } catch { body = {}; }
  let blobPut = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try { blobPut = require('@vercel/blob').put; } catch {}
  }
  const out = await processRfq({ body, headers: req.headers, env: process.env, fetchFn: globalThis.fetch, blobPut });
  return res.status(out.status).json(out.json);
};
module.exports.processRfq = processRfq;
