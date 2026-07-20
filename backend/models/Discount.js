const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide discount name'],
    trim: true,
    maxlength: [120, 'Discount name cannot exceed 120 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  value: {
    type: Number,
    required: [true, 'Please provide discount value'],
    min: [0, 'Discount value cannot be negative']
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
discountSchema.index({ applicableProducts: 1 });

discountSchema.methods.isCurrentlyActive = function(now = new Date()) {
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

module.exports = mongoose.model('Discount', discountSchema);
