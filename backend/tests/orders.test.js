'use strict';
// Order integrity: what the server refuses to believe from the browser. No database involved.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrder, codOnly, priceOrder, couponAmount, OrderError } = require('../utils/orderGuard');

const ADDRESS = { fullName: 'Asha Raman', phone: '9876543210', email: 'asha@example.com', addressLine1: '12 Farm Road', city: 'Thanjavur', state: 'Tamil Nadu', pincode: '613001' };
const item = (over = {}) => Object.assign({ product: '64b7f0c2a1b2c3d4e5f60718', name: 'Karunguruvai Rice', quantity: 2, price: 180, selectedQuantity: '1kg', selectedUnit: 'kg', selectedPrice: 180 }, over);
const good = (over = {}) => Object.assign({ items: [item()], shippingAddress: ADDRESS, paymentMethod: 'COD', totalPrice: 378, discount: 80 }, over);
const ctx = (over = {}) => Object.assign({ method: 'COD', findProducts: async () => [{ _id: '64b7f0c2a1b2c3d4e5f60718', price: 180 }], findCoupon: async () => null }, over);
const rejects = (p, re, status) => assert.rejects(p, e => e instanceof OrderError && re.test(e.message) && (!status || e.status === status));

test('a normal order is accepted and the server fixes the amounts itself', async () => {
  const o = await buildOrder(good(), ctx());
  assert.equal(o.itemsPrice, 360); assert.equal(o.taxPrice, 18); assert.equal(o.shippingPrice, 0); assert.equal(o.totalPrice, 378);
  assert.equal(o.paymentMethod, 'COD');
});

test('SECURITY: fields a customer must never set are dropped (paid flag, status, user, tracking)', async () => {
  const o = await buildOrder(good({ isPaid: true, paidAt: new Date(), paymentInfo: { id: 'pay_fake', status: 'completed' }, orderStatus: 'Delivered', user: 'someone-else', trackingNumber: 'X1', shiprocketOrderId: '9', isDelivered: true }), ctx());
  for (const k of ['isPaid', 'paidAt', 'paymentInfo', 'orderStatus', 'user', 'trackingNumber', 'shiprocketOrderId', 'isDelivered']) assert.ok(!(k in o), k + ' must not be copied from the request');
});

test('SECURITY: a ₹1 order for expensive rice is refused (price floor from the catalogue)', async () => {
  await rejects(buildOrder(good({ items: [item({ price: 1 })], totalPrice: 2 }), ctx()), /price of Karunguruvai Rice has changed/, 409);
});

test('SECURITY: a total that does not match the item prices is refused', async () => {
  await rejects(buildOrder(good({ totalPrice: 100 }), ctx()), /does not match/, 409);
  await rejects(buildOrder(good({ totalPrice: 'free' }), ctx()), /does not match/, 409);
});

test('smaller packs are still fine (250 g of a ₹180/kg rice)', async () => {
  const o = await buildOrder(good({ items: [item({ price: 45, quantity: 1, selectedQuantity: '0.25kg' })], totalPrice: 47 }), ctx());
  assert.equal(o.itemsPrice, 45); assert.equal(o.totalPrice, 47);
});

test('promo codes are applied by the server, not trusted from the browser', async () => {
  const welcome = { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, isValid: () => true };
  const o = await buildOrder(good({ couponCode: 'welcome10', totalPrice: 340 }), ctx({ findCoupon: async c => (c === 'WELCOME10' ? welcome : null) }));
  assert.equal(o.totalPrice, 340); assert.equal(o.couponCode, 'WELCOME10'); assert.equal(o.taxPrice, 16);
  await rejects(buildOrder(good({ couponCode: 'welcome10', totalPrice: 378 }), ctx({ findCoupon: async () => welcome })), /does not match/, 409);   // claims no discount
  await rejects(buildOrder(good({ couponCode: 'NOPE' }), ctx()), /not valid any more/);
});

test('coupon maths: percentage cap, fixed amount, minimum order', () => {
  assert.equal(couponAmount({ discountType: 'percentage', discountValue: 50, maxDiscount: 100 }, 1000), 100);
  assert.equal(couponAmount({ discountType: 'fixed', discountValue: 5000 }, 360), 360);
  assert.throws(() => couponAmount({ code: 'BIG', discountType: 'fixed', discountValue: 50, minOrderAmount: 500 }, 360), OrderError);
});

test('delivery fee applies only under the free-shipping amount', () => {
  process.env.SHIPPING_FEE = '60';
  try {
    assert.equal(priceOrder([item({ price: 100, quantity: 1 })]).shippingPrice, 60);
    assert.equal(priceOrder([item({ price: 500, quantity: 2 })]).shippingPrice, 0);
  } finally { delete process.env.SHIPPING_FEE; }
});

test('bad carts and addresses get a clear message', async () => {
  await rejects(buildOrder(good({ items: [] }), ctx()), /cart is empty/);
  await rejects(buildOrder(good({ items: [item({ quantity: 0 })] }), ctx()), /invalid quantity/);
  await rejects(buildOrder(good({ items: [item({ quantity: 500 })] }), ctx()), /invalid quantity/);
  await rejects(buildOrder(good({ shippingAddress: { ...ADDRESS, pincode: '12' } }), ctx()), /6-digit pincode/);
  await rejects(buildOrder(good({ shippingAddress: { ...ADDRESS, phone: '12345' } }), ctx()), /10-digit mobile/);
  await rejects(buildOrder(good({ shippingAddress: undefined }), ctx()), /name/);
});

test('POST /orders is cash on delivery only; online payments must go through the payment window', () => {
  assert.equal(codOnly('cod'), 'COD'); assert.equal(codOnly('COD'), 'COD');
  for (const m of ['Razorpay', 'razorpay', 'UPI', 'Stripe', 'PayU', '', undefined]) assert.throws(() => codOnly(m), OrderError, 'must refuse ' + m);
});

test('products that are not in the database (old static ids) are still priced from the cart, with totals checked', async () => {
  const o = await buildOrder(good({ items: [item({ product: 7 })] }), ctx({ findProducts: async () => [] }));
  assert.equal(o.totalPrice, 378);
});
