'use strict';

const crypto = require('node:crypto');
const SESSION_COOKIE = 'lds_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function configReady(env) {
  return !!(env.LDS_ADMIN_PASSWORD && env.LDS_ADMIN_PASSWORD.length >= 16 &&
    env.LDS_SESSION_SECRET && env.LDS_SESSION_SECRET.length >= 32);
}
function signature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
function createSession(env, now = Date.now()) {
  if (!configReady(env)) throw new Error('Admin authentication is not configured.');
  const payload = String(now) + '.' + crypto.randomBytes(16).toString('hex');
  return payload + '.' + signature(payload, env.LDS_SESSION_SECRET);
}
function cookieValue(header) {
  const parts = String(header || '').split(';');
  for (const part of parts) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) return part.slice(i + 1).trim();
  }
  return '';
}
function isAdmin(req, env, now = Date.now()) {
  if (!configReady(env)) return false;
  const token = cookieValue(req && req.headers && req.headers.cookie);
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const issued = Number(parts[0]);
  if (!Number.isFinite(issued) || issued > now + 60_000 || now - issued > SESSION_TTL_MS) return false;
  const payload = parts[0] + '.' + parts[1];
  const expected = Buffer.from(signature(payload, env.LDS_SESSION_SECRET));
  const actual = Buffer.from(parts[2]);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function setSessionCookie(res, value, maxAge = Math.floor(SESSION_TTL_MS / 1000)) {
  res.setHeader('Set-Cookie', SESSION_COOKIE + '=' + value +
    '; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', SESSION_COOKIE + '=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}
function passwordMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  SESSION_TTL_MS, configReady, createSession, isAdmin,
  setSessionCookie, clearSessionCookie, passwordMatches,
};
