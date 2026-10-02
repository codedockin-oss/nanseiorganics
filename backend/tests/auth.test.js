'use strict';
// Account tests: register, sign in, forgot / reset / change password, profile, admin protection.
// Runs the REAL auth controllers, routes and middleware. Only the database is replaced by an in-memory user store,
// so nothing touches MongoDB and no real e-mail is sent.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'https://shop.example';

/* ---------------------------------------------------------------- in-memory stand-ins for the models */
const users = [];
let seq = 0;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sent = [];                                   // e-mails "sent"

class FakeUser {
  constructor(doc) { this._dirty = new Set(); this._id = String(++seq).padStart(24, '0'); Object.assign(this, doc); }
  get id() { return this._id; }
  get password() { return this._pw; }
  set password(v) { this._pw = v; this._dirty.add('password'); }       // like Mongoose: assigning marks it modified
  static _match(u, q) {
    return Object.entries(q).every(([k, v]) => {
      if (v && typeof v === 'object' && v.$in) return v.$in.includes(u[k]);
      if (v && typeof v === 'object' && v.$gt !== undefined) return u[k] !== undefined && u[k] > v.$gt;
      return u[k] === v;
    });
  }
  static _chain(value) { const p = Promise.resolve(value); p.select = () => p; p.lean = () => p; p.populate = () => p; return p; }
  static findOne(q) { return FakeUser._chain(users.find(u => FakeUser._match(u, q)) || null); }
  static findById(id) { return FakeUser._chain(users.find(u => u._id === String(id)) || null); }
  static async findByIdAndUpdate(id, upd) {
    const u = users.find(x => x._id === String(id)); if (!u) return null;
    if (upd.$push) { /* activity history: ignored */ } else Object.assign(u, upd);
    return u;
  }
  static async create(doc) {
    if (!doc.firstName) throw Object.assign(new Error('First name is required'), { name: 'ValidationError' });
    if (!doc.lastName) throw Object.assign(new Error('Last name is required'), { name: 'ValidationError' });
    if (!doc.email || !EMAIL_RE.test(doc.email)) throw Object.assign(new Error('Please provide a valid email'), { name: 'ValidationError' });
    if (!doc.password || doc.password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { name: 'ValidationError' });
    if (users.some(u => u.email === String(doc.email).toLowerCase().trim())) throw Object.assign(new Error('E11000'), { code: 11000, keyPattern: { email: 1 } });
    const u = new FakeUser({ role: 'customer', ...doc });
    await u.save(); users.push(u); return u;
  }
  async save(_opts) {
    if (this.email) this.email = this.email.toLowerCase().trim();
    this.name = [this.firstName, this.lastName].filter(Boolean).join(' ');
    if (this.password && this._dirty.has('password')) { this.password = await bcrypt.hash(this.password, 4); this._dirty.delete('password'); }
    return this;
  }
  set(k, v) { this[k] = v; this._dirty.add(k); }
  async comparePassword(p) { return bcrypt.compare(p, this.password); }
  generateToken() { const role = this.role === 'user' ? 'customer' : this.role; return jwt.sign({ id: this._id, userId: this._id, email: this.email, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE }); }
  toAuthJSON() { return { id: this._id, firstName: this.firstName, lastName: this.lastName, name: this.name, email: this.email, role: this.role === 'user' ? 'customer' : this.role }; }
}
const FakeCart = { findOneAndUpdate: async () => ({}) };

function stub(rel, exports_) { const f = require.resolve(path.join(__dirname, '..', rel)); require.cache[f] = { id: f, filename: f, loaded: true, exports: exports_ }; }
stub('models/User.js', FakeUser);
stub('models/Cart.js', FakeCart);
stub('utils/sendEmail.js', async o => { sent.push(o); });

const authRoutes = require('../routes/authRoutes');
const { protect, authorize } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.get('/api/admin-only', protect, authorize('admin'), (_q, r) => r.json({ success: true, secret: 'admin data' }));
app.use((err, _q, res, _n) => res.status(500).json({ success: false, message: err.message }));

