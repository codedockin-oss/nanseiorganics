'use strict';
/** Short shipping-update emails (shipped / out for delivery / delivered), in the store's colours. */
const sendEmail = require('./sendEmail');

const SITE = () => (process.env.FRONTEND_URL || 'https://www.nanseiorg.in').replace(/\/$/, '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const trackPage = order => SITE() + '/track-order.html?order=' + encodeURIComponent(order.orderNumber || order._id);

const COPY = {
  shipped: {
    subject: 'Your order is on its way',
    title: 'Your order is on its way',
    lead: 'Your parcel has left our farm and is with the courier.',
  },
  out_for_delivery: {
    subject: 'Out for delivery today',
    title: 'Out for delivery today',
    lead: 'The courier is bringing your parcel today. Please keep your phone close in case they call.',
  },
  delivered: {
    subject: 'Your order was delivered',
    title: 'Delivered',
    lead: 'Your order has arrived. If anything is damaged or not right, reply to this email within 7 days with a photo and we will sort it out.',
  },
};

function template(order, kind) {
  const c = COPY[kind] || COPY.shipped;
  const num = esc(order.orderNumber || order._id);
  const eta = kind !== 'delivered' && order.estimatedDelivery
    ? `<p style="margin:14px 0 0;font-size:14px;color:#3d5a45;">Expected by <strong style="color:#0f2218;">${esc(new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }))}</strong></p>` : '';
  const awb = order.trackingNumber
    ? `<p style="margin:14px 0 0;font-size:13px;color:#5d6b60;">${esc(order.courierService || 'Courier')} &middot; AWB <strong style="color:#0f2218;">${esc(order.trackingNumber)}</strong></p>` : '';
  const button = kind === 'delivered'
    ? `<a href="${esc(SITE() + '/account.html')}" style="background:#0f2218;color:#e8c97a;text-decoration:none;padding:13px 26px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;display:inline-block;">View my orders</a>`
    : `<a href="${esc(trackPage(order))}" style="background:#0f2218;color:#e8c97a;text-decoration:none;padding:13px 26px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;display:inline-block;">Track my order</a>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f7f3ec;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-top:3px solid #c9a84c;">
<tr><td style="background:#0f2218;padding:24px 34px;text-align:center;"><span style="font-family:Georgia,serif;font-size:22px;color:#fff;letter-spacing:.04em;">Nansei Organics</span></td></tr>
<tr><td style="padding:34px;">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#b8922a;font-weight:700;">Order ${num}</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;color:#0f2218;font-weight:600;">${c.title}</h1>
<p style="margin:0;font-size:15px;line-height:1.7;color:#3d5a45;">${c.lead}</p>${eta}${awb}
<p style="margin:24px 0 0;">${button}</p>
</td></tr>
<tr><td style="padding:18px 34px;background:#fdfaf5;font-size:12px;color:#6f8a75;line-height:1.6;">Questions? Just reply to this email. Nansei Organics, Achankulam, Tamil Nadu.</td></tr>
</table></td></tr></table></body></html>`;
}

/** notify(order, 'shipped' | 'out_for_delivery' | 'delivered') — never throws. */
async function notifyCustomer(order, kind, User) {
  try {
    const user = User ? await User.findById(order.user).select('name email').lean() : null;
    const email = (user && user.email) || (order.shippingAddress && order.shippingAddress.email);
    if (!email) return;
    const c = COPY[kind] || COPY.shipped;
    await sendEmail({
      email,
      subject: c.subject + ' — order ' + (order.orderNumber || order._id),
      html: template(order, kind),
      idempotencyKey: 'ship-' + kind + '/' + String(order._id),     // a repeated courier scan never sends it twice
      tags: [{ name: 'type', value: 'shipping_' + kind }],
    });
  } catch (err) {
    console.warn('[Shipping] customer email failed:', err.message);
  }
}

module.exports = { notifyCustomer, template, trackPage };
