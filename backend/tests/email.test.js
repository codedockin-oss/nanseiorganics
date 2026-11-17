'use strict';
// Email goes through Resend when RESEND_API_KEY is set: right request, retries on 429, never sends twice.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const sendEmail = require('../utils/sendEmail');
const { template } = require('../utils/shippingEmails');

test('Resend request: endpoint, auth, from, text version and idempotency key', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'Nansei Organics <orders@nanseiorg.in>';
  const calls = [];
  sendEmail._setFetch(async (url, opt) => { calls.push({ url, opt }); return { ok: true, status: 200, json: async () => ({ id: 'em_1' }) }; });
  const out = await sendEmail({ email: 'a@b.in', subject: 'Hi', html: '<p>Hello &amp; welcome</p>', idempotencyKey: 'order-confirm/1' });
  assert.equal(out.id, 'em_1');
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].opt.headers.Authorization, 'Bearer re_test');
  assert.equal(calls[0].opt.headers['Idempotency-Key'], 'order-confirm/1');
  const body = JSON.parse(calls[0].opt.body);
  assert.deepEqual(body.to, ['a@b.in']);
  assert.equal(body.from, 'Nansei Organics <orders@nanseiorg.in>');
  assert.equal(body.text, 'Hello & welcome');
});

test('Resend rate limit is retried; a bad request is reported', async () => {
  process.env.RESEND_API_KEY = 're_test';
  let n = 0;
  sendEmail._setFetch(async () => (++n === 1 ? { ok: false, status: 429, json: async () => ({ message: 'slow down' }) } : { ok: true, status: 200, json: async () => ({ id: 'em_2' }) }));
  assert.equal((await sendEmail({ email: 'a@b.in', subject: 'x', html: 'x' })).id, 'em_2');
  sendEmail._setFetch(async () => ({ ok: false, status: 422, json: async () => ({ name: 'validation_error', message: 'Invalid from' }) }));
  await assert.rejects(sendEmail({ email: 'a@b.in', subject: 'x', html: 'x' }), /Invalid from/);
  delete process.env.RESEND_API_KEY;
});

test('shipping emails link to the store tracking page', () => {
  const html = template({ _id: 'x', orderNumber: 'NO-1001', trackingNumber: 'AWB1', courierService: 'Delhivery' }, 'out_for_delivery');
  assert.match(html, /track-order\.html\?order=NO-1001/);
  assert.match(html, /Out for delivery today/);
  assert.match(html, /AWB1/);
});
