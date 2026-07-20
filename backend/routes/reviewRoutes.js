const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, admin } = require('../middleware/auth');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

async function refreshProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const avg = stats[0]?.avgRating || 0;
  const count = stats[0]?.count || 0;
  const reviews = await Review.find({ product: productId, isApproved: true }).select('_id').lean();
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(avg * 10) / 10,
    numReviews: count,
    reviews: reviews.map(r => r._id)
  });
  return { rating: Math.round(avg * 10) / 10, numReviews: count };
}

// GET /api/reviews/product/:productId — public
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, isApproved: true })
      .populate('user', 'name firstName lastName')
      .sort('-createdAt');
    const product = await Product.findById(req.params.productId).select('rating numReviews').lean();
    res.json({ success: true, data: reviews, rating: product?.rating || 0, numReviews: product?.numReviews || 0 });
  } catch (error) {
    console.error('[Reviews] GET /product/:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reviews/my-reviews — get current user's reviews
router.get('/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id }).select('product orderId rating').lean();
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/reviews — create review (must be delivered order owner)
router.post('/', protect, async (req, res) => {
  try {
    const { product, orderId, rating, title, comment } = req.body;
    if (!product || !orderId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'product, orderId, rating and comment are required' });
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (comment.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Comment is too short' });
    }

    // Verify order belongs to user, is Delivered, and contains the product
    const order = await Order.findOne({ _id: orderId, user: req.user.id }).lean();
    if (!order) {
      return res.status(403).json({ success: false, message: 'Order not found or does not belong to you' });
    }
    if (order.orderStatus !== 'Delivered') {
      return res.status(403).json({ success: false, message: 'Reviews can be submitted after your order is delivered.' });
    }
    const productInOrder = order.items.some(item => String(item.product) === String(product));
    if (!productInOrder) {
      return res.status(403).json({ success: false, message: 'Product not found in this order' });
    }

    const existing = await Review.findOne({ user: req.user.id, product });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const sanitizedTitle = title ? title.trim().slice(0, 100) : '';
    const sanitizedComment = comment.trim().slice(0, 1000);

    const review = await Review.create({
      product,
      orderId,
      rating: ratingNum,
      title: sanitizedTitle,
      comment: sanitizedComment,
      user: req.user.id,
      isVerifiedPurchase: true
    });
    const summary = await refreshProductRating(product);
    res.status(201).json({ success: true, data: review, summary });
  } catch (error) {
    console.error('[Reviews] POST / error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/reviews/:id — edit own review
router.patch('/:id', protect, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this review' });
    }
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      review.rating = ratingNum;
    }
    if (title !== undefined) review.title = title.trim().slice(0, 100);
    if (comment !== undefined) {
      if (comment.trim().length < 3) return res.status(400).json({ success: false, message: 'Comment is too short' });
      review.comment = comment.trim().slice(0, 1000);
    }
    await review.save();
    const summary = await refreshProductRating(review.product);
    res.json({ success: true, data: review, summary });
  } catch (error) {
    console.error('[Reviews] PATCH /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep PUT for backward compat — same logic as PATCH but also allows admin
router.put('/:id', protect, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this review' });
    }
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      review.rating = ratingNum;
    }
    if (title !== undefined) review.title = title.trim().slice(0, 100);
    if (comment !== undefined) review.comment = comment.trim().slice(0, 1000);
    await review.save();
    const summary = await refreshProductRating(review.product);
    res.json({ success: true, data: review, summary });
  } catch (error) {
    console.error('[Reviews] PUT /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — delete own review (or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }
    const productId = review.product;
    await review.deleteOne();
    const summary = await refreshProductRating(productId);
    res.json({ success: true, message: 'Review deleted', summary });
  } catch (error) {
    console.error('[Reviews] DELETE /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reviews/admin/all — admin: list all reviews
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort('-createdAt')
      .lean();
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
