const User = require('../models/User');
const Cart = require('../models/Cart');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { otpEmail } = require('../utils/emailTemplates');
const { OAuth2Client } = require('google-auth-library');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password, emailVerified: false });
    await Cart.create({ user: user._id, items: [] });

    const token = user.generateToken();
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Admin master login: env credentials always work regardless of DB state
    const isAdminMaster = ADMIN_EMAIL && ADMIN_PASSWORD &&
      email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;

    if (isAdminMaster) {
      if (!user) {
        // Create admin user for the first time
        user = await User.create({ name: 'Admin', email: ADMIN_EMAIL.toLowerCase(), role: 'admin', emailVerified: true, password: ADMIN_PASSWORD });
      } else {
        // Ensure role is admin regardless of what's in DB
        if (user.role !== 'admin') {
          await User.findByIdAndUpdate(user._id, { role: 'admin' });
          user.role = 'admin';
        }
      }
    } else {
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await User.findByIdAndUpdate(user._id, {
      $push: { activityHistory: { $each: [{ type: 'login', description: 'User logged in' }], $slice: -200 } }
    });

    const token = user.generateToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (error) { next(error); }
};


// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 },
      $set: { lastLogoutAt: new Date(), fcmToken: null },
      $push: { activityHistory: { $each: [{ type: 'logout', description: 'User logged out' }], $slice: -200 } }
    });

    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('addresses').populate('wishlist');
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) { next(error); }
};

// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.lastLogoutAt = new Date();
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const resetUrl = `${frontendUrl}/pages/reset-password.html?token=${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Nansai Organics — Password Reset',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h2 style="font-size:1.4rem;color:#1a3a2a;margin-bottom:8px;">Reset your password</h2>
            <p style="color:#555;font-size:.9rem;margin-bottom:24px;">Click the button below to reset your password. This link expires in 30 minutes.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:#1a3a2a;color:#fff;text-decoration:none;font-size:.85rem;font-weight:600;letter-spacing:.06em;border-radius:4px;">Reset Password</a>
            <p style="color:#999;font-size:.78rem;margin-top:24px;">If you didn't request this, ignore this email.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('[ForgotPassword] Email failed:', emailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' });
    }

    res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) { next(error); }
};

// @route   PUT /api/auth/reset-password/:resetToken
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/google
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        emailVerified: true,
        password: crypto.randomBytes(32).toString('hex'), // unusable random password
      });
      await Cart.create({ user: user._id, items: [] });
    } else {
      // Link Google ID if signed up via email before
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      }
    }

    await User.findByIdAndUpdate(user._id, {
      $push: { activityHistory: { $each: [{ type: 'login', description: 'Logged in via Google' }], $slice: -200 } }
    });

    const token = user.generateToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (error) {
    console.error('[Google Auth]', error.message);
    res.status(401).json({ success: false, message: 'Google sign-in failed. Please try again.' });
  }
};

// @route   POST /api/auth/check-phone — kept as stub for route compatibility
exports.checkPhone = async (req, res) => res.status(410).json({ success: false, message: 'Phone login is disabled' });
exports.registerOtpSend = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.loginOtpSend    = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.loginOtpVerify  = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.sendEmailOtp    = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.verifyEmailOtp  = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.sendPhoneOtp    = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
exports.verifyPhoneOtp  = async (req, res) => res.status(410).json({ success: false, message: 'OTP login is disabled' });
