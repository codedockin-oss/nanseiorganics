const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Coupon = require('../models/Coupon');

const admin = [protect, authorize('admin')];
const txt = (v, max) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim().slice(0, max);
const num = v => (v === '' || v == null ? undefined : Number(v));

/**
 * Turn an admin form into coupon fields. Accepts the schema's own names
 * (validFrom / validUntil / usageLimit) and the older ones the panel used to send
 * (expiresAt / maxUses), so nothing that already works breaks.
 */
function couponFields(body, isNew) {
  const out = {};
  if (body.code !== undefined) {
    out.code = txt(body.code, 30).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!out.code) throw Object.assign(new Error('Please give the coupon a code, like NANSAI10'), { status: 400 });
  }
  if (body.description !== undefined || isNew) out.description = txt(body.description, 200) || (out.code ? 'Coupon ' + out.code : 'Coupon');
  if (body.discountType !== undefined) {
    if (!['percentage', 'fixed'].includes(body.discountType)) throw Object.assign(new Error('Discount type must be percentage or fixed'), { status: 400 });
    out.discountType = body.discountType;
  }
  if (body.discountValue !== undefined) {
    out.discountValue = Number(body.discountValue);
    if (!(out.discountValue > 0)) throw Object.assign(new Error('Enter a discount greater than 0'), { status: 400 });
    if ((body.discountType || 'percentage') === 'percentage' && out.discountValue > 90) throw Object.assign(new Error('A percentage discount cannot be more than 90%'), { status: 400 });
  }
  if (body.minOrderAmount !== undefined) out.minOrderAmount = Math.max(0, num(body.minOrderAmount) || 0);
  if (body.maxDiscount !== undefined) out.maxDiscount = num(body.maxDiscount) > 0 ? num(body.maxDiscount) : null;
  const from = body.validFrom, until = body.validUntil !== undefined ? body.validUntil : body.expiresAt;
  if (from !== undefined || isNew) out.validFrom = from ? new Date(from) : new Date();
  if (until !== undefined || isNew) out.validUntil = until ? new Date(until) : new Date(Date.now() + 365 * 864e5);
  if ((out.validFrom && isNaN(out.validFrom)) || (out.validUntil && isNaN(out.validUntil))) throw Object.assign(new Error('Please enter valid dates'), { status: 400 });
  if (out.validFrom && out.validUntil && out.validUntil < out.validFrom) throw Object.assign(new Error('The end date is before the start date'), { status: 400 });
  const limit = body.usageLimit !== undefined ? body.usageLimit : body.maxUses;
  if (limit !== undefined) out.usageLimit = num(limit) > 0 ? Math.round(num(limit)) : null;
  if (body.isActive !== undefined) out.isActive = body.isActive === true || body.isActive === 'true';
  return out;
}

const fail = (res, err, where) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  if (err.code === 11000) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
  console.error('[Coupons] ' + where + ' error:', err.message);
  res.status(500).json({ success: false, message: 'Server error' });
};

router.get('/', ...admin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt').lean();
    res.json({ success: true, data: coupons });
  } catch (err) { fail(res, err, 'GET /'); }
});

router.post('/validate', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon || !coupon.isValid()) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
    }
    res.json({ success: true, data: coupon });
  } catch (err) { fail(res, err, 'POST /validate'); }
});

router.post('/', ...admin, async (req, res) => {
  try {
    const fields = couponFields(req.body || {}, true);
    if (!fields.code || !fields.discountType || fields.discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'Code, discount type and discount value are required' });
    }
    const coupon = await Coupon.create(fields);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { fail(res, err, 'POST /'); }
});

router.put('/:id', ...admin, async (req, res) => {
  try {
    const fields = couponFields(req.body || {}, false);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) { fail(res, err, 'PUT /:id'); }
});

router.delete('/:id', ...admin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) { fail(res, err, 'DELETE /:id'); }
});

module.exports = router;
module.exports.couponFields = couponFields;
