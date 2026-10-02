'use strict';
/** Short "your order has shipped / was delivered" emails, in the store's colours. */
const sendEmail = require('./sendEmail');

const FRONTEND = () => (process.env.FRONTEND_URL || 'https://nansaiorganics.netlify.app').replace(/\/$/, '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function template(order, kind) {
  const num = esc(order.orderNumber || order._id);
  const shipped = kind === 'shipped';
  const title = shipped ? 'Your order is on its way' : 'Your order has been delivered';
  const lead = shipped
    ? 'Good news — your order has been picked up by the courier.'
    : 'Your order has arrived. We hope you love it!';
  const track = order.trackingUrl
    ? `<p style="margin:22px 0 0;"><a href="${esc(order.trackingUrl)}" style="background:#0f2218;color:#e8c97a;text-decoration:none;padding:13px 26px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;display:inline-block;">Track your parcel</a></p>` : '';
  const awb = order.trackingNumber
    ? `<p style="margin:14px 0 0;font-size:13px;color:#5d6b60;">${esc(order.courierService || 'Courier')} &middot; Tracking number <strong style="color:#0f2218;">${esc(order.trackingNumber)}</strong></p>` : '';
  const orders = `${FRONTEND()}/pages/checkout.html?page=orders`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f6f0;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;">
<tr><td style="background:#0f2218;padding:26px 34px;text-align:center;"><span style="font-family:Georgia,serif;font-size:22px;color:#fff;letter-spacing:.04em;">Nansai Organics</span></td></tr>
<tr><td style="padding:34px;">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#b8922a;font-weight:700;">Order #${num}</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;color:#0f2218;font-weight:600;">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.7;color:#3d5a45;">${lead}</p>${awb}${track}
<p style="margin:26px 0 0;font-size:13px;"><a href="${orders}" style="color:#2d5a3d;">View all my orders</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

/** notify(order, 'shipped' | 'delivered') — never throws. */
async function notifyCustomer(order, kind, User) {
  try {
    const user = User ? await User.findById(order.user).select('name email').lean() : null;
    const email = (user && user.email) || (order.shippingAddress && order.shippingAddress.email);
    if (!email) return;
    await sendEmail({
      email,
      subject: (kind === 'shipped' ? 'Your order is on its way' : 'Your order was delivered') + ' — #' + (order.orderNumber || order._id),
      html: template(order, kind),
    });
  } catch (err) {
    console.warn('[Shipping] customer email failed:', err.message);
  }
}

module.exports = { notifyCustomer, template };
