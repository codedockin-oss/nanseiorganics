const twilio = require('twilio');

const sendSms = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  // Not configured — log OTP to console for development use
  console.log('\n' + '='.repeat(40));
  console.log(`  OTP for +91${phone}:  ${otp}`);
  console.log('='.repeat(40) + '\n');

  if (process.env.NODE_ENV !== 'production') return;

  const isConfigured = accountSid && accountSid.startsWith('AC') && authToken && authToken.length > 10;
  if (!isConfigured) return;

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: `Your Nansei Organics verification code is: ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
    from,
    to: `+91${phone}`
  });
  console.log(`[SMS] OTP sent to +91${phone}`);
};

module.exports = sendSms;
