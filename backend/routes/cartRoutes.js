const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Cart = require('../models/Cart');

router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product').lean();
    res.json({ success: true, data: cart || { items: [], totalPrice: 0 } });
  } catch (error) {
    console.error('[Cart] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity, selectedQuantity, selectedUnit, selectedPrice } = req.body;
    const qty = parseInt(quantity);
    if (!productId || isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Valid productId and quantity (min 1) are required' });
    }

    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < 1) return res.status(400).json({ success: false, message: 'Product is out of stock' });
    const packageLabel = String(selectedQuantity || `${product.weight}${product.unit}`).trim();
    const unit = String(selectedUnit || product.unit || '').trim();
    const unitPrice = Number(selectedPrice ?? req.body.price ?? product.price);
    if (!packageLabel || Number.isNaN(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ success: false, message: 'Valid selected quantity and price are required' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    const cartItem = { product: productId, quantity: qty, selectedQuantity: packageLabel, selectedUnit: unit, selectedPrice: unitPrice, price: unitPrice };
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [cartItem] });
    } else {
      const itemIndex = cart.items.findIndex(item =>
        item.product.toString() === productId && item.selectedQuantity === packageLabel
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += qty;
        cart.items[itemIndex].selectedPrice = unitPrice;
        cart.items[itemIndex].price = unitPrice;
      } else {
        cart.items.push(cartItem);
      }
      await cart.save();
    }

    await cart.populate('items.product');
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('[Cart] POST /add error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const selectedQuantity = req.query.selectedQuantity;
    cart.items = cart.items.filter(item => {
      const productMatches = item.product.toString() === req.params.productId;
      const quantityMatches = !selectedQuantity || item.selectedQuantity === selectedQuantity;
      return !(productMatches && quantityMatches);
    });
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('[Cart] DELETE /remove error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/clear', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('[Cart] DELETE /clear error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
