const BRAND = {
  name:    'Nansai Organics',
  tagline: 'Pure. Natural. Trusted.',
  color:   '#0f2218',
  accent:  '#c9a84c',
  light:   '#f0fdf4',
  url:     process.env.FRONTEND_URL || 'https://nansaiorganics.netlify.app',
};

function base(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background:${BRAND.color};border-radius:14px 14px 0 0;padding:32px 40px;text-align:center;">
        <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;letter-spacing:.04em;">
          🌿 ${BRAND.name}
        </p>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.12em;text-transform:uppercase;">${BRAND.tagline}</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#fff;padding:36px 40px;border-left:1px solid #e2e8d8;border-right:1px solid #e2e8d8;">
        ${content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:${BRAND.color};border-radius:0 0 14px 14px;padding:20px 40px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,.5);">
          Questions? Reply to this email or contact us at
          <a href="mailto:${process.env.EMAIL_USER}" style="color:${BRAND.accent};text-decoration:none;">${process.env.EMAIL_USER}</a>
        </p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,.3);">
          © ${new Date().getFullYear()} ${BRAND.name} · All rights reserved
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── ORDER CONFIRMATION (customer) ──────────────────────────────────────────
function orderConfirmation(order, user) {
  const addr   = order.shippingAddress || {};
  const items  = order.items || [];
  const isCOD  = (order.paymentMethod || '').toUpperCase() === 'COD';
  const date   = new Date(order.createdAt || Date.now())
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f4ec;font-size:14px;color:#1a2416;">
        ${i.name || i.product?.name || 'Product'}
        <span style="display:block;font-size:12px;color:#7a9a7a;margin-top:2px;">Qty: ${i.quantity}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f4ec;font-size:14px;font-weight:700;color:#0f2218;text-align:right;">
        ₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}
      </td>
    </tr>`).join('');

  const content = `
    <!-- Greeting -->
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2218;">Your order is confirmed! 🎉</p>
    <p style="margin:0 0 28px;font-size:15px;color:#4a6a4a;line-height:1.6;">
      Hi ${user?.name || 'there'}, thank you for choosing Nansai Organics. We've received your order and will begin processing it shortly.
    </p>

    <!-- Order ID Banner -->
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:28px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Order ID</p>
        <p style="margin:0;font-size:17px;font-weight:800;color:#0f2218;font-family:monospace;">#${order.orderNumber || order._id}</p>
      </div>
      <div>
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Date</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#0f2218;">${date}</p>
      </div>
      <div>
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Payment</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#0f2218;">${isCOD ? 'Cash on Delivery' : order.paymentMethod || 'Online'}</p>
      </div>
    </div>

    <!-- Items -->
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Items Ordered</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:14px 0 0;font-size:15px;font-weight:800;color:#0f2218;">Total</td>
          <td style="padding:14px 0 0;font-size:17px;font-weight:900;color:#2d5a3d;text-align:right;">₹${order.totalPrice?.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <hr style="border:none;border-top:1px solid #e8f0e0;margin:24px 0;">

    <!-- Delivery Address -->
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Delivery Address</p>
    <div style="background:#f8faf4;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f2218;">${addr.fullName || user?.name || ''}</p>
      <p style="margin:0;font-size:13px;color:#4a6a4a;line-height:1.7;">
        ${[addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
        ${addr.phone ? `<br>📞 ${addr.phone}` : ''}
      </p>
    </div>

    ${isCOD ? `
    <!-- COD Notice -->
    <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        💰 <strong>Cash on Delivery:</strong> Please keep ₹${order.totalPrice?.toLocaleString('en-IN')} ready at the time of delivery.
      </p>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-top:8px;">
      <a href="${BRAND.url}/pages/account.html" style="display:inline-block;background:${BRAND.color};color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:.02em;">
        Track My Order →
      </a>
    </div>

    <p style="margin:28px 0 0;font-size:13px;color:#7a9a7a;text-align:center;line-height:1.7;">
      We'll send you another email when your order is shipped.<br>
      <strong style="color:#0f2218;">Thank you for supporting organic farming! 🌾</strong>
    </p>`;

  return base(content);
}

// ── ADMIN NEW ORDER NOTIFICATION ───────────────────────────────────────────
function adminOrderNotification(order) {
  const addr   = order.shippingAddress || {};
  const items  = order.items || [];
  const date   = new Date(order.createdAt || Date.now())
    .toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e8f5e9;font-size:13px;color:#1a2416;">${i.name || 'Product'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8f5e9;font-size:13px;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8f5e9;font-size:13px;font-weight:700;text-align:right;">₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const content = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#0f2218;">🛒 New Order Received</p>
    <p style="margin:0 0 24px;font-size:14px;color:#4a6a4a;">A new order has been placed and is awaiting processing.</p>

    <!-- Stats -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Order ID</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#0f2218;font-family:monospace;">#${order.orderNumber || order._id}</p>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Total</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#2d5a3d;">₹${order.totalPrice?.toLocaleString('en-IN')}</p>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Payment</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#0f2218;">${order.paymentMethod || 'Online'}</p>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Date</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:#0f2218;">${date}</p>
      </div>
    </div>

    <!-- Items -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#0f2218;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">Product</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="background:#f0fdf4;">
          <td colspan="2" style="padding:12px 14px;font-weight:800;font-size:14px;color:#0f2218;">Total</td>
          <td style="padding:12px 14px;text-align:right;font-weight:900;font-size:15px;color:#2d5a3d;">₹${order.totalPrice?.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Address -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a8c5c;">Delivery Address</p>
    <div style="background:#f8faf4;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f2218;">${addr.fullName || ''}</p>
      <p style="margin:0;font-size:13px;color:#4a6a4a;line-height:1.7;">
        ${[addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
        ${addr.phone ? `<br>📞 ${addr.phone}` : ''}
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'https://nansaiorganics.netlify.app'}/pages/admin-panel.html" style="display:inline-block;background:#0f2218;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Open Admin Panel →
      </a>
    </div>`;

  return base(content);
}

// ── OTP EMAIL ──────────────────────────────────────────────────────────────
function otpEmail(otp, purpose = 'verify your account') {
  const content = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2218;">Your verification code</p>
    <p style="margin:0 0 28px;font-size:15px;color:#4a6a4a;">Use the code below to ${purpose}. It expires in <strong>5 minutes</strong>.</p>

    <div style="background:#f0fdf4;border:2px dashed #4a8c5c;border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:.3em;color:#0f2218;font-family:monospace;">${otp}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#7a9a7a;text-align:center;line-height:1.7;">
      Never share this code with anyone.<br>
      If you didn't request this, please ignore this email.
    </p>`;

  return base(content);
}

module.exports = { orderConfirmation, adminOrderNotification, otpEmail };
