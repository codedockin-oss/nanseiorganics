const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative']
  },
  oldPrice: {
    type: Number,
    min: [0, 'Old price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please provide product category'],
    enum: ['rice', 'flowers', 'beverages', 'flour', 'other']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: String
  }],
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Please provide unit'],
    enum: ['kg', 'g', 'l', 'ml', 'piece', 'pack']
  },
  weight: {
    type: Number,
    required: [true, 'Please provide weight/quantity']
  },
  badge: {
    type: String,
    enum: ['new', 'hot', 'sale', 'bestseller'],
    default: 'sale'
  },
  section: {
    type: String,
    enum: ['new', 'bestseller', 'category'],
    default: 'category'
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  certifications: [{
    type: String,
    enum: ['USDA Organic', 'Kosher', 'Halal', 'FSSAI', 'Non-GMO', 'Fair Trade', 'ISO 22000']
  }],
  ingredients: [String],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  benefits: [String],
  howToUse: String,
  shelfLife: String,
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  metaTitle: String,
  metaDescription: String,
  tagline: {
    type: String,
    maxlength: [200, 'Tagline cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Indexes for high-load query patterns
productSchema.index({ isActive: 1, createdAt: -1 });          // default list
productSchema.index({ isActive: 1, category: 1, createdAt: -1 }); // category filter
productSchema.index({ isActive: 1, badge: 1 });               // badge filter
productSchema.index({ isActive: 1, section: 1 });             // section filter
productSchema.index({ isActive: 1, isFeatured: 1 });          // featured
productSchema.index({ isActive: 1, rating: -1 });             // sort by rating
productSchema.index({ isActive: 1, price: 1 });               // sort by price
productSchema.index({ name: 'text', description: 'text', tags: 'text' }); // full-text search

// Create slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Calculate discount percentage
productSchema.virtual('discount').get(function() {
  if (this.oldPrice && this.oldPrice > this.price) {
    return Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100);
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