let server, port;
test.before(async () => { await new Promise(r => { server = app.listen(0, () => { port = server.address().port; r(); }); }); });
test.after(() => server.close());
const call = (method, p, { body, token } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ port, method, path: p, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }));
  });
  req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
});
const reg = (over = {}) => call('POST', '/api/auth/register', { body: { firstName: 'Asha', lastName: 'Raman', email: 'asha@example.com', password: 'Str0ng!pass', ...over } });
const login = (email, password) => call('POST', '/api/auth/login', { body: { email, password } });

/* ------------------------------------------------------------------- register */
test('register: creates a customer, returns a token, never returns the password', async () => {
  const r = await reg();
  assert.equal(r.status, 201); assert.equal(r.body.success, true);
  assert.ok(r.body.token); assert.equal(r.body.user.role, 'customer'); assert.equal(r.body.user.email, 'asha@example.com'); assert.equal(r.body.user.name, 'Asha Raman');
  assert.equal(JSON.stringify(r.body).includes('Str0ng'), false); assert.equal(r.body.user.password, undefined);
  const stored = users.find(u => u.email === 'asha@example.com');
  assert.notEqual(stored.password, 'Str0ng!pass'); assert.ok(await bcrypt.compare('Str0ng!pass', stored.password));   // stored hashed
});

test('register: validation errors are specific and nothing is created', async () => {
  const before = users.length;
  const cases = [[{ firstName: '' }, /first name/i], [{ lastName: '  ' }, /last name/i], [{ email: '' }, /email is required/i], [{ email: 'not-an-email' }, /valid email/i], [{ password: 'short' }, /8 characters/i], [{ password: '' }, /8 characters/i]];
  for (const [over, re] of cases) { const r = await reg({ ...over, email: over.email === undefined ? 'v@example.com' : over.email }); assert.equal(r.status, 400, JSON.stringify(over)); assert.match(r.body.message, re); }
  assert.equal(users.length, before);
});

test('register: duplicate email is refused, case and spaces do not matter', async () => {
  const r = await reg({ email: '  ASHA@Example.COM ' });
  assert.equal(r.status, 409); assert.match(r.body.message, /already exists/i);
});

test('register: a visitor can never choose their own role or inject markup into their name', async () => {
  const r = await reg({ email: 'mallory@example.com', role: 'admin', isAdmin: true, firstName: '<script>alert(1)</script>Mal', lastName: 'Lory' });
  assert.equal(r.status, 201); assert.equal(r.body.user.role, 'customer');
  assert.equal(r.body.user.firstName.includes('<'), false);
  assert.equal((await call('GET', '/api/admin-only', { token: r.body.token })).status, 403);
});

test('SECURITY: the old built-in admin accounts are gone — nobody becomes admin by e-mail address or a known password', async () => {
  for (const email of ['anthanyanis@gmail.com', 'athanyanis@gmail.com']) {
    const l = await login(email, '@anthony@');                    // the password that used to be hard-coded
    assert.equal(l.status, 401, email + ' must not log in with the old built-in password');
    assert.equal(users.some(u => u.email === email), false, 'login must never auto-create an admin');
    const r = await reg({ email, password: 'Whatever123' });       // anyone may register that address…
    assert.equal(r.body.user.role, 'customer');                    // …but it earns no privileges
    const again = await login(email, 'Whatever123');
    assert.equal(again.body.user.role, 'customer');
    assert.equal((await call('GET', '/api/admin-only', { token: again.body.token })).status, 403);
  }
});

/* ---------------------------------------------------------------------- login */
test('login: correct details work, token carries id + role and opens protected routes', async () => {
  const r = await login('ASHA@example.com', 'Str0ng!pass');
  assert.equal(r.status, 200); assert.equal(r.body.message, 'Login successful');
  const claims = jwt.verify(r.body.token, process.env.JWT_SECRET);
  assert.equal(claims.role, 'customer'); assert.equal(claims.email, 'asha@example.com'); assert.ok(claims.exp > Date.now() / 1000);
  const me = await call('GET', '/api/auth/me', { token: r.body.token });
  assert.equal(me.status, 200); assert.equal(me.body.user.email, 'asha@example.com'); assert.equal(me.body.user.password, undefined);
});

test('login: wrong password and unknown e-mail get the same answer; empty and malformed input are rejected early', async () => {
  const wrong = await login('asha@example.com', 'nope-nope'), unknown = await login('nobody@example.com', 'Str0ng!pass');
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401); assert.equal(wrong.body.message, unknown.body.message);
  assert.equal((await login('', '')).status, 400); assert.equal((await login('asha@example.com', '')).status, 400); assert.equal((await login('bad-email', 'x'.repeat(9))).status, 400);
  assert.equal((await call('POST', '/api/auth/login', { body: {} })).status, 400);
  assert.equal((await call('POST', '/api/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } })).status >= 400, true);   // NoSQL-injection style input
});

test('protected routes: no token, garbage, tampered and expired tokens are all refused', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
  assert.equal((await call('GET', '/api/auth/me', { token: 'abc.def.ghi' })).status, 401);
  const good = (await login('asha@example.com', 'Str0ng!pass')).body.token;
  const [h, p, s] = good.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), role: 'admin' })).toString('base64url');
  assert.equal((await call('GET', '/api/admin-only', { token: [h, forgedPayload, s].join('.') })).status, 401);        // role edited, signature no longer valid
  const wrongKey = jwt.sign({ id: users[0]._id, role: 'admin' }, 'another-secret');
  assert.equal((await call('GET', '/api/admin-only', { token: wrongKey })).status, 401);
  const expired = jwt.sign({ id: users[0]._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: -10 });
  assert.equal((await call('GET', '/api/auth/me', { token: expired })).status, 401);
  const ghost = jwt.sign({ id: '999999999999999999999999', role: 'customer' }, process.env.JWT_SECRET);
  assert.equal((await call('GET', '/api/auth/me', { token: ghost })).status, 401);                                     // account deleted after the token was issued
});

test('admin routes: customers get 403, a real admin gets in', async () => {
  const cust = (await login('asha@example.com', 'Str0ng!pass')).body.token;
  assert.equal((await call('GET', '/api/admin-only', { token: cust })).status, 403);
  users.find(u => u.email === 'asha@example.com').role = 'admin';                       // what `node seeders/make-admin.js` does
  const adm = (await login('asha@example.com', 'Str0ng!pass')).body.token;
  const r = await call('GET', '/api/admin-only', { token: adm });
  assert.equal(r.status, 200); assert.equal(r.body.secret, 'admin data');
  users.find(u => u.email === 'asha@example.com').role = 'customer';
});

test('logout answers cleanly', async () => { assert.equal((await call('POST', '/api/auth/logout')).status, 200); });

/* ------------------------------------------------------------ forgot / reset password */
test('forgot password: identical answer for known and unknown e-mails, e-mail only goes to real accounts, bad input is rejected', async () => {
  sent.length = 0;
  const known = await call('POST', '/api/auth/forgot-password', { body: { email: 'asha@example.com' } });
  const unknown = await call('POST', '/api/auth/forgot-password', { body: { email: 'ghost@example.com' } });
  assert.equal(known.status, 200); assert.equal(unknown.status, 200);
  assert.deepEqual(known.body, unknown.body);                                            // cannot be used to discover who has an account
  assert.equal(known.body.resetToken, undefined);                                        // the token is never returned in production
  assert.equal(sent.length, 1); assert.equal(sent[0].email, 'asha@example.com');
  assert.match(sent[0].html, /https:\/\/shop\.example\/pages\/reset-password\.html\?token=[0-9a-f]{64}/);
  assert.equal((await call('POST', '/api/auth/forgot-password', { body: { email: 'nope' } })).status, 400);
  assert.equal((await call('POST', '/api/auth/forgot-password', { body: {} })).status, 400);
});

const lastToken = () => sent[sent.length - 1].html.match(/token=([0-9a-f]{64})/)[1];

test('reset password: the link works once, the new password works, the old one stops, weak and bad tokens are refused', async () => {
  sent.length = 0;
  await call('POST', '/api/auth/forgot-password', { body: { email: 'asha@example.com' } });
  const token = lastToken();
  const stored = users.find(u => u.email === 'asha@example.com');
  assert.notEqual(stored.resetPasswordToken, token);                                    // only a hash of the token is stored
  assert.equal(stored.resetPasswordToken, crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(stored.resetPasswordExpire > Date.now() && stored.resetPasswordExpire <= Date.now() + 31 * 60 * 1000);   // 30 minutes
  assert.equal((await call('PUT', '/api/auth/reset-password/' + token, { body: { password: 'short' } })).status, 400);
  assert.equal((await call('PUT', '/api/auth/reset-password/' + 'f'.repeat(64), { body: { password: 'BrandNew#123' } })).status, 400);
  const ok = await call('PUT', '/api/auth/reset-password/' + token, { body: { password: 'BrandNew#123' } });
  assert.equal(ok.status, 200); assert.ok(ok.body.token);
  assert.equal((await login('asha@example.com', 'Str0ng!pass')).status, 401);           // old password is dead
  assert.equal((await login('asha@example.com', 'BrandNew#123')).status, 200);
  assert.equal((await call('PUT', '/api/auth/reset-password/' + token, { body: { password: 'Another#12345' } })).status, 400);   // link cannot be reused
  assert.equal(stored.resetPasswordToken, undefined);
});

test('reset password: an expired link is refused', async () => {
  sent.length = 0;
  await call('POST', '/api/auth/forgot-password', { body: { email: 'asha@example.com' } });
  const token = lastToken();
  users.find(u => u.email === 'asha@example.com').resetPasswordExpire = Date.now() - 1000;
  const r = await call('PUT', '/api/auth/reset-password/' + token, { body: { password: 'BrandNew#456' } });
  assert.equal(r.status, 400); assert.match(r.body.message, /invalid or expired/i);
});

/* ------------------------------------------------------- change password / profile */
test('change password: needs the current password, enforces length, then switches over', async () => {
  const t = (await login('asha@example.com', 'BrandNew#123')).body.token;
  assert.equal((await call('PUT', '/api/auth/change-password', { token: t, body: { currentPassword: 'wrong', newPassword: 'Another#12345' } })).status, 401);
  assert.equal((await call('PUT', '/api/auth/change-password', { token: t, body: { currentPassword: 'BrandNew#123', newPassword: 'tiny' } })).status, 400);
  assert.equal((await call('PUT', '/api/auth/change-password')).status, 401);
  assert.equal((await call('PUT', '/api/auth/change-password', { token: t, body: { currentPassword: 'BrandNew#123', newPassword: 'Another#12345' } })).status, 200);
  assert.equal((await login('asha@example.com', 'BrandNew#123')).status, 401);
  assert.equal((await login('asha@example.com', 'Another#12345')).status, 200);
});

test('profile: names can be updated, but role and e-mail cannot be changed through it', async () => {
  const t = (await login('asha@example.com', 'Another#12345')).body.token;
  const r = await call('PUT', '/api/auth/profile', { token: t, body: { firstName: 'Ashwini', role: 'admin', email: 'hijack@example.com', password: 'x' } });
  assert.equal(r.status, 200); assert.equal(r.body.user.firstName, 'Ashwini'); assert.equal(r.body.user.role, 'customer'); assert.equal(r.body.user.email, 'asha@example.com');
  assert.equal((await login('asha@example.com', 'Another#12345')).status, 200);          // password untouched
});
