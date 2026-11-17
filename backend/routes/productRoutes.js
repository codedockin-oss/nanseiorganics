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

/**
 * PATCH /api/products/:id/stock — admin: set or adjust the stock of one pack size.
 * Body: { sku, stock }        stock = number to set, or null to stop tracking that size
 *    or { sku, delta }        add (positive) or remove (negative) packs; never goes below 0
 */
router.patch('/:id/stock', protect, authorize('admin'), async (req, res) => {
  try {
    const { bustCache } = require('../middleware/cache');
    const sku = String((req.body && req.body.sku) || '').toUpperCase().trim();
    if (!sku) return res.status(400).json({ success: false, message: 'Which size? (sku missing)' });
    const p = await Product.findOne({ _id: req.params.id, 'sizes.sku': sku });
    if (!p) return res.status(404).json({ success: false, message: 'Product or size not found' });
    const z = p.sizes.find(s => String(s.sku).toUpperCase() === sku);
    if (req.body.delta !== undefined) {
      const d = Math.round(Number(req.body.delta));
      if (!Number.isFinite(d)) return res.status(400).json({ success: false, message: 'Enter a whole number' });
      z.stock = Math.max(0, (z.stock || 0) + d);
    } else if (req.body.stock === null || req.body.stock === '') {
      z.stock = null;
    } else {
      const n = Math.round(Number(req.body.stock));
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ success: false, message: 'Stock must be 0 or more' });
      z.stock = n;
    }
    // the headline stock follows the tracked sizes, as when the product is saved
    const tracked = p.sizes.filter(s => s.active !== false && s.stock != null);
    if (tracked.length) p.stock = tracked.reduce((n, s) => n + s.stock, 0);
    await p.save();
    bustCache('/api/products');
    res.json({ success: true, data: { sku: z.sku, label: z.label, stock: z.stock, productStock: p.stock } });
  } catch (err) {
    console.error('[Products] stock error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
