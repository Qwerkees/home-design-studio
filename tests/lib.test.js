'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../api/_lib.js');
const { MAGIC, makeFetch, BLOB } = require('./helpers.js');

test('sanitizeText caps length and strips control chars', () => {
  assert.equal(L.sanitizeText('a\u0000b\tc', 100), 'a b c');
  assert.equal(L.sanitizeText('x'.repeat(200), 10).length, 10);
  assert.equal(L.sanitizeText(null), '');
});

test('sniffType recognizes allowed media and rejects junk', () => {
  assert.equal(L.sniffType(MAGIC.jpeg), 'image/jpeg');
  assert.equal(L.sniffType(MAGIC.png), 'image/png');
  assert.equal(L.sniffType(MAGIC.webp), 'image/webp');
  assert.equal(L.sniffType(MAGIC.webm), 'video/webm');
  assert.equal(L.sniffType(MAGIC.mp4), 'video/mp4');
  assert.equal(L.sniffType(MAGIC.mov), 'video/quicktime');
  assert.equal(L.sniffType(MAGIC.heic), 'image/heic');
  assert.equal(L.sniffType(MAGIC.junk), null);
  assert.equal(L.sniffType(Buffer.from('<?php echo 1; ?>')), null);
});

test('cleanMedia keeps only our blob URLs and caps count', () => {
  const got = L.cleanMedia([
    { url: BLOB('a.jpg'), contentType: 'image/jpeg', name: 'a' },
    { url: 'https://evil.example.com/x.jpg' },
    { url: 'http://store1.public.blob.vercel-storage.com/b.jpg' }, // not https
    { url: 'not a url' },
  ]);
  assert.equal(got.length, 1);
  assert.equal(got[0].url, BLOB('a.jpg'));
  const many = Array.from({ length: 20 }, (_, i) => ({ url: BLOB(i + '.jpg') }));
  assert.equal(L.cleanMedia(many).length, L.MAX_FILES);
});

test('sameOrigin enforces matching host and requires an origin on POST', () => {
  assert.equal(L.sameOrigin({ host: 'x.test', origin: 'https://x.test' }), true);
  assert.equal(L.sameOrigin({ host: 'x.test', referer: 'https://x.test/free' }), true);
  assert.equal(L.sameOrigin({ host: 'x.test', origin: 'https://evil.test' }), false);
  assert.equal(L.sameOrigin({ host: 'x.test' }), false);
  assert.equal(L.sameOrigin({}), false);
});

test('rateLimit blocks over the window', () => {
  const now = 1000;
  let blocked = false;
  for (let i = 0; i < 5; i++) blocked = L.rateLimit('k1', 3, 10_000, now);
  assert.equal(blocked, true);
  assert.equal(L.rateLimit('k2', 3, 10_000, now), false);
});

test('maybeEncrypt/decrypt round-trips with a 32-byte key; passthrough without', () => {
  const key = require('node:crypto').randomBytes(32).toString('base64');
  const enc = L.maybeEncrypt(JSON.stringify({ a: 1 }), { LDS_DATA_KEY: key });
  assert.equal(enc.encrypted, true);
  assert.notEqual(enc.body.indexOf('"a"'), 0);
  assert.deepEqual(L.decrypt(enc.body, key), { a: 1 });
  const plain = L.maybeEncrypt('{"a":1}', {});
  assert.equal(plain.encrypted, false);
  assert.equal(plain.body, '{"a":1}');
  assert.equal(L.maybeEncrypt('{}', { LDS_DATA_KEY: 'short' }).encrypted, false);
});

test('verifyBlobMedia accepts a real jpeg', async () => {
  const url = BLOB('a.jpg');
  const f = makeFetch({ [url]: { size: 1024, storeType: 'image/jpeg', magic: MAGIC.jpeg } });
  const v = await L.verifyBlobMedia({ url, name: 'a' }, f);
  assert.equal(v.contentType, 'image/jpeg');
  assert.equal(v.kind, 'image');
  assert.equal(v.size, 1024);
});

test('verifyBlobMedia rejects oversize', async () => {
  const url = BLOB('big.mp4');
  const f = makeFetch({ [url]: { size: L.MAX_BYTES + 1, storeType: 'video/mp4', magic: MAGIC.mp4 } });
  await assert.rejects(() => L.verifyBlobMedia({ url }, f), /over 75 MB/);
});

test('verifyBlobMedia rejects a spoofed type (store says jpeg, bytes are webm)', async () => {
  const url = BLOB('fake.jpg');
  const f = makeFetch({ [url]: { size: 500, storeType: 'image/jpeg', magic: MAGIC.webm } });
  await assert.rejects(() => L.verifyBlobMedia({ url }, f), /did not match its contents/);
});

test('verifyBlobMedia rejects non-media bytes', async () => {
  const url = BLOB('x.jpg');
  const f = makeFetch({ [url]: { size: 10, storeType: 'image/jpeg', magic: MAGIC.junk } });
  await assert.rejects(() => L.verifyBlobMedia({ url }, f), /not an accepted/);
});

test('scanMedia: no key -> unscanned; malicious -> throws; clean -> scanned', async () => {
  const items = [{ url: BLOB('a.jpg'), kind: 'image' }];
  const none = await L.scanMedia(items, {}, makeFetch({}));
  assert.equal(none[0].scanned, false);
  const clean = await L.scanMedia(items, { VIRUSTOTAL_API_KEY: 'k' }, makeFetch({}, { vt: { malicious: 0 } }));
  assert.equal(clean[0].scanned, true);
  await assert.rejects(
    () => L.scanMedia(items, { VIRUSTOTAL_API_KEY: 'k' }, makeFetch({}, { vt: { malicious: 3 } })),
    /security scan/
  );
});

test('detectAIGen flags a high score when configured', async () => {
  const items = [{ url: BLOB('a.jpg'), kind: 'image' }];
  const off = await L.detectAIGen(items, {}, makeFetch({}));
  assert.equal(off[0].aiChecked, false);
  const on = await L.detectAIGen(items, { SIGHTENGINE_USER: 'u', SIGHTENGINE_SECRET: 's' }, makeFetch({}, { aigen: { ai_generated: 0.92 } }));
  assert.equal(on[0].aiChecked, true);
  assert.equal(on[0].aiGenFlag, true);
});
