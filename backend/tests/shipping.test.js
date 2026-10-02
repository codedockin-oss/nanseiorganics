'use strict';
// Run with:  cd backend && npm test      (no database, no network — Shiprocket and MongoDB are faked)
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

process.env.SHIPROCKET_EMAIL = 'api@example.com';
process.env.SHIPROCKET_PASSWORD = 'secret';
process.env.SHIPROCKET_WEBHOOK_TOKEN = 'hook-secret';
process.env.SHIPROCKET_PICKUP_LOCATION = 'Farm';

const sr = require('../utils/shiprocket');
const service = require('../utils/shippingService');
const createShippingRouter = require('../routes/shippingRoutes');

/* ---------------------------------------------------------------- fakes */
const baseOrder = (over = {}) => ({
  _id: 'o1', orderNumber: 'NO-1001', user: 'u1', paymentMethod: 'COD', isPaid: false, orderStatus: 'Pending',
  createdAt: '2026-10-01T06:30:00Z', itemsPrice: 400, shippingPrice: 0, discount: 0, totalPrice: 420,
  shippingAddress: { fullName: 'Asha Raman Iyer', phone: '+91 98765 43210', addressLine1: '12 Farm Road', city: 'Thanjavur', state: 'Tamil Nadu', pincode: '613001' },
  items: [{ product: 'p1', name: 'Karunguruvai Rice', quantity: 2, price: 180, selectedQuantity: '1kg' }, { product: 'p2', name: 'Paneer Rose', quantity: 1, price: 40, selectedQuantity: '10 pcs' }],
  trackingEvents: [],
  ...over,
});

function fakeOrderModel(orders) {
  const store = new Map(orders.map(o => [o._id, o]));
  const matches = (o, q) => q.$or
    ? q.$or.some(c => Object.entries(c).every(([k, v]) => String(o[k]) === String(v)))
    : Object.entries(q).every(([k, v]) => String(o[k]) === String(v));
  return {
    store,
    findById: async id => store.get(id) || null,
    findOne: async q => [...store.values()].find(o => matches(o, q)) || null,
    findByIdAndUpdate: async (id, u) => { const o = store.get(id); Object.assign(o, u); return o; },
  };
}
const FakeUser = { findById: () => ({ select: () => ({ lean: async () => ({ email: 'asha@example.com', name: 'Asha' }) }) }) };

/** A fake Shiprocket that records calls. `script` overrides responses by path. */
function fakeShiprocket(script = {}) {
  const calls = [];
  sr._setFetch(async (url, opts) => {
    const path = url.replace(/^.*\/v1\/external/, '');
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ method: opts.method, path, body, auth: opts.headers.Authorization });
    const r = script[path] ? await script[path](body, calls) : defaults[path] && defaults[path](body);
    const status = (r && r.__status) || 200;
    return { status, ok: status < 400, json: async () => (r && r.__body) || r || {} };
  });
  return calls;
}
const defaults = {
  '/auth/login': () => ({ token: 'tok-1' }),
  '/orders/create/adhoc': () => ({ order_id: 555, shipment_id: 777, status: 'NEW' }),
  '/courier/assign/awb': () => ({ response: { data: { awb_code: 'AWB123', courier_name: 'Delhivery' } } }),
  '/courier/generate/pickup': () => ({ pickup_status: 1 }),
};

/* ----------------------------------------------------------- pure helpers */
test('payload: COD, cleaned phone, split name, India-time date, weight with the minimum', () => {
  const p = sr.buildOrderPayload(baseOrder(), { email: 'asha@example.com' });
  assert.equal(p.payment_method, 'COD');
  assert.equal(p.billing_phone, '9876543210');
  assert.equal(p.billing_customer_name, 'Asha');
  assert.equal(p.billing_last_name, 'Raman Iyer');
  assert.equal(p.order_date, '2026-10-01 12:00');
  assert.equal(p.pickup_location, 'Farm');
  assert.equal(p.sub_total, 420);
  assert.equal(p.order_items.length, 2);
  assert.equal(p.weight, 2.5);                            // 2 x 1kg + 10 pcs x 0.05 = 2.5
  assert.equal(sr.buildOrderPayload(baseOrder({ items: [{ name: 'x', quantity: 1, price: 1, selectedQuantity: '250g' }] }), {}).weight, 0.5);   // minimum
  assert.equal(sr.buildOrderPayload(baseOrder({ paymentMethod: 'Razorpay' }), {}).payment_method, 'Prepaid');
});

test('weights: kg, g, l, ml and pieces', () => {
  const w = (q, unit) => sr.lineWeightKg({ selectedQuantity: q, selectedUnit: unit });
  assert.equal(w('2kg'), 2); assert.equal(w('500g'), 0.5); assert.equal(w('1L'), 1); assert.equal(w('250ml'), 0.25); assert.equal(w('10 pcs'), 0.5);
});

