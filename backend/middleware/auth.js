const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user; // full user object including role
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Admin only access
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.user.role === 'user' ? 'customer' : req.user.role;
    const allowed = roles.map(r => r === 'user' ? 'customer' : r);
    if (!allowed.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${role}' is not authorized to access this route`
      });
    }
    next();
  };
};
