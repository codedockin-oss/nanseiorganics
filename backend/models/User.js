const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
    default: undefined
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  emailVerified: { type: Boolean, default: false },
  emailOtp: String,
  emailOtpExpire: Date,
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: String,
  phoneOtpExpire: Date,
  otpAttempts: { type: Number, default: 0 },
  otpAttemptsExpire: Date,
  otpDailyCount: { type: Number, default: 0 },
  otpDailyReset: Date,
  googleId: String,
  facebookId: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
  },
  activityHistory: [{
    type: { type: String, required: true },  // e.g. 'login', 'add_to_cart', 'wishlist', 'view_product'
    description: String,
    meta: mongoose.Schema.Types.Mixed,       // extra data (productId, productName, etc.)
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token — include role so authorize() middleware works
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model('User', userSchema);
