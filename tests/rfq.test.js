'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { processRfq } = require('../api/rfq.js');
const { MAGIC, makeFetch, BLOB } = require('./helpers.js');

let ipN = 0;
function headers() { ipN += 1; return { host: 'studio.test', origin: 'https://studio.test', 'x-forwarded-for': '10.0.0.' + ipN }; }
function goodBody(extra) {
  return Object.assign({ declaredReal: true, contact: 'me@example.com', space: 'Kitchen', media: [{ url: BLOB('a.jpg'), contentType: 'image/jpeg', name: 'a.jpg' }] }, extra || {});
}
function env(extra) { return Object.assign({ BLOB_READ_WRITE_TOKEN: 'tok' }, extra || {}); }
function blobObjects() { return { [BLOB('a.jpg')]: { size: 2048, storeType: 'image/jpeg', magic: MAGIC.jpeg } }; }

test('rejects a cross-site origin (403)', async () => {
  const out = await processRfq({ body: goodBody(), headers: { host: 'studio.test', origin: 'https://evil.test', 'x-forwarded-for': '9.9.9.1' }, env: env(), fetchFn: makeFetch(blobObjects()), blobPut: async () => {} });
  assert.equal(out.status, 403);
});

test('requires the self-declaration (400)', async () => {
  const out = await processRfq({ body: goodBody({ declaredReal: false }), headers: headers(), env: env(), fetchFn: makeFetch(blobObjects()), blobPut: async () => {} });
  assert.equal(out.status, 400);
  assert.match(out.json.error, /confirm/i);
});

test('requires contact (400)', async () => {
  const out = await processRfq({ body: goodBody({ contact: '' }), headers: headers(), env: env(), fetchFn: makeFetch(blobObjects()), blobPut: async () => {} });
  assert.equal(out.status, 400);
});

test('honeypot field is rejected (400)', async () => {
  const out = await processRfq({ body: goodBody({ company: 'spam' }), headers: headers(), env: env(), fetchFn: makeFetch(blobObjects()), blobPut: async () => {} });
  assert.equal(out.status, 400);
});

test('requires at least one valid media ref (400)', async () => {
  const out = await processRfq({ body: goodBody({ media: [{ url: 'https://evil.example.com/x.jpg' }] }), headers: headers(), env: env(), fetchFn: makeFetch(blobObjects()), blobPut: async () => {} });
  assert.equal(out.status, 400);
});

test('happy path stores the RFQ and returns 36 HRS (200)', async () => {
  let putArgs = null;
  const out = await processRfq({
    body: goodBody(), headers: headers(), env: env(),
    fetchFn: makeFetch(blobObjects()),
    blobPut: async (path, body, opts) => { putArgs = { path, body, opts }; },
  });
  assert.equal(out.status, 200);
  assert.equal(out.json.ok, true);
  assert.match(out.json.id, /^RFQ-\d{8}-[0-9A-F]{8}$/);
  assert.equal(out.json.sla, '36 HRS');
  assert.ok(putArgs && putArgs.path.startsWith('rfqs/'));
  assert.equal(putArgs.opts.addRandomSuffix, true);
});

test('encrypts at rest when LDS_DATA_KEY is set', async () => {
  const key = require('node:crypto').randomBytes(32).toString('base64');
  let stored = null;
  const out = await processRfq({
    body: goodBody(), headers: headers(), env: env({ LDS_DATA_KEY: key }),
    fetchFn: makeFetch(blobObjects()),
    blobPut: async (path, body) => { stored = body; },
  });
  assert.equal(out.status, 200);
  assert.equal(stored.indexOf('me@example.com'), -1); // PII not readable in the stored body
  assert.match(stored, /"ct":/);
});

test('rejects a spoofed file via server-side magic check (415)', async () => {
  const objs = { [BLOB('a.jpg')]: { size: 500, storeType: 'image/jpeg', magic: MAGIC.webm } };
  const out = await processRfq({ body: goodBody(), headers: headers(), env: env(), fetchFn: makeFetch(objs), blobPut: async () => {} });
  assert.equal(out.status, 415);
});

test('rejects a malicious file when the scanner is configured (422)', async () => {
  const out = await processRfq({
    body: goodBody(), headers: headers(), env: env({ VIRUSTOTAL_API_KEY: 'k' }),
    fetchFn: makeFetch(blobObjects(), { vt: { malicious: 4 } }), blobPut: async () => {},
  });
  assert.equal(out.status, 422);
});

test('without a storage token, logs but returns 501', async () => {
  const out = await processRfq({ body: goodBody(), headers: headers(), env: {}, fetchFn: makeFetch(blobObjects()), blobPut: null });
  assert.equal(out.status, 501);
  assert.match(out.json.id, /^RFQ-/);
});

test('records an AI-gen flag when detection is configured', async () => {
  let stored = null;
  const out = await processRfq({
    body: goodBody(), headers: headers(), env: env({ SIGHTENGINE_USER: 'u', SIGHTENGINE_SECRET: 's' }),
    fetchFn: makeFetch(blobObjects(), { aigen: { ai_generated: 0.95 } }),
    blobPut: async (p, b) => { stored = b; },
  });
  assert.equal(out.status, 200);
  assert.equal(out.json.flagged, true);
  assert.match(stored, /"aiGenFlag":true/);
});
