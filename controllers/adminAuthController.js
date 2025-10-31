const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const AdminUser = require('../models/AdminUser');
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '15');

// ---------------------- ADMIN REGISTER ----------------------
exports.adminRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword
    } = req.body;

    // ✅ Required field check
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // ✅ Email validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // ✅ Password validation
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // ✅ Check if admin email already exists
    const existingAdmin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // ✅ Generate OTP
    const otpCode = generateOTP(6);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // ✅ Create admin user
    const admin = new AdminUser({
      name,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save middleware
      role: 'admin',
      isEmailVerified: false,
      otp: { code: otpCode, expiresAt: otpExpiresAt }
    });

    await admin.save();

    // ✅ Send OTP email
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.status(201).json({ 
      message: 'Admin registered successfully. OTP sent to email for verification.',
      email
    });
  } catch (err) {
    console.error('Admin Register Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- ADMIN VERIFY OTP ----------------------
exports.verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (!admin.otp || !admin.otp.code) return res.status(400).json({ message: 'No OTP found' });
    if (admin.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });
    if (admin.otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (admin.otp.code !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    // ✅ Mark verified
    admin.isEmailVerified = true;
    admin.otp = undefined;
    await admin.save();

    return res.json({ message: 'Admin email verified successfully. You can now login.' });
  } catch (err) {
    console.error('Admin Verify OTP Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- ADMIN LOGIN ----------------------
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // ✅ Find admin by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    if (!admin.isEmailVerified) {
      return res.status(403).json({ message: 'Email not verified. Please verify first.' });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { 
      id: admin._id, 
      role: admin.role, 
      email: admin.email
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    return res.json({
      token,
      user: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email, 
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- ADMIN PROFILE ----------------------
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.user.id).select('-passwordHash -otp');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    return res.json(admin);
  } catch (err) {
    console.error('Admin Profile Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