test('status mapping', () => {
  const m = (t, id) => sr.mapStatus(t, id).orderStatus;
  assert.equal(m('DELIVERED'), 'Delivered'); assert.equal(m('', 7), 'Delivered');
  assert.equal(m('OUT FOR DELIVERY'), 'Shipped'); assert.equal(m('IN TRANSIT'), 'Shipped'); assert.equal(m('PICKED UP'), 'Shipped');
  assert.equal(m('PICKUP SCHEDULED'), 'Packed'); assert.equal(m('OUT FOR PICKUP'), 'Packed');
  assert.equal(m('UNDELIVERED'), null); assert.equal(m('RTO INITIATED'), null); assert.equal(sr.mapStatus('RTO INITIATED').rto, true);
});

test('tracking update: moves forward, merges scans without duplicates, never goes backwards', () => {
  const order = baseOrder({ orderStatus: 'Processing', trackingNumber: 'AWB123' });
  const payload = { awb: 'AWB123', courier_name: 'Delhivery', current_status: 'IN TRANSIT', etd: '2026-10-05 00:00:00',
    scans: [{ date: '2026-10-02 09:00:00', activity: 'Picked up', location: 'Thanjavur', status: 'PICKED UP' }, { date: '2026-10-02 18:00:00', activity: 'Arrived at hub', location: 'Trichy', status: 'IN TRANSIT' }] };
  const a = sr.buildTrackingUpdate(order, payload);
  assert.equal(a.update.orderStatus, 'Shipped'); assert.equal(a.becameShipped, true); assert.equal(a.update.trackingEvents.length, 2);
  assert.equal(a.update.trackingEvents[0].at.toISOString(), '2026-10-02T03:30:00.000Z');          // 09:00 IST
  Object.assign(order, a.update);
  const b = sr.buildTrackingUpdate(order, payload);                                                  // same scans again
  assert.equal(b.update.trackingEvents.length, 2); assert.equal(b.changed, false); assert.equal(b.becameShipped, false);
  const back = sr.buildTrackingUpdate(order, { awb: 'AWB123', current_status: 'PICKUP SCHEDULED', scans: [] });
  assert.equal(back.update.orderStatus, undefined);                                                  // no regression
  const done = sr.buildTrackingUpdate(order, { awb: 'AWB123', current_status: 'DELIVERED', scans: [{ date: '2026-10-04 11:00:00', activity: 'Delivered', status: 'DELIVERED' }] });
  assert.equal(done.update.orderStatus, 'Delivered'); assert.equal(done.update.isDelivered, true); assert.equal(done.becameDelivered, true);
  assert.equal(sr.buildTrackingUpdate({ ...order, orderStatus: 'Cancelled' }, { current_status: 'DELIVERED' }).update.orderStatus, undefined);   // cancelled stays cancelled
});

/* ------------------------------------------------------------ API client */
test('createShipment: login → create → assign courier → pickup, token reused', async () => {
  const calls = fakeShiprocket();
  const out = await sr.createShipment(baseOrder(), { email: 'a@b.c' });
  assert.deepEqual(calls.map(c => c.path), ['/auth/login', '/orders/create/adhoc', '/courier/assign/awb', '/courier/generate/pickup']);
  assert.equal(calls[1].auth, 'Bearer tok-1');
  assert.equal(calls[2].body.shipment_id, 777);
  assert.equal(out.awb, 'AWB123'); assert.equal(out.courier, 'Delhivery'); assert.match(out.trackingUrl, /AWB123/);
  await sr.createShipment(baseOrder(), {});
  assert.equal(calls.filter(c => c.path === '/auth/login').length, 1);
});

test('createShipment: an expired token is refreshed once, a courier failure keeps the partial result', async () => {
  let first = true;
  let calls = fakeShiprocket({ '/orders/create/adhoc': () => { if (first) { first = false; return { __status: 401, __body: { message: 'Unauthorized' } }; } return defaults['/orders/create/adhoc'](); } });
  const out = await sr.createShipment(baseOrder(), {});
  assert.equal(calls.filter(c => c.path === '/auth/login').length, 2); assert.equal(out.awb, 'AWB123');

  calls = fakeShiprocket({ '/courier/assign/awb': () => ({ response: { data: { awb_assign_error: 'Insufficient wallet balance' } } }) });
  await assert.rejects(() => sr.createShipment(baseOrder(), {}), err => { assert.match(err.message, /wallet/); assert.equal(err.partial.shipmentId, '777'); return true; });
});

