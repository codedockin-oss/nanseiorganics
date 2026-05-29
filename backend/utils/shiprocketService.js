const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let tokenExpiresAt = 0;
const SHIPROCKET_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled'];

function assertConfig() {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    throw new Error('Shiprocket credentials are not configured');
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function shiprocketRequest(path, options = {}, attempt = 1) {
  const token = await getToken();
  const res = await fetch(`${SR_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if ((res.status === 401 || res.status === 403) && attempt === 1) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return shiprocketRequest(path, options, attempt + 1);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await wait(350 * attempt);
    return shiprocketRequest(path, options, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `Shiprocket request failed (${res.status})`);
  }
  return data;
}

async function getToken() {
  assertConfig();
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.message || 'Shiprocket authentication failed');
  }
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

function toShiprocketOrderPayload(order) {
  const addr = order.shippingAddress || {};
  const phone = addr.mobileNumber || addr.phone;
  const userEmail = order.user?.email || process.env.ADMIN_EMAIL || 'orders@nanseiorganics.com';

  return {
    order_id: order.orderNumber || order.orderId || String(order._id),
    order_date: new Date(order.createdAt || Date.now()).toISOString().slice(0, 19).replace('T', ' '),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
    comment: 'Nansei Organics order',
    billing_customer_name: addr.fullName,
    billing_last_name: '',
    billing_address: addr.addressLine1,
    billing_address_2: addr.addressLine2 || '',
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: addr.country || 'India',
    billing_email: userEmail,
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: (order.items || []).map((item, index) => ({
      name: item.name,
      sku: item.product?._id ? String(item.product._id) : `NANSEI-${index + 1}`,
      units: item.quantity,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: '',
    })),
    payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
    shipping_charges: order.shippingPrice || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: order.discount || 0,
    sub_total: order.itemsPrice || order.totalPrice || 0,
    length: Number(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || 15),
    breadth: Number(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || 15),
    height: Number(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || 10),
    weight: Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || 0.5),
  };
}

async function createShipment(order) {
  return shiprocketRequest('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(toShiprocketOrderPayload(order)),
  });
}

async function assignAwb(shipmentId, courierId) {
  const body = { shipment_id: shipmentId };
  if (courierId) body.courier_id = courierId;
  return shiprocketRequest('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function trackAwb(awbCode) {
  return shiprocketRequest(`/courier/track/awb/${encodeURIComponent(awbCode)}`);
}

function extractAwb(data) {
  return String(data?.awb_code || data?.response?.data?.awb_code || data?.data?.awb_code || data?.awb || data?.AWB || '').trim();
}

function extractCourier(data) {
  return String(data?.courier_name || data?.courierName || data?.courier || data?.response?.data?.courier_name || data?.data?.courier_name || '').trim();
}

function extractEta(data) {
  const raw = data?.edd || data?.eta || data?.estimated_delivery_date || data?.expected_delivery_date ||
    data?.data?.eta || data?.data?.edd || data?.tracking_data?.shipment_track?.[0]?.edd;
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function extractShipmentId(data) {
  return String(data?.shipment_id || data?.shipmentId || data?.shipment || data?.data?.shipment_id || data?.response?.data?.shipment_id || '').trim();
}

function extractRawTrackingStatus(data) {
  return String(
    data?.shipment_status ||
    data?.current_status ||
    data?.currentTrackingStatus ||
    data?.status ||
    data?.tracking_data?.shipment_track?.[0]?.current_status ||
    data?.tracking_data?.track_status ||
    data?.data?.shipment_status ||
    ''
  ).trim();
}

function normalizeShippingStatus(status) {
  const raw = String(status || '').toLowerCase();
  if (/cancel|rto|return|lost|destroy|damag/.test(raw)) return 'Cancelled';
  if (/delivered|completed/.test(raw)) return 'Delivered';
  if (/out\s*for\s*delivery|\bofd\b/.test(raw)) return 'Out For Delivery';
  if (/ship|transit|pickup|picked|manifest|dispatched|in[-\s]?scan|out[-\s]?scan|hub|reached|forwarded/.test(raw)) return 'Shipped';
  if (/awb|assign|confirm|packed|processing|ready|booked|created|new/.test(raw)) return 'Confirmed';
  return SHIPROCKET_STATUSES.includes(status) ? status : 'Pending';
}

function mapTrackingStatus(data) {
  return normalizeShippingStatus(extractRawTrackingStatus(data));
}

function extractWebhookFields(payload = {}) {
  const awbCode = extractAwb(payload) ||
    String(payload.awb_code || payload.awb || payload.AWB || payload.awbNumber || payload.awb_number || '').trim();
  const shipmentId = extractShipmentId(payload) ||
    String(payload.shipment_id || payload.shipmentId || payload.shipment || '').trim();
  const currentTrackingStatus = extractRawTrackingStatus(payload);
  return {
    awbCode,
    shipmentId,
    courierName: extractCourier(payload),
    trackingUrl: payload.tracking_url || payload.trackingUrl || trackingUrl(awbCode),
    estimatedDeliveryDate: extractEta(payload),
    currentTrackingStatus,
    shippingStatus: normalizeShippingStatus(currentTrackingStatus),
  };
}

function applyTrackingToOrder(order, fields) {
  if (!order || !fields) return false;
  const previous = order.shippingStatus;
  if (fields.shipmentId) order.shipmentId = fields.shipmentId;
  if (fields.awbCode) order.awbCode = fields.awbCode;
  if (fields.courierName) order.courierName = fields.courierName;
  if (fields.trackingUrl) order.trackingUrl = fields.trackingUrl;
  else if (order.awbCode && !order.trackingUrl) order.trackingUrl = trackingUrl(order.awbCode);
  if (fields.estimatedDeliveryDate) order.estimatedDeliveryDate = fields.estimatedDeliveryDate;
  if (fields.currentTrackingStatus) order.currentTrackingStatus = fields.currentTrackingStatus;
  if (fields.shippingStatus) order.shippingStatus = fields.shippingStatus;

  if (order.shippingStatus === 'Confirmed') order.orderStatus = 'Packed';
  if (['Shipped', 'Out For Delivery'].includes(order.shippingStatus)) order.orderStatus = 'Shipped';
  if (order.shippingStatus === 'Delivered') {
    order.orderStatus = 'Delivered';
    order.isDelivered = true;
    order.deliveredAt = order.deliveredAt || new Date();
  }
  if (order.shippingStatus === 'Cancelled') {
    order.orderStatus = 'Cancelled';
    order.cancelledAt = order.cancelledAt || new Date();
  }
  return previous !== order.shippingStatus;
}

function trackingUrl(awbCode) {
  return awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}` : '';
}

module.exports = {
  createShipment,
  assignAwb,
  trackAwb,
  extractAwb,
  extractCourier,
  extractEta,
  extractShipmentId,
  extractRawTrackingStatus,
  extractWebhookFields,
  applyTrackingToOrder,
  normalizeShippingStatus,
  mapTrackingStatus,
  trackingUrl,
};
