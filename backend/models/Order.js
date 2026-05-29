const mongoose = require('mongoose');
const Counter  = require('./Counter');

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.Mixed, ref: 'Product' },
  name:     { type: String, required: true },
  image:    String,
  quantity: { type: Number, required: true, min: 1 },
  price:    { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  orderId:     { type: String, unique: true, sparse: true },
  orderNumber: { type: String, unique: true },

  items: [orderItemSchema],

  shippingAddress: {
    fullName:              { type: String, required: true, trim: true },
    mobileNumber:          { type: String, required: true, match: /^[6-9]\d{9}$/ },
    phone:                 { type: String },
    alternateMobileNumber: { type: String, default: '', match: /^$|^[6-9]\d{9}$/ },
    addressLine1:          { type: String, required: true, trim: true },
    addressLine2:          { type: String, default: '', trim: true },
    city:                  { type: String, required: true, trim: true },
    state:                 { type: String, required: true, trim: true },
    pincode:               { type: String, required: true, match: /^[1-9]\d{5}$/ },
    country:               { type: String, default: 'India', trim: true },
  },

  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'Razorpay', 'PayU', 'Stripe', 'UPI'],
  },
  paymentInfo: { id: String, status: String, paidAt: Date },
  isPaid:      { type: Boolean, default: false },
  paidAt:      Date,

  itemsPrice:    { type: Number, required: true, default: 0 },
  taxPrice:      { type: Number, required: true, default: 0 },
  shippingPrice: { type: Number, required: true, default: 0 },
  discount:      { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true, default: 0 },

  orderStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },

  shippingStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },

  shipmentId:             String,
  awbCode:                String,
  courierName:            String,
  trackingUrl:            String,
  estimatedDeliveryDate:  Date,
  currentTrackingStatus:  String,

  isDelivered:        { type: Boolean, default: false },
  deliveredAt:        Date,
  cancelledAt:        Date,
  cancellationReason: String,
  notes:              String,
  couponCode:         String,
  estimatedDelivery:  Date,
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ shippingStatus: 1, createdAt: -1 });
orderSchema.index({ shipmentId: 1 }, { sparse: true });
orderSchema.index({ awbCode: 1 }, { sparse: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentInfo.id': 1 }, { sparse: true });

orderSchema.pre('validate', function (next) {
  if (this.shippingAddress && !this.shippingAddress.mobileNumber && this.shippingAddress.phone) {
    this.shippingAddress.mobileNumber = String(this.shippingAddress.phone).replace(/\D/g, '').slice(-10);
  }
  next();
});

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber || !this.orderId) {
    const year    = new Date().getFullYear();
    const counter = await Counter.findOneAndUpdate(
      { key: `orders-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const id = `ORD-${year}-${counter.seq}`;
    this.orderId     = this.orderId     || id;
    this.orderNumber = this.orderNumber || id;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
