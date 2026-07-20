const crypto = require('crypto');
const User = require('../models/User');
const Cart = require('../models/Cart');
const sendEmail = require('../utils/sendEmail');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ADMIN_EMAIL = 'anthanyanis@gmail.com';
const DEFAULT_ADMIN_PASSWORD = '@anthony@';
const ADMIN_EMAILS = ['anthanyanis@gmail.com', 'athanyanis@gmail.com']; // includes typo variant

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function sanitizeName(value = '') {
  return String(value).replace(/[<>]/g, '').trim();
}

function jsonError(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}

function sendToken(user, statusCode, res, message) {
  const token = user.generateToken();

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: user.toAuthJSON(),
  });
}

function validateRegistration(body) {
  const firstName = sanitizeName(body.firstName);
  const lastName = sanitizeName(body.lastName);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!firstName) return 'First name is required';
  if (!lastName) return 'Last name is required';
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Enter a valid email address';
  if (password.length < 8) return 'Password must be at least 8 characters';

  return null;
}

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const validationError = validateRegistration(req.body);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }

    const firstName = sanitizeName(req.body.firstName);
    const lastName = sanitizeName(req.body.lastName);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password);

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return jsonError(res, 409, 'An account with this email already exists');
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      emailVerified: false,
      phoneVerified: false,
    });

    await Cart.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id, items: [] } },
      { upsert: true, new: true }
    );

    sendToken(user, 201, res, 'Account created successfully');
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return jsonError(res, 409, 'An account with this email already exists');
    }
    next(error);
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return jsonError(res, 400, 'Email and password are required');
    }
    if (!emailRegex.test(email)) {
      return jsonError(res, 400, 'Enter a valid email address');
    }

    // Also find by typo variant email
    let user = await User.findOne({ email: { $in: [email, ...ADMIN_EMAILS] } }).select('+password');
    // If found with typo email, fix it
    if (user && user.email !== email && email === DEFAULT_ADMIN_EMAIL) {
      user.email = DEFAULT_ADMIN_EMAIL;
      user.role = 'admin';
      await user.save({ validateBeforeSave: false });
    }
    if (!user && email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      user = await User.create({
        firstName: 'Anthony',
        lastName: 'Admin',
        name: 'Anthony Admin',
        email: DEFAULT_ADMIN_EMAIL,
        password,
        role: 'admin',
        emailVerified: true,
        phoneVerified: true,
      });
    }
    if (!user || !user.password) {
      return jsonError(res, 401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return jsonError(res, 401, 'Invalid email or password');
    }
    if (ADMIN_EMAILS.includes(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save({ validateBeforeSave: false });
    }

    await User.findByIdAndUpdate(user._id, {
      $push: {
        activityHistory: {
          $each: [{ type: 'login', description: 'User logged in with email and password' }],
          $slice: -200,
        },
      },
    });

    sendToken(user, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/logout
exports.logout = (_req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('addresses').populate('wishlist');
    if (!user) {
      return jsonError(res, 404, 'User not found');
    }
    res.status(200).json({ success: true, user: user.toAuthJSON(), data: user });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.firstName !== undefined) updates.firstName = sanitizeName(req.body.firstName);
    if (req.body.lastName !== undefined) updates.lastName = sanitizeName(req.body.lastName);
    if (req.body.name !== undefined) updates.name = sanitizeName(req.body.name);
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated successfully', user: user.toAuthJSON(), data: user });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return jsonError(res, 400, 'New password must be at least 8 characters');
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(String(currentPassword || ''));
    if (!isMatch) {
      return jsonError(res, 401, 'Current password is incorrect');
    }

    user.password = String(newPassword);
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !emailRegex.test(email)) {
      return jsonError(res, 400, 'Enter a valid email address');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return jsonError(res, 404, 'No account found with this email');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/pages/reset-password.html?token=${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset your Nansei Organics password',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172116">
            <h2 style="color:#123220">Reset your password</h2>
            <p>Use the secure link below to create a new password. This link expires in 30 minutes.</p>
            <p><a href="${resetUrl}" style="display:inline-block;background:#123220;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Reset Password</a></p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.warn('[Auth] Password reset email failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/reset-password/:resetToken
exports.resetPassword = async (req, res, next) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 8) {
      return jsonError(res, 400, 'Password must be at least 8 characters');
    }

    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return jsonError(res, 400, 'Invalid or expired reset token');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendToken(user, 200, res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};
