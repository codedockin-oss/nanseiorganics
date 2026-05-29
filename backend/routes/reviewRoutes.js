const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Review  = require('../models/Review');
const Product = require('../models/Product');
const Order   = require('../models/Order');

// Recalculate and save product rating + numReviews
async function syncProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(String(productId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg   = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const count = stats[0]?.count || 0;
  await Product.findByIdAndUpdate(productId, { rating: avg, numReviews: count });
}

// GET /api/reviews/product/:productId — public
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, isApproved: true })
      .populate('user', 'name')
      .sort('-createdAt')
      .lean();
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('[Reviews] GET /product/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/reviews — authenticated
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
    if (comment.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Review must be at least 5 characters' });
    }

    // Duplicate check
    const existing = await Review.findOne({ user: req.user.id, product });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    // Check verified purchase
    const purchased = await Order.findOne({
      user: req.user.id,
      'items.product': product,
      orderStatus: { $in: ['Delivered', 'Shipped', 'Packed', 'Processing'] },
    }).lean();

    const review = await Review.create({
      product,
      rating: ratingNum,
      title:  title?.trim().slice(0, 100),
      comment: comment.trim().slice(0, 1000),
      user:   req.user.id,
      isVerifiedPurchase: !!purchased,
    });

    // Update product rating + numReviews
    await syncProductRating(product);

    const populated = await review.populate('user', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[Reviews] POST / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    await syncProductRating(review.product);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('[Reviews] DELETE /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reviews — admin: all reviews
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find().populate('user', 'name email').populate('product', 'name').sort('-createdAt').skip(skip).limit(+limit).lean(),
      Review.countDocuments(),
    ]);
    res.json({ success: true, data: reviews, total });
  } catch (err) {
    console.error('[Reviews] GET / error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
