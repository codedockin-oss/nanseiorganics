const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide coupon code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide coupon description']
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: [true, 'Please provide discount value'],
    min: [0, 'Discount value cannot be negative']
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableCategories: [{
    type: String
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

module.exports = mongoose.model('Coupon', couponSchema);
