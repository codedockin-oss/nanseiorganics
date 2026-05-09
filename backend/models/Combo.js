const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide combo name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide combo description']
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  image: {
    url: {
      type: String,
      required: true
    },
    public_id: String
  },
  price: {
    type: Number,
    required: [true, 'Please provide combo price'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    required: true
  },
  badge: {
    type: String,
    enum: ['Bestseller', 'Hot Deal', 'Wellness', 'New'],
    default: 'New'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate discount percentage
comboSchema.virtual('discount').get(function() {
  if (this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

comboSchema.set('toJSON', { virtuals: true });
comboSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Combo', comboSchema);
