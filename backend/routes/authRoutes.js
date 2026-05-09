const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe, updateProfile, changePassword,
  forgotPassword, resetPassword,
  sendEmailOtp, verifyEmailOtp,
  sendPhoneOtp, verifyPhoneOtp,
  loginOtpSend, loginOtpVerify,
  checkPhone, registerOtpSend,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register',          register);
router.post('/login',             login);
router.post('/logout',            logout);
router.get('/me',                 protect, getMe);
router.put('/profile',            protect, updateProfile);
router.put('/change-password',    protect, changePassword);
router.post('/forgot-password',   forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.post('/check-phone',        checkPhone);
router.post('/register-otp-send',  registerOtpSend);
router.post('/login-otp-send',     loginOtpSend);
router.post('/login-otp-verify',   loginOtpVerify);
router.post('/send-email-otp',    protect, sendEmailOtp);
router.post('/verify-email-otp',  protect, verifyEmailOtp);
router.post('/send-phone-otp',    protect, sendPhoneOtp);
router.post('/verify-phone-otp',  protect, verifyPhoneOtp);

module.exports = router;
