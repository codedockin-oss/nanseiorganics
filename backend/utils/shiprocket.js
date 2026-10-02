'use strict';
/**
 * Shiprocket integration — a thin API client plus pure helpers (no database access here).
 *
 * Needed env vars (all optional — with no credentials the store simply behaves as before):
 *   SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD   an API user created in Shiprocket → Settings → API
 *   SHIPROCKET_PICKUP_LOCATION               pickup address nickname in Shiprocket (default "Primary")
 *   SHIPROCKET_AUTO_SHIP                     "false" = only create the Shiprocket order, don't buy a label
 *   SHIPROCKET_WEBHOOK_TOKEN                 secret you also enter in Shiprocket's webhook settings
 *   SHIPROCKET_MIN_WEIGHT / _PIECE_WEIGHT    kg — minimum parcel weight (0.5) / weight of one "piece" (0.05)
 *   SHIPROCKET_LENGTH / _BREADTH / _HEIGHT   cm — default parcel size (20 x 15 x 10)
 *   SHIPROCKET_TRACKING_URL                  tracking link template, "{awb}" is replaced
 *
 * Written against Shiprocket's public API documentation (apiv2.shiprocket.in/v1/external).
 * Field names are kept in one place so a change on their side is a small edit.
 */

const BASE = () => process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

let fetchImpl = (...args) => fetch(...args);      // replaceable in tests
let token = null;
let tokenAt = 0;
const TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1000;      // tokens live 10 days; refresh a little early

function _setFetch(fn) { fetchImpl = fn; token = null; tokenAt = 0; }

const isConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
const autoShipEnabled = () => isConfigured() && String(process.env.SHIPROCKET_AUTO_SHIP || 'true').toLowerCase() !== 'false';
const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : d; };

/* ------------------------------------------------------------------ HTTP */

async function http(method, path, body, authed = true, retry = true) {
  if (authed && (!token || Date.now() - tokenAt > TOKEN_TTL_MS)) await login();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetchImpl(BASE() + path, {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, authed ? { Authorization: 'Bearer ' + token } : {}),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (res.status === 401 && authed && retry) { token = null; return http(method, path, body, authed, false); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data && (data.message || (data.errors && JSON.stringify(data.errors)));
      const err = new Error('Shiprocket: ' + (detail || 'HTTP ' + res.status));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  } finally { clearTimeout(timer); }
}

async function login() {
  const data = await http('POST', '/auth/login', { email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }, false);
  if (!data.token) throw new Error('Shiprocket: login did not return a token');
  token = data.token; tokenAt = Date.now();
}

/* --------------------------------------------------------- order payload */

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return ['Customer', ''];
  return [parts[0], parts.slice(1).join(' ')];
}

/** 10-digit Indian mobile from "+91 98765 43210", "09876543210", … */
function cleanPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/** Weight in kg of one ordered line, from labels like "1kg", "500g", "250 ml", "10 pcs". */
function lineWeightKg(item) {
  const label = String(item.selectedQuantity || '') + ' ' + String(item.selectedUnit || '');
  const m = label.match(/([\d.]+)\s*(kg|g|l|ml|pcs|pc|piece|pieces)?/i);
  const amount = m ? parseFloat(m[1]) : NaN;
  if (!Number.isFinite(amount)) return num(process.env.SHIPROCKET_PIECE_WEIGHT, 0.05);
  let unit = (m[2] || '').toLowerCase();
  if (!unit) { const u = String(item.selectedUnit || '').match(/kg|g|ml|l|piece|pcs|pc/i); unit = u ? u[0].toLowerCase() : 'pcs'; }
  if (unit === 'kg') return amount;
  if (unit === 'g') return amount / 1000;
  if (unit === 'l') return amount;            // ~1 kg per litre
  if (unit === 'ml') return amount / 1000;
  return amount * num(process.env.SHIPROCKET_PIECE_WEIGHT, 0.05);
}

function orderWeightKg(order) {
  const total = (order.items || []).reduce((s, it) => s + lineWeightKg(it) * (Number(it.quantity) || 1), 0);
  const min = num(process.env.SHIPROCKET_MIN_WEIGHT, 0.5);
  return Math.max(min, Math.round(total * 100) / 100);
}

