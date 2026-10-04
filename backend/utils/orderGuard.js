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

/** coupon document -> rupees off a subtotal (0 when it does not apply) */
function couponAmount(c, sub) {
  if (!c || (c.isValid && !c.isValid())) return 0;
  if (c.minOrderAmount && sub < c.minOrderAmount) throw new OrderError(`Promo code ${c.code} needs an order of ₹${c.minOrderAmount} or more.`);
  let d = c.discountType === 'percentage' ? sub * c.discountValue / 100 : c.discountValue;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return Math.round(Math.min(d, sub));
}

function priceOrder(items, coupon) {
  const itemsPrice = money(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const couponOff = couponAmount(coupon, itemsPrice);
  const taxable = Math.max(0, itemsPrice - couponOff);
  const taxPrice = Math.round(taxable * GST_RATE);
  const shippingPrice = itemsPrice >= FREE_SHIPPING_ABOVE() ? 0 : SHIPPING_FEE();
  return { itemsPrice, couponOff, taxPrice, shippingPrice, totalPrice: taxable + taxPrice + shippingPrice };
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

  // catalogue price check (only for products that really exist in the database)
  const ids = [...new Set(items.map(i => String(i.product)))];
  const found = ctx.findProducts ? await ctx.findProducts(ids) : [];
  const byId = new Map(found.map(p => [String(p._id), p]));
  for (const i of items) {
    const p = byId.get(String(i.product));
    if (p && Number(p.price) > 0 && i.price < Number(p.price) * MIN_PRICE_SHARE) {
      throw new OrderError(`The price of ${i.name} has changed. Please refresh the page and try again.`, 409);
    }
  }

  let coupon = null;
  const code = str(body.couponCode, 40).toUpperCase();
  if (code && ctx.findCoupon) {
    coupon = await ctx.findCoupon(code);
    if (!coupon) throw new OrderError(`Promo code ${code} is not valid any more.`);
  }
  const priced = priceOrder(items, coupon);
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

module.exports = { buildOrder, codOnly, priceOrder, couponAmount, OrderError, PAY_METHODS };
