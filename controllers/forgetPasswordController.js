const bcrypt = require('bcryptjs');
const validator = require('validator');

const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '15');
const MAX_RESET_ATTEMPTS = 3;

// ---------------------- REQUEST PASSWORD RESET ----------------------
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check in both User and AdminUser collections
    let user = await User.findOne({ email: email.toLowerCase() });
    let userType = 'user';

    if (!user) {
      user = await AdminUser.findOne({ email: email.toLowerCase() });
      userType = 'admin';
    }

    if (!user) {
      // Don't reveal that email doesn't exist for security
      return res.json({ 
        message: 'If this email exists, you will receive a password reset OTP shortly.' 
      });
    }

    // Check if user has exceeded reset attempts
    if (user.resetPasswordAttempts >= MAX_RESET_ATTEMPTS) {
      return res.status(429).json({ 
        message: 'Too many reset attempts. Please try again later.' 
      });
    }

    // Generate OTP
    const otpCode = generateOTP(6);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Save OTP to user
    user.resetPasswordOtp = {
      code: otpCode,
      expiresAt: otpExpiresAt
    };
    user.resetPasswordAttempts += 1;

    if (userType === 'user') {
      await user.save();
    } else {
      await user.save();
    }

    // Send OTP email
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.json({ 
      message: 'Password reset OTP sent to your email. It will expire in 15 minutes.',
      email: email
    });

  } catch (err) {
    console.error('Request Password Reset Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- VERIFY RESET OTP ----------------------
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Check in both collections
    let user = await User.findOne({ email: email.toLowerCase() });
    let userType = 'user';

    if (!user) {
      user = await AdminUser.findOne({ email: email.toLowerCase() });
      userType = 'admin';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordOtp.code) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }

    if (user.resetPasswordOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (user.resetPasswordOtp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid - mark it as verified (but don't clear it yet)
    user.resetPasswordOtp.verified = true;

    if (userType === 'user') {
      await user.save();
    } else {
      await user.save();
    }

    return res.json({ 
      message: 'OTP verified successfully. You can now reset your password.',
      email: email
    });

  } catch (err) {
    console.error('Verify Reset OTP Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- RESET PASSWORD ----------------------
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check in both collections
    let user = await User.findOne({ email: email.toLowerCase() });
    let userType = 'user';

    if (!user) {
      user = await AdminUser.findOne({ email: email.toLowerCase() });
      userType = 'admin';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordOtp.code) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }

    if (user.resetPasswordOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (user.resetPasswordOtp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset fields
    user.passwordHash = passwordHash;
    user.resetPasswordOtp = undefined;
    user.resetPasswordAttempts = 0;

    if (userType === 'user') {
      await user.save();
    } else {
      await user.save();
    }

    return res.json({ 
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- RESEND RESET OTP ----------------------
exports.resendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check in both collections
    let user = await User.findOne({ email: email.toLowerCase() });
    let userType = 'user';

    if (!user) {
      user = await AdminUser.findOne({ email: email.toLowerCase() });
      userType = 'admin';
    }

    if (!user) {
      // Don't reveal that email doesn't exist
      return res.json({ 
        message: 'If this email exists, you will receive a new OTP shortly.' 
      });
    }

    // Check if user has exceeded reset attempts
    if (user.resetPasswordAttempts >= MAX_RESET_ATTEMPTS) {
      return res.status(429).json({ 
        message: 'Too many reset attempts. Please try again later.' 
      });
    }

    // Generate new OTP
    const otpCode = generateOTP(6);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Update OTP and increment attempts
    user.resetPasswordOtp = {
      code: otpCode,
      expiresAt: otpExpiresAt
    };
    user.resetPasswordAttempts += 1;

    if (userType === 'user') {
      await user.save();
    } else {
      await user.save();
    }

    // Send new OTP email
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.json({ 
      message: 'New OTP sent to your email. It will expire in 15 minutes.',
      email: email
    });

  } catch (err) {
    console.error('Resend Reset OTP Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};