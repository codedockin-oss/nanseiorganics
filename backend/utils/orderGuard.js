'use strict';
/**
 * Everything the server must not take on trust from the browser when an order arrives.
 *   - only known fields are copied (a customer can never set isPaid, orderStatus, user, tracking …)
 *   - amounts are recomputed here from the item prices: subtotal, coupon, 5% GST, delivery, total
 *   - prices are checked against the catalogue so a ₹1 rice order is refused
 * Pure functions + two injected look-ups, so it is tested without MongoDB.
 */
const FREE_SHIPPING_ABOVE = () => Number(process.env.FREE_SHIPPING_ABOVE || 999);
const SHIPPING_FEE = () => Number(process.env.SHIPPING_FEE || 0);
const GST_RATE = 0.05;
const MIN_PRICE_SHARE = 0.2;           // the smallest pack we sell is a quarter of the base unit, so never below 20% of the unit price

const PAY_METHODS = { razorpay: 'Razorpay', payu: 'PayU', cod: 'COD', upi: 'UPI', stripe: 'Stripe' };
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const money = v => Math.round(Number(v) * 100) / 100;

class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function cleanItems(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new OrderError('Your cart is empty.');
  if (raw.length > 50) throw new OrderError('Too many items in one order.');
  return raw.map((i, n) => {
    const price = Number(i && i.price), qty = Number(i && i.quantity);
    if (!(price > 0) || !Number.isFinite(price)) throw new OrderError(`Item ${n + 1} has an invalid price.`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new OrderError(`Item ${n + 1} has an invalid quantity.`);
    if (!i.product && i.product !== 0) throw new OrderError(`Item ${n + 1} is missing its product.`);
    return {
      product: i.product,
      name: str(i.name, 200) || 'Product',
      image: str(i.image, 600),
      quantity: qty,
      selectedQuantity: str(i.selectedQuantity, 40) || '1',
      sku: str(i.sku, 40).toUpperCase(),
      selectedUnit: str(i.selectedUnit, 20),
      selectedPrice: Number.isFinite(Number(i.selectedPrice)) ? Math.max(0, Number(i.selectedPrice)) : price,
      price,
    };
  });
}

function cleanAddress(a) {
  a = a || {};
  const out = {
    fullName: str(a.fullName, 120), phone: str(a.phone, 20).replace(/[^\d+]/g, ''), email: str(a.email, 160),
    addressLine1: str(a.addressLine1, 240), addressLine2: str(a.addressLine2, 240),
    city: str(a.city, 100), state: str(a.state, 100), pincode: str(a.pincode, 10), country: str(a.country, 60) || 'India',
  };
  if (out.fullName.length < 2) throw new OrderError('Please enter the recipient\'s name.');
  if (!/^(\+?91)?[6-9]\d{9}$/.test(out.phone)) throw new OrderError('Please enter a valid 10-digit mobile number.');
  if (out.addressLine1.length < 3 || !out.city || !out.state) throw new OrderError('Please complete the delivery address.');
  if (!/^[1-9]\d{5}$/.test(out.pincode)) throw new OrderError('Please enter a valid 6-digit pincode.');
  return out;
}

/** the size an order line refers to: by code, else by label ("500 g" = "500g"), else the only size there is */
function findSize(sizes, item) {
  const norm = v => String(v || '').toLowerCase().replace(/\s+/g, '').replace(/pieces?|pcs?$/, 'pc');
  if (item.sku) { const bySku = sizes.find(z => String(z.sku).toUpperCase() === item.sku); if (bySku) return bySku; }
  const byLabel = sizes.find(z => norm(z.label) === norm(item.selectedQuantity));
  if (byLabel) return byLabel;
  return sizes.length === 1 ? sizes[0] : null;
}

/** coupon document -> rupees off a subtotal (0 when it does not apply) */
function couponAmount(c, sub) {
  if (!c || (c.isValid && !c.isValid())) return 0;
  if (c.minOrderAmount && sub < c.minOrderAmount) throw new OrderError(`Promo code ${c.code} needs an order of ₹${c.minOrderAmount} or more.`);
  let d = c.discountType === 'percentage' ? sub * c.discountValue / 100 : c.discountValue;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return Math.round(Math.min(d, sub));
}

/** delivery and COD rules when no store settings are passed in (tests, or before the admin saves any) */
function envRules() {
  return { gstRate: GST_RATE, freeShippingAbove: FREE_SHIPPING_ABOVE(), shippingFee: SHIPPING_FEE(), codEnabled: true, codFee: 0 };
}

/**
 * subtotal - coupon, + 5% GST on that, + delivery (free at or above the threshold), + COD fee for cash on delivery.
 * The checkout page does the same sum with the same rules (GET /api/orders/pricing).
 */
function priceOrder(items, coupon, rules, method) {
  const r = Object.assign(envRules(), rules || {});
  const itemsPrice = money(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const couponOff = couponAmount(coupon, itemsPrice);
  const taxable = Math.max(0, itemsPrice - couponOff);
  const taxPrice = Math.round(taxable * r.gstRate);
  const shippingPrice = itemsPrice >= r.freeShippingAbove ? 0 : r.shippingFee;
  const codFee = method === 'COD' ? Number(r.codFee) || 0 : 0;
  return { itemsPrice, couponOff, taxPrice, shippingPrice, codFee, totalPrice: taxable + taxPrice + shippingPrice + codFee };
}

/**
 * @param body    req.body
 * @param ctx     { method: 'COD' | 'Razorpay', findProducts(ids) -> [{_id, price}], findCoupon(code) -> coupon|null }
 * @returns       a clean document ready for Order.create (still needs `user`, and payment fields for paid orders)
 */
async function buildOrder(body, ctx) {
  body = body || {};
  const items = cleanItems(body.items);
  const shippingAddress = cleanAddress(body.shippingAddress);

  // catalogue check: products are found by database id or by the storefront's number (legacyId)
  const ids = [...new Set(items.map(i => String(i.product)))];
  const found = ctx.findProducts ? await ctx.findProducts(ids) : [];
  const byId = new Map();
  found.forEach(p => { byId.set(String(p._id), p); if (p.legacyId != null) byId.set(String(p.legacyId), p); });
  for (const i of items) {
    const p = byId.get(String(i.product));
    if (!p) continue;
    if (p.isActive === false) throw new OrderError(`${p.name || i.name} is not available any more. Please remove it from your cart.`, 409);
    const sizes = (p.sizes || []).filter(z => z && z.active !== false);
    if (sizes.length) {
      // products with sizes: the line must be one of them, at exactly that size's price
      const z = findSize(sizes, i);
      if (!z) throw new OrderError(`The pack size of ${p.name} has changed. Please remove it and add it again.`, 409);
      if (Math.abs(Number(z.price) - i.price) > 0.5) {
        throw new OrderError(`The price of ${p.name} (${z.label}) is now ₹${z.price}. Please refresh the page and try again.`, 409);
      }
      if (z.stock != null && i.quantity > z.stock) {
        throw new OrderError(z.stock > 0 ? `Only ${z.stock} of ${p.name} (${z.label}) left.` : `${p.name} (${z.label}) is out of stock.`, 409);
      }
      i.sku = String(z.sku || '').toUpperCase();
      i.selectedQuantity = z.label;
      i.name = p.name;
      i.product = String(p._id);
    } else if (Number(p.price) > 0 && i.price < Number(p.price) * MIN_PRICE_SHARE) {
      throw new OrderError(`The price of ${i.name} has changed. Please refresh the page and try again.`, 409);
    }
  }

  let coupon = null;
  const code = str(body.couponCode, 40).toUpperCase();
  if (code && ctx.findCoupon) {
    coupon = await ctx.findCoupon(code);
    if (!coupon) throw new OrderError(`Promo code ${code} is not valid any more.`);
  }
  const rules = ctx.getRules ? await ctx.getRules() : envRules();
  if (ctx.method === 'COD' && rules.codEnabled === false) {
    throw new OrderError('Cash on delivery is not available right now. Please choose Pay online.', 400);
  }
  const priced = priceOrder(items, coupon, rules, ctx.method);
  const claimed = Number(body.totalPrice);
  if (!Number.isFinite(claimed) || Math.abs(claimed - priced.totalPrice) > 1.5) {
    throw new OrderError('The order total does not match the prices. Please refresh the page and try again.', 409);
  }

  const est = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
  return {
    items,
    shippingAddress,
    paymentMethod: ctx.method,
    itemsPrice: priced.itemsPrice,
    taxPrice: priced.taxPrice,
    shippingPrice: priced.shippingPrice,
    codFee: priced.codFee,
    discount: Math.max(0, Math.min(priced.itemsPrice, Math.round(Number(body.discount) || 0))) || priced.couponOff,
    totalPrice: priced.totalPrice,
    couponCode: coupon ? coupon.code : undefined,
    estimatedDelivery: est && !isNaN(est) ? est : undefined,
  };
}

/** The payment method a request may ask for on POST /orders: cash on delivery only. */
function codOnly(method) {
  const m = PAY_METHODS[String(method || '').toLowerCase()];
  if (m !== 'COD') throw new OrderError('Online payments are confirmed through the payment window. Please choose Pay online, or Cash on Delivery.', 400);
  return m;
}

/** The pricing rules the checkout page shows, so its totals always match what the server charges. */
function pricingRules(rules) {
  return Object.assign(envRules(), rules || {});
}

module.exports = { buildOrder, codOnly, priceOrder, couponAmount, pricingRules, envRules, findSize, OrderError, PAY_METHODS };
