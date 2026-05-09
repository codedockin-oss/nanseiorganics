const express = require('express');
const router  = express.Router();
const Blog    = require('../models/Blog');
const { protect, authorize } = require('../middleware/auth');

// GET all blogs (public)
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({ isActive: true }).sort('-createdAt').lean();
    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single blog (public)
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create blog (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update blog (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE blog (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
