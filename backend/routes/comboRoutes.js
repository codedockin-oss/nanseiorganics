const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Combo = require('../models/Combo');

router.get('/', async (req, res) => {
  try {
    const combos = await Combo.find().populate('products');
    res.json({ success: true, data: combos });
  } catch (error) {
    console.error('[Combos] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, products, price, oldPrice, image, isActive } = req.body;
    if (!name || !products || !price) {
      return res.status(400).json({ success: false, message: 'name, products and price are required' });
    }
    const combo = await Combo.create({ name, description, products, price, oldPrice, image, isActive });
    res.status(201).json({ success: true, data: combo });
  } catch (error) {
    console.error('[Combos] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
