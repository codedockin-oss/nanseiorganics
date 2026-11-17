'use strict';
/**
 * Sends one email. Uses Resend when RESEND_API_KEY is set, otherwise the SMTP settings (EMAIL_HOST …).
 *
 *   RESEND_API_KEY   re_…  (Resend dashboard → API keys)
 *   EMAIL_FROM       "Nansei Organics <orders@nanseiorg.in>" — the domain must be verified in Resend → Domains.
 *                    Without a verified domain Resend only delivers from onboarding@resend.dev to your own address.
 *   EMAIL_REPLY_TO   optional, where customer replies go (e.g. your Gmail)
 *
 * options: { email, subject, html, text?, replyTo?, idempotencyKey?, tags? }
 * Returns { id } on success, { skipped } when email is not set up. Throws on a delivery error so callers can log it.
 */
const RESEND_URL = 'https://api.resend.com/emails';

let fetchImpl = (...a) => fetch(...a);
function _setFetch(fn) { fetchImpl = fn; }

const fromAddress = () => process.env.EMAIL_FROM || 'Nansei Organics <onboarding@resend.dev>';
const plain = html => String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h\d|tr|div)>/gi, '\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

async function viaResend(o) {
  const body = {
    from: fromAddress(),
    to: Array.isArray(o.email) ? o.email : [o.email],
    subject: o.subject,
    html: o.html,
    text: o.text || plain(o.html),
  };
  const replyTo = o.replyTo || process.env.EMAIL_REPLY_TO;
  if (replyTo) body.reply_to = replyTo;
  if (Array.isArray(o.tags) && o.tags.length) body.tags = o.tags;
  const headers = { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' };
  if (o.idempotencyKey) headers['Idempotency-Key'] = String(o.idempotencyKey).slice(0, 256);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res, data;
    try {
      res = await fetchImpl(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
      data = await res.json().catch(() => ({}));
    } finally { clearTimeout(timer); }
    if (res.ok) return { id: data.id };
    // 429 = over the per-second limit, 5xx = their side: wait and try again (same idempotency key, so never sent twice)
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
    const err = new Error('Resend: ' + (data.message || data.name || 'HTTP ' + res.status));
    err.status = res.status;
    throw err;
  }
}

async function viaSmtp(o) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  const info = await transporter.sendMail({
    from: fromAddress(), to: o.email, subject: o.subject, html: o.html, text: o.text || plain(o.html),
    replyTo: o.replyTo || process.env.EMAIL_REPLY_TO || undefined,
  });
  return { id: info && info.messageId };
}

const isConfigured = () => !!process.env.RESEND_API_KEY || !!(process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-gmail'));

async function sendEmail(options) {
  if (!options || !options.email) return { skipped: 'no recipient' };
  if (process.env.RESEND_API_KEY) {
    const out = await viaResend(options);
    console.log('[Email] sent via Resend to', options.email, out.id || '');
    return out;
  }
  if (!isConfigured()) {
    console.warn('[Email] not configured (set RESEND_API_KEY) — skipped:', options.subject);
    return { skipped: 'not configured' };
  }
  const out = await viaSmtp(options);
  console.log('[Email] sent via SMTP to', options.email);
  return out;
}

module.exports = sendEmail;
module.exports.isConfigured = isConfigured;
module.exports.plain = plain;
module.exports._setFetch = _setFetch;
