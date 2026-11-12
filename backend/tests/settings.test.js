'use strict';
// Store settings: delivery/COD rules reach the order total, and admin input is checked.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { priceOrder, buildOrder } = require('../utils/orderGuard');
const { merge, defaults, pricingFrom, publicSettings } = require('../utils/settings');
const { cleanSettings } = require('../routes/settingsRoutes');

const item = (o = {}) => ({ product: 'p1', name: 'Karunguruvai Rice', quantity: 1, price: 180, selectedQuantity: '1kg', ...o });
const ADDRESS = { fullName: 'Priya S', phone: '9876543210', addressLine1: '12 Temple Street', city: 'Srivilliputhur', state: 'Tamil Nadu', pincode: '626125' };

test('delivery fee below the threshold, free at or above it', () => {
  const rules = { freeShippingAbove: 500, shippingFee: 50 };
  assert.equal(priceOrder([item({ price: 180 })], null, rules).shippingPrice, 50);
  assert.equal(priceOrder([item({ price: 250, quantity: 2 })], null, rules).shippingPrice, 0);
});

test('COD fee is added only for cash on delivery', () => {
  const rules = { freeShippingAbove: 999, shippingFee: 0, codFee: 30 };
  assert.equal(priceOrder([item()], null, rules, 'COD').totalPrice, 180 + 9 + 30);
  assert.equal(priceOrder([item()], null, rules, 'Razorpay').totalPrice, 180 + 9);
});

test('COD switched off by the admin is refused', async () => {
  const ctx = { method: 'COD', getRules: async () => ({ codEnabled: false }) };
  await assert.rejects(buildOrder({ items: [item()], shippingAddress: ADDRESS, totalPrice: 189 }, ctx), /Cash on delivery is not available/);
});

test('COD fee is part of the total the server accepts', async () => {
  const ctx = { method: 'COD', getRules: async () => ({ codFee: 30 }) };
  const o = await buildOrder({ items: [item()], shippingAddress: ADDRESS, totalPrice: 219 }, ctx);
  assert.equal(o.codFee, 30);
  assert.equal(o.totalPrice, 219);
});

test('saved settings override defaults; blanks keep the default', () => {
  const s = merge(defaults(), { contact: { phone: '+91 90000 00000', email: '' }, shipping: { shippingFee: 40, codEnabled: false } });
  assert.equal(s.contact.phone, '+91 90000 00000');
  assert.equal(s.contact.email, defaults().contact.email);
  assert.equal(pricingFrom(s).shippingFee, 40);
  assert.equal(pricingFrom(s).codEnabled, false);
  assert.deepEqual(publicSettings(merge(defaults(), { announcement: { enabled: false, items: [{ text: 'Hi' }] } })).announcement, []);
});

test('admin input is cleaned and checked', () => {
  const c = cleanSettings({ contact: { email: 'Shop@Example.com', whatsapp: '+91 63821-42578' }, announcement: { items: [{ text: '<b>Free</b> delivery above ₹999' }, { text: '' }] } });
  assert.equal(c.contact.email, 'shop@example.com');
  assert.equal(c.contact.whatsapp, '916382142578');
  assert.deepEqual(c.announcement.items, [{ text: 'Free delivery above ₹999', code: '', link: '' }]);
  assert.throws(() => cleanSettings({ contact: { email: 'not-an-email' } }), /valid email/);
  assert.throws(() => cleanSettings({ legal: { fssai: '123' } }), /14 digits/);
  assert.throws(() => cleanSettings({ shipping: { shippingFee: -5 } }), /between 0/);
  assert.throws(() => cleanSettings({ social: { instagram: 'javascript:alert(1)' } }), /https/);
});
