const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('[Users] GET /profile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, name, phone, avatar } = req.body;
    const allowedFields = {};
    if (name !== undefined)   allowedFields.name   = name;
    if (phone !== undefined)  allowedFields.phone  = phone;
    if (avatar !== undefined) allowedFields.avatar = avatar;

    if (newPassword) {
      const user = await User.findById(req.user.id).select('+password');
      const match = await user.comparePassword(currentPassword || '');
      if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      user.password = newPassword;
      Object.assign(user, allowedFields);
      await user.save();
      const updated = await User.findById(req.user.id).select('-password');
      return res.json({ success: true, data: updated });
    }
    const user = await User.findByIdAndUpdate(req.user.id, allowedFields, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('[Users] PUT /profile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort('-createdAt');
    const Order = require('../models/Order');
    const orderStats = await Order.aggregate([
      { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } }
    ]);
    const statsMap = {};
    orderStats.forEach(s => { statsMap[s._id.toString()] = s; });
    const usersWithStats = users.map(u => ({
      ...u.toObject(),
      orderCount: statsMap[u._id.toString()]?.orderCount || 0,
      totalSpent: statsMap[u._id.toString()]?.totalSpent || 0
    }));
    res.json({ success: true, data: usersWithStats, total: users.length });
  } catch (error) {
    console.error('[Users] GET / error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('[Users] DELETE /:id error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be user or admin' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('[Users] PUT /:id/role error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users/activity — log an activity event
router.post('/activity', protect, async (req, res) => {
  try {
    const { type, description, meta } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'type is required' });
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        activityHistory: {
          $each: [{ type, description, meta }],
          $slice: -200
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[Users] POST /activity error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/activity — fetch activity history
router.get('/activity', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('activityHistory');
    const history = (user.activityHistory || []).slice().reverse();
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[Users] GET /activity error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
