const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Discount = require('../models/Discount');

function normalizeDiscountPayload(body) {
  const payload = {
    name: body.name,
    description: body.description,
    type: body.type || body.discountType,
    value: body.value ?? body.discountValue,
    applicableProducts: body.applicableProducts || [],
    startDate: body.startDate || body.validFrom,
    endDate: body.endDate || body.validUntil,
    isActive: body.isActive,
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  return payload;
}

router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const productId = req.query.productId;
    const query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    if (productId) {
      query.$or = [
        { applicableProducts: { $size: 0 } },
        { applicableProducts: productId },
      ];
    }
    const discounts = await Discount.find(query).sort('-updatedAt').lean();
    res.json({ success: true, data: discounts });
  } catch (error) {
    console.error('[Discounts] GET /active error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', protect, authorize('admin'), async (_req, res) => {
  try {
    const discounts = await Discount.find().populate('applicableProducts', 'name price images').sort('-createdAt');
    res.json({ success: true, data: discounts });
  } catch (error) {
    console.error('[Discounts] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const payload = normalizeDiscountPayload(req.body);
    const discount = await Discount.create(payload);
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    console.error('[Discounts] POST / error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const payload = normalizeDiscountPayload(req.body);
    const discount = await Discount.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });
    res.json({ success: true, data: discount });
  } catch (error) {
    console.error('[Discounts] PUT /:id error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

router.patch('/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });
    discount.isActive = req.body.isActive === undefined ? !discount.isActive : Boolean(req.body.isActive);
    await discount.save();
    res.json({ success: true, data: discount });
  } catch (error) {
    console.error('[Discounts] PATCH /:id/toggle error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });
    res.json({ success: true, message: 'Discount deleted' });
  } catch (error) {
    console.error('[Discounts] DELETE /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
