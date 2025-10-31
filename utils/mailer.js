const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOtpEmail(toEmail, otp, ttlMinutes = 15, purpose = 'verification') {
  const purposes = {
    verification: 'email verification',
    reset: 'password reset'
  };
  
  const subject = `E-Learning Platform : Your ${purposes[purpose] || 'verification'} OTP`;
  const text = `Your OTP for ${purposes[purpose] || 'verification'} is ${otp}. It is valid for 5 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${subject}</h2>
      <p>Your OTP code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
      <p>This OTP will expire in <strong>${ttlMinutes} minutes</strong>.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject,
    text,
    html
  });
}
// Add this to your existing mailer.js
async function sendCustomEmail(toEmail, subject, html) {
  const text = html.replace(/<[^>]*>/g, ''); // Basic HTML to text conversion
  
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject,
    text,
    html
  });
}



module.exports = { sendOtpEmail, sendCustomEmail };
