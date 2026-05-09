const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-gmail')) {
    console.warn('⚠️  EMAIL not configured in .env — skipping send. OTP:', options._otp || '(see server log)');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    html: options.html
  });

  console.log(`✅ Email sent to ${options.email}`);
};

module.exports = sendEmail;
