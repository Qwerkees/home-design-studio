'use strict';
// Test helpers: byte fixtures + a routable mock fetch.

function pad(bytes, len = 32) { const b = Buffer.alloc(len, 0); Buffer.from(bytes).copy(b); return b; }
const MAGIC = {
  jpeg: pad([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
  png: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), // RIFF....WEBP
  webm: pad([0x1a, 0x45, 0xdf, 0xa3]),
  mp4: pad([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]), // ....ftypisom
  mov: pad([0, 0, 0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]), // ....ftypqt
  heic: pad([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]), // ....ftypheic
  junk: pad([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c]),
};

function resp(ok, { headers = {}, buf = null, json = null } = {}) {
  const lc = {}; for (const k of Object.keys(headers)) lc[k.toLowerCase()] = headers[k];
  return {
    ok, status: ok ? 200 : 400,
    headers: { get: (k) => (k.toLowerCase() in lc ? lc[k.toLowerCase()] : null) },
    arrayBuffer: async () => (buf ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : new ArrayBuffer(0)),
    json: async () => json,
  };
}

// A blob "object" the mock fetch will serve: { size, storeType, magic }
function makeFetch(objects, { vt = { malicious: 0 }, aigen = { ai_generated: 0 }, onNotify } = {}) {
  return async function fetchFn(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    // VirusTotal
    if (url === 'https://www.virustotal.com/api/v3/urls') return resp(true, { json: { data: { id: 'an-123' } } });
    if (url.startsWith('https://www.virustotal.com/api/v3/analyses/')) {
      return resp(true, { json: { data: { attributes: { stats: { malicious: vt.malicious } } } } });
    }
    // Sightengine
    if (url.startsWith('https://api.sightengine.com/')) return resp(true, { json: { type: { ai_generated: aigen.ai_generated } } });
    // Notify webhook
    if (/notify|hook|slack/i.test(url)) { if (onNotify) onNotify(url, opts); return resp(true, { json: {} }); }
    // Blob object (HEAD for size/type, GET Range for magic)
    const o = objects[url];
    if (!o) return resp(false);
    if (method === 'HEAD') return resp(true, { headers: { 'content-length': String(o.size), 'content-type': o.storeType } });
    return resp(true, { headers: {}, buf: o.magic });
  };
}

const BLOB = (name) => 'https://store1.public.blob.vercel-storage.com/' + name;

module.exports = { MAGIC, makeFetch, resp, BLOB, pad };
