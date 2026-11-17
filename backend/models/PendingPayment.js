const mongoose = require('mongoose');

/**
 * A checkout that has opened Razorpay but whose order is not saved yet.
 * The server prices the cart when the payment starts and keeps it here, so the order can be created
 * from Razorpay's webhook even if the customer's browser never comes back after paying.
 * Records remove themselves after 3 days.
 */
const pendingPaymentSchema = new mongoose.Schema({
  rzpOrderId: { type: String, required: true, unique: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payload:    { type: mongoose.Schema.Types.Mixed, required: true },   // the checkout's order body, re-priced on use
  amount:     { type: Number, required: true },                        // paise, what Razorpay was asked to collect
  status:     { type: String, enum: ['pending', 'claimed', 'done', 'mismatch'], default: 'pending' },
  paymentId:  String,
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt:  { type: Date, default: Date.now, expires: 3 * 24 * 60 * 60 },
});

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