function pad(n) { return String(n).padStart(2, '0'); }
function istStamp(d) {                         // "YYYY-MM-DD HH:mm" in India time
  const ist = new Date(new Date(d).getTime() + 5.5 * 3600 * 1000);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

function buildOrderPayload(order, user) {
  const a = order.shippingAddress || {};
  const [first, last] = splitName(a.fullName);
  const cod = String(order.paymentMethod).toUpperCase() === 'COD';
  const payload = {
    order_id: String(order.orderNumber || order._id),
    order_date: istStamp(order.createdAt || Date.now()),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: String(a.addressLine1 || '').slice(0, 190) || 'NA',
    billing_address_2: String(a.addressLine2 || '').slice(0, 190),
    billing_city: a.city,
    billing_pincode: String(a.pincode || '').trim(),
    billing_state: a.state,
    billing_country: a.country || 'India',
    billing_email: (user && user.email) || a.email || process.env.ADMIN_EMAIL || '',
    billing_phone: cleanPhone(a.phone),
    shipping_is_billing: true,
    order_items: (order.items || []).map((it, i) => ({
      name: String(it.name || 'Item').slice(0, 100),
      sku: String((it.product && it.product._id) || it.product || 'SKU-' + (i + 1)).slice(0, 50),
      units: Number(it.quantity) || 1,
      selling_price: Number(it.price) || 0,
      discount: 0, tax: '', hsn: '',
    })),
    payment_method: cod ? 'COD' : 'Prepaid',
    shipping_charges: Number(order.shippingPrice) || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(order.discount) || 0,
    sub_total: Number(order.totalPrice) || 0,         // for COD this is the amount the courier collects
    length: num(process.env.SHIPROCKET_LENGTH, 20),
    breadth: num(process.env.SHIPROCKET_BREADTH, 15),
    height: num(process.env.SHIPROCKET_HEIGHT, 10),
    weight: orderWeightKg(order),
  };
  if (process.env.SHIPROCKET_CHANNEL_ID) payload.channel_id = process.env.SHIPROCKET_CHANNEL_ID;
  return payload;
}

const trackingUrlFor = awb => awb ? (process.env.SHIPROCKET_TRACKING_URL || 'https://shiprocket.co/tracking/{awb}').replace('{awb}', encodeURIComponent(awb)) : '';

/* -------------------------------------------------------------- API calls */

/**
 * Creates the Shiprocket order, buys a label (assigns a courier + AWB) and asks for pickup.
 * Safe to call again after a partial failure: pass what already exists in `existing`.
 */
async function createShipment(order, user, { assignAwb = true, existing = {} } = {}) {
  const out = {
    shiprocketOrderId: existing.shiprocketOrderId || '',
    shipmentId: existing.shipmentId || '',
    awb: existing.awb || '',
    courier: existing.courier || '',
  };
  if (!out.shipmentId) {
    const created = await http('POST', '/orders/create/adhoc', buildOrderPayload(order, user));
    if (!created.shipment_id) throw new Error('Shiprocket: ' + (created.message || 'no shipment id returned'));
    out.shiprocketOrderId = String(created.order_id);
    out.shipmentId = String(created.shipment_id);
    if (created.awb_code) out.awb = String(created.awb_code);
    if (created.courier_name) out.courier = created.courier_name;
  }
  if (assignAwb && !out.awb) {
    const res = await http('POST', '/courier/assign/awb', { shipment_id: Number(out.shipmentId) });
    const d = (res.response && res.response.data) || {};
    if (!d.awb_code) {
      const why = d.awb_assign_error || res.message || 'no courier could be assigned';
      const err = new Error('Shiprocket: ' + why); err.partial = out; throw err;
    }
    out.awb = String(d.awb_code);
    out.courier = d.courier_name || out.courier;
  }
  if (assignAwb && out.awb) {
    try { await http('POST', '/courier/generate/pickup', { shipment_id: [Number(out.shipmentId)] }); out.pickupRequested = true; }
    catch (e) { out.pickupError = e.message; }          // label exists; Shiprocket will usually auto-schedule pickup anyway
  }
  out.trackingUrl = trackingUrlFor(out.awb);
  return out;
}

async function cancelShipment(shiprocketOrderId) {
  return http('POST', '/orders/cancel', { ids: [Number(shiprocketOrderId)] });
}

/** Live tracking by AWB, normalised to the same shape the webhook sends. */
async function trackAwb(awb) {
  const res = await http('GET', '/courier/track/awb/' + encodeURIComponent(awb));
  const td = res.tracking_data || {};
  const first = (td.shipment_track && td.shipment_track[0]) || {};
  return {
    awb,
    courier_name: first.courier_name || '',
    current_status: first.current_status || '',
    current_status_id: td.shipment_status,
    etd: td.etd || first.edd || '',
    track_url: td.track_url || '',
    scans: (td.shipment_track_activities || []).map(a => ({
      date: a.date, activity: a.activity, location: a.location, status: a['sr-status-label'] || a.status || '',
    })),
  };
}

/* ------------------------------------------------------- status handling */

const RANK = { Pending: 0, Processing: 1, Packed: 2, Shipped: 3, Delivered: 4 };

/**
 * Courier wording → { orderStatus, label, rto }.  `orderStatus` is null when the event should not move the order.
 * Text is matched (not only ids) because courier statuses vary; ids 7 and 17/18/6/42 are the well-known ones.
 */
function mapStatus(text, id) {
  const t = String(text || '').toUpperCase();
  const n = Number(id);
  if (/RTO|RETURN/.test(t) || n === 9 || n === 10) return { orderStatus: null, label: 'Returning to seller', rto: true };
  if (/CANCEL/.test(t) || n === 8) return { orderStatus: null, label: 'Shipment cancelled', rto: false };
  if (/UNDELIVERED|NOT DELIVERED|DELIVERY ATTEMPT|FAILED/.test(t) || n === 21) return { orderStatus: null, label: 'Delivery attempt failed', rto: false };
  if ((/DELIVERED/.test(t) && !/OUT FOR/.test(t)) || n === 7) return { orderStatus: 'Delivered', label: 'Delivered', rto: false };
  if (/OUT FOR DELIVERY/.test(t) || n === 17) return { orderStatus: 'Shipped', label: 'Out for delivery', rto: false };
  if (/IN TRANSIT|SHIPPED|PICKED UP|REACHED|ARRIVED|DISPATCH|DEPART|HUB/.test(t) || n === 6 || n === 18 || n === 42) return { orderStatus: 'Shipped', label: n === 42 || /PICKED UP/.test(t) ? 'Picked up' : 'In transit', rto: false };
  if (/PICKUP|MANIFEST|AWB|READY TO SHIP|PACKED|NEW/.test(t)) return { orderStatus: 'Packed', label: 'Awaiting pickup', rto: false };
  return { orderStatus: null, label: text ? String(text) : '', rto: false };
}

/** Shiprocket timestamps are India time without a zone: "2026-10-01 14:03:00". */
function parseStamp(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  const str = String(s).trim();
  let d = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(str)
    ? new Date(str.replace(' ', 'T') + (str.length === 16 ? ':00' : '') + '+05:30') : new Date(str);
  if (isNaN(d)) {                                             // "01 10 2026 14:03:00" style
    const m = str.match(/^(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):?(\d{2})?$/);
    if (m) d = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}+05:30`);
  }
  return isNaN(d) ? null : d;
}

/**
 * Pure: current order + a tracking payload (webhook or live lookup) → what to store.
 * Returns { update, changed, becameShipped, becameDelivered }.  Never moves an order backwards
 * and never touches cancelled / refunded orders' status.
 */
function buildTrackingUpdate(order, p) {
  const scans = Array.isArray(p.scans) ? p.scans : [];
  const events = new Map();
  (order.trackingEvents || []).forEach(e => { const at = parseStamp(e.at); events.set(`${at && at.getTime()}|${e.status}|${e.activity}`, { at, status: e.status, activity: e.activity, location: e.location }); });
  scans.forEach(s => {
    const at = parseStamp(s.date) || new Date();
    const status = s['sr-status-label'] || s.status || s['sr-status'] || '';
    const ev = { at, status: String(status), activity: String(s.activity || ''), location: String(s.location || '') };
    events.set(`${at.getTime()}|${ev.status}|${ev.activity}`, ev);
  });
  const merged = [...events.values()].filter(e => e.at).sort((a, b) => a.at - b.at).slice(-100);

  const latestScan = merged[merged.length - 1];
  const rawStatus = p.current_status || (latestScan && (latestScan.status || latestScan.activity)) || '';
  const mapped = mapStatus(rawStatus, p.current_status_id || p.shipment_status_id);

  const update = {};
  if (merged.length) update.trackingEvents = merged;
  if (rawStatus) update.shipmentStatus = String(rawStatus);
  if (p.awb && !order.trackingNumber) update.trackingNumber = String(p.awb);
  if (p.courier_name) update.courierService = p.courier_name;
  const etd = parseStamp(p.etd);
  if (etd) update.estimatedDelivery = etd;
  update.trackingUrl = p.track_url || order.trackingUrl || trackingUrlFor(p.awb || order.trackingNumber);

  const frozen = order.orderStatus === 'Cancelled' || order.orderStatus === 'Refunded';
  let becameShipped = false, becameDelivered = false;
  if (!frozen && mapped.orderStatus && RANK[mapped.orderStatus] > (RANK[order.orderStatus] || 0)) {
    update.orderStatus = mapped.orderStatus;
    becameShipped = mapped.orderStatus === 'Shipped' && order.orderStatus !== 'Shipped';
    becameDelivered = mapped.orderStatus === 'Delivered';
    if (becameDelivered) { update.isDelivered = true; update.deliveredAt = (latestScan && latestScan.at) || new Date(); }
  }
  update.lastTrackingSync = new Date();
  const changed = !!(update.orderStatus || update.shipmentStatus !== order.shipmentStatus || merged.length !== (order.trackingEvents || []).length);
  return { update, changed, becameShipped, becameDelivered, label: mapped.label, rto: mapped.rto };
}

module.exports = {
  isConfigured, autoShipEnabled, createShipment, cancelShipment, trackAwb,
  buildOrderPayload, orderWeightKg, lineWeightKg, cleanPhone, splitName, mapStatus, parseStamp, buildTrackingUpdate, trackingUrlFor,
  _setFetch,
};
