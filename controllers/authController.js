const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/User');
const Class = require('../models/Class'); // ✅ ADD THIS IMPORT
const { generateOTP } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { generateRoleNumber } = require('../utils/roleNumber');

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '15');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
      confirmPassword,
    } = req.body;

    // ✅ Required field check
    if (
      !fullName ||
      !dob ||
      !email ||
      !phone ||
      !academicRegion ||
      !className ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Phone validation (+country code)
    if (!/^\+\d{1,3}\d{7,14}$/.test(phone)) {
      return res
        .status(400)
        .json({
          message:
            'Phone number must include country code (e.g., +91XXXXXXXXXX)',
        });
    }

    // ✅ Email & password validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters' });
    }

    // ✅ Check if email already exists (ANY role)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ Check if student email matches any parent email
    const parentWithSameEmail = await User.findOne({
      email: email.toLowerCase(),
      role: 'parent',
    });
    if (parentWithSameEmail) {
      return res.status(400).json({
        message:
          'Student email cannot be same as parent email. Please use a different email address.',
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
      otp: { code: otpCode, expiresAt: otpExpiresAt },
    });

    await user.save();

    // ✅ Send OTP email
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.status(201).json({
      message:
        'Student registered successfully. OTP sent to email for verification.',
      roleNumber,
      email,
    });
  } catch (err) {
    console.error('Student Register Error:', err);

    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- STUDENT REGISTRATION REQUEST ----------------------
// Creates a student request WITHOUT password or OTP. The record is created
// with role: 'student', studentStatus: 'pending', isEmailVerified: false,
// and registrationSource set from req.body.registeredBy.
// Files: profilePicture, governmentProof (multipart/form-data)
exports.studentRequest = async (req, res) => {
  try {
    // Note: multipart/form-data fields arrive as strings
    const {
      fullName,
      dob,
      email,
      phone,
      academicRegion,
      class: className,
      parentDetails: parentDetailsRaw,
      address: addressRaw,
      academicYear,
      howDidYouFindUs,
      registeredBy,
    } = req.body;

    // Basic required checks: at minimum fullName and class must be provided
    if (!fullName || !className) {
      return res.status(400).json({ message: 'fullName and class are required' });
    }

    // Validate registeredBy
    const allowedSources = ['student', 'parent', 'admin'];
    const registrationSource = allowedSources.includes(registeredBy)
      ? registeredBy
      : 'student';

    // Validate class exists (reuse Class model lookup from existing register())
    const classExists = await Class.findOne({ className: className });
    if (!classExists) {
      return res.status(400).json({ message: 'Invalid class selected' });
    }

    // If class is numeric 1-5 require parentDetails. We allow className like '1' or 'Grade 1'.
    let classNumber = null;
    const numMatch = (classExists.className || '').match(/\d+/);
    if (numMatch) classNumber = parseInt(numMatch[0], 10);

    let parentDetails = undefined;
    if (parentDetailsRaw) {
      // parentDetails may be sent as JSON string in multipart forms
      try {
        parentDetails =
          typeof parentDetailsRaw === 'string'
            ? JSON.parse(parentDetailsRaw)
            : parentDetailsRaw;
      } catch (e) {
        // ignore parse error; use raw
        parentDetails = parentDetailsRaw;
      }
    }

    if (classNumber !== null && classNumber >= 1 && classNumber <= 5) {
      if (!parentDetails || !parentDetails.name || !parentDetails.relationship) {
        return res.status(400).json({ message: 'parentDetails required for classes 1-5' });
      }
    }

    // Files handled by multer in route; pick file paths if present
    let profilePicturePath = undefined;
    let governmentProofPath = undefined;
    if (req.files) {
      if (req.files.profilePicture && req.files.profilePicture.length > 0) {
        profilePicturePath = path.join('/uploads', 'students', req.files.profilePicture[0].filename).replace(/\\/g, '/');
      }
      if (req.files.governmentProof && req.files.governmentProof.length > 0) {
        governmentProofPath = path.join('/uploads', 'students', req.files.governmentProof[0].filename).replace(/\\/g, '/');
      }
    }

    // Since passwordHash is required by schema, create a random placeholder hash
    // This ensures the document can be saved but the user cannot login until
    // admin approves and sets a real password (or a separate flow is used).
    const randomToken = Math.random().toString(36).slice(2);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(randomToken, salt);

    // Parse address if provided as JSON string
    let address = undefined;
    if (addressRaw) {
      try {
        address = typeof addressRaw === 'string' ? JSON.parse(addressRaw) : addressRaw;
      } catch (e) {
        address = addressRaw;
      }
    }

    // Create the student request user document
    const studentReq = new User({
      fullName,
      dob: dob ? new Date(dob) : undefined,
      email: email ? email.toLowerCase() : undefined,
      phone,
      academicRegion,
      class: classExists._id,
      passwordHash,
      role: 'student',
      studentStatus: 'pending',
      isEmailVerified: false,
      registrationSource,
      profilePicture: profilePicturePath,
      governmentProof: governmentProofPath,
      parentDetails: parentDetails,
      address: address,
      academicYear,
      howDidYouFindUs,
    });

    await studentReq.save();

    return res.status(201).json({ message: 'Registration request submitted successfully' });
  } catch (err) {
    console.error('Student Request Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// ---------------------- VERIFY OTP ----------------------
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.otp || !user.otp.code)
      return res.status(400).json({ message: 'No OTP found for this user' });
    if (user.isEmailVerified)
      return res.status(400).json({ message: 'Email already verified' });
    if (user.otp.expiresAt < new Date())
      return res.status(400).json({ message: 'OTP expired' });
    if (user.otp.code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    // ✅ Mark verified
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    return res.json({
      message: 'Email verified successfully. You can now login.',
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- STUDENT LOGIN ----------------------
exports.login = async (req, res) => {
  try {
    const { emailOrRoleNumber, password } = req.body;

    if (!emailOrRoleNumber || !password) {
      return res
        .status(400)
        .json({ message: 'Email/Role Number and password required' });
    }

    // ✅ Find user by email OR roleNumber
    const user = await User.findOne({
      $or: [
        { email: emailOrRoleNumber.toLowerCase() },
        { roleNumber: emailOrRoleNumber.toUpperCase() },
      ],
    });

    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    // ✅ Ensure it's a student
    if (user.role !== 'student') {
      return res
        .status(403)
        .json({ message: 'Please use the correct login portal for your role' });
    }

    // If student registration is not approved by admin, block login
    if (user.role === 'student' && user.studentStatus !== 'approved') {
      return res.status(403).json({
        message: 'Your admission request is pending admin approval',
      });
    }

    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: 'Email not verified. Please verify first.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    const payload = {
      id: user._id,
      role: user.role,
      email: user.email,
      roleNumber: user.roleNumber,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
        academicRegion: user.academicRegion,
      },
    });
  } catch (err) {
    console.error('Student Login Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
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
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};
