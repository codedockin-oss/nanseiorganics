const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Coupon = require('../models/Coupon');

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('[Coupons] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
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
  } catch (error) {
    console.error('[Coupons] POST /validate error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount = 0,
      usageLimit,
      maxUses,
      validFrom,
      validUntil,
      expiresAt,
      isActive = true,
      description,
      maxDiscount,
    } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'code, discountType and discountValue are required' });
    }
    const until = validUntil || expiresAt;
    if (!until) return res.status(400).json({ success: false, message: 'validUntil or expiresAt is required' });

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      description: description || `${discountValue}${discountType === 'percentage' ? '%' : ' INR'} off`,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit: usageLimit ?? maxUses ?? null,
      validFrom: validFrom || new Date(),
      validUntil: until,
      isActive,
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('[Coupons] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
