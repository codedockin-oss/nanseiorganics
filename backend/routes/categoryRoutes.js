const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Category = require('../models/Category');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Categories] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, slug, image, description, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const category = await Category.create({ name, slug, image, description, isActive });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('[Categories] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
