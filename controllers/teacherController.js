const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { sendCustomEmail } = require('../utils/mailer'); // ✅ Use sendCustomEmail instead
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');
const Meeting = require('../models/Meeting');
const Note = require('../models/Note');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment'); // ✅ ADD THIS LINE
const TestResult = require('../models/TestResult');
const Test = require('../models/Test'); // For clarity
const ScheduledSubject = require('../models/scheduledSubject'); //Neww
const schedule = require('node-schedule');//forTest
const Announcement = require('../models/Announcement');
const TeacherAnnouncement = require('../models/TeacherAnnouncement'); // adjust path

const { DateTime } = require('luxon');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LessonPlanner = require('../models/LessonPlanner');

// ... other imports

// ---------------------- TEACHER SIGNUP REQUEST ----------------------
exports.teacherSignup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      gender,
      countryRegion,
      state,   
      city,    
      qualification,
      password,
      confirmPassword
    } = req.body;

    // ✅ Required field check
    if (!fullName || !email || !phone || !gender || !countryRegion || !state || !city || !qualification || !password || !confirmPassword) {
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

    // ✅ Gender validation
    const allowedGenders = ['Male', 'Female', 'Other'];
    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender value' });
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
      gender,
      countryRegion,
      state,  
      city, 
      qualification,
      idProofUrl,
      passwordHash,
      role: 'teacher',
      teacherStatus: 'pending',
      isEmailVerified: true
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
    
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
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



// ==============================
// MULTER SETUP: Store notes locally (uploads/notes)
// ==============================
const notesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'notes');
    fs.mkdirSync(uploadPath, { recursive: true }); // create folder if doesn't exist
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix);
  }
});

const upload = multer({
  storage: notesStorage,
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

// ==============================
// UPLOAD NOTE CONTROLLER
// ==============================
exports.uploadNote = async (req, res) => {
  try {
    const { title, description, subjectName, className } = req.body;
    const teacherId = req.user.id;

    if (!title || !subjectName || !className) {
      return res.status(400).json({ message: 'Title, subject name, and class name are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Trim and validate class name
    const cleanClassName = className.toString().trim();
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
    }

    // Better subject search
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
      });
    }

    // Save note in MongoDB (store file path instead of binary data)
    const note = new Note({
      title,
      description,
      subject: subject._id,
      class: classData._id,
      uploadedBy: teacherId,
      fileName: req.file.filename,
      filePath: req.file.path,          // store local file path
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'pending'                 // Admin approval required
    });

    await note.save();

    return res.status(201).json({
      message: 'Note uploaded successfully. Waiting for admin approval.',
      note: {
        id: note._id,
        title: note.title,
        subject: subject.subjectName,
        class: classData.className,
        status: note.status
      }
    });

  } catch (error) {
    console.error('Upload Note Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==============================
// DOWNLOAD NOTE CONTROLLER
// ==============================
exports.downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.status !== 'approved') {
      return res.status(404).json({ message: 'Note not found or not approved' });
    }

    res.download(note.filePath, note.fileName);
  } catch (error) {
    console.error('Download Note Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==============================
// VIEW NOTE (INLINE PREVIEW)
// ==============================
exports.viewNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Access control
    const user = req.user;
    if (
      note.status !== 'approved' &&
      user.role !== 'teacher' &&
      user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Note not approved yet' });
    }

    // Check file exists
    if (!fs.existsSync(note.filePath)) {
      return res.status(404).json({ message: 'File missing on server' });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Type', note.fileMimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${note.fileName}"`
    );

    // Stream file
    const fileStream = fs.createReadStream(note.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('View Note Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ==============================
// GET APPROVED NOTES (for eLibrary dashboard)
// ==============================
exports.getApprovedNotes = async (req, res) => {
  try {
    const { className, subjectName } = req.query;

    if (!className || !subjectName) {
      return res.status(400).json({ message: 'className and subjectName are required' });
    }

    const classData = await Class.findOne({ className: className.trim() });
    if (!classData) return res.status(400).json({ message: 'Class not found' });

    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });
    if (!subject) return res.status(400).json({ message: 'Subject not found' });

    const notes = await Note.find({
      class: classData._id,
      subject: subject._id,
      status: 'approved'
    }).select('title description fileName');

    return res.json({ notes });
  } catch (error) {
    console.error('Get Approved Notes Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Helper function to get available subjects for a class
async function getAvailableSubjects(classId) {
  const subjects = await Subject.find({ class: classId });
  return subjects.map(s => s.subjectName).join(', ');
}

// Multer for assignments
const assignmentUpload = multer({
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

exports.uploadAssignmentMiddleware = assignmentUpload.single('file');



// ---------------------- UPLOAD ASSIGNMENT ----------------------
exports.uploadAssignment = async (req, res) => {
  try {
    const { title, description, subjectName, className, dueDate } = req.body;
    const teacherId = req.user.id;

    if (!title || !subjectName || !className || !dueDate) {
      return res.status(400).json({ 
        message: 'Title, subject name, class name, and due date are required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Find class
    const cleanClassName = className.toString().replace(/"/g, '').trim();
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
    }

    // Find subject
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
      });
    }

    // Create assignment
    const assignment = new Assignment({
      title,
      description,
      subject: subject._id,
      class: classData._id,
      uploadedBy: teacherId,
      fileName: req.file.originalname,
      fileData: req.file.buffer,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      dueDate: new Date(dueDate),
      status: 'active'
    });

    await assignment.save();

    return res.status(201).json({
      message: 'Assignment uploaded successfully',
      assignment: {
        id: assignment._id,
        title: assignment.title,
        subject: subject.subjectName,
        class: classData.className,
        dueDate: assignment.dueDate,
        status: assignment.status
      }
    });

  } catch (error) {
    console.error('Upload Assignment Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET MY ASSIGNMENTS ----------------------
exports.getMyAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await Assignment.find({ uploadedBy: teacherId })
      .populate('subject', 'subjectName')
      .populate('class', 'className')
      .select('-fileData')
      .sort({ createdAt: -1 });

    return res.json(assignments);
  } catch (error) {
    console.error('Get My Assignments Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- DOWNLOAD ASSIGNMENT ----------------------
exports.downloadAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('uploadedBy', 'fullName email')
      .populate('class', 'className');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only teacher who uploaded or students from that class can download
    const user = req.user;
    
    if (user.role === 'teacher' && assignment.uploadedBy._id.toString() !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role === 'student' && user.class.toString() !== assignment.class._id.toString()) {
      return res.status(403).json({ message: 'Access denied - not in this class' });
    }

    res.set('Content-Type', assignment.fileMimeType);
    res.set('Content-Disposition', `attachment; filename="${assignment.fileName}"`);
    return res.send(assignment.fileData);

  } catch (error) {
    console.error('Download Assignment Error:', error);
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

// ---------------------- UPDATE TEACHER SUBJECTS ----------------------
exports.updateTeacherSubjects = async (req, res) => {
  try {
    const { subjectSpecialization } = req.body;
    const teacherId = req.user.id;

    const subjectNames = subjectSpecialization.map(name => new RegExp(`^${name}$`, 'i'));
    const subjects = await Subject.find({ 
      subjectName: { $in: subjectNames } 
    });

    if (subjects.length !== subjectSpecialization.length) {
      const missingSubjects = subjectSpecialization.filter(name => 
        !subjects.some(subject => subject.subjectName.toLowerCase() === name.toLowerCase())
      );
      return res.status(400).json({ 
        message: `Invalid subjects: ${missingSubjects.join(', ')}` 
      });
    }

    const subjectIds = subjects.map(subject => subject._id);

    const teacher = await User.findByIdAndUpdate(
      teacherId,
      { subjectSpecialization: subjectIds },
      { new: true }
    ).populate('subjectSpecialization', 'subjectName subjectCode class');

    return res.json({
      message: 'Teacher subjects updated successfully',
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        subjectSpecialization: teacher.subjectSpecialization
      }
    });

  } catch (err) {
    console.error('Update Teacher Subjects Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getTeacherProfile = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id)
      .populate('subjectSpecialization', 'subjectName subjectCode class')
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


// ---------------------- GET STUDENTS BY CLASS AND SUBJECT ----------------------
exports.getStudentsByClassAndSubject = async (req, res) => {
  try {
    const { className, subjectName } = req.params;
    const teacherId = req.user.id;

    if (!className || !subjectName) {
      return res.status(400).json({ 
        message: 'Class name and subject name are required' 
      });
    }

    // Find class
    const cleanClassName = className.toString().replace(/"/g, '').trim();
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
    }

    // Find subject
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
      });
    }

    // Get students from that class
    const students = await User.find({ 
      role: 'student', 
      class: classData._id 
    }).select('_id fullName email rollNumber class');

    return res.json({
      class: classData.className,
      subject: subject.subjectName,
      subjectId: subject._id,
      students: students,
      totalStudents: students.length
    });

  } catch (error) {
    console.error('Get Students By Class & Subject Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- UPLOAD MARKS BY ROLL NUMBER ----------------------
// ---------------------- UPLOAD MARKS BY ROLL NUMBER ----------------------
exports.uploadMarksByRollNumber = async (req, res) => {
  try {
    const { 
      rollNumber,
      subjectName, 
      testTitle, 
      obtainedMarks, 
      totalMarks 
    } = req.body;

    const teacherId = req.user.id;

    if (!rollNumber || !subjectName || !testTitle || !obtainedMarks || !totalMarks) {
      return res.status(400).json({ 
        message: 'Roll number, subject name, test title, obtained marks, and total marks are required' 
      });
    }

    // Find student by roleNumber
    const student = await User.findOne({ 
      roleNumber: rollNumber.toString().trim(),
      role: 'student' 
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found with this roll number' });
    }

    // Find student's class
    const classData = await Class.findById(student.class);
    if (!classData) {
      return res.status(400).json({ message: 'Student class not found' });
    }

    // Find subject for the student's class
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${classData.className}` 
      });
    }

    // Check if marks don't exceed total marks
    if (parseInt(obtainedMarks) > parseInt(totalMarks)) {
      return res.status(400).json({ 
        message: `Obtained marks (${obtainedMarks}) cannot exceed total marks (${totalMarks})` 
      });
    }

    // ✅ FIXED: Create or find test with proper validation
    let test = await Test.findOne({
      title: testTitle,
      subject: subject._id,
      class: classData._id,
      createdBy: teacherId
    });

    if (!test) {
      // Verify teacher exists
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Create test
      test = new Test({
        title: testTitle,
        subject: subject._id,
        class: classData._id,
        totalMarks: parseInt(totalMarks),
        testDate: new Date(),
        createdBy: teacherId
      });
      
      await test.save();
    }

    // Create or update test result
    const testResult = await TestResult.findOneAndUpdate(
      { studentID: student._id, testID: test._id },
      { 
        marks: parseInt(obtainedMarks),
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    ).populate('studentID', 'fullName email roleNumber class')
     .populate('testID');

    // Calculate percentage
    const percentage = ((testResult.marks / test.totalMarks) * 100).toFixed(2);

    return res.status(201).json({
      message: 'Marks uploaded successfully',
      result: {
        id: testResult._id,
        student: testResult.studentID.fullName,
        rollNumber: testResult.studentID.roleNumber,
        class: classData.className,
        subject: subject.subjectName,
        testTitle: test.title,
        obtainedMarks: testResult.marks,
        totalMarks: test.totalMarks,
        percentage: percentage
      }
    });

  } catch (error) {
    console.error('Upload Marks By Roll Number Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Marks already uploaded for this student and test' });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- UPLOAD MULTIPLE MARKS BY ROLL NUMBERS ----------------------
exports.uploadMultipleMarksByRollNumber = async (req, res) => {
  try {
    const { 
      subjectName, 
      testTitle, 
      totalMarks,
      marksData // Array of { rollNumber, obtainedMarks }
    } = req.body;

    const teacherId = req.user.id;

    if (!subjectName || !testTitle || !totalMarks || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ 
        message: 'Subject name, test title, total marks, and marks data array are required' 
      });
    }

    const results = [];
    const errors = [];

    // Process each student's marks
    for (const mark of marksData) {
      try {
        const { rollNumber, obtainedMarks } = mark;

        if (!rollNumber || obtainedMarks === undefined) {
          errors.push(`Missing roll number or marks for entry: ${JSON.stringify(mark)}`);
          continue;
        }

        // ✅ FIX: Find student by roleNumber (not rollNumber)
        const student = await User.findOne({ 
          roleNumber: rollNumber.toString().trim(),  // CHANGED: rollNumber → roleNumber
          role: 'student' 
        });

        if (!student) {
          errors.push(`Student not found with roll number: ${rollNumber}`);
          continue;
        }

        // Find student's class
        const classData = await Class.findById(student.class);
        if (!classData) {
          errors.push(`Class not found for student: ${rollNumber}`);
          continue;
        }

        // Find subject for the student's class
        const subject = await Subject.findOne({
          subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
          class: classData._id
        });

        if (!subject) {
          errors.push(`Subject "${subjectName}" not found for class ${classData.className} (Roll: ${rollNumber})`);
          continue;
        }

        // Check if marks don't exceed total marks
        if (parseInt(obtainedMarks) > parseInt(totalMarks)) {
          errors.push(`Marks (${obtainedMarks}) exceed total marks for roll number: ${rollNumber}`);
          continue;
        }

        // Create or find test
        let test = await Test.findOne({
          title: testTitle,
          subject: subject._id,
          class: classData._id,
          createdBy: teacherId
        });

        if (!test) {
          test = new Test({
            title: testTitle,
            subject: subject._id,
            class: classData._id,
            totalMarks: parseInt(totalMarks),
            testDate: new Date(),
            createdBy: teacherId
          });
          await test.save();
        }

        // Create or update test result
        const testResult = await TestResult.findOneAndUpdate(
          { studentID: student._id, testID: test._id },
          { 
            marks: parseInt(obtainedMarks),
          },
          { 
            new: true, 
            upsert: true,
            runValidators: true 
          }
        ).populate('studentID', 'fullName email roleNumber');

        const percentage = ((testResult.marks / test.totalMarks) * 100).toFixed(2);

        results.push({
          student: testResult.studentID.fullName,
          rollNumber: testResult.studentID.roleNumber,  // CHANGED: rollNumber → roleNumber
          class: classData.className,
          obtainedMarks: testResult.marks,
          totalMarks: test.totalMarks,
          percentage: percentage
        });

      } catch (error) {
        errors.push(`Error for roll number ${mark.rollNumber}: ${error.message}`);
      }
    }

    return res.status(201).json({
      message: `Marks uploaded for ${results.length} students`,
      subject: subjectName,
      testTitle: testTitle,
      totalMarks: totalMarks,
      successful: results,
      errors: errors,
      totalProcessed: results.length + errors.length
    });

  } catch (error) {
    console.error('Upload Multiple Marks By Roll Number Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET STUDENTS BY CLASS AND SUBJECT ----------------------
// ---------------------- GET STUDENTS BY CLASS AND SUBJECT ----------------------
exports.getStudentsByClassAndSubject = async (req, res) => {
  try {
    const { className, subjectName } = req.params;
    const teacherId = req.user.id;

    if (!className || !subjectName) {
      return res.status(400).json({ 
        message: 'Class name and subject name are required' 
      });
    }

    // Find class
    const cleanClassName = className.toString().replace(/"/g, '').trim();
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
    }

    // Find subject
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
      });
    }

    // Get students from that class - FIXED: use roleNumber instead of rollNumber
    const students = await User.find({ 
      role: 'student', 
      class: classData._id 
    }).select('_id fullName email roleNumber class'); // ✅ CHANGED: rollNumber → roleNumber

    return res.json({
      class: classData.className,
      subject: subject.subjectName,
      subjectId: subject._id,
      students: students,
      totalStudents: students.length
    });

  } catch (error) {
    console.error('Get Students By Class & Subject Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// ---------------------- GET STUDENT MARKS BY ROLL NUMBER ----------------------
exports.getStudentMarks = async (req, res) => {
  try {
    const { rollNumber } = req.body;
    
    if (!rollNumber) {
      return res.status(400).json({ message: 'Roll number is required in request body' });
    }

    // Find student by roll number
    const student = await User.findOne({ 
      roleNumber: rollNumber.toString().trim(),
      role: 'student' 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found with this roll number' });
    }

    // Get all marks for this student
    const marks = await TestResult.find({ studentID: student._id })
      .populate('testID', 'title totalMarks testDate')
      .populate({
        path: 'testID',
        populate: {
          path: 'subject',
          select: 'subjectName'
        }
      })
      .populate({
        path: 'testID', 
        populate: {
          path: 'class',
          select: 'className'
        }
      })
      .sort({ 'testID.testDate': -1 });

    // Format response
    const formattedMarks = marks.map(result => ({
      id: result._id,
      testTitle: result.testID.title,
      marks: result.marks,
      totalMarks: result.testID.totalMarks,
      percentage: ((result.marks / result.testID.totalMarks) * 100).toFixed(2),
      testDate: result.testID.testDate,
      subject: result.testID.subject.subjectName,
      class: result.testID.class.className
    }));

    return res.json({
      student: {
        id: student._id,
        fullName: student.fullName,
        rollNumber: student.roleNumber,
        class: student.class
      },
      totalTests: formattedMarks.length,
      marks: formattedMarks
    });

  } catch (error) {
    console.error('Get Student Marks Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET CLASS MARKS ----------------------
exports.getClassMarks = async (req, res) => {
  try {
    const { className, subjectName } = req.body;
    const teacherId = req.user.id;

    if (!className || !subjectName) {
      return res.status(400).json({ 
        message: 'Class name and subject name are required in request body' 
      });
    }

    // Find class
    const cleanClassName = className.toString().replace(/"/g, '').trim();
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
    }

    // Find subject
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
      });
    }

    // Get all tests for this class and subject
    const tests = await Test.find({ 
      class: classData._id,
      subject: subject._id
    });

    const testIds = tests.map(test => test._id);

    // Get all marks for these tests
    const marks = await TestResult.find({ 
      testID: { $in: testIds }
    })
    .populate('studentID', 'fullName roleNumber')
    .populate('testID', 'title totalMarks testDate')
    .sort({ 'testID.testDate': -1 });

    // Group marks by student
    const studentMarks = {};
    marks.forEach(result => {
      const studentId = result.studentID._id.toString();
      if (!studentMarks[studentId]) {
        studentMarks[studentId] = {
          student: {
            id: result.studentID._id,
            fullName: result.studentID.fullName,
            rollNumber: result.studentID.roleNumber
          },
          tests: []
        };
      }
      
      studentMarks[studentId].tests.push({
        testTitle: result.testID.title,
        marks: result.marks,
        totalMarks: result.testID.totalMarks,
        percentage: ((result.marks / result.testID.totalMarks) * 100).toFixed(2),
        testDate: result.testID.testDate
      });
    });

    return res.json({
      class: classData.className,
      subject: subject.subjectName,
      totalStudents: Object.keys(studentMarks).length,
      totalTests: tests.length,
      studentMarks: Object.values(studentMarks)
    });

  } catch (error) {
    console.error('Get Class Marks Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET MY UPLOADED MARKS ----------------------
exports.getMyUploadedMarks = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get all tests created by this teacher
    const tests = await Test.find({ createdBy: teacherId });
    const testIds = tests.map(test => test._id);

    // Get all marks for these tests
    const marks = await TestResult.find({ testID: { $in: testIds } })
      .populate('studentID', 'fullName roleNumber')
      .populate('testID', 'title totalMarks testDate')
      .populate({
        path: 'testID',
        populate: {
          path: 'subject',
          select: 'subjectName'
        }
      })
      .populate({
        path: 'testID',
        populate: {
          path: 'class', 
          select: 'className'
        }
      })
      .sort({ 'testID.testDate': -1 });

    // Format response
    const formattedMarks = marks.map(result => ({
      id: result._id,
      student: {
        fullName: result.studentID.fullName,
        rollNumber: result.studentID.roleNumber
      },
      testTitle: result.testID.title,
      marks: result.marks,
      totalMarks: result.testID.totalMarks,
      percentage: ((result.marks / result.testID.totalMarks) * 100).toFixed(2),
      testDate: result.testID.testDate,
      subject: result.testID.subject.subjectName,
      class: result.testID.class.className
    }));

    return res.json({
      totalUploaded: formattedMarks.length,
      marks: formattedMarks
    });

  } catch (error) {
    console.error('Get My Uploaded Marks Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//Neww
// ------------------- ADD SUBJECT REQUEST -------------------
exports.addScheduledSubject = async (req, res) => {
  try {
    const { email, classId, subjectName } = req.body;

    // 1️⃣ Find teacher by email
    const teacher = await User.findOne({ email, role: 'teacher' });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // 2️⃣ Find class
    const selectedClass = await Class.findById(classId).populate('subjects');
    if (!selectedClass) return res.status(404).json({ message: 'Class not found' });

    // 3️⃣ Find subject in that class
    const subject = await Subject.findOne({ subjectName, class: classId });
    if (!subject)
      return res.status(400).json({ message: 'Subject not found in class list' });

    // 4️⃣ Check if already requested
    const existing = await ScheduledSubject.findOne({
      teacher: teacher._id,
      class: classId,
      subject: subject._id,
    });
    if (existing)
      return res.status(400).json({ message: 'You already requested this subject' });

    // 5️⃣ Create new scheduled subject
    const newScheduled = await ScheduledSubject.create({
      teacher: teacher._id,
      class: classId,
      subject: subject._id,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Subject request submitted. Waiting for admin approval.',
      data: newScheduled,
    });
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ------------------- SUBJECT LIST FOR SELECTED CLASS (Approved Only) -------------------
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Fetch only approved scheduled subjects for this class
    const approvedSubjects = await ScheduledSubject.find({ teacher: teacherId, status: 'approved' })
      .populate('subject', 'subjectName')
      .populate('class', 'className')   // Get subject name
      .populate('teacher', 'fullName email'); // Optional: include teacher info

    if (!approvedSubjects || approvedSubjects.length === 0) {
      return res.status(200).json({ subjects: [] }); // Return empty array if none approved
    }

    // Map to simple array to send only necessary info
    const subjectsForFrontend = approvedSubjects.map((item) => ({
      subjectId: item.subject._id,
      subjectName: item.subject.subjectName,
      teacherName: item.teacher.fullName,
      teacherEmail: item.teacher.email,
      className: item.class.className
    }));

    res.status(200).json({ subjects: subjectsForFrontend });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// new test
const countryToTimezone = {
  India: 'Asia/Kolkata',
  USA: 'America/New_York',
  UK: 'Europe/London',
  // add more countries as needed
};

// Create a new test for teacher
exports.teacherCreateTest = async (req, res) => {
  try {
    const { title, subject, class: classId, totalMarks, testDate, link } = req.body;

    // Validate required fields including link
    if (!title || !subject || !classId || !totalMarks || !link) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, subject, class, totalMarks, and link are required.' 
      });
    }

    // 1️⃣ Get teacher's timezone
    const teacher = await User.findById(req.user?._id);
    const teacherRegion = countryToTimezone[teacher?.countryRegion] || 'UTC';

    // 2️⃣ Parse and convert testDate to UTC
    let testDateUTC;

    if (testDate) {
      let localDateTime;

      if (testDate.includes('T')) {
        // ISO format from frontend calendar
        localDateTime = DateTime.fromISO(testDate, { zone: teacherRegion });
      } else {
        // "dd-mm-yyyy HH:mm" format
        const [datePart, timePart] = testDate.split(' ');
        if (!datePart || !timePart) {
          return res.status(400).json({ success: false, message: 'Invalid testDate format.' });
        }
        const [day, month, year] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');

        localDateTime = DateTime.fromObject({
          day: parseInt(day, 10),
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          hour: parseInt(hours, 10),
          minute: parseInt(minutes, 10)
        }, { zone: teacherRegion });
      }

      if (!localDateTime.isValid) {
        return res.status(400).json({ success: false, message: 'Could not parse testDate. Check format and timezone.' });
      }

      testDateUTC = localDateTime.toUTC().toJSDate();
    } else {
      // Default to current UTC time if missing
      testDateUTC = new Date();
    }

    // 3️⃣ Save the test
    const newTest = await Test.create({
      title,
      subject,
      class: classId,
      totalMarks,
      testDate: testDateUTC,
      link,
      createdBy: req.user?._id || null,
      status: 'pending'
    });

    res.status(201).json({ success: true, test: newTest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// Get all tests created by teacher
exports.getTeacherTests = async (req, res) => {
  try {
    const teacher = await User.findById(req.user?._id);
    const teacherRegion = teacher?.countryRegion || 'UTC';

    const tests = await Test.find({ createdBy: req.user._id })
      .populate('subject')
      .populate('class');

    // Convert testDate from UTC → teacher's local timezone
    const testsWithLocalTime = tests.map(test => ({
      ...test.toObject(),
      testDateLocal: DateTime.fromJSDate(test.testDate)
                             .setZone(teacherRegion)
                             .toLocaleString(DateTime.DATETIME_MED)
    }));

    res.status(200).json({ success: true, tests: testsWithLocalTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// const TeacherAnnouncement = require('../models/TeacherAnnouncement');
// // ---------------------- CREATE ANNOUNCEMENT ----------------------
// exports.createAnnouncement = async (req, res) => {
//   try {
//     const { 
//       title, 
//       description, 
//       announcementType, 
//       className, 
//       subjectName,
//       eventDate,
//       eventLocation 
//     } = req.body;

//     const teacherId = req.user.id;

//     // Validation
//     if (!title || !description || !announcementType) {
//       return res.status(400).json({ 
//         message: 'Title, description, and announcement type are required' 
//       });
//     }

//     if (announcementType === 'student' && (!className || !subjectName)) {
//       return res.status(400).json({ 
//         message: 'Class name and subject name are required for student announcements' 
//       });
//     }

//     let classData = null;
//     let subject = null;

//     // For student announcements, validate class and subject
//     if (announcementType === 'student') {
//       // Find class
//       const cleanClassName = className.toString().replace(/"/g, '').trim();
//       classData = await Class.findOne({ className: cleanClassName });
//       if (!classData) {
//         return res.status(400).json({ message: `Class "${cleanClassName}" not found` });
//       }

//       // Find subject
//       subject = await Subject.findOne({
//         subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
//         class: classData._id
//       });

//       if (!subject) {
//         return res.status(400).json({ 
//           message: `Subject "${subjectName}" not found for class ${cleanClassName}` 
//         });
//       }
//     }

//     // Create announcement
//     const announcement = new TeacherAnnouncement({
//       title,
//       description,
//       announcementType,
//       class: classData ? classData._id : undefined,
//       subject: subject ? subject._id : undefined,
//       createdBy: teacherId,
//       eventDate: eventDate ? new Date(eventDate) : undefined,
//       eventLocation: eventLocation || undefined,
//       // Events go to admin for approval, student announcements are auto-approved
//       status: announcementType === 'student' ? 'approved' : 'pending'
//     });

//     await announcement.save();

//     // Populate for response
//     await announcement.populate('class', 'className');
//     await announcement.populate('subject', 'subjectName');
//     await announcement.populate('createdBy', 'fullName');

//     return res.status(201).json({
//       message: announcementType === 'student' 
//         ? 'Announcement created successfully for students' 
//         : 'Event announcement submitted for admin approval',
//       announcement: {
//         id: announcement._id,
//         title: announcement.title,
//         announcementType: announcement.announcementType,
//         class: announcement.class ? announcement.class.className : null,
//         subject: announcement.subject ? announcement.subject.subjectName : null,
//         status: announcement.status,
//         createdAt: announcement.createdAt
//       }
//     });

//   } catch (error) {
//     console.error('Create Announcement Error:', error);
//     return res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };



// ---------------------- TEACHER CREATE ANNOUNCEMENT ----------------------
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience } = req.body;
    const teacherId = req.user.id;

    if (!title || !message || !audience) {
      return res.status(400).json({ message: 'Title, message and audience are required' });
    }

    const announcements = [];

    const baseData = {
      title,
      description: message,        // 🔑 schema expects description
      announcementType: 'student', // 🔑 valid enum value
      createdBy: teacherId
    };

    if (audience === 'Students Only') {
      const ann = new TeacherAnnouncement({
        ...baseData
      });
      await ann.save();
      announcements.push(ann);

    } else if (audience === 'Parents Only') {
      const ann = new TeacherAnnouncement({
        ...baseData
      });
      await ann.save();
      announcements.push(ann);

    } else if (audience === 'Parents & Students') {
      const annStudent = new TeacherAnnouncement({
        ...baseData
      });

      const annParent = new TeacherAnnouncement({
        ...baseData
      });

      await annStudent.save();
      await annParent.save();

      announcements.push(annStudent, annParent);

    } else {
      return res.status(400).json({ message: 'Invalid audience selection' });
    }

    return res.status(201).json({
      message: 'Announcement(s) created successfully by teacher',
      count: announcements.length,
      announcements
    });

  } catch (err) {
    console.error('Teacher Create Announcement Error:', err);
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};


// ---------------------- GET MY ANNOUNCEMENTS ----------------------
exports.getMyAnnouncements = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const announcements = await TeacherAnnouncement.find({ createdBy: teacherId })
      .populate('class', 'className')
      .populate('subject', 'subjectName')
      .populate('createdBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 });

    return res.json({
      total: announcements.length,
      announcements: announcements
    });

  } catch (error) {
    console.error('Get My Announcements Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- UPDATE ANNOUNCEMENT ----------------------
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventDate, eventLocation } = req.body;
    const teacherId = req.user.id;

    const announcement = await TeacherAnnouncement.findOne({ 
      _id: id, 
      createdBy: teacherId,
      status: { $in: ['pending', 'approved'] }
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found or cannot be updated' });
    }

    // Update fields
    if (title) announcement.title = title;
    if (description) announcement.description = description;
    if (eventDate) announcement.eventDate = new Date(eventDate);
    if (eventLocation) announcement.eventLocation = eventLocation;

    // If it was approved, send back to pending for admin review
    if (announcement.status === 'approved' && announcement.announcementType === 'event') {
      announcement.status = 'pending';
    }

    await announcement.save();
    await announcement.populate('class', 'className');
    await announcement.populate('subject', 'subjectName');

    return res.json({
      message: 'Announcement updated successfully',
      announcement: announcement
    });

  } catch (error) {
    console.error('Update Announcement Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- DELETE ANNOUNCEMENT ----------------------
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const announcement = await TeacherAnnouncement.findOne({ 
      _id: id, 
      createdBy: teacherId 
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await TeacherAnnouncement.findByIdAndDelete(id);

    return res.json({
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete Announcement Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Get all tests created by teacher
exports.getTeacherTests = async (req, res) => {
  try {
    const teacher = await User.findById(req.user?._id);
    const teacherRegion = teacher?.countryRegion || 'UTC';

    const tests = await Test.find({ createdBy: req.user._id })
      .populate('subject')
      .populate('class');

    // Convert testDate from UTC → teacher's local timezone
    const testsWithLocalTime = tests.map(test => ({
      ...test.toObject(),
      testDateLocal: DateTime.fromJSDate(test.testDate)
                             .setZone(teacherRegion)
                             .toLocaleString(DateTime.DATETIME_MED)
    }));

    res.status(200).json({ success: true, tests: testsWithLocalTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// -------------------- GET TOTAL NOTES FOR A SUBJECT BY TEACHER--------------------

exports.getNotesCountByClassAndSubject = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { className, subjectName } = req.query;

    if (!className || !subjectName) {
      return res.status(400).json({ message: 'Both class name and subject name are required.' });
    }

    const cleanClassName = className.toString().replace(/"/g, '').trim();

    // Find class
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(404).json({ message: `Class "${cleanClassName}" not found.` });
    }

    // Find subject for that class
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(404).json({ message: `Subject "${subjectName}" not found for class "${cleanClassName}".` });
    }

    // Count notes uploaded by teacher for this class and subject
    const noteCount = await Note.countDocuments({
      uploadedBy: teacherId,
      class: classData._id,
      subject: subject._id
    });

    return res.status(200).json({
      success: true,
      message: 'Note count for class and subject fetched successfully.',
      teacherId,
      className: cleanClassName,
      subjectName,
      noteCount
    });

  } catch (error) {
    console.error('Error fetching note count:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching note count.',
      error: error.message
    });
  }
};

// -------------------- GET TOTAL TEST FOR A SUBJECT BY TEACHER --------------------

exports.getTotalTestsByTeacherForSubject = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { subjectName, className } = req.query;

    if (!subjectName || !className) {
      return res.status(400).json({ message: 'Subject name and class name are required.' });
    }

    const cleanClassName = className.toString().replace(/"/g, '').trim();

    // Find class
    const classData = await Class.findOne({ className: cleanClassName });
    if (!classData) {
      return res.status(404).json({ message: `Class "${cleanClassName}" not found.` });
    }

    // Find subject for that class
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: classData._id
    });

    if (!subject) {
      return res.status(404).json({ message: `Subject "${subjectName}" not found for class "${cleanClassName}".` });
    }

    // Count tests created by teacher for that subject and class
    const totalTests = await Test.countDocuments({
      createdBy: teacherId,
      subject: subject._id,
      class: classData._id
    });

    return res.status(200).json({
      success: true,
      message: `Total tests for ${subjectName} in class ${cleanClassName} by teacher.`,
      subjectName,
      className: cleanClassName,
      totalTests
    });

  } catch (error) {
    console.error('Error fetching total tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching total tests.',
      error: error.message
    });
  }
};

// ---------------- Add Lesson lessonplanner----------------
exports.addLesson = async (req, res) => {
  try {
    const { subjectId, title, date, startTime, endTime } = req.body;
    const teacherId = req.user.id;

    if (!subjectId || !title || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Convert date from dd-mm-yyyy to yyyy-mm-dd for JS Date
    const [day, month, year] = date.split('-').map(Number);
    const lessonDate = new Date(year, month - 1, day);

    const lesson = new LessonPlanner({
      teacher: teacherId,
      subject: subjectId,
      date: lessonDate,
      title,
      startTime,
      endTime
    });

    await lesson.save();
    return res.status(201).json({ message: 'Lesson added successfully', lesson });
  } catch (error) {
    console.error('Add Lesson Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------- Get Lessons for a Teacher ----------------
exports.getMyLessons = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const lessons = await LessonPlanner.find({ teacher: teacherId })
      .populate('subject', 'subjectName')
      .sort({ date: 1, startTime: 1 });

    return res.json({ lessons });
  } catch (error) {
    console.error('Get Lessons Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------- Get Next Lesson ----------------
exports.getNextLesson = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const now = new Date();

    // Find next lesson today or later
    const nextLesson = await LessonPlanner.findOne({
      teacher: teacherId,
      date: { $gte: now }
    })
      .populate('subject', 'subjectName')
      .sort({ date: 1, startTime: 1 });

    if (!nextLesson) return res.json({ message: 'No upcoming lessons' });

    return res.json({ nextLesson });
  } catch (error) {
    console.error('Get Next Lesson Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------- Get Subjects for Teacher (Dropdown) ----------------
exports.getSubjectsByTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const subjects = await Subject.find({ teacher: teacherId }).select('subjectName');
    return res.json({ subjects });
  } catch (error) {
    console.error('Get Subjects Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- Get Next Lesson for Subject ----------------------
exports.getNextLessonForSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const teacherId = req.user.id;

    if (!subjectId) return res.status(400).json({ message: 'Subject ID is required' });

    const now = new Date();

    // Find next lesson for this subject for this teacher, sorted by date & startTime
    const nextLesson = await LessonPlanner.findOne({
      teacher: teacherId,
      subject: subjectId,
      date: { $gte: now.toISOString().split('T')[0] } // filter today or later
    })
      .sort({ date: 1, startTime: 1 })
      .populate('subject', 'subjectName');

    if (!nextLesson) return res.status(404).json({ message: 'No upcoming lessons found' });

    return res.json({ nextLesson });
  } catch (error) {
    console.error('Get Next Lesson Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- Get All Lessons for Teacher ----------------------
exports.getMyLessons = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const lessons = await LessonPlanner.find({ teacher: teacherId }).populate('subject', 'subjectName').sort({ date: 1, startTime: 1 });
    return res.json({ lessons });
  } catch (error) {
    console.error('Get My Lessons Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};