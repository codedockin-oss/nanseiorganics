// Stand-in for the Nansei backend so the storefront can be exercised without MongoDB.
// It answers the endpoints the pages call with small, realistic payloads and keeps a few things
// in memory (addresses, the last order) so checkout can be tested end to end.
// It NEVER touches the real database - run it instead of the backend when testing the UI.
const http = require('http');

const PORT = Number(process.env.MOCK_API_PORT || 5000);
const user = { _id: 'u1', id: 'u1', name: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '9876543210', role: 'admin', createdAt: '2026-01-10T10:00:00Z' };
const addr = { fullName: 'Test User', phone: '9876543210', addressLine1: '12 Farm Road', city: 'Thanjavur', state: 'Tamil Nadu', pincode: '613001', country: 'India' };
const sampleOrders = [
  { _id: 'o1', orderNumber: 'NO-1001', orderStatus: 'Delivered', paymentMethod: 'COD', totalPrice: 540, itemsPrice: 500, createdAt: '2026-07-01T10:00:00Z', deliveredAt: '2026-07-05T10:00:00Z', trackingNumber: 'TRK10011',
    items: [{ product: { _id: '1', name: 'Karunguruvai Rice', images: [] }, name: 'Karunguruvai Rice', quantity: 2, price: 180, selectedQuantity: '1kg', image: '' }], shippingAddress: addr },
  { _id: 'o2', orderNumber: 'NO-1002', orderStatus: 'Processing', paymentMethod: 'Razorpay', totalPrice: 320, itemsPrice: 300, createdAt: '2026-07-20T10:00:00Z',
    items: [{ product: { _id: '8', name: 'Paneer Rose', images: [] }, name: 'Paneer Rose', quantity: 2, price: 150, selectedQuantity: '10 pcs', image: '' }], shippingAddress: addr },
  { _id: 'o3', orderNumber: 'NO-1003', orderStatus: 'Shipped', paymentMethod: 'COD', totalPrice: 220, itemsPrice: 220, createdAt: '2026-07-25T10:00:00Z', trackingNumber: 'AWB10033', courierService: 'Delhivery', trackingUrl: 'https://shiprocket.co/tracking/AWB10033', shipmentStatus: 'IN TRANSIT', estimatedDelivery: '2026-07-30T10:00:00Z',
    items: [{ product: { _id: '2', name: 'Karuppu Kavuni Rice', images: [] }, name: 'Karuppu Kavuni Rice', quantity: 1, price: 220, selectedQuantity: '1kg', image: '' }], shippingAddress: addr },
];

sampleOrders.forEach(o => { Object.defineProperty(o, '__s0', { value: o.orderStatus, enumerable: false }); });
const trackEvents = [
  { at: '2026-07-26T09:10:00Z', status: 'PICKED UP', activity: 'Picked up from the farm', location: 'Thanjavur' },
  { at: '2026-07-26T18:40:00Z', status: 'IN TRANSIT', activity: 'Arrived at sorting hub', location: 'Trichy' },
  { at: '2026-07-27T08:05:00Z', status: 'IN TRANSIT', activity: 'Departed from hub', location: 'Trichy' },
];

function staticResponse(url) {
  const p = url.split('?')[0].replace(/^\/api/, '');
  if (p === '/auth/me') return { success: true, user, data: user };
  if (p === '/auth/forgot-password') return { success: true, message: 'Reset link sent' };
  if (p === '/users/activity') return { success: true, data: [] };
  if (p === '/products') return { success: true, products: [], count: 0, total: 0 };     // pages fall back to their built-in catalogue
  if (/^\/products\//.test(p)) return { success: false, message: 'Not found' };
  if (p === '/wishlist') return { success: true, wishlist: [], data: [], products: [] };
  if (p === '/cart') return { success: true, cart: { items: [] }, items: [], data: { items: [] } };
  if (p === '/orders/my-orders' || p === '/orders') return { success: true, orders: sampleOrders, data: sampleOrders, count: sampleOrders.length };
  if (/^\/reviews/.test(p)) return { success: true, reviews: [], data: [], count: 0, stats: {} };
  if (p === '/discounts/active' || p === '/discounts') return { success: true, discounts: [], data: [] };
  if (p === '/news') return { success: true, news: [], data: [] };
  if (p === '/blogs' || p === '/blog') return { success: true, blogs: [], data: [] };
  if (/^\/(coupons|combos|categories)/.test(p)) return { success: true, data: [], coupons: [], combos: [], categories: [] };
  return { success: true, data: [] };
}

const addressesDb = [];
let lastOrder = null;
const readBody = req => new Promise(resolve => { let b = ''; req.on('data', c => { b += c; }); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } }); });


/* ---------------- accounts (behaves like backend/controllers/authController.js) ---------------- */
const seedUsers = () => [
  { _id: 'u1', firstName: 'Test', lastName: 'User', email: 'test@example.com', password: 'Test@12345', role: 'customer' },
  { _id: 'u2', firstName: 'Admin', lastName: 'Owner', email: 'admin@example.com', password: 'Admin@12345', role: 'admin' },
];
let accounts = seedUsers();
const resetTokens = new Map();     // token -> { email, exp }
let lastReset = null, seqUser = 10;
const pub = u => ({ id: u._id, _id: u._id, firstName: u.firstName, lastName: u.lastName, name: u.firstName + ' ' + u.lastName, email: u.email, role: u.role });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); return true; };
const userFromToken = req => { const h = req.headers.authorization || ''; const t = h.replace(/^Bearer\s+/, ''); const m = /^tok:(.+)$/.exec(t); return m ? accounts.find(u => u._id === m[1]) : null; };
async function handleAuth(req, res, path) {
  if (!path.startsWith('/auth/') && path !== '/__accounts' && path !== '/__last_reset') return false;
  if (path === '/__accounts') { accounts = seedUsers(); resetTokens.clear(); lastReset = null; return send(res, 200, { success: true }); }
  if (path === '/auth/me') {
    if (!req.headers.authorization) return send(res, 401, { success: false, message: 'Not authorized to access this route' });
    const u = userFromToken(req);
    if (u) return send(res, 200, { success: true, user: pub(u), data: pub(u) });
    if ((req.headers.authorization || '').startsWith('Bearer tok:')) return send(res, 401, { success: false, message: 'Not authorized to access this route' });   // unknown / deleted account
    return false;                                                  // legacy test token: falls through to the static user
  }
  const body = req.method === 'GET' ? {} : await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (path === '/auth/register' && req.method === 'POST') {
    const first = String(body.firstName || '').replace(/[<>]/g, '').trim(), last = String(body.lastName || '').replace(/[<>]/g, '').trim(), pw = String(body.password || '');
    if (!first) return send(res, 400, { success: false, message: 'First name is required' });
    if (!last) return send(res, 400, { success: false, message: 'Last name is required' });
    if (!email) return send(res, 400, { success: false, message: 'Email is required' });
    if (!EMAIL.test(email)) return send(res, 400, { success: false, message: 'Enter a valid email address' });
    if (pw.length < 8) return send(res, 400, { success: false, message: 'Password must be at least 8 characters' });
    if (accounts.some(u => u.email === email)) return send(res, 409, { success: false, message: 'An account with this email already exists' });
    const u = { _id: 'u' + (++seqUser), firstName: first, lastName: last, email, password: pw, role: 'customer' }; accounts.push(u);
    return send(res, 201, { success: true, message: 'Account created successfully', token: 'tok:' + u._id, user: pub(u) });
  }
  if (path === '/auth/login' && req.method === 'POST') {
    const pw = String(body.password || '');
    if (!email || !pw) return send(res, 400, { success: false, message: 'Email and password are required' });
    if (!EMAIL.test(email)) return send(res, 400, { success: false, message: 'Enter a valid email address' });
    const u = accounts.find(x => x.email === email);
    if (!u || u.password !== pw) return send(res, 401, { success: false, message: 'Invalid email or password' });
    return send(res, 200, { success: true, message: 'Login successful', token: 'tok:' + u._id, user: pub(u) });
  }
  if (path === '/auth/logout') return send(res, 200, { success: true, message: 'Logged out successfully' });
  if (path === '/auth/forgot-password' && req.method === 'POST') {
    if (!email || !EMAIL.test(email)) return send(res, 400, { success: false, message: 'Enter a valid email address' });
    if (accounts.some(u => u.email === email)) { lastReset = 'rt' + Math.random().toString(16).slice(2) + Date.now().toString(16); resetTokens.set(lastReset, { email, exp: Date.now() + 30 * 60 * 1000 }); }
    return send(res, 200, { success: true, message: 'If an account exists for this email, a reset link has been sent' });
  }
  if (path === '/__last_reset') return send(res, 200, { token: lastReset });
  const m = /^\/auth\/reset-password\/([^/]+)$/.exec(path);
  if (m && req.method === 'PUT') {
    const pw = String(body.password || ''); if (pw.length < 8) return send(res, 400, { success: false, message: 'Password must be at least 8 characters' });
    const rec = resetTokens.get(decodeURIComponent(m[1]));
    if (!rec || rec.exp < Date.now()) return send(res, 400, { success: false, message: 'Invalid or expired reset token' });
    const u = accounts.find(x => x.email === rec.email); u.password = pw; resetTokens.delete(decodeURIComponent(m[1]));
    return send(res, 200, { success: true, message: 'Password reset successful', token: 'tok:' + u._id, user: pub(u) });
  }
  return false;
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const path = req.url.split('?')[0].replace(/^\/api/, '');
  if (await handleAuth(req, res, path)) return;
  let payload;
  if (path === '/addresses' && req.method === 'POST') {
    const b = await readBody(req); const a = Object.assign({ _id: 'a' + (addressesDb.length + 1) }, b); addressesDb.push(a);
    payload = { success: true, data: a };
  } else if (path === '/addresses' && req.method === 'GET') payload = { success: true, data: addressesDb, addresses: addressesDb };
  else if (path === '/orders' && req.method === 'POST') {
    lastOrder = await readBody(req);
    payload = { success: true, data: { _id: 'o99', orderNumber: 'NO-9999', createdAt: new Date().toISOString(), orderStatus: 'processing', totalPrice: lastOrder.totalPrice || 0, items: lastOrder.items || [], shippingAddress: lastOrder.shippingAddress || {} } };
  } else if (path === '/shipping/lookup' && req.method === 'POST') {
    const b = await readBody(req); const num = String(b.orderNumber || '').replace(/^#/, '').trim();
    const o = sampleOrders.find(x => x.orderNumber === num || x._id === num);
    const ph = String(b.phone || '').replace(/\D/g, '').slice(-10);
    if (!o || o.shippingAddress.phone.replace(/\D/g, '').slice(-10) !== ph) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, message: 'We could not find that order. Please check the order number and mobile number.' })); }
    payload = { success: true, data: { orderNumber: o.orderNumber, status: o.orderStatus, shipmentStatus: o.shipmentStatus || '', courier: o.courierService || '', awb: o.trackingNumber || '', trackingUrl: o.trackingUrl || '', estimatedDelivery: o.estimatedDelivery || null, events: o.trackingNumber ? trackEvents.slice().reverse() : [] } };
  } else if (/^\/shipping\/track\/[^/]+$/.test(path)) {
    const o = sampleOrders.find(x => x._id === path.split('/').pop() || x.orderNumber === path.split('/').pop());
    payload = o ? { success: true, data: { orderNumber: o.orderNumber, status: o.orderStatus, shipmentStatus: o.shipmentStatus || '', courier: o.courierService || '', awb: o.trackingNumber || '', trackingUrl: o.trackingUrl || '', estimatedDelivery: o.estimatedDelivery || null,
      events: o.trackingNumber ? trackEvents.slice().reverse() : [] } } : { success: false, message: 'Order not found' };
  } else if (/^\/orders\/[^/]+\/cancel$/.test(path) && req.method === 'PUT') {
    const o = sampleOrders.find(x => x._id === path.split('/')[2]);
    if (!o) payload = { success: false, message: 'Order not found' };
    else if (!['Pending', 'Processing', 'Packed'].includes(o.orderStatus)) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, message: 'This order can no longer be cancelled because it has already been dispatched' })); }
    else { o.orderStatus = 'Cancelled'; payload = { success: true, data: o }; }
  } else if (path === '/__reset') { sampleOrders.forEach(o => { o.orderStatus = o.__s0; }); payload = { success: true };
  } else if (path === '/__last_order') payload = lastOrder || {};
  else payload = staticResponse(req.url);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}).listen(PORT, '127.0.0.1', () => console.log(`mock API on http://127.0.0.1:${PORT}/api`));
