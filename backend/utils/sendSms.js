const MSG91_SEND_OTP_URL = 'https://api.msg91.com/api/sendotp.php';

const sendSms = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER_ID || 'NANSEI';
  const template = process.env.MSG91_OTP_MESSAGE || 'Your Nansei Organics verification code is ##OTP##. Valid for 5 minutes. Do not share it.';
  const mobile = `91${phone}`;
  const isConfigured = authKey && authKey.length > 10;

  console.log('\n' + '='.repeat(40));
  console.log(`  OTP for +91${phone}:  ${otp}`);
  console.log('='.repeat(40) + '\n');

  if (process.env.NODE_ENV !== 'production') return;

  if (!isConfigured) {
    throw new Error('MSG91 SMS is not configured');
  }

  const params = new URLSearchParams({
    authkey: authKey,
    mobile,
    message: template,
    sender,
    otp,
    otp_expiry: '5',
    otp_length: String(otp.length),
  });

  const response = await fetch(`${MSG91_SEND_OTP_URL}?${params.toString()}`);
  const text = await response.text();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { message: text };
  }

  if (!response.ok || payload.type === 'error') {
    throw new Error(payload.message || `MSG91 send failed with HTTP ${response.status}`);
  }

  console.log(`[SMS] MSG91 OTP sent to +91${phone}`);
};

module.exports = sendSms;
