const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/User');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Submission = require('../models/AssignmentSubmission');
const { sendOtpEmail } = require('../utils/mailer');
const { generateOTP } = require('../utils/otp'); // ✅ ADD THIS IMPORT
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '15');

// ---------------------- PARENT REGISTER ----------------------
exports.registerParent = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      linkedStudents,
      password,
      confirmPassword,
    } = req.body;

    // ✅ Required field check
    if (
      !fullName ||
      !email ||
      !phone ||
      !linkedStudents ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Email validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // ✅ Phone validation
    if (!/^\+\d{1,3}\d{7,14}$/.test(phone)) {
      return res.status(400).json({
        message: 'Phone number must include country code (e.g., +91XXXXXXXXXX)',
      });
    }

    // ✅ Password validation
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

    // ✅ Validate linked students exist and get their details
    const studentValidation = await validateLinkedStudents(linkedStudents);
    if (!studentValidation.isValid) {
      return res.status(400).json({ message: studentValidation.error });
    }

    // ✅ Check if parent email matches any student email
    const studentWithSameEmail = await User.findOne({
      email: email.toLowerCase(),
      role: 'student',
    });
    if (studentWithSameEmail) {
      return res.status(400).json({
        message:
          'Parent email cannot be same as student email. Please use a different email address.',
      });
    }

    // ✅ Also check if any linked student has the same email
    for (const studentInfo of studentValidation.studentsInfo) {
      const student = await User.findOne({
        roleNumber: studentInfo.studentId,
        role: 'student',
      });

      if (student && student.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          message: `Your email cannot be same as your child's (${studentInfo.studentName}) email. Please use a different email address.`,
        });
      }
    }

    // ✅ Password hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ✅ Generate OTP
    const otpCode = generateOTP(6);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // ✅ Create parent user
    const parent = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: 'parent',
      linkedStudents,
      isEmailVerified: false,
      otp: { code: otpCode, expiresAt: otpExpiresAt }, // ✅ ADD OTP HERE
    });

    await parent.save();

    // ✅ Send OTP email (CORRECT WAY)
    await sendOtpEmail(email, otpCode, OTP_TTL_MINUTES);

    return res.status(201).json({
      message:
        'Parent registered successfully. OTP sent to email for verification.',
      email,
      linkedStudents: studentValidation.studentsInfo,
    });
  } catch (err) {
    console.error('Parent Register Error:', err);

    // ✅ Handle duplicate key error
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.roleNumber) {
        return res.status(500).json({
          message: 'Registration temporarily unavailable. Please try again.',
        });
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- VALIDATE LINKED STUDENTS ----------------------
async function validateLinkedStudents(linkedStudents) {
  try {
    if (!Array.isArray(linkedStudents) || linkedStudents.length === 0) {
      return { isValid: false, error: 'At least one student must be linked' };
    }

    const studentsInfo = [];

    for (const link of linkedStudents) {
      const { studentId, relationship } = link;

      if (!studentId || !relationship) {
        return {
          isValid: false,
          error: 'Each linked student must have studentId and relationship',
        };
      }

      // Find student by roleNumber
      const student = await User.findOne({
        roleNumber: studentId.toUpperCase(),
        role: 'student',
      });

      if (!student) {
        return {
          isValid: false,
          error: `Student with ID ${studentId} not found`,
        };
      }

      studentsInfo.push({
        studentId: student.roleNumber,
        studentName: student.fullName,
        relationship,
      });
    }

    return { isValid: true, studentsInfo };
  } catch (error) {
    return { isValid: false, error: 'Error validating students' };
  }
}

// ---------------------- PARENT LOGIN ----------------------
exports.loginParent = async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res
        .status(400)
        .json({ message: 'Student ID and password required' });
    }

    // ✅ Find parent by linked student ID
    const parent = await User.findOne({
      'linkedStudents.studentId': studentId.toUpperCase(),
      role: 'parent',
    });

    if (!parent) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    if (!parent.isEmailVerified) {
      return res
        .status(403)
        .json({ message: 'Email not verified. Please verify first.' });
    }

    const isMatch = await bcrypt.compare(password, parent.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // ✅ Get linked student details
    const linkedStudentDetails = await getLinkedStudentDetails(
      parent.linkedStudents
    );

    const payload = {
      id: parent._id,
      role: parent.role,
      email: parent.email,
      linkedStudents: parent.linkedStudents,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return res.json({
      token,
      user: {
        id: parent._id,
        fullName: parent.fullName,
        email: parent.email,
        role: parent.role,
        linkedStudents: linkedStudentDetails,
      },
    });
  } catch (err) {
    console.error('Parent Login Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET LINKED STUDENT DETAILS ----------------------
async function getLinkedStudentDetails(linkedStudents) {
  const studentDetails = [];

  for (const link of linkedStudents) {
    const student = await User.findOne({
      roleNumber: link.studentId,
      role: 'student',
    }).select('fullName class academicRegion roleNumber');

    if (student) {
      studentDetails.push({
        studentId: student.roleNumber,
        studentName: student.fullName,
        class: student.class,
        region: student.academicRegion,
        relationship: link.relationship,
      });
    }
  }

  return studentDetails;
}

// ---------------------- PARENT PROFILE ----------------------
exports.getParentProfile = async (req, res) => {
  try {
    const parent = await User.findById(req.user.id).select('-passwordHash');

    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    // ✅ Get detailed student information
    const linkedStudentDetails = await getLinkedStudentDetails(
      parent.linkedStudents
    );

    const parentProfile = {
      ...parent.toObject(),
      linkedStudents: linkedStudentDetails,
    };

    return res.json(parentProfile);
  } catch (err) {
    console.error('Parent Profile Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

const TeacherAnnouncement = require('../models/TeacherAnnouncement');

// ---------------------- GET PARENT ANNOUNCEMENTS ----------------------
exports.getParentAnnouncements = async (req, res) => {
  try {
    const parentId = req.user.id;
    
    // Get parent's linked students
    const parent = await User.findById(parentId);
    if (!parent || !parent.linkedStudents || parent.linkedStudents.length === 0) {
      return res.json({
        linkedStudents: 0,
        total: 0,
        announcements: []
      });
    }

    // Extract roll numbers from linked students
    const studentRollNumbers = parent.linkedStudents.map(ls => ls.studentId);

    // Find students by their roll numbers (roleNumber)
    const students = await User.find({ 
      roleNumber: { $in: studentRollNumbers },
      role: 'student'
    }).populate('class');

    if (students.length === 0) {
      return res.json({
        linkedStudents: 0,
        total: 0,
        announcements: []
      });
    }

    const studentClasses = students.map(s => s.class._id);

    // Get announcements for students' classes and approved events
    const announcements = await TeacherAnnouncement.find({
      $or: [
        // Student-specific announcements for their children's classes
        { 
          announcementType: 'student', 
          class: { $in: studentClasses },
          status: 'approved'
        },
        // All approved events
        { 
          announcementType: 'event', 
          status: 'approved'
        }
      ]
    })
    .populate('class', 'className')
    .populate('subject', 'subjectName')
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 });

    return res.json({
      linkedStudents: students.length,
      studentNames: students.map(s => s.fullName),
      studentClasses: [...new Set(students.map(s => s.class.className))],
      total: announcements.length,
      announcements: announcements
    });

  } catch (error) {
    console.error('Get Parent Announcements Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};