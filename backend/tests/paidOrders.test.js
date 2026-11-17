'use strict';
// A Razorpay payment becomes exactly one order, whether the browser or the webhook reports it first.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizePaidOrder, PaidOrderError } = require('../utils/paidOrders');

function world({ total = 540, paid = 54000, pending = true } = {}) {
  const orders = [];
  const pendings = pending ? [{ rzpOrderId: 'order_1', user: 'u1', payload: { cart: 1 }, amount: 54000, status: 'pending' }] : [];
  const match = (doc, q) => Object.entries(q).every(([k, v]) => (k === 'paymentInfo.id' ? doc.paymentInfo && doc.paymentInfo.id === v : doc[k] === v));
  const after = [];
  const deps = {
    Order: {
      findOne: async q => orders.find(o => match(o, q)) || null,
      create: async d => { const o = { _id: 'o' + (orders.length + 1), orderNumber: 'NO-' + (1000 + orders.length), ...d }; orders.push(o); return o; },
    },
    PendingPayment: {
      findOneAndUpdate: async (q, u) => { const p = pendings.find(x => match(x, q)); if (!p) return null; Object.assign(p, u.$set); return p; },
      findOne: async q => pendings.find(x => match(x, q)) || null,
      updateOne: async (q, u) => { const p = pendings.find(x => match(x, q)); if (p) Object.assign(p, u.$set); },
    },
    buildOrder: async () => ({ items: [{ name: 'Rice', quantity: 1, price: total }], totalPrice: total }),
    fetchPaidAmount: async () => paid,
    takeStock: async () => {},
    afterCreate: async (o, u) => { after.push([o._id, u]); },
  };
  return { deps, orders, pendings, after };
}

test('a paid checkout becomes one paid order, and the cart owner gets it', async () => {
  const w = world();
  const r = await finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' });
  assert.equal(r.created, true);
  assert.equal(w.orders.length, 1);
  assert.equal(w.orders[0].isPaid, true);
  assert.equal(w.orders[0].user, 'u1');
  assert.equal(w.orders[0].paymentInfo.id, 'pay_1');
  assert.equal(w.pendings[0].status, 'done');
  assert.deepEqual(w.after, [['o1', 'u1']]);
});

test('the same payment reported again (webhook retry, double tap) never makes a second order', async () => {
  const w = world();
  await finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' });
  const again = await finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' });
  assert.equal(again.created, false);
  assert.equal(w.orders.length, 1);
  assert.equal(w.after.length, 1);
});

test('browser and webhook at the same moment: one saves it, the other gets that order', async () => {
  const w = world();
  const [a, b] = await Promise.all([
    finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1', waitMs: 1000 }),
    finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1', waitMs: 1000 }),
  ]);
  assert.equal(w.orders.length, 1);
  assert.equal([a, b].filter(x => x.created).length, 1);
  assert.ok(a.order && b.order);
});

test('an amount that differs from the cart is refused and flagged', async () => {
  const w = world({ paid: 100 });
  await assert.rejects(finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' }), e => e instanceof PaidOrderError && e.status === 409);
  assert.equal(w.orders.length, 0);
  assert.equal(w.pendings[0].status, 'mismatch');
});

test('if saving fails the checkout is released so a retry can finish it', async () => {
  const w = world();
  const create = w.deps.Order.create;
  w.deps.Order.create = async () => { throw new Error('db down'); };
  await assert.rejects(finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' }), /db down/);
  assert.equal(w.pendings[0].status, 'pending');
  w.deps.Order.create = create;
  const r = await finalizePaidOrder(w.deps, { rzpOrderId: 'order_1', paymentId: 'pay_1' });
  assert.equal(r.created, true);
});

test('checkouts started before this change still save from the browser; the webhook alone cannot', async () => {
  const w = world({ pending: false });
  const hook = await finalizePaidOrder(w.deps, { rzpOrderId: 'order_9', paymentId: 'pay_9' });
  assert.equal(hook.unmatched, true);
  const browser = await finalizePaidOrder(w.deps, { rzpOrderId: 'order_9', paymentId: 'pay_9', fallback: { payload: { cart: 1 }, user: 'u7' } });
  assert.equal(browser.created, true);
  assert.equal(w.orders[0].user, 'u7');
});