/* ------------------------------------------------------------- service */
test('autoShip: ships COD at once, waits for payment on prepaid, never double-ships, records failures', async () => {
  fakeShiprocket();
  const Order = fakeOrderModel([baseOrder(), baseOrder({ _id: 'o2', paymentMethod: 'Razorpay', isPaid: false }), baseOrder({ _id: 'o3', paymentMethod: 'Razorpay', isPaid: true })]);
  const a = await service.autoShip({ Order, User: FakeUser, orderId: 'o1' });
  assert.equal(a.awb, 'AWB123');
  const o1 = Order.store.get('o1');
  assert.equal(o1.trackingNumber, 'AWB123'); assert.equal(o1.shiprocketShipmentId, '777'); assert.equal(o1.orderStatus, 'Processing'); assert.equal(o1.shippingError, '');
  assert.equal(o1.trackingEvents.length, 1);
  assert.equal((await service.autoShip({ Order, User: FakeUser, orderId: 'o1' })).skipped, 'already shipped');
  assert.equal((await service.autoShip({ Order, User: FakeUser, orderId: 'o2' })).skipped, 'waiting for payment');
  assert.equal((await service.autoShip({ Order, User: FakeUser, orderId: 'o3' })).awb, 'AWB123');

  fakeShiprocket({ '/orders/create/adhoc': () => ({ __status: 422, __body: { message: 'Pickup location not found' } }) });
  const bad = fakeOrderModel([baseOrder({ _id: 'o4' })]);
  const f = await service.autoShip({ Order: bad, User: FakeUser, orderId: 'o4' });
  assert.match(f.error, /Pickup location/); assert.match(bad.store.get('o4').shippingError, /Pickup location/);
  assert.equal(bad.store.get('o4').orderStatus, 'Pending');                  // the order itself is untouched

  process.env.SHIPROCKET_AUTO_SHIP = 'false';
  assert.equal((await service.autoShip({ Order, User: FakeUser, orderId: 'o1' })).skipped !== undefined, true);
  delete process.env.SHIPROCKET_AUTO_SHIP;
});

test('autoShip does nothing without Shiprocket credentials', async () => {
  const keep = process.env.SHIPROCKET_EMAIL; delete process.env.SHIPROCKET_EMAIL;
  const out = await service.autoShip({ Order: fakeOrderModel([baseOrder()]), User: FakeUser, orderId: 'o1' });
  process.env.SHIPROCKET_EMAIL = keep;
  assert.equal(out.skipped, 'not configured');
});

/* --------------------------------------------------------------- routes */
function serve(router, user) {
  const app = express(); app.use(express.json());
  app.use('/api/shipping', router);
  return new Promise(resolve => { const s = app.listen(0, () => resolve({ s, port: s.address().port })); });
}
const call = (port, method, path, { headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ port, method, path, headers: { 'Content-Type': 'application/json', ...headers } }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }));
  });
  req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
});

test('webhook: needs the token, updates the order, emails once on shipped and once on delivered', async () => {
  fakeShiprocket();
  const Order = fakeOrderModel([baseOrder({ orderStatus: 'Processing', trackingNumber: 'AWB123', shiprocketOrderId: '555' })]);
  const sent = [];
  const router = createShippingRouter({ Order, User: FakeUser, protect: (q, s, n) => n(), authorize: () => (q, s, n) => n(), notifyCustomer: async (o, kind) => sent.push(kind) });
  const { s, port } = await serve(router);
  try {
    assert.equal((await call(port, 'POST', '/api/shipping/webhook', { body: {} })).status, 401);
    assert.equal((await call(port, 'POST', '/api/shipping/webhook', { headers: { 'x-api-key': 'wrong' }, body: {} })).status, 401);
    const hdr = { 'x-api-key': 'hook-secret' };
    const transit = { awb: 'AWB123', sr_order_id: 555, order_id: 'NO-1001', current_status: 'IN TRANSIT', courier_name: 'Delhivery', scans: [{ date: '2026-10-02 09:00:00', activity: 'Picked up', location: 'Thanjavur', 'sr-status-label': 'PICKED UP' }] };
    const r1 = await call(port, 'POST', '/api/shipping/webhook', { headers: hdr, body: transit });
    assert.equal(r1.status, 200); assert.equal(r1.body.matched, true);
    assert.equal(Order.store.get('o1').orderStatus, 'Shipped');
    await call(port, 'POST', '/api/shipping/webhook', { headers: hdr, body: transit });               // duplicate delivery of the same event
    await call(port, 'POST', '/api/shipping/webhook', { headers: hdr, body: { ...transit, current_status: 'DELIVERED', scans: [...transit.scans, { date: '2026-10-04 11:00:00', activity: 'Delivered', 'sr-status-label': 'DELIVERED' }] } });
    assert.equal(Order.store.get('o1').orderStatus, 'Delivered'); assert.equal(Order.store.get('o1').isDelivered, true);
    assert.deepEqual(sent, ['shipped', 'delivered']);
    assert.equal((await call(port, 'POST', '/api/shipping/webhook', { headers: hdr, body: { awb: 'UNKNOWN' } })).body.matched, false);   // unknown parcel is fine
  } finally { s.close(); }
});

