const User = require('../models/User');
const Cart = require('../models/Cart');
const crypto = require('crypto');
const sendSms = require('../utils/sendSms');
const sendEmail = require('../utils/sendEmail');
const { otpEmail } = require('../utils/emailTemplates');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const OTP_TTL = 5 * 60 * 1000;       // 5 minutes
const OTP_COOLDOWN = 60 * 1000;       // 60s between sends
const MAX_ATTEMPTS = 5;
const MAX_DAILY_OTP = 5;              // max OTP sends per phone per day

// Returns error string if rate-limited, null if OK. Mutates user object (call user.save after).
function checkAndIncrementDailyOtp(user) {
  if (process.env.NODE_ENV !== 'production') return null; // no limits in dev
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (!user.otpDailyReset || now > user.otpDailyReset) {
    user.otpDailyCount = 0;
    user.otpDailyReset = now + dayMs;
  }
  if (user.otpDailyCount >= MAX_DAILY_OTP)
    return `OTP limit reached. You can request a maximum of ${MAX_DAILY_OTP} OTPs per day. Try again tomorrow.`;
  user.otpDailyCount += 1;
  return null;
}

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, password and mobile number are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const phoneOtp = generateOtp();
    const expire = Date.now() + 10 * 60 * 1000;

    const user = await User.create({
      name, email, password, phone,
      emailVerified: false,
      phoneOtp, phoneOtpExpire: expire
    });

    await Cart.create({ user: user._id, items: [] });

    try {
      await sendSms(phone, phoneOtp);
    } catch (e) { console.error('Phone OTP SMS failed:', e.message); }

    const token = user.generateToken();
    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your mobile number.',
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerified: true, phoneVerified: false }
    });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    if ((!email && !phone) || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password' });
    }

    const query = email ? { email: email.toLowerCase() } : { phone };
    const user = await User.findOne(query).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await User.findByIdAndUpdate(user._id, {
      $push: { activityHistory: { $each: [{ type: 'login', description: 'User logged in' }], $slice: -200 } }
    });

    const token = user.generateToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified }
    });
  } catch (error) { next(error); }
};


// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
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
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Reset link sent to your email' });
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

// @route   POST /api/auth/check-phone
exports.checkPhone = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });

    const user = await User.findOne({ phone }).select('_id').lean();
    res.status(200).json({ success: true, exists: !!user });
  } catch (error) { next(error); }
};

// Temporary OTP store (in-memory): phone → { otp, expire, name, email, attempts }
const pendingRegistrations = new Map();

// @route   POST /api/auth/register-otp-send  (new user: name+email+phone → send OTP, do NOT save to DB yet)
exports.registerOtpSend = async (req, res, next) => {
  try {
    const { phone, name, email, password } = req.body;
    if (!phone || !/^\d{10}$/.test(phone))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email || !/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(email))
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    if (!password || password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    // Check if a verified account already exists
    const existingPhone = await User.findOne({ phone, phoneVerified: true }).lean();
    if (existingPhone)
      return res.status(400).json({ success: false, message: 'An account with this mobile already exists. Please login.' });

    const existingEmail = await User.findOne({ email: email.toLowerCase(), phoneVerified: true }).lean();
    if (existingEmail)
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login.' });

    // Cooldown: 60s between OTP sends for same phone (skipped in dev)
    const pending = pendingRegistrations.get(phone);
    if (process.env.NODE_ENV === 'production' && pending && (pending.expire - Date.now()) > (OTP_TTL - OTP_COOLDOWN))
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });

    const otp = generateOtp();
    pendingRegistrations.set(phone, {
      otp,
      expire: Date.now() + OTP_TTL,
      name: name.trim(),
      email: email.toLowerCase(),
      password: req.body.password || '',
      attempts: 0,
    });

    // Auto-cleanup after TTL
    setTimeout(() => pendingRegistrations.delete(phone), OTP_TTL);

    try {
      await sendSms(phone, otp);
    } catch (e) {
      console.error('[SMS] registerOtpSend failed:', e.message);
    }
    res.status(200).json({ success: true, message: `OTP sent to +91${phone}` });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/login-otp-send
exports.loginOtpSend = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account found. Please register first.' });

    // Rate-limit: 1 OTP per 60s (skipped in dev)
    if (process.env.NODE_ENV === 'production' && user.phoneOtpExpire && (user.phoneOtpExpire - Date.now()) > (OTP_TTL - OTP_COOLDOWN))
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });

    // Daily limit
    const dailyErr = checkAndIncrementDailyOtp(user);
    if (dailyErr) return res.status(429).json({ success: false, message: dailyErr });

    const otp = generateOtp();
    user.phoneOtp = otp;
    user.phoneOtpExpire = Date.now() + OTP_TTL;
    user.otpAttempts = 0;
    user.otpAttemptsExpire = Date.now() + OTP_TTL;
    await user.save({ validateBeforeSave: false });

    try {
      await sendSms(phone, otp);
    } catch (e) {
      console.error('[SMS] loginOtpSend failed:', e.message);
    }
    res.status(200).json({ success: true, message: `OTP sent to +91${phone}` });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/login-otp-verify
exports.loginOtpVerify = async (req, res, next) => {
  try {
    const { phone, otp, name, email, password } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });

    // ── Registration flow: verify from in-memory pending store ──
    const pending = pendingRegistrations.get(phone);
    if (pending) {
      if (pending.expire < Date.now())
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

      if (pending.attempts >= MAX_ATTEMPTS)
        return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });

      if (pending.otp !== String(otp).trim()) {
        pending.attempts += 1;
        const left = MAX_ATTEMPTS - pending.attempts;
        return res.status(400).json({ success: false, message: left > 0 ? `Incorrect OTP. ${left} attempt(s) left.` : 'Too many incorrect attempts. Please request a new OTP.' });
      }

      // OTP correct — now create the user in DB
      pendingRegistrations.delete(phone);
      const finalPassword = password || pending.password || require('crypto').randomBytes(20).toString('hex');
      const user = await User.create({
        name:          name?.trim()        || pending.name,
        email:         email?.toLowerCase() || pending.email,
        password:      finalPassword,
        phone,
        phoneVerified: true,
        emailVerified: false,
      });
      await Cart.create({ user: user._id, items: [] });
      console.log(`[Auth] New user created: ${user.name} | phone: ${phone} | email: ${user.email}`);
      const token = user.generateToken();
      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, phoneVerified: true }
      });
    }

    // ── Login flow: verify from DB ──
    const user = await User.findOne({ phone });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account found with this mobile number' });

    if (!user.phoneOtp || !user.phoneOtpExpire)
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (user.phoneOtpExpire < Date.now())
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

    if (user.otpAttempts >= MAX_ATTEMPTS)
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });

    if (user.phoneOtp !== String(otp).trim()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const left = MAX_ATTEMPTS - user.otpAttempts;
      return res.status(400).json({ success: false, message: left > 0 ? `Incorrect OTP. ${left} attempt(s) left.` : 'Too many incorrect attempts. Please request a new OTP.' });
    }

    user.phoneOtp = undefined;
    user.phoneOtpExpire = undefined;
    user.otpAttempts = 0;
    user.otpAttemptsExpire = undefined;
    user.phoneVerified = true;
    await user.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(user._id, {
      $push: { activityHistory: { $each: [{ type: 'login', description: 'Logged in via OTP' }], $slice: -200 } }
    });

    const token = user.generateToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar, emailVerified: user.emailVerified, phoneVerified: true }
    });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/send-email-otp
exports.sendEmailOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.emailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });
    if (user.emailOtpExpire && (user.emailOtpExpire - Date.now()) > 9 * 60 * 1000) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });
    }
    const otp = generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Nansai Organics Verification Code',
        html: otpEmail(otp, 'verify your email address'),
      });
    } catch (e) { console.warn('Email OTP send failed:', e.message); }
    res.status(200).json({ success: true, message: `OTP sent to ${user.email}` });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/verify-email-otp
exports.verifyEmailOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });
    const user = await User.findById(req.user.id);
    if (user.emailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });
    if (!user.emailOtp || !user.emailOtpExpire) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (user.emailOtpExpire < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (user.emailOtp !== String(otp).trim()) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    user.emailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/send-phone-otp
exports.sendPhoneOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.phone) return res.status(400).json({ success: false, message: 'No mobile number on your account' });
    if (user.phoneVerified) return res.status(400).json({ success: false, message: 'Mobile number is already verified' });
    if (user.phoneOtpExpire && (user.phoneOtpExpire - Date.now()) > 9 * 60 * 1000) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });
    }
    const otp = generateOtp();
    user.phoneOtp = otp;
    user.phoneOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    await sendSms(user.phone, otp);
    res.status(200).json({ success: true, message: `OTP sent to +91${user.phone}` });
  } catch (error) { next(error); }
};

// @route   POST /api/auth/verify-phone-otp
exports.verifyPhoneOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });
    const user = await User.findById(req.user.id);
    if (user.phoneVerified) return res.status(400).json({ success: false, message: 'Mobile is already verified' });
    if (!user.phoneOtp || !user.phoneOtpExpire) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (user.phoneOtpExpire < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (user.phoneOtp !== String(otp).trim()) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    user.phoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, message: 'Mobile number verified successfully!' });
  } catch (error) { next(error); }
};
