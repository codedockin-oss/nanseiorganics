const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed, // accepts ObjectId OR static numeric id
    ref: 'Product',
  },
  name: { type: String, required: true },
  image: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'Razorpay', 'PayU', 'Stripe', 'UPI']
  },
  paymentInfo: {
    id: String,
    status: String,
    paidAt: Date
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  trackingNumber: String,
  courierService: String,
  estimatedDelivery: Date,
  notes: String,
  couponCode: String
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });          // my-orders
orderSchema.index({ orderStatus: 1, createdAt: -1 });   // admin filter by status
orderSchema.index({ createdAt: -1 });                   // admin list

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