test('webhook is closed when no token is configured', async () => {
  const keep = process.env.SHIPROCKET_WEBHOOK_TOKEN; delete process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const router = createShippingRouter({ Order: fakeOrderModel([]), User: FakeUser, protect: (q, s, n) => n(), authorize: () => (q, s, n) => n() });
  const { s, port } = await serve(router);
  try { assert.equal((await call(port, 'POST', '/api/shipping/webhook', { headers: { 'x-api-key': 'x' }, body: {} })).status, 503); }
  finally { s.close(); process.env.SHIPROCKET_WEBHOOK_TOKEN = keep; }
});

test('tracking lookup: owner and admin only, shows newest scan first', async () => {
  fakeShiprocket({ '/courier/track/awb/AWB123': () => ({ tracking_data: { shipment_status: 18, etd: '2026-10-05 00:00:00', shipment_track: [{ current_status: 'IN TRANSIT', courier_name: 'Delhivery' }],
    shipment_track_activities: [{ date: '2026-10-02 09:00:00', activity: 'Picked up', location: 'Thanjavur', 'sr-status-label': 'PICKED UP' }, { date: '2026-10-02 18:00:00', activity: 'Arrived at hub', location: 'Trichy', 'sr-status-label': 'IN TRANSIT' }] } }) });
  const Order = fakeOrderModel([baseOrder({ orderStatus: 'Processing', trackingNumber: 'AWB123', courierService: 'Delhivery', trackingUrl: 'https://shiprocket.co/tracking/AWB123' })]);
  let user = { id: 'u1', role: 'user' };
  const router = createShippingRouter({ Order, User: FakeUser, notifyCustomer: async () => { }, protect: (req, res, next) => { req.user = user; next(); }, authorize: () => (q, s, n) => n() });
  const { s, port } = await serve(router);
  try {
    const mine = await call(port, 'GET', '/api/shipping/track/NO-1001');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.status, 'Shipped'); assert.equal(mine.body.data.awb, 'AWB123'); assert.equal(mine.body.data.courier, 'Delhivery');
    assert.equal(mine.body.data.events[0].activity, 'Arrived at hub'); assert.equal(mine.body.data.events.length, 2);
    user = { id: 'someone-else', role: 'user' };
    assert.equal((await call(port, 'GET', '/api/shipping/track/NO-1001')).status, 403);
    user = { id: 'admin', role: 'admin' };
    assert.equal((await call(port, 'GET', '/api/shipping/track/NO-1001')).status, 200);
    assert.equal((await call(port, 'GET', '/api/shipping/track/NO-404')).status, 404);
  } finally { s.close(); }
});

test('guest lookup: needs the right mobile, never reveals whether an order exists, and is rate limited', async () => {
  fakeShiprocket();
  const Order = fakeOrderModel([baseOrder({ orderStatus: 'Shipped', trackingNumber: 'AWB123', courierService: 'Delhivery', trackingUrl: 'https://shiprocket.co/tracking/AWB123', lastTrackingSync: new Date() })]);
  const router = createShippingRouter({ Order, User: FakeUser, protect: (q, s, n) => n(), authorize: () => (q, s, n) => n(), notifyCustomer: async () => { } });
  const { s, port } = await serve(router);
  try {
    const ok = await call(port, 'POST', '/api/shipping/lookup', { body: { orderNumber: '#NO-1001', phone: '098765 43210' } });
    assert.equal(ok.status, 200); assert.equal(ok.body.data.orderNumber, 'NO-1001'); assert.equal(ok.body.data.awb, 'AWB123'); assert.equal(ok.body.data.courier, 'Delhivery');
    assert.equal(ok.body.data.shippingAddress, undefined);                         // no personal data comes back
    const wrongPhone = await call(port, 'POST', '/api/shipping/lookup', { body: { orderNumber: 'NO-1001', phone: '9000000000' } });
    const wrongOrder = await call(port, 'POST', '/api/shipping/lookup', { body: { orderNumber: 'NO-9999', phone: '9876543210' } });
    assert.equal(wrongPhone.status, 404); assert.equal(wrongOrder.status, 404);
    assert.equal(wrongPhone.body.message, wrongOrder.body.message);                // identical answers
    assert.equal((await call(port, 'POST', '/api/shipping/lookup', { body: { orderNumber: 'NO-1001' } })).status, 404);
    let last; for (let i = 0; i < 14; i++) last = await call(port, 'POST', '/api/shipping/lookup', { body: { orderNumber: 'NO-1001', phone: '9000000000' } });
    assert.equal(last.status, 429);
  } finally { s.close(); }
});
