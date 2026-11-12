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

// @route   GET /api/products/:id   (database id, or the storefront's number 1, 2, 3 ...)
exports.getProduct = async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const where = /^\d{1,6}$/.test(id) ? { legacyId: Number(id) } : (/^[a-f0-9]{24}$/i.test(id) ? { _id: id } : null);
    if (!where) return res.status(404).json({ success: false, message: 'Product not found' });
    where.isActive = { $ne: false };                     // products the admin switched off are not shown
    const product = await Product.findOne(where)
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


// ---- pack sizes: each has its own code, price, MRP and stock ----
const txt = (v, max) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim().slice(0, max);
function cleanSizes(raw, legacyId) {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw Object.assign(new Error('Sizes must be a list'), { status: 400 });
  const seen = new Set();
  return raw.slice(0, 12).map((z, n) => {
    const label = txt(z && z.label, 30);
    const price = Math.round(Number(z && z.price));
    const mrp = z && z.mrp !== '' && z.mrp != null ? Math.round(Number(z.mrp)) : undefined;
    const stock = z && z.stock !== '' && z.stock != null ? Math.max(0, Math.round(Number(z.stock))) : null;
    if (!label) throw Object.assign(new Error(`Size ${n + 1}: please give it a name, like "500 g"`), { status: 400 });
    if (!(price >= 1)) throw Object.assign(new Error(`${label}: please enter a selling price`), { status: 400 });
    if (mrp !== undefined && mrp < price) throw Object.assign(new Error(`${label}: the MRP cannot be lower than the selling price`), { status: 400 });
    let sku = txt(z && z.sku, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!sku) sku = ('P' + (legacyId || '') + '-' + label.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 40);
    if (seen.has(sku)) throw Object.assign(new Error(`Two sizes share the code ${sku}`), { status: 400 });
    seen.add(sku);
    const unit = ['g', 'ml', 'piece'].includes(z && z.unit) ? z.unit : (/ml|\bl\b/i.test(label) ? 'ml' : /pc|piece/i.test(label) ? 'piece' : 'g');
    return { sku, label, amount: Number(z && z.amount) || undefined, unit, price, mrp, stock: Number.isFinite(stock) ? stock : null, active: !(z && z.active === false) };
  });
}
/** headline price / MRP / stock follow the sizes, so lists and old pages stay right */
function summarise(update) {
  const sizes = (update.sizes || []).filter(z => z.active);
  if (!sizes.length) return update;
  const first = sizes[0];
  update.price = first.price;
  update.oldPrice = first.mrp || first.price;
  const tracked = sizes.filter(z => z.stock != null);
  update.stock = tracked.length ? tracked.reduce((n, z) => n + z.stock, 0) : (update.stock != null ? update.stock : 0);
  return update;
}
const EXTRA = ['hsn', 'gstRate', 'countryOfOrigin', 'packedBy', 'lowStockAt', 'shelfLife', 'howToUse', 'metaTitle', 'metaDescription'];

// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline } = req.body;
    let sizes;
    try { sizes = cleanSizes(req.body.sizes, req.body.legacyId); } catch (e) { return res.status(e.status || 400).json({ success: false, message: e.message }); }
    const extra = {}; EXTRA.forEach(k => { if (req.body[k] !== undefined) extra[k] = req.body[k]; });
    if (req.body.legacyId != null && req.body.legacyId !== '') extra.legacyId = Number(req.body.legacyId);
    const doc = summarise({ name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit: unit || 'pack', weight: weight || 1, tagline, sizes, ...extra });
    Object.keys(doc).forEach(k => doc[k] === undefined && delete doc[k]);
    const product = await Product.create({ ...doc, name, tagline });
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
    try { updates.sizes = cleanSizes(req.body.sizes, req.body.legacyId); } catch (e) { return res.status(e.status || 400).json({ success: false, message: e.message }); }
    EXTRA.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (oldPrice === '' || oldPrice === null) updates.oldPrice = undefined;   // the old price can be cleared
    if (updates.sizes) summarise(updates);
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
