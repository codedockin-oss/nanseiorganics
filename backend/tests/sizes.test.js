'use strict';
// Orders are priced from the product's pack sizes in the database, never from the browser.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrder } = require('../utils/orderGuard');

const ADDRESS = { fullName: 'Priya S', phone: '9876543210', addressLine1: '12 Temple Street', city: 'Srivilliputhur', state: 'Tamil Nadu', pincode: '626125' };
const RICE = { _id: 'a'.repeat(24), legacyId: 1, name: 'Karunguruvai Rice', isActive: true, sizes: [
  { sku: 'P1-500G', label: '500 g', price: 90, mrp: 110, stock: null, active: true },
  { sku: 'P1-1KG', label: '1 kg', price: 180, mrp: 220, stock: 1, active: true },
] };
const ROSE = { _id: 'b'.repeat(24), legacyId: 8, name: 'Paneer Rose', isActive: true, sizes: [{ sku: 'P8-PACK', label: '50 pcs', price: 150, stock: null, active: true }] };
const ctx = (extra = {}) => ({ method: 'COD', findProducts: async () => [RICE, ROSE, ...(extra.more || [])], getRules: async () => ({ freeShippingAbove: 999, shippingFee: 0 }) });
const order = (items) => ({ items, shippingAddress: ADDRESS, totalPrice: Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 1.05) });

test('the storefront number finds the product; the right size and price are accepted and recorded', async () => {
  const o = await buildOrder(order([{ product: 1, name: 'anything', quantity: 2, price: 90, selectedQuantity: '500g' }]), ctx());
  assert.equal(o.items[0].sku, 'P1-500G');
  assert.equal(o.items[0].selectedQuantity, '500 g');
  assert.equal(o.items[0].name, 'Karunguruvai Rice');      // name comes from the catalogue, not the browser
  assert.equal(o.items[0].product, RICE._id);
});

test('a price that differs from the size price is refused', async () => {
  await assert.rejects(buildOrder(order([{ product: 1, quantity: 1, price: 45, selectedQuantity: '500 g' }]), ctx()), e => e.status === 409 && /is now ₹90/.test(e.message));
});

test('a pack size the product does not have is refused', async () => {
  await assert.rejects(buildOrder(order([{ product: 1, quantity: 1, price: 45, selectedQuantity: '0.25 kg' }]), ctx()), /pack size .* has changed/);
});

test('stock is respected for tracked sizes only', async () => {
  await assert.rejects(buildOrder(order([{ product: 1, sku: 'P1-1KG', quantity: 2, price: 180 }]), ctx()), /Only 1 of Karunguruvai Rice \(1 kg\) left/);
  await buildOrder(order([{ product: 1, sku: 'P1-1KG', quantity: 1, price: 180 }]), ctx());
  await buildOrder(order([{ product: 1, sku: 'P1-500G', quantity: 40, price: 90 }]), ctx());   // not tracked: no limit
});

test('a single-pack product matches even with an old cart label', async () => {
  const o = await buildOrder(order([{ product: 8, quantity: 1, price: 150, selectedQuantity: '1 piece' }]), ctx());
  assert.equal(o.items[0].sku, 'P8-PACK');
});

test('a product the admin switched off cannot be ordered', async () => {
  const OFF = { ...ROSE, _id: 'c'.repeat(24), legacyId: 9, name: 'Hibiscus Flower', isActive: false };
  await assert.rejects(buildOrder(order([{ product: 9, quantity: 1, price: 120 }]), ctx({ more: [OFF] })), /not available any more/);
});
