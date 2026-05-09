const express     = require('express');
const dns         = require('dns');
const path        = require('path');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const jwt         = require('jsonwebtoken');
require('dotenv').config();

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// ── Route imports ──
const authRoutes     = require('./routes/authRoutes');
const productRoutes  = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes     = require('./routes/cartRoutes');
const orderRoutes    = require('./routes/orderRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes   = require('./routes/reviewRoutes');
const userRoutes     = require('./routes/userRoutes');
const comboRoutes    = require('./routes/comboRoutes');
const addressRoutes  = require('./routes/addressRoutes');
const couponRoutes   = require('./routes/couponRoutes');
const paymentRoutes  = require('./routes/paymentRoutes');
const blogRoutes     = require('./routes/blogRoutes');
const newsRoutes     = require('./routes/newsRoutes');

const User         = require('./models/User');
const errorHandler = require('./middleware/errorHandler');
const connectDB    = require('./config/database');

const app = express();

// ── Trust proxy (Render / Nginx sit in front) ──
app.set('trust proxy', 1);

// ── Keep-alive for upstream connections ──
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  next();
});

// ── Security headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://checkout.razorpay.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc:   ["https://api.razorpay.com"],
    }
  }
}));

// ── Compression (skip tiny responses) ──
app.use(compression({ threshold: 1024 }));

// ── CORS ──
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'null',           // file:// protocol sends origin: null
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);          // same-origin / curl
    if (origin === 'null') return cb(null, true); // file://
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
}));

// ── Body parsers — tight limits ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Logging (production: errors only) ──
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
  }));
}

// ── DB ──
connectDB();

// ── Rate limiters ──
const makeLimit = (max, windowMin = 15) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// OTP: 10 sends per hour per IP (generous for real use)
const otpLimiter     = makeLimit(10, 60);
// Auth (login/register/check): 50 req / 15 min
const authLimiter    = makeLimit(50, 15);
// Public reads: 500 req / 15 min
const publicLimiter  = makeLimit(500, 15);
// Writes (cart, orders, reviews): 100 req / 15 min
const writeLimiter   = makeLimit(100, 15);
// Admin: 300 req / 15 min
const adminLimiter   = makeLimit(300, 15);
// Payment: 50 req / 15 min
const paymentLimiter = makeLimit(50, 15);

// ── Health check (no rate limit) ──
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// ── API Routes ──
// OTP limiters applied specifically before the auth router
app.use('/api/auth/login-otp-send',    otpLimiter);
app.use('/api/auth/register-otp-send', otpLimiter);
// All other auth routes use the standard auth limiter
app.use('/api/auth',      authLimiter,    authRoutes);
app.use('/api/products',  publicLimiter,  productRoutes);
app.use('/api/categories',publicLimiter,  categoryRoutes);
app.use('/api/combos',    publicLimiter,  comboRoutes);
app.use('/api/cart',      writeLimiter,   cartRoutes);
app.use('/api/orders',    writeLimiter,   orderRoutes);
app.use('/api/wishlist',  writeLimiter,   wishlistRoutes);
app.use('/api/reviews',   writeLimiter,   reviewRoutes);
app.use('/api/users',     adminLimiter,   userRoutes);
app.use('/api/addresses', writeLimiter,   addressRoutes);
app.use('/api/coupons',   publicLimiter,  couponRoutes);
app.use('/api/payment',   paymentLimiter, paymentRoutes);
app.use('/api/blogs',     publicLimiter,  blogRoutes);
app.use('/api/news',      publicLimiter,  newsRoutes);

// ── 404 for unknown API routes ──
app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Admin panel (server-gated) ──
app.get('/admin', async (req, res) => {
  const token = req.query.token || req.cookies?.nansai_admin_token;
  if (!token) return res.redirect('/admin-login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('role').lean();
    if (!user || user.role !== 'admin') return res.redirect('/admin-login');
    res.sendFile(path.join(__dirname, '..', 'pages', 'admin-panel.html'));
  } catch {
    res.redirect('/admin-login');
  }
});

app.get('/admin-login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'admin-panel.html'));
});

// ── Static frontend with aggressive caching ──
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true,
}));

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => res.sendFile(path.join(frontendPath, 'pages', 'index.html')));
} else {
  app.use('*', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
}

// ── Error handler ──
app.use(errorHandler);

// ── Start ──
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Tell PM2 this worker is ready AFTER the port is actually bound
  if (process.send) process.send('ready');
});

// Keep-alive timeout slightly above load balancer's (Render uses 75s)
server.keepAliveTimeout = 90000;
server.headersTimeout   = 91000;

// ── Graceful shutdown (handles PM2 reload + Render SIGTERM) ──
function shutdown(signal) {
  console.log(`[Worker ${process.pid}] ${signal} — shutting down gracefully`);
  server.close(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log(`[Worker ${process.pid}] ✅ MongoDB closed`);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// PM2 sends 'shutdown' message before SIGINT during graceful reload
process.on('message', (msg) => {
  if (msg === 'shutdown') shutdown('PM2 shutdown');
});

process.on('unhandledRejection', (err) => {
  console.error(`[Worker ${process.pid}] ❌ Unhandled Rejection:`, err.message);
  shutdown('unhandledRejection');
});
