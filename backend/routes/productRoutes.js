const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const Product = require('../models/Product');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Admin: get ALL products (including inactive)
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { search, category, page = 1, limit = 100 } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);
    res.json({ success: true, products, total });
  } catch (error) {
    console.error('[Products] GET /admin/all error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/',    cache(30),  getProducts);   // cache 30s
router.get('/:id', cache(60),  getProduct);    // cache 60s
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
