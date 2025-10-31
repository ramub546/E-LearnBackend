const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/User');
const Class = require('../models/Class'); // ✅ ADD THIS IMPORT
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { generateRoleNumber } = require('../utils/roleNumber');

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '15');

// ---------------------- REGISTER ----------------------
exports.register = async (req, res) => {
  try {
    const {
      fullName,
      dob,
      email,
      phone,
      academicRegion,
      class: className, // This should be class ID (ObjectId)
      password,
      confirmPassword
    } = req.body;

    // ✅ Required field check
    if (!fullName || !dob || !email || !phone || !academicRegion || !className || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Phone validation (+country code)
    if (!/^\+\d{1,3}\d{7,14}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must include country code (e.g., +91XXXXXXXXXX)' });
    }

    // ✅ Email & password validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // ✅ Check if email already exists (ANY role)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ Check if student email matches any parent email
    const parentWithSameEmail = await User.findOne({ 
      email: email.toLowerCase(), 
      role: 'parent' 
    });
    if (parentWithSameEmail) {
      return res.status(400).json({ 
        message: 'Student email cannot be same as parent email. Please use a different email address.' 
      });
    }

 // ✅ Validate class exists by name instead of ID
const classExists = await Class.findOne({ className: className });
if (!classExists) {
  return res.status(400).json({ message: 'Invalid class selected' });
}

// Then use class ID in user creation

    // ✅ Generate Role Number based on REGION
    let roleNumber = await generateRoleNumber(academicRegion); // ✅ Use 'let' instead of 'const'

    // ✅ Check if roleNumber already exists (application-level uniqueness)
    const existingRoleNumber = await User.findOne({ roleNumber });
    if (existingRoleNumber) {
      // Regenerate if conflict
      roleNumber = await generateRoleNumber(academicRegion); // ✅ Remove 'const' here
    }

    // ✅ Password hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ✅ Generate OTP
    const otpCode = generateOTP(6);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // ✅ Create student user
    const user = new User({
      fullName,
      dob,
      email: email.toLowerCase(),
      phone,
      academicRegion,
      class: classExists._id, 
      passwordHash,
      role: 'student',
      roleNumber,
      isEmailVerified: false,
      otp: { code: otpCode, expiresAt: otpExpiresAt }
    });

    await user.save();

    // ✅ Send OTP email
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.status(201).json({ 
      message: 'Student registered successfully. OTP sent to email for verification.',
      roleNumber,
      email 
    });
  } catch (err) {
    console.error('Student Register Error:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// ---------------------- VERIFY OTP ----------------------
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.otp || !user.otp.code) return res.status(400).json({ message: 'No OTP found for this user' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });
    if (user.otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (user.otp.code !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    // ✅ Mark verified
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    return res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- STUDENT LOGIN ----------------------
exports.login = async (req, res) => {
  try {
    const { emailOrRoleNumber, password } = req.body;
    
    if (!emailOrRoleNumber || !password) {
      return res.status(400).json({ message: 'Email/Role Number and password required' });
    }

    // ✅ Find user by email OR roleNumber
    const user = await User.findOne({
      $or: [
        { email: emailOrRoleNumber.toLowerCase() },
        { roleNumber: emailOrRoleNumber.toUpperCase() }
      ]
    });
    
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    // ✅ Ensure it's a student
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Please use the correct login portal for your role' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Email not verified. Please verify first.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { 
      id: user._id, 
      role: user.role, 
      email: user.email,
      roleNumber: user.roleNumber
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    return res.json({
      token,
      user: { 
        id: user._id, 
        fullName: user.fullName, 
        email: user.email, 
        role: user.role,
        roleNumber: user.roleNumber,
        class: user.class,
        academicRegion: user.academicRegion
      }
    });
  } catch (err) {
    console.error('Student Login Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- PROFILE ----------------------
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -otp');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Profile Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};