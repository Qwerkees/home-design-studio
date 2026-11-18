'use strict';

const A = require('../_admin.js');

async function readPrivateJson(get, pathname, env) {
  const item = await get(pathname, { access: 'private' });
  if (!item || !item.stream) return null;
  const raw = await new Response(item.stream).text();
  let data = JSON.parse(raw);
  if (data && data.v === 1 && data.iv && data.tag && data.ct) {
    if (!env.LDS_DATA_KEY) throw new Error('An encrypted RFQ cannot be opened until LDS_DATA_KEY is configured.');
    data = require('../_lib.js').decrypt(raw, env.LDS_DATA_KEY);
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!A.isAdmin(req, process.env)) return res.status(401).json({ error: 'Owner login required.' });
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie');
  try {
    const { list, get } = require('@vercel/blob');
    const result = await list({ prefix: 'rfqs/', limit: 100 });
    const records = [];
    for (const blob of (result.blobs || [])) {
      const rfq = await readPrivateJson(get, blob.pathname, process.env);
      if (!rfq || !rfq.id) continue;
      records.push({
        id: rfq.id, createdAt: rfq.createdAt, tier: rfq.tier,
        space: rfq.space, style: rfq.style, name: rfq.name,
        contact: rfq.contact, notes: rfq.notes, status: rfq.status,
        review: rfq.review, sla: rfq.sla,
        media: (rfq.media || []).map((m) => ({
          pathname: m.pathname, name: m.name, contentType: m.contentType,
          kind: m.kind, size: m.size, scanStatus: m.scanStatus || 'manual-review-required',
        })),
      });
    }
    records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.status(200).json({ ok: true, records });
  } catch (e) {
    try { console.error('[admin-rfqs] private inbox read failed', e && e.message); } catch {}
    return res.status(503).json({ error: 'The private request inbox is not available. Check the private Blob store configuration.' });
  }
};
