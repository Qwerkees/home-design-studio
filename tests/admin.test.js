'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const A = require('../api/_admin.js');

const env = {
  LDS_ADMIN_PASSWORD: 'a-long-owner-password-for-tests',
  LDS_SESSION_SECRET: 'a-session-signing-secret-that-is-at-least-32-characters',
};

test('admin auth requires both strong environment secrets', () => {
  assert.equal(A.configReady(env), true);
  assert.equal(A.configReady({ LDS_ADMIN_PASSWORD: 'short', LDS_SESSION_SECRET: env.LDS_SESSION_SECRET }), false);
  assert.equal(A.configReady({ LDS_ADMIN_PASSWORD: env.LDS_ADMIN_PASSWORD, LDS_SESSION_SECRET: 'short' }), false);
});

test('password comparison is exact and rejects missing values', () => {
  assert.equal(A.passwordMatches(env.LDS_ADMIN_PASSWORD, env.LDS_ADMIN_PASSWORD), true);
  assert.equal(A.passwordMatches('wrong-password', env.LDS_ADMIN_PASSWORD), false);
  assert.equal(A.passwordMatches(undefined, env.LDS_ADMIN_PASSWORD), false);
});

test('signed admin session is valid only for the correct secret and lifetime', () => {
  const now = 1_800_000_000_000;
  const token = A.createSession(env, now);
  const req = { headers: { cookie: 'other=x; lds_admin=' + token } };
  assert.equal(A.isAdmin(req, env, now + 1000), true);
  assert.equal(A.isAdmin(req, { ...env, LDS_SESSION_SECRET: 'wrong-session-secret-which-is-also-long-enough-32chars' }, now + 1000), false);
  assert.equal(A.isAdmin(req, env, now + A.SESSION_TTL_MS + 1), false);
  assert.equal(A.isAdmin({ headers: {} }, env, now), false);
});

test('session cookies are HttpOnly, Secure, SameSite Strict, and scoped to admin APIs', () => {
  let cookie = '';
  A.setSessionCookie({ setHeader: (name, value) => { if (name === 'Set-Cookie') cookie = value; } }, 'signed');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/admin/);
});
