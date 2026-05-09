const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Address = require('../models/Address');

function _fmt(a) {
  return {
    _id: a._id,
    name: a.fullName,
    phone: a.phone,
    line1: a.addressLine1,
    line2: a.addressLine2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault
  };
}

router.get('/', protect, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id });
    res.json({ success: true, data: addresses.map(_fmt) });
  } catch (error) {
    console.error('[Addresses] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, phone, line1, line2, city, state, pincode, isDefault } = req.body;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'name, phone, line1, city, state and pincode are required' });
    }
    const address = await Address.create({
      fullName: name, phone, addressLine1: line1, addressLine2: line2,
      city, state, pincode, isDefault, user: req.user.id
    });
    res.status(201).json({ success: true, data: _fmt(address) });
  } catch (error) {
    console.error('[Addresses] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { name, line1, line2, phone, city, state, pincode, isDefault } = req.body;
    const update = {};
    if (name !== undefined)    update.fullName     = name;
    if (line1 !== undefined)   update.addressLine1 = line1;
    if (line2 !== undefined)   update.addressLine2 = line2;
    if (phone !== undefined)   update.phone        = phone;
    if (city !== undefined)    update.city         = city;
    if (state !== undefined)   update.state        = state;
    if (pincode !== undefined) update.pincode      = pincode;
    if (isDefault !== undefined) {
      update.isDefault = isDefault;
      if (isDefault) await Address.updateMany({ user: req.user.id }, { isDefault: false });
    }
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, data: _fmt(address) });
  } catch (error) {
    console.error('[Addresses] PUT /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('[Addresses] DELETE /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
