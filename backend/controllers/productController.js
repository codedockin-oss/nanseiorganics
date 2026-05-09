const Product = require('../models/Product');
const { bustCache } = require('../middleware/cache');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, sort, page = 1, limit = 20, badge, section } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;
    if (badge)    query.badge    = badge;
    if (section)  query.section  = section;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name:        { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { tags:        { $regex: safe, $options: 'i' } },
      ];
    }

    const sortMap = {
      'price-low':  { price: 1 },
      'price-high': { price: -1 },
      'rating':     { rating: -1 },
      'newest':     { createdAt: -1 },
    };
    const sortBy = sortMap[sort] || { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // lean() returns plain JS objects — much faster, no Mongoose overhead
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-reviews -__v')   // exclude heavy fields on list view
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: 'reviews', populate: { path: 'user', select: 'name avatar' } })
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline } = req.body;
    const product = await Product.create({ name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline });
    bustCache('/api/products');
    bustCache('/api/categories');
    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline } = req.body;
    const updates = { name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline };
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    bustCache('/api/products');
    res.status(200).json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    bustCache('/api/products');
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/featured
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .select('-reviews -__v')
      .limit(8)
      .sort('-createdAt')
      .lean();
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/:id/related
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('category').lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const products = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select('-reviews -__v')
      .limit(4)
      .sort('-rating')
      .lean();

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};
