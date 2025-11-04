const mongoose = require('mongoose');

const User = require('../models/User');
const Note = require('../models/Note');
const Subject = require('../models/Subject');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Attendance = require('../models/Attendance');
// ----------------------- RAMU ------------------

// ---------------------- GET STUDENT NOTES BY SUBJECT ----------------------
const getStudentNotes = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).populate('class');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.class) {
      return res
        .status(400)
        .json({ message: 'Student is not assigned to any class' });
    }

    // Get approved notes for student's class
    const notes = await Note.find({
      class: student.class._id,
      status: 'approved',
    })
      .populate('uploadedBy', 'fullName')
      .populate('subject', 'subjectName subjectCode')
      .select('-fileData')
      .sort({ createdAt: -1 });

    // Group notes by subject
    const notesBySubject = {};
    notes.forEach((note) => {
      const subjectName = note.subject.subjectName;
      if (!notesBySubject[subjectName]) {
        notesBySubject[subjectName] = [];
      }
      notesBySubject[subjectName].push(note);
    });

    return res.json({
      message: 'Student notes retrieved successfully',
      class: student.class.className,
      notesBySubject: notesBySubject,
    });
  } catch (err) {
    console.error('Get Student Notes Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};
// ---------------------- DOWNLOAD NOTE ----------------------
const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'fullName email role')
      .populate('class');

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const user = req.user;

    // Admin and teacher who uploaded can always download
    if (
      user.role === 'admin' ||
      (user.role === 'teacher' && note.uploadedBy._id.toString() === user.id)
    ) {
      // Allow download
    }
    // For students: check if note is approved AND student is in same class
    else if (user.role === 'student') {
      const student = await User.findById(user.id).populate('class');

      if (
        !student.class ||
        student.class._id.toString() !== note.class._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: 'This note is not available for your class' });
      }

      if (note.status !== 'approved') {
        return res
          .status(403)
          .json({ message: 'This note is not approved yet' });
      }
    }
    // For other teachers: only if approved
    else if (user.role === 'teacher' && note.status !== 'approved') {
      return res.status(403).json({ message: 'This note is not approved yet' });
    }

    res.set('Content-Type', note.fileMimeType);
    res.set('Content-Disposition', `attachment; filename="${note.fileName}"`);
    return res.send(note.fileData);
  } catch (error) {
    console.error('Download Note Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET STUDENT NOTES BY SPECIFIC SUBJECT ----------------------
const getStudentNotesBySubject = async (req, res) => {
  try {
    const { subjectName } = req.params;
    const student = await User.findById(req.user.id).populate('class');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find subject by name for student's class
    const subject = await Subject.findOne({
      subjectName: new RegExp(subjectName, 'i'),
      class: student.class._id,
    });

    if (!subject) {
      return res
        .status(404)
        .json({ message: 'Subject not found for your class' });
    }

    // Get approved notes for this specific subject and class
    const notes = await Note.find({
      class: student.class._id,
      subject: subject._id,
      status: 'approved',
    })
      .populate('uploadedBy', 'fullName')
      .populate('subject', 'subjectName')
      .select('-fileData')
      .sort({ createdAt: -1 });

    return res.json({
      message: `Notes for ${subject.subjectName} retrieved successfully`,
      subject: subject.subjectName,
      notes: notes,
    });
  } catch (err) {
    console.error('Get Student Notes By Subject Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET CLASS ASSIGNMENTS ----------------------
const getClassAssignments = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const assignments = await Assignment.find({
      class: student.class,
      status: 'active',
    })
      .populate('subject', 'subjectName')
      .populate('uploadedBy', 'fullName')
      .select('-fileData')
      .sort({ dueDate: 1 });

    return res.json(assignments);
  } catch (error) {
    console.error('Get Class Assignments Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- DOWNLOAD ASSIGNMENT (Student) ----------------------
const downloadAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate(
      'class',
      'className'
    );

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const student = await User.findById(req.user.id);

    // Check if student is in the same class
    if (student.class.toString() !== assignment.class._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.set('Content-Type', assignment.fileMimeType);
    res.set(
      'Content-Disposition',
      `attachment; filename="${assignment.fileName}"`
    );
    return res.send(assignment.fileData);
  } catch (error) {
    console.error('Download Assignment Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET MY MARKS BY SUBJECT (Student) ----------------------
const getMyMarksBySubject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subjectName } = req.params;

    if (!subjectName) {
      return res.status(400).json({
        message: 'Subject name is required',
      });
    }

    // Find the student to get their class
    const student = await User.findById(studentId).populate('class');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find subject for the student's class
    const subject = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
      class: student.class._id,
    });

    if (!subject) {
      return res.status(404).json({
        message: `Subject "${subjectName}" not found for your class`,
      });
    }

    // Get all tests for this subject
    const tests = await Test.find({
      subject: subject._id,
      class: student.class._id,
    });

    const testIds = tests.map((test) => test._id);

    // Get marks for these tests
    const marks = await TestResult.find({
      studentID: studentId,
      testID: { $in: testIds },
    })
      .populate('testID', 'title totalMarks testDate')
      .sort({ 'testID.testDate': -1 });

    // Format the response
    const formattedMarks = marks.map((result) => ({
      id: result._id,
      testTitle: result.testID.title,
      marks: result.marks,
      totalMarks: result.testID.totalMarks,
      percentage: ((result.marks / result.testID.totalMarks) * 100).toFixed(2),
      testDate: result.testID.testDate,
      subject: subject.subjectName,
    }));

    return res.json({
      student: student.fullName,
      class: student.class.className,
      subject: subject.subjectName,
      totalTests: formattedMarks.length,
      marks: formattedMarks,
    });
  } catch (error) {
    console.error('Get My Marks By Subject Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ------------------------ SHUBHAM------------------------
/**
 * @route   GET /api/student/me
 * @desc    Get the logged-in student's profile data.
 * @access  Private (Student)
 */
const getMyProfile = async (req, res) => {
  try {
    // 1. Get the student's ID from the authenticated req.user object
    const student = await User.findById(req.user.id)
      .populate({
        path: 'class',
        select: 'classCode className',
      })
      .select(
        // Exclude sensitive fields
        '-passwordHash -otp -resetPasswordOtp -resetPasswordAttempts -__v -teacherStatus -linkedStudents'
      );

    // 2. Check if student was found
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // 3. Send the successful response
    return res.status(200).json({
      success: true,
      message: 'Student data fetched successfully',
      data: student,
    });
  } catch (error) {
    // 4. Handle any server errors
    console.error('Error fetching student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/class
 * @desc    Get the full class data (teacher, subjects) for the logged-in student.
 * @access  Private (Student)
 */
const getMyClassData = async (req, res) => {
  try {
    // 1. Find the student and select ONLY their 'class' field
    const student = await User.findById(req.user.id)
      .populate({
        path: 'class',
        select: 'classCode',
      })
      .select(
        // Exclude sensitive fields
        '-passwordHash -otp -resetPasswordOtp -resetPasswordAttempts -__v -teacherStatus -linkedStudents'
      );

    // 2. Check if a student was found
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // 3. Check if the student is assigned to a class
    if (!student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any class',
      });
    }

    // 4. Find the Class document and populate its fields
    const classData = await Class.findById(student.class)
      .populate({
        path: 'subjects',
        select: 'subjectCode subjectName',
      })
      .select('-__v');

    // 5. Check if the class data was found
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class data not found for this student',
      });
    }

    // 6. Send the successful response
    return res.status(200).json({
      success: true,
      message: 'Student class data fetched successfully',
      data: classData,
    });
  } catch (error) {
    // 7. Handle any server errors
    console.error('Error fetching student class data:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/subjects
 * @desc    Get *only* the subjects for the logged-in student.
 * @access  Private (Student)
 */
const getMySubjects = async (req, res) => {
  try {
    // 1. Find the student and select ONLY their 'class' field
    const student = await User.findById(req.user.id).select('class role');

    // 2. Check if a student was found
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // 3. Check if the student is assigned to a class
    if (!student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any class',
      });
    }

    // 4. Find the Class document and populate *only* its subjects
    const classData = await Class.findById(student.class)
      .populate({
        path: 'subjects',
        select: 'subjectCode subjectName description',
      })
      .select('subjects -_id'); // Select only the 'subjects' field

    // 5. Check if the class data was found
    if (!classData || !classData.subjects) {
      return res.status(404).json({
        success: false,
        message: 'Subject data not found for this student',
      });
    }

    // 6. Send the successful response
    return res.status(200).json({
      success: true,
      message: 'Student subjects fetched successfully',
      data: classData.subjects,
    });
  } catch (error) {
    // 7. Handle any server errors
    console.error('Error fetching student subjects:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/assignments/pending
 * @desc    Get all *non-submitted* (pending) assignments for the logged-in student.
 * @access  Private (Student)
 */
const getMyPendingAssignments = async (req, res) => {
  try {
    // 1. Find the student to get their class ID and their own ID
    const student = await User.findById(req.user.id).select('_id class role');

    // 2. Validate student and their class enrollment
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }
    if (!student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any class',
      });
    }

    // 3. Find the student's class to get the list of subject IDs
    const classData = await Class.findById(student.class).select('subjects');

    // 4. Validate class data
    if (!classData || !classData.subjects) {
      return res.status(404).json({
        success: false,
        message: 'Class subjects not found for this student',
      });
    }
    const subjectIds = classData.subjects;

    // 5. Find all assignments this student *has* submitted
    const submissions = await AssignmentSubmission.find({
      student: student._id,
    }).select('assignment -_id');

    // 6. Create an array of just the assignment IDs that have been submitted
    const submittedAssignmentIds = submissions.map((sub) => sub.assignment);

    // 7. Find all assignments for the class, *excluding* those already submitted
    const pendingAssignments = await Assignment.find({
      subject: { $in: subjectIds },
      _id: { $nin: submittedAssignmentIds },
    })
      .populate('subject', 'subjectName subjectCode')
      .populate('uploadedBy', 'fullName')
      .populate('class', '-subjects -__v -updatedAt -createdAt')
      .sort({ dueDate: 1 })
      .select('-__v');

    // 8. Send the successful response
    return res.status(200).json({
      success: true,
      message: `Found ${pendingAssignments.length} pending assignments`,
      noOfPendingAssignments: pendingAssignments.length,
      data: pendingAssignments,
    });
  } catch (error) {
    // 9. Handle any server errors
    console.error('Error fetching student assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/assignments/submitted
 * @desc    Get all assignments that the logged-in student *has* submitted.
 * @access  Private (Student)
 */
const getMySubmittedAssignments = async (req, res) => {
  try {
    // 1. Find the student by their ID
    const student = await User.findById(req.user.id).select('_id role');

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // 2. Find all submissions for this student's _id
    const submissions = await AssignmentSubmission.find({
      student: student._id,
    })
      .populate({
        path: 'assignment',
        select: 'assignmentName description dueDate subject',
        populate: {
          path: 'subject',
          select: 'subjectName subjectCode',
        },
      })
      .select('-fileData -__v')
      .sort({ submittedAt: -1 });

    // 3. Handle case where student has submitted nothing
    if (!submissions || submissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No submitted assignments found for this student',
        data: [],
      });
    }

    // 4. Send the successful response
    return res.status(200).json({
      success: true,
      message: `Found ${submissions.length} submitted assignments`,
      data: submissions,
    });
  } catch (error) {
    // 5. Handle any server errors
    console.error('Error fetching submitted assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/student/assignments/:assignmentId/submit
 * @desc    Submit an assignment and mark attendance as 'present'
 * @access  Private (Student)
 */
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    // 1. Check for file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF.',
      });
    }

    // 2. Find the assignment
    const assignment = await Assignment.findById(assignmentId)
      .select('subject class dueDate')
      .lean();

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // 3. Check if submission already exists
    const existingSubmission = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: studentId,
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this assignment',
      });
    }

    // 4. Create the new submission
    const now = new Date();
    const submissionStatus = now > assignment.dueDate ? 'late' : 'submitted';

    const newSubmission = new AssignmentSubmission({
      assignment: assignmentId,
      student: studentId,
      fileData: req.file.buffer,
      fileMimeType: req.file.mimetype,
      fileName: req.file.originalname,
      status: submissionStatus,
      submittedAt: now,
    });

    await newSubmission.save();

    // 5. --- UPDATE ATTENDANCE LOGIC (CONDITIONAL) ---
    // **MODIFIED:** Only update attendance if submissionStatus is 'submitted' (on time).

    let attendanceUpdated = false;
    let attendanceRecord = null;

    if (submissionStatus === 'submitted') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // Today at 00:00:00
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // Today at 23:59:59

      // Find and update the attendance record
      attendanceRecord = await Attendance.findOneAndUpdate(
        {
          student: studentId,
          subject: assignment.subject,
          date: { $gte: todayStart, $lte: todayEnd }, // For today only
        },
        {
          $set: {
            status: 'present',
          },
        },
        {
          new: true, // Return the updated document
          upsert: true, // Create if cron job failed
        }
      );

      if (attendanceRecord) {
        attendanceUpdated = true;
      }
    } else {
      // If 'late', do nothing. Attendance remains 'absent'.
      console.log(
        `Late submission for student ${studentId}. Attendance not updated.`
      );
    }

    // 6. Send the successful response
    return res.status(201).json({
      success: true,
      message: `Assignment submitted successfully (Status: ${submissionStatus})`,
      submissionData: newSubmission,
      attendanceUpdated: attendanceUpdated, // Will be 'false' if late
    });
  } catch (error) {
    // 7. Handle any server errors
    console.error('Error submitting assignment:', error);
    if (error.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        message: `File upload error: ${error.message}. Ensure it's a PDF < 10MB.`,
      });
    }
    if (error.message.includes('File upload rejected')) {
      return res
        .status(400)
        .json({ success: false, message: 'Only PDF files are allowed.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/tests
 * @desc    Get all *currently available* tests for the logged-in student.
 * @access  Private (Student)
 */
const getMyAvailableTests = async (req, res) => {
  try {
    // 1. Find the student to get their class ID
    const student = await User.findById(req.user.id).select('class role');

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (!student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any class',
      });
    }

    // 2. Find the class to get the list of subject IDs
    const classData = await Class.findById(student.class).select('subjects');

    if (!classData || !classData.subjects || classData.subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class subjects not found for this student',
      });
    }
    const subjectIds = classData.subjects;

    // 3. Find all *available* tests for those subjects
    const now = new Date();
    const availableTests = await Test.find({
      subject: { $in: subjectIds },
      $and: [
        {
          $or: [
            { availableFrom: { $exists: false } },
            { availableFrom: null },
            { availableFrom: { $lte: now } },
          ],
        },
        {
          $or: [
            { availableUntil: { $exists: false } },
            { availableUntil: null },
            { availableUntil: { $gte: now } },
          ],
        },
      ],
    })
      .populate('subject', 'subjectName subjectCode')
      .sort({ availableUntil: 1 })
      .select('-__v');

    // 4. Send the successful response
    return res.status(200).json({
      success: true,
      message: `Found ${availableTests.length} available tests`,
      noOfAvailableTests: availableTests.length,
      data: availableTests,
    });
  } catch (error) {
    // 5. Handle any server errors
    console.error('Error fetching student tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/attendance
 * @desc    Get the logged-in student's attendance records.
 * @query   ?subjectCode=CODE - (Optional) Filter by subject.
 * @query   ?startDate=YYYY-MM-DD - (Optional) Filter by start date.
 * @query   ?endDate=YYYY-MM-DD - (Optional) Filter by end date.
 * @access  Private (Student)
 */
const getMyAttendance = async (req, res) => {
  try {
    // 1. Get optional filters from query string
    const { subjectCode, startDate, endDate } = req.query;

    // 2. Find the student by their ID
    const student = await User.findById(req.user.id).select('_id role');

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // 3. Build the base filter object for the Attendance query
    const filter = {
      student: student._id, // This filter is always applied
    };

    // 4. Add optional filters

    // --- Subject Filter ---
    if (subjectCode) {
      try {
        const subject = await Subject.findOne({
          subjectCode: subjectCode.toUpperCase(),
        }).select('_id');
        if (!subject) {
          return res.status(404).json({
            success: false,
            message: `Subject not found with code: ${subjectCode}`,
          });
        }
        filter.subject = subject._id;
      } catch (error) {
        console.error('Error finding subject by code:', error);
        return res.status(500).json({
          success: false,
          message: 'Error processing subject code',
          error: error.message,
        });
      }
    }

    // --- Date Range Filter ---
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.date = dateFilter;
    }

    // 5. Execute the main query with all combined filters
    const attendanceRecords = await Attendance.find(filter)
      .populate('subject', 'subjectName subjectCode -_id')
      .populate('markedBy', 'fullName uniqueId -_id')
      .populate('class', 'classCode -_id')
      .sort({ date: -1 });

    // 6. Send the successful response
    return res.status(200).json({
      success: true,
      message: `Found ${attendanceRecords.length} attendance records`,
      query: filter,
      data: attendanceRecords,
    });
  } catch (error) {
    // 7. Handle any server errors
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/attendance/summary
 * @desc    Get attendance summary (% per subject) for the logged-in student.
 * @access  Private (Student)
 * @assumes An 'Attendance' model exists with { student, subject, status }
 */
const getMyAttendanceSummary = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('class role');
    if (!student || student.role !== 'student' || !student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student or student class not found',
      });
    }

    const classData = await Class.findById(student.class)
      .populate('subjects', 'subjectName subjectCode')
      .select('subjects');

    if (!classData || !classData.subjects) {
      return res.status(44).json({
        success: false,
        message: 'Subjects not found for this student',
      });
    }

    const { subjects } = classData;

    // 2. Use Promise.all to fetch attendance counts for all subjects in parallel
    const attendanceSummary = await Promise.all(
      subjects.map(async (subject) => {
        // Count all 'present' records for this student and subject
        const presentClasses = await Attendance.countDocuments({
          student: req.user.id,
          subject: subject._id,
          status: 'present',
        });

        // Count *all* records for this student and subject
        const totalClasses = await Attendance.countDocuments({
          student: req.user.id,
          subject: subject._id,
        });

        // Calculate percentage
        const percentage =
          totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

        return {
          _id: subject._id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          presentClasses,
          totalClasses,
          percentage: parseFloat(percentage.toFixed(2)), // Return as a number
        };
      })
    );

    // 3. Send the successful response
    return res.status(200).json({
      success: true,
      message: 'Attendance summary fetched successfully',
      data: attendanceSummary,
    });
  } catch (error) {
    // 4. Handle any server errors
    console.error('Error fetching attendance summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/student/upcoming-deadlines
 * @desc    Get all tests and assignments due today, tomorrow, or the day after.
 * @access  Private (Student)
 */
const getMyUpcomingDeadlines = async (req, res) => {
  try {
    // 1. Get student and their class/subject info
    const student = await User.findById(req.user.id).select('_id class role');

    if (!student || student.role !== 'student' || !student.class) {
      return res.status(404).json({
        success: false,
        message: 'Student or student class not found',
      });
    }

    const classData = await Class.findById(student.class).select('subjects');

    if (!classData || !classData.subjects) {
      return res.status(404).json({
        success: false,
        message: 'Class subjects not found for this student',
      });
    }
    const subjectIds = classData.subjects;

    // 2. Define the date ranges
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const dayAfterTomorrowStart = new Date(todayStart);
    dayAfterTomorrowStart.setDate(todayStart.getDate() + 2);

    const dayAfterTomorrowEnd = new Date(dayAfterTomorrowStart);
    dayAfterTomorrowEnd.setHours(23, 59, 59, 999);

    // 3. Find all relevant items in parallel
    const [tests, assignments] = await Promise.all([
      // Find tests within the 3-day window
      Test.find({
        subject: { $in: subjectIds },
        testDate: { $gte: todayStart, $lte: dayAfterTomorrowEnd },
      })
        .populate('subject', 'subjectName subjectCode')
        .select('title subject testDate totalMarks')
        .lean(), // Use .lean() for faster read-only ops

      // Find assignments within the 3-day window
      Assignment.find({
        subject: { $in: subjectIds },
        dueDate: { $gte: todayStart, $lte: dayAfterTomorrowEnd },
      })
        .populate('subject', 'subjectName subjectCode')
        .select('title subject dueDate')
        .lean(),
    ]);

    // 4. Combine and categorize the results

    // Add a 'type' and common 'date' field for easy processing
    const combinedDeadlines = [
      ...tests.map((t) => ({ ...t, type: 'test', date: t.testDate })),
      ...assignments.map((a) => ({
        ...a,
        type: 'assignment',
        date: a.dueDate,
      })),
    ];

    const upcoming = {
      today: [],
      tomorrow: [],
      dayAfterTomorrow: [],
    };

    // Sort items into their respective day-buckets
    for (const item of combinedDeadlines) {
      const itemDate = new Date(item.date);

      if (itemDate >= dayAfterTomorrowStart) {
        upcoming.dayAfterTomorrow.push(item);
      } else if (itemDate >= tomorrowStart) {
        upcoming.tomorrow.push(item);
      } else {
        upcoming.today.push(item);
      }
    }

    // 5. Send the successful response
    return res.status(200).json({
      success: true,
      message: 'Upcoming deadlines fetched successfully',
      data: upcoming,
    });
  } catch (error) {
    // 6. Handle any server errors
    console.error('Error fetching upcoming deadlines:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

// ---------------------- GET STUDENT ANNOUNCEMENTS ----------------------
const getStudentAnnouncements = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student's class
    const student = await User.findById(studentId).populate('class');
    if (!student || !student.class) {
      return res.status(400).json({ message: 'Student class not found' });
    }

    // Get announcements for student's class and approved events
    const announcements = await TeacherAnnouncement.find({
      $or: [
        // Student-specific announcements for their class
        { 
          announcementType: 'student', 
          class: student.class._id,
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
      studentClass: student.class.className,
      total: announcements.length,
      announcements: announcements
    });

  } catch (error) {
    console.error('Get Student Announcements Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const TeacherAnnouncement = require('../models/TeacherAnnouncement');
module.exports = {
  getStudentNotes,
  downloadNote,
  getStudentNotesBySubject,
  getClassAssignments,
  downloadAssignment,
  getMyMarksBySubject,
  getMyProfile,
  getMyClassData,
  getMySubjects,
  getMyPendingAssignments,
  getMySubmittedAssignments,
  submitAssignment,
  getMyAvailableTests,
  getMyAttendance,
  getMyAttendanceSummary,
  getMyUpcomingDeadlines,
  getStudentAnnouncements,
};


