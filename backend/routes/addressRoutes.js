const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Address = require('../models/Address');

function _fmt(a) {
  return {
    _id: a._id,
    name: a.fullName,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.addressLine1,
    addressLine1: a.addressLine1,
    line2: a.addressLine2,
    addressLine2: a.addressLine2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country || 'India',
    alternateMobileNumber: a.alternateMobileNumber || '',
    addressType: a.addressType,
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
    const name = req.body.name || req.body.fullName;
    const line1 = req.body.line1 || req.body.addressLine1;
    const line2 = req.body.line2 || req.body.addressLine2;
    const { phone, alternateMobileNumber, city, state, pincode, country, isDefault, addressType } = req.body;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'name, phone, line1, city, state and pincode are required' });
    }
    const address = await Address.create({
      fullName: name, phone, alternateMobileNumber, addressLine1: line1, addressLine2: line2,
      city, state, pincode, country: country || 'India', isDefault, addressType, user: req.user.id
    });
    res.status(201).json({ success: true, data: _fmt(address) });
  } catch (error) {
    console.error('[Addresses] POST / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const name = req.body.name || req.body.fullName;
    const line1 = req.body.line1 || req.body.addressLine1;
    const line2 = req.body.line2 || req.body.addressLine2;
    const { phone, alternateMobileNumber, city, state, pincode, country, isDefault, addressType } = req.body;
    const update = {};
    if (name !== undefined)    update.fullName     = name;
    if (line1 !== undefined)   update.addressLine1 = line1;
    if (line2 !== undefined)   update.addressLine2 = line2;
    if (phone !== undefined)   update.phone        = phone;
    if (alternateMobileNumber !== undefined) update.alternateMobileNumber = alternateMobileNumber;
    if (city !== undefined)    update.city         = city;
    if (state !== undefined)   update.state        = state;
    if (pincode !== undefined) update.pincode      = pincode;
    if (country !== undefined) update.country      = country;
    if (addressType !== undefined) update.addressType = addressType;
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
