const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'user'],
    default: 'customer'
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
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });

// Keep legacy `name` users compatible with the split-name auth flow.
userSchema.pre('validate', function(next) {
  if ((!this.firstName || !this.lastName) && this.name) {
    const parts = this.name.trim().split(/\s+/);
    if (!this.firstName) this.firstName = parts.shift() || this.name.trim();
    if (!this.lastName) this.lastName = parts.join(' ') || 'Customer';
  }
  next();
});

// Derive `name` from firstName + lastName before saving.
userSchema.pre('save', function(next) {
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.firstName || this.lastName) {
    this.name = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }
  next();
});

// Hash password before saving (only if present)
userSchema.pre('save', async function(next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token — include role so authorize() middleware works
userSchema.methods.generateToken = function() {
  const role = this.role === 'user' ? 'customer' : this.role;
  return jwt.sign(
    { id: this._id, userId: this._id, email: this.email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.toAuthJSON = function() {
  const role = this.role === 'user' ? 'customer' : this.role;
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
    email: this.email,
    role,
  };
};

module.exports = mongoose.model('User', userSchema);
