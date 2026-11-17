'use strict';
/**
 * Turns one confirmed Razorpay payment into exactly one order.
 *
 * Two things can report the same payment: the customer's browser (POST /orders/razorpay/verify) and
 * Razorpay's webhook (payment.captured / order.paid). Razorpay delivers webhooks at least once, in any
 * order, and the browser may never come back at all. So:
 *   1. an order already saved for this payment id is returned as is;
 *   2. otherwise the pending checkout is "claimed" atomically — only one caller can win the claim;
 *   3. the winner re-prices the stored cart, checks it equals what Razorpay collected, and saves the order.
 * Everything it needs is passed in, so it is tested without MongoDB or Razorpay.
 */

class PaidOrderError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * deps: {
 *   Order, PendingPayment,                      mongoose-like models
 *   buildOrder(payload) -> doc                  prices the cart (throws OrderError on a bad cart)
 *   fetchPaidAmount(rzpOrderId) -> paise|null   what Razorpay actually collected (null if it can't be checked)
 *   takeStock(items), afterCreate(order, userId)
 * }
 * args: { rzpOrderId, paymentId, fallback?: { payload, user }, waitMs? }
 * returns { order, created } | { pending: true } | { unmatched: true }
 */
async function finalizePaidOrder(deps, { rzpOrderId, paymentId, fallback = null, waitMs = 0 }) {
  if (!rzpOrderId || !paymentId) throw new PaidOrderError(400, 'Missing payment details');
  const { Order, PendingPayment } = deps;

  const existing = await Order.findOne({ 'paymentInfo.id': paymentId });
  if (existing) return { order: existing, created: false };

  let source = await PendingPayment.findOneAndUpdate(
    { rzpOrderId, status: 'pending' },
    { $set: { status: 'claimed', paymentId } },
    { new: true },
  );

  if (!source) {
    const rec = await PendingPayment.findOne({ rzpOrderId });
    if (rec) {
      // someone else (browser or webhook) is saving it right now, or already has
      for (let waited = 0; waited <= waitMs; waited += 500) {
        const done = await Order.findOne({ 'paymentInfo.id': paymentId });
        if (done) return { order: done, created: false };
        if (waited < waitMs) await sleep(500);
      }
      if (rec.status === 'mismatch') throw new PaidOrderError(409, 'The amount paid does not match the order. We will contact you, or write to us with payment ' + paymentId + '.');
      return { pending: true };
    }
    // checkouts started before this change have no stored cart: use the browser's, as before
    if (!fallback || !fallback.payload || !fallback.user) return { unmatched: true };
    source = { payload: fallback.payload, user: fallback.user, amount: null, legacy: true };
  }

  const release = async status => { if (!source.legacy) await PendingPayment.updateOne({ rzpOrderId }, { $set: { status } }); };

  let doc;
  try { doc = await deps.buildOrder(source.payload); }
  catch (e) { await release('pending'); throw e; }

  const expected = Math.round(doc.totalPrice * 100);
  let paid = null;
  try { paid = await deps.fetchPaidAmount(rzpOrderId); } catch (e) { paid = null; }
  if (paid == null && source.amount != null) paid = source.amount;
  if (paid != null && Number(paid) !== expected) {
    await release('mismatch');
    console.error('[Razorpay] AMOUNT MISMATCH payment', paymentId, 'paid', paid, 'order', expected);
    throw new PaidOrderError(409, 'Your payment (' + paymentId + ') does not match the order total. Please contact us with this payment number and we will sort it out right away.');
  }

  let order;
  try {
    await deps.takeStock(doc.items);
    order = await deps.Order.create({
      ...doc,
      user: source.user,
      isPaid: true,
      paidAt: new Date(),
      paymentInfo: { id: paymentId, status: 'completed', paidAt: new Date() },
    });
  } catch (e) {
    await release('pending');
    throw e;
  }
  if (!source.legacy) await PendingPayment.updateOne({ rzpOrderId }, { $set: { status: 'done', order: order._id } });
  try { await deps.afterCreate(order, source.user); } catch (e) { console.warn('[Orders] after-payment steps failed:', e.message); }
  return { order, created: true };
}

module.exports = { finalizePaidOrder, PaidOrderError };
