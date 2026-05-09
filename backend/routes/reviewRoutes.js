const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Review = require('../models/Review');

router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId }).populate('user', 'name');
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('[Reviews] GET /product/:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { product, rating, title, comment } = req.body;
    if (!product || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'product, rating and comment are required' });
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const existing = await Review.findOne({ user: req.user.id, product });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({ product, rating: ratingNum, title, comment, user: req.user.id });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('[Reviews] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
