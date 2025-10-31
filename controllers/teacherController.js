const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { sendCustomEmail } = require('../utils/mailer'); // ✅ Use sendCustomEmail instead
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');
const Meeting = require('../models/Meeting');
const Subject = require('../models/Subject'); 

// ---------------------- TEACHER SIGNUP REQUEST ----------------------
exports.teacherSignup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      countryRegion,
      subjectSpecialization,
      qualification,
      password,
      confirmPassword
    } = req.body;

    // ✅ Required field check
    if (!fullName || !email || !phone || !countryRegion || !subjectSpecialization || !qualification || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Email validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // ✅ Phone validation
    if (!/^\+\d{1,3}\d{7,14}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must include country code' });
    }

    // ✅ Password validation
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // ✅ Check if email already exists (any role)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.role === 'teacher') {
        if (existingUser.teacherStatus === 'pending') {
          return res.status(400).json({ 
            message: 'You have already submitted a request with this email. Please wait for admin approval.' 
          });
        } else if (existingUser.teacherStatus === 'approved') {
          return res.status(400).json({ 
            message: 'Teacher with this email is already approved. Please login.' 
          });
        }
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ Password hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ✅ Handle file upload (ID Proof)
    const idProofUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // ✅ Create teacher with pending status
    const teacher = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      countryRegion,
      subjectSpecialization,
      qualification,
      idProofUrl,
      passwordHash,
      role: 'teacher',
      teacherStatus: 'pending',
      isEmailVerified: true
      // ✅ No roleNumber field for teachers
    });

    await teacher.save();

    // ✅ Send notification email to teacher
    const emailMessage = `
      <h2>Teacher Registration Request Received</h2>
      <p>Dear ${fullName},</p>
      <p>Your teacher registration request has been received and is under review.</p>
      <p>You will receive an email once your account is approved by the admin.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Email: ${email}</li>
        <li>Subject: ${subjectSpecialization}</li>
        <li>Qualification: ${qualification}</li>
      </ul>
      <p>Thank you for your patience.</p>
    `;

    await sendCustomEmail(email, 'Teacher Registration Under Review', emailMessage);

    return res.status(201).json({ 
      message: 'Teacher registration request submitted successfully. Please wait for admin approval.',
      status: 'pending'
    });
  } catch (err) {
    console.error('Teacher Signup Error:', err);
    
    // ✅ Handle specific MongoDB errors
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.roleNumber) {
        return res.status(500).json({ 
          message: 'Database configuration error. Please contact administrator.' 
        });
      }
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- TEACHER LOGIN ----------------------
exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // ✅ Find teacher by email
    const teacher = await User.findOne({ 
      email: email.toLowerCase(), 
      role: 'teacher' 
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    // ✅ Check teacher status
    if (teacher.teacherStatus === 'pending') {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please wait for admin approval.' 
      });
    }

    if (teacher.teacherStatus === 'rejected') {
      return res.status(403).json({ 
        message: `Your account has been rejected. Reason: ${teacher.rejectionReason || 'Contact admin for details.'}` 
      });
    }

    // ✅ REMOVED OTP verification check since teachers don't need it

    const isMatch = await bcrypt.compare(password, teacher.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { 
      id: teacher._id, 
      role: teacher.role, 
      email: teacher.email,
      teacherStatus: teacher.teacherStatus
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    return res.json({
      token,
      user: { 
        id: teacher._id, 
        fullName: teacher.fullName, 
        email: teacher.email, 
        role: teacher.role,
        teacherStatus: teacher.teacherStatus,
        subjectSpecialization: teacher.subjectSpecialization,
        qualification: teacher.qualification
      }
    });
  } catch (err) {
    console.error('Teacher Login Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- TEACHER PROFILE ----------------------
exports.getTeacherProfile = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id)
      .select('-passwordHash -otp');
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.json(teacher);
  } catch (err) {
    console.error('Teacher Profile Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const multer = require('multer');          // Namrata My addition for notes uploading
const Note = require('../models/Note');


//  NOTES UPLOAD FEATURE (Teacher -> Admin Approval) Namrata
// ===============================================================

// Multer setup for in-memory file uploads (≤10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF and Word files allowed.'));
    }
    cb(null, true);
  },
});

exports.uploadMiddleware = upload.single('file');

// ---------------------- UPLOAD NOTE ----------------------
exports.uploadNote = async (req, res) => {
  try {
    const { title, description, subjectId, classId } = req.body;
    const teacherId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const note = new Note({
      title,
      description,
      uploadedBy: teacherId,
      subject: subjectId || undefined,
      class: classId || undefined,
      fileData: req.file.buffer,
      fileMimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSizeMB: +(req.file.size / (1024 * 1024)).toFixed(2),
      status: 'pending',
    });

    await note.save();

    // ✅ Optional: Notify teacher or admin using your existing mailer utils
    // await sendCustomEmail(adminEmail, 'New Note Pending Approval', `Teacher ${req.user.email} uploaded ${note.title}`);

    return res.status(201).json({
      message: 'Note uploaded successfully. Awaiting admin approval.',
      noteId: note._id,
    });
  } catch (error) {
    console.error('Upload Note Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET MY NOTES ----------------------
exports.getMyNotes = async (req, res) => {
  try {
    const teacherId = req.user?.id;
    const notes = await Note.find({ uploadedBy: teacherId }).select('-fileData');
    return res.json(notes);
  } catch (error) {
    console.error('Get My Notes Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- DOWNLOAD NOTE ----------------------
exports.downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('uploadedBy', 'fullName email role');
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Only approved notes can be downloaded by non-teachers
    const user = req.user;
    if (user.role !== 'teacher' && user.role !== 'admin' && note.status !== 'approved') {
      return res.status(403).json({ message: 'This note is not available for download' });
    }

    res.set('Content-Type', note.fileMimeType);
    res.set('Content-Disposition', `attachment; filename="${note.fileName}"`);
    return res.send(note.fileData);
  } catch (error) {
    console.error('Download Note Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};




/// ---------------------- SCHEDULE MEETING ----------------------
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, description, date, durationMinutes, subjectId } = req.body;
    const teacherId = req.user.id;

    if (!title || !date || !durationMinutes || !subjectId) {
      return res.status(400).json({ message: 'Title, date, duration, and subjectId are required.' });
    }

    // Get the subject to find the associated class (fetching from db)
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(400).json({ message: 'Invalid subjectId.' });

    const meeting = new Meeting({
      title,
      description,
      date,
      durationMinutes,
      class: subject.class, // class derived from subject table in db
      subject: subjectId,
      hostedBy: teacherId,
      isInstant: false,
      status: 'scheduled',
    });

    
    // meeting.meetingLink = await createGoogleMeetLink(...) but for now generated in frontend

    await meeting.save();

    // Notify students of that class only
    const students = await User.find({ role: 'student', class: subject.class });
    const emails = students.map(s => s.email).filter(e => e);

    if (emails.length > 0) {
      await sendCustomEmail(
        emails, // toEmail
        `New Meeting Scheduled: ${title}`, // subject
        `<p>Hello,</p>
         <p>A new meeting "<strong>${title}</strong>" has been scheduled for your class.</p>
         <p><b>Description:</b> ${description || 'No description'}</p>
         <p><b>Date:</b> ${new Date(date).toLocaleString()}</p>
         <p><b>Duration:</b> ${durationMinutes} minutes</p>
         <p><b>Join Link:</b> ${meeting.meetingLink || 'To be added'}</p>
         <p><b>Check for notifications in your dashboard.</b></p>
         <p>Best regards,<br>Your Teaching Team</p>`
      );
    }

    return res.status(201).json({
      message: 'Meeting scheduled successfully and students notified.',
      meeting,
    });

  } catch (error) {
    console.error('Schedule Meeting Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- START INSTANT MEETING ----------------------
exports.startInstantMeeting = async (req, res) => {
  try {
    const { title, description, durationMinutes, subjectId } = req.body;
    const teacherId = req.user.id;

    if (!title || !durationMinutes || !subjectId) {
      return res.status(400).json({ message: 'Title, duration, and subjectId are required.' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(400).json({ message: 'Invalid subjectId.' });

    const meeting = new Meeting({
      title,
      description,
      date: new Date(),
      durationMinutes,
      class: subject.class,
      subject: subjectId,
      hostedBy: teacherId,
      isInstant: true,
      status: 'ongoing',
    });

    // Optional: generate Google Meet link here
    // meeting.meetingLink = await createGoogleMeetLink(...);

    await meeting.save();

    // Notify students of that class only
    const students = await User.find({ role: 'student', class: subject.class });
    const emails = students.map(s => s.email).filter(e => e);

    if (emails.length > 0) {
      await sendCustomEmail(
        emails, // toEmail
        `Instant Meeting Started: ${title}`, // subject
        `<p>Hello,</p>
         <p>An instant meeting "<strong>${title}</strong>" has just started for your class.</p>
         <p><b>Description:</b> ${description || 'No description'}</p>
         <p><b>Duration:</b> ${durationMinutes} minutes</p>
         <p><b>Join Link:</b> ${meeting.meetingLink || 'To be added'}</p>
         <p>Best regards,<br>Your Teaching Team</p>`
      );
    }

    return res.status(201).json({
      message: 'Instant meeting started successfully and students notified.',
      meeting,
    });

  } catch (error) {
    console.error('Start Instant Meeting Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET TEACHER MEETINGS ----------------------
exports.getMyMeetings = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const meetings = await Meeting.find({ hostedBy: teacherId }).sort({ date: -1 });
    return res.json(meetings);
  } catch (error) {
    console.error('Get My Meetings Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
