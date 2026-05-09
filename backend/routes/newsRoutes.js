const express = require('express');
const router  = express.Router();
const News    = require('../models/News');
const { protect, authorize } = require('../middleware/auth');

// GET all news (public)
router.get('/', async (req, res) => {
  try {
    const news = await News.find({ isActive: true }).sort('-createdAt').lean();
    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single news (public)
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id).lean();
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create news (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const news = await News.create(req.body);
    res.status(201).json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update news (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE news (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id).lean();
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
