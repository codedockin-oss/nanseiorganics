const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1'],
    default: 1
  },
  selectedQuantity: {
    type: String,
    required: true,
    trim: true,
    default: '1'
  },
  selectedUnit: {
    type: String,
    trim: true
  },
  selectedPrice: {
    type: Number,
    required: true,
    min: [0, 'Selected price cannot be negative'],
    default: 0
  },
  price: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalPrice: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.items.forEach(item => {
    if (!item.selectedQuantity) item.selectedQuantity = String(item.quantity || 1);
    if (item.selectedPrice === undefined || item.selectedPrice === null) item.selectedPrice = item.price || 0;
  });
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => sum + ((item.selectedPrice ?? item.price) * item.quantity), 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
