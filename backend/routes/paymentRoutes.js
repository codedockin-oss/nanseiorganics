const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

function getRzp() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured in .env');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    const rzp = getRzp();
    const order = await rzp.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: 'rcpt_' + Date.now(),
    });
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Payment] create-order error:', err.message);
    res.status(500).json({ success: false, message: 'Payment order creation failed' });
  }
});

// POST /api/payment/verify-payment
router.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' });
    }
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, verified: false, message: 'Invalid payment signature' });
    }
    res.json({ success: true, verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    console.error('[Payment] verify-payment error:', err.message);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

module.exports = router;
