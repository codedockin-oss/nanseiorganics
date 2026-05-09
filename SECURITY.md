# 🔒 Security Guide for NANSAI Organics

## ✅ Completed Security Tasks

### 1. Created `.gitignore`
- Prevents `.env` file from being committed to Git
- Protects sensitive credentials and API keys
- Excludes node_modules and other unnecessary files

### 2. Cleaned `.env.example`
- Removed all real credentials
- Added helpful comments and links
- Safe to commit to version control

### 3. Generated New JWT Secret
- Created cryptographically secure 128-character key
- Updated in your `.env` file
- Old key: `nansai_organics_super_secret_key_2024_change_in_production`
- New key: `057104a8180f44796b94714dceb44940e024c4db3412005b384ec4a7a43caa4620795f99af2f110ec539808346db7223159b539dd3307a49413d1bb851a3da03`

## ⚠️ URGENT: Change Your MongoDB Password

Your MongoDB password (`NanseiOrganics005`) may have been exposed. Follow these steps:

### Steps to Change MongoDB Password:

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Login** to your account
3. **Navigate to**: Database Access (left sidebar)
4. **Find user**: `anthonyanis`
5. **Click**: Edit button
6. **Change Password**: Generate a strong password
7. **Update** your `.env` file with the new password

### Generate Strong Password:
```bash
# Run this in your terminal to generate a secure password:
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

## 📋 Before Deploying to Production

### Environment Variables Checklist:
- [ ] Change `NODE_ENV` to `production`
- [ ] Update `FRONTEND_URL` to your actual domain
- [ ] Set up real email credentials (Gmail App Password)
- [ ] Configure Razorpay production keys
- [ ] Set up Cloudinary account and add credentials
- [ ] Verify MongoDB connection string
- [ ] Test all environment variables

### Security Best Practices:
- [ ] Never commit `.env` file to Git
- [ ] Use different credentials for development and production
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Use environment-specific `.env` files (`.env.development`, `.env.production`)
- [ ] Enable MongoDB IP whitelist
- [ ] Use strong, unique passwords for all services
- [ ] Enable 2FA on all service accounts

## 🔑 How to Get API Keys

### Razorpay (Payment Gateway)
1. Sign up: https://dashboard.razorpay.com/signup
2. Go to Settings → API Keys
3. Generate Test/Live keys
4. Add to `.env` file

### Cloudinary (Image Upload)
1. Sign up: https://cloudinary.com/users/register/free
2. Go to Dashboard
3. Copy Cloud Name, API Key, API Secret
4. Add to `.env` file

### Gmail App Password (Email)
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" and your device
4. Copy the 16-character password
5. Add to `.env` as `EMAIL_PASSWORD`

## 🚀 Setting Up New Environment

When setting up on a new machine or for a team member:

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd agri-store
   ```

2. **Copy example file**
   ```bash
   cd backend
   cp .env.example .env
   ```

3. **Fill in credentials**
   - Edit `.env` file
   - Add your own credentials
   - Never share this file

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Start server**
   ```bash
   npm start
   ```

## 📞 Need Help?

If you suspect a security breach:
1. Immediately change all passwords
2. Rotate all API keys
3. Check MongoDB access logs
4. Review recent Git commits
5. Contact your hosting provider

## 📚 Additional Resources

- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: January 2026
**Status**: ✅ Basic security measures implemented
**Next Review**: Change MongoDB password immediately
