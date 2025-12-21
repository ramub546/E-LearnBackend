const User = require('../models/User');
const { sendCustomEmail } = require('../utils/mailer');
const { generateRoleNumber } = require('../utils/roleNumber');
const bcrypt = require('bcryptjs');
const ScheduledSubject = require('../models/scheduledSubject');
const Announcement = require('../models/Announcement');
const TestResult = require('../models/TestResult');
const Test = require('../models/Test'); // Assuming Test.js is in models
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance'); // Make sure path is correct
// const User = require('../models/User');
const mongoose = require('mongoose'); // Need this for ID validation
const LessonPlanner = require('../models/LessonPlanner');

// ---------------------- GET PENDING TEACHERS ----------------------
exports.getPendingTeachers = async (req, res) => {
  try {
    const pendingTeachers = await User.find({
      role: 'teacher',
      teacherStatus: 'pending',
    }).select('-passwordHash -otp');

    return res.json({
      message: 'Pending teachers retrieved successfully',
      count: pendingTeachers.length,
      teachers: pendingTeachers,
    });
  } catch (err) {
    console.error('Get Pending Teachers Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ALL TEACHERS ----------------------
exports.getAllTeachers = async (req, res) => {
  try {
    const { status } = req.query; // pending, approved, rejected

    const filter = { role: 'teacher' };
    if (status) filter.teacherStatus = status;

    const teachers = await User.find(filter)
      .select('-passwordHash -otp')
      .sort({ createdAt: -1 });

    return res.json({
      message: 'Teachers retrieved successfully',
      count: teachers.length,
      teachers: teachers,
    });
  } catch (err) {
    console.error('Get All Teachers Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET TEACHER BY EMAIL ----------------------
exports.getTeacherByEmail = async (req, res) => {
  try {
    const { teacherEmail } = req.params;

    const teacher = await User.findOne({
      email: teacherEmail,
      role: 'teacher',
    }).select('-passwordHash -otp');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.json({
      message: 'Teacher retrieved successfully',
      teacher: teacher,
    });
  } catch (err) {
    console.error('Get Teacher By Email Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- APPROVE TEACHER BY EMAIL ----------------------
exports.approveTeacherByEmail = async (req, res) => {
  try {
    const { teacherEmail } = req.params;
    const adminId = req.user.id;

    const teacher = await User.findOne({
      email: teacherEmail,
      role: 'teacher',
      teacherStatus: 'pending',
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ message: 'Pending teacher not found with this email' });
    }

    // ✅ Update teacher status
    teacher.teacherStatus = 'approved';
    teacher.approvedAt = new Date();
    teacher.approvedBy = adminId;

    await teacher.save();

    // ✅ Send approval email to teacher
    const approvalEmail = `
      <h2>🎉 Teacher Account Approved!</h2>
      <p>Dear ${teacher.fullName},</p>
      <p>We are pleased to inform you that your teacher account has been approved by the administration.</p>
      <p><strong>You can now login to your account and start using the platform.</strong></p>
      <p><strong>Login Details:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${teacher.email}</li>
        <li><strong>Status:</strong> Approved</li>
        <li><strong>Subject:</strong> ${teacher.subjectSpecialization}</li>
      </ul>
      <p>Welcome to our teaching community! We look forward to working with you.</p>
      <p>Best regards,<br>Administration Team</p>
    `;

    await sendCustomEmail(
      teacher.email,
      'Teacher Account Approved - Welcome!',
      approvalEmail
    );

    return res.json({
      message: 'Teacher approved successfully',
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        subjectSpecialization: teacher.subjectSpecialization,
        status: teacher.teacherStatus,
      },
    });
  } catch (err) {
    console.error('Approve Teacher Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- REJECT TEACHER BY EMAIL ----------------------
exports.rejectTeacherByEmail = async (req, res) => {
  try {
    const { teacherEmail } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const teacher = await User.findOne({
      email: teacherEmail,
      role: 'teacher',
      teacherStatus: 'pending',
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ message: 'Pending teacher not found with this email' });
    }

    // ✅ Update teacher status
    teacher.teacherStatus = 'rejected';
    teacher.rejectionReason = rejectionReason;

    await teacher.save();

    // ✅ Send rejection email to teacher
    const rejectionEmail = `
      <h2>Teacher Registration Update</h2>
      <p>Dear ${teacher.fullName},</p>
      <p>Thank you for your interest in joining our teaching platform.</p>
      <p>After careful review, we regret to inform you that your teacher registration request has not been approved at this time.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
      <p>If you have any questions or would like to discuss this further, please contact our administration team.</p>
      <p>We appreciate your understanding and encourage you to apply again in the future if your circumstances change.</p>
      <p>Best regards,<br>Administration Team</p>
    `;

    await sendCustomEmail(
      teacher.email,
      'Teacher Registration Status Update',
      rejectionEmail
    );

    return res.json({
      message: 'Teacher rejected successfully',
    });
  } catch (err) {
    console.error('Reject Teacher Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};
// ---------------------- GET ALL STUDENTS ----------------------
exports.getAllStudents = async (req, res) => {
  try {
    const { class: className, region } = req.query;

    const filter = { role: 'student' };
    if (className) filter.class = className;
    if (region) filter.academicRegion = new RegExp(region, 'i');

    const students = await User.find(filter)
      .select('-passwordHash -otp')
      .sort({ createdAt: -1 });

    return res.json({
      message: 'Students retrieved successfully',
      count: students.length,
      students: students,
    });
  } catch (err) {
    console.error('Get All Students Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET PENDING STUDENT REQUESTS ----------------------
// Returns students with studentStatus === 'pending'. Excludes sensitive fields
// like passwordHash and otp, and returns full student, parentDetails and address info.
exports.getPendingStudents = async (req, res) => {
  try {
    const pendingStudents = await User.find({
      role: 'student',
      studentStatus: 'pending',
    })
      .select('-passwordHash -otp')
      .sort({ createdAt: -1 });

    return res.json({
      message: 'Pending student requests retrieved successfully',
      count: pendingStudents.length,
      students: pendingStudents,
    });
  } catch (err) {
    console.error('Get Pending Students Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- APPROVE STUDENT REQUEST ----------------------
// POST /api/admin/students/:id/approve
// Admin approves a pending student registration request.
// Actions:
// - Set studentStatus = 'approved', isEmailVerified = true, approvedAt, approvedBy
// - Generate student roleNumber if missing
// - Create or update parent account with a temporary password (8 chars)
// - Send emails to student (admission approved) and parent (credentials)
exports.approveStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const adminId = req.user.id;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update student fields
    student.studentStatus = 'approved';
    student.isEmailVerified = true;
    student.approvedAt = new Date();
    student.approvedBy = adminId;

    // Generate roleNumber if missing
    if (!student.roleNumber) {
      const region = student.academicRegion || 'NO';
      let roleNumber = await generateRoleNumber(region);
      // ensure uniqueness at application level
      const existing = await User.findOne({ roleNumber });
      if (existing) {
        roleNumber = await generateRoleNumber(region);
      }
      student.roleNumber = roleNumber;
    }

    // Set student's initial password to their roleNumber so they can login immediately.
    // This will be their first password; they can change it later via reset/password change flow.
    try {
      const saltStudent = await bcrypt.genSalt(10);
      const studentPasswordHash = await bcrypt.hash(student.roleNumber, saltStudent);
      student.passwordHash = studentPasswordHash;
    } catch (hashErr) {
      console.error('Error hashing student initial password:', hashErr);
    }

    await student.save();

    // Handle parent account creation/updating
    const parentInfo = student.parentDetails || null;
    let tempParentPassword = null;
    if (parentInfo && parentInfo.email) {
      const parentEmail = parentInfo.email.toLowerCase();
      let parentUser = await User.findOne({ email: parentEmail, role: 'parent' });

      // Generate initial password for parent (8 chars alphanumeric).
      // This will be treated as the parent's initial/permanent password (they may change it later).
      tempParentPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const parentPasswordHash = await bcrypt.hash(tempParentPassword, salt);

      if (parentUser) {
        // Ensure linkedStudents contains this student
        const alreadyLinked = parentUser.linkedStudents.some(
          (ls) => ls.studentId && student.roleNumber && ls.studentId.toUpperCase() === student.roleNumber.toUpperCase()
        );
        if (!alreadyLinked) {
          parentUser.linkedStudents.push({ studentId: student.roleNumber, relationship: parentInfo.relationship || 'Parent' });
        }
        // Update passwordHash with the generated initial password so parent can login
        parentUser.passwordHash = parentPasswordHash;
        parentUser.isEmailVerified = true; // admin-created parent is considered verified
        await parentUser.save();
      } else {
        // Create new parent user
        const parentPhone = parentInfo.phone || student.phone || '';
        const newParent = new User({
          fullName: parentInfo.name || 'Parent',
          email: parentEmail,
          phone: parentPhone,
          passwordHash: parentPasswordHash,
          role: 'parent',
          linkedStudents: [{ studentId: student.roleNumber, relationship: parentInfo.relationship || 'Parent' }],
          isEmailVerified: true,
        });

        await newParent.save();
        parentUser = newParent;
      }

      // Send parent email with credentials
      try {
        const parentEmailHtml = `
          <h2>Parent Account Created</h2>
          <p>Dear ${parentInfo.name || 'Parent'},</p>
          <p>An account has been created for you to access the student information.</p>
          <p><strong>Login details:</strong></p>
          <ul>
            <li>Email: ${parentEmail}</li>
            <li>Temporary Password: ${tempParentPassword}</li>
          </ul>
          <p>Please login and change your password immediately.</p>
        `;
        await sendCustomEmail(parentEmail, 'Parent Account Created - Credentials', parentEmailHtml);
      } catch (emailErr) {
        console.error('Error sending parent email:', emailErr);
      }
    }

    // Send student email notifying approval
    try {
      const studentEmailHtml = `
        <h2>Admission Approved</h2>
        <p>Dear ${student.fullName},</p>
        <p>Your admission request has been approved.</p>
        <p><strong>Student ID (Role Number):</strong> ${student.roleNumber}</p>
        <p>You can now login once your account has a password set by admin or via the password setup flow.</p>
      `;
      if (student.email) await sendCustomEmail(student.email, 'Admission Approved', studentEmailHtml);
    } catch (emailErr) {
      console.error('Error sending student email:', emailErr);
    }

    return res.json({ message: 'Student approved successfully' });
  } catch (err) {
    console.error('Approve Student Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- REJECT STUDENT REQUEST ----------------------
// POST /api/admin/students/:id/reject
// Sets studentStatus = 'rejected', saves rejectionReason, and emails student and parent.
exports.rejectStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'rejectionReason is required' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.studentStatus = 'rejected';
    student.rejectionReason = rejectionReason;
    await student.save();

    // Send rejection email to student
    try {
      if (student.email) {
        const studentEmailHtml = `
          <h2>Registration Request Update</h2>
          <p>Dear ${student.fullName},</p>
          <p>We regret to inform you that your registration request has been rejected.</p>
          <p><strong>Reason:</strong> ${rejectionReason}</p>
        `;
        await sendCustomEmail(student.email, 'Registration Request Rejected', studentEmailHtml);
      }
    } catch (emailErr) {
      console.error('Error sending student rejection email:', emailErr);
    }

    // Send rejection email to parent if available
    try {
      const parentInfo = student.parentDetails || null;
      if (parentInfo && parentInfo.email) {
        const parentEmail = parentInfo.email.toLowerCase();
        const parentEmailHtml = `
          <h2>Registration Request Update</h2>
          <p>Dear ${parentInfo.name || 'Parent'},</p>
          <p>The registration request for ${student.fullName} has been rejected.</p>
          <p><strong>Reason:</strong> ${rejectionReason}</p>
        `;
        await sendCustomEmail(parentEmail, 'Student Registration Rejected', parentEmailHtml);
      }
    } catch (emailErr) {
      console.error('Error sending parent rejection email:', emailErr);
    }

    return res.json({ message: 'Student rejected successfully' });
  } catch (err) {
    console.error('Reject Student Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ALL PARENTS ----------------------
exports.getAllParents = async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('-passwordHash -otp')
      .sort({ createdAt: -1 });

    // Get student details for each parent
    const parentsWithStudentDetails = await Promise.all(
      parents.map(async (parent) => {
        const studentDetails = await getLinkedStudentDetails(
          parent.linkedStudents
        );
        return {
          ...parent.toObject(),
          linkedStudents: studentDetails,
        };
      })
    );

    return res.json({
      message: 'Parents retrieved successfully',
      count: parents.length,
      parents: parentsWithStudentDetails,
    });
  } catch (err) {
    console.error('Get All Parents Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET PARENTS WITH STUDENTS COMBINED ----------------------
exports.getParentsWithStudents = async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('-passwordHash -otp')
      .sort({ createdAt: -1 });

    const parentsWithFullDetails = await Promise.all(
      parents.map(async (parent) => {
        const studentDetails = await getLinkedStudentDetails(
          parent.linkedStudents
        );

        return {
          parent: {
            id: parent._id,
            fullName: parent.fullName,
            email: parent.email,
            phone: parent.phone,
          },
          linkedStudents: studentDetails,
        };
      })
    );

    return res.json({
      message: 'Parents with student details retrieved successfully',
      count: parents.length,
      data: parentsWithFullDetails,
    });
  } catch (err) {
    console.error('Get Parents With Students Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- HELPER FUNCTION: GET LINKED STUDENT DETAILS ----------------------
async function getLinkedStudentDetails(linkedStudents) {
  if (!linkedStudents || linkedStudents.length === 0) {
    return [];
  }

  const studentDetails = [];

  for (const link of linkedStudents) {
    const student = await User.findOne({
      roleNumber: link.studentId,
      role: 'student',
    }).select('fullName class academicRegion roleNumber email');

    if (student) {
      studentDetails.push({
        studentId: student.roleNumber,
        studentName: student.fullName,
        studentEmail: student.email,
        class: student.class,
        region: student.academicRegion,
        relationship: link.relationship,
      });
    } else {
      studentDetails.push({
        studentId: link.studentId,
        studentName: 'Student not found',
        studentEmail: 'Unknown',
        class: 'Unknown',
        region: 'Unknown',
        relationship: link.relationship,
      });
    }
  }

  return studentDetails;
}

// controllers/adminController.js           Namrata
const Note = require('../models/Note');

// ---------------------- GET PENDING NOTES ----------------------
exports.getPendingNotes = async (req, res) => {
  try {
    const notes = await Note.find({ status: 'pending' })
      .populate('uploadedBy', 'fullName email')
      .select('-fileData'); // exclude binary data for faster load
    return res.json(notes);
  } catch (error) {
    console.error('Get Pending Notes Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- APPROVE NOTE ----------------------
exports.approveNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const adminId = req.user?.id; // from protect middleware if admin is logged in

    const note = await Note.findById(noteId).populate(
      'uploadedBy',
      'email fullName'
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });

    note.status = 'approved';
    note.approvedBy = adminId;
    note.approvedAt = new Date();
    await note.save();

    // ✅ Optional: Send approval email to teacher
    try {
      await sendCustomEmail(
        note.uploadedBy.email,
        'Your Note Has Been Approved',
        `
          <h3>Hi ${note.uploadedBy.fullName},</h3>
          <p>Your note <b>${note.title}</b> has been approved by the admin and is now available to students.</p>
        `
      );
    } catch (e) {
      console.log('Email not sent:', e.message);
    }

    return res.json({ message: 'Note approved successfully' });
  } catch (error) {
    console.error('Approve Note Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- REJECT NOTE ----------------------
exports.rejectNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const { reason } = req.body;

    const note = await Note.findById(noteId).populate(
      'uploadedBy',
      'email fullName'
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });

    note.status = 'rejected';
    note.rejectionReason = reason || 'No reason provided';
    await note.save();

    // ✅ Optional: Notify teacher of rejection
    try {
      await sendCustomEmail(
        note.uploadedBy.email,
        'Your Note Was Rejected',
        `
          <h3>Hi ${note.uploadedBy.fullName},</h3>
          <p>Your note <b>${note.title}</b> has been rejected by the admin.</p>
          <p><b>Reason:</b> ${reason || 'Not specified'}</p>
        `
      );
    } catch (e) {
      console.log('Email not sent:', e.message);
    }

    return res.json({ message: 'Note rejected successfully' });
  } catch (error) {
    console.error('Reject Note Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

//Neww
// ✅ Get all pending scheduled subjects
exports.getPendingScheduledSubjects = async (req, res) => {
  try {
    const pendingSubjects = await ScheduledSubject.find({ status: 'pending' })
      .populate('teacher', 'fullName email') // teacher details
      .populate('class', 'className') // class details
      .populate('subject', 'subjectName'); // subject details

    res.status(200).json({ pendingSubjects });
  } catch (error) {
    console.error('Error fetching pending subjects:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Approve a scheduled subject request Neww
exports.approveScheduledSubject = async (req, res) => {
  try {
    const { scheduledId } = req.body;

    const scheduled = await ScheduledSubject.findById(scheduledId);
    if (!scheduled)
      return res.status(404).json({ message: 'Scheduled request not found' });

    scheduled.status = 'approved';
    scheduled.approvedAt = new Date();

    await scheduled.save();

    res.status(200).json({ message: 'Subject approved', data: scheduled });
  } catch (error) {
    console.error('Error approving subject:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Admin announcement controller
const TeacherAnnouncement = require('../models/TeacherAnnouncement');

// ---------------------- GET PENDING ANNOUNCEMENTS ----------------------
exports.getPendingAnnouncements = async (req, res) => {
  try {
    const announcements = await TeacherAnnouncement.find({ status: 'pending' })
      .populate('class', 'className')
      .populate('subject', 'subjectName')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    return res.json({
      total: announcements.length,
      announcements: announcements,
    });
  } catch (error) {
    console.error('Get Pending Announcements Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- APPROVE ANNOUNCEMENT ----------------------
exports.approveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const announcement = await TeacherAnnouncement.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      { new: true }
    )
      .populate('class', 'className')
      .populate('subject', 'subjectName')
      .populate('createdBy', 'fullName email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    return res.json({
      message: 'Announcement approved successfully',
      announcement: announcement,
    });
  } catch (error) {
    console.error('Approve Announcement Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- REJECT ANNOUNCEMENT ----------------------
exports.rejectAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const announcement = await TeacherAnnouncement.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason,
      },
      { new: true }
    )
      .populate('class', 'className')
      .populate('subject', 'subjectName')
      .populate('createdBy', 'fullName email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    return res.json({
      message: 'Announcement rejected successfully',
      announcement: announcement,
    });
  } catch (error) {
    console.error('Reject Announcement Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET ALL ANNOUNCEMENTS ----------------------
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await TeacherAnnouncement.find()
      .populate('class', 'className')
      .populate('subject', 'subjectName')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 });

    return res.json({
      total: announcements.length,
      announcements: announcements,
    });
  } catch (error) {
    console.error('Get All Announcements Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

// ------------SHUBHAM----------------
// ---------------------- GET SUBJECT RESULTS SUMMARY ----------------------
exports.getSubjectResultsSummary = async (req, res) => {
  try {
    const summary = await TestResult.aggregate([
      // 1. Get Test details (subject/class) for each result
      {
        $lookup: {
          from: 'tests', // Collection name for 'Test' model
          localField: 'testID',
          foreignField: '_id',
          as: 'testDetails',
        },
      },
      {
        $unwind: '$testDetails',
      },

      // 2. Group by class and subject to get average marks
      {
        $group: {
          _id: {
            class: '$testDetails.class',
            subject: '$testDetails.subject',
          },
          avgScore: { $avg: '$marks' },
          totalResults: { $sum: 1 },
        },
      },

      // 3. Get Class details (className)
      {
        $lookup: {
          from: 'classes', // Collection name for 'Class' model
          localField: '_id.class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      {
        $unwind: '$classInfo',
      },

      // 4. Get Subject details (subjectName)
      {
        $lookup: {
          from: 'subjects', // Collection name for 'Subject' model
          localField: '_id.subject',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      {
        $unwind: '$subjectInfo',
      },

      // 5. Group by Class to nest subjects
      {
        $group: {
          _id: '$_id.class',
          className: { $first: '$classInfo.className' },
          subjects: {
            $push: {
              subjectId: '$_id.subject',
              subjectName: '$subjectInfo.subjectName',
              avgScore: { $round: ['$avgScore', 2] }, // Round to 2 decimal places
              totalResultsCount: '$totalResults',
            },
          },
        },
      },

      // 6. Add a numeric field for proper sorting (1, 2, ... 10)
      {
        $addFields: {
          classNameInt: { $toInt: '$className' },
        },
      },

      // 7. Sort by class name (numeric)
      {
        $sort: {
          classNameInt: 1,
        },
      },

      // 8. Final formatting
      {
        $project: {
          _id: 0,
          classId: '$_id',
          className: 1,
          subjects: 1,
        },
      },
    ]);

    return res.json({
      message: 'Results summary retrieved successfully',
      summary: summary,
    });
  } catch (err) {
    console.error('Get Subject Results Summary Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ATTENDANCE SUMMARY (Updated) ----------------------
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { period: requestedPeriod } = req.query; // e.g., 'today', 'this_week', 'last_week', 'all'
    let effectivePeriod = 'today'; // Default to 'today'
    const dateFilter = {};

    // --- Date Range Logic ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

    if (requestedPeriod === 'this_week') {
      effectivePeriod = 'this_week';
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // Start of next Sunday
      dateFilter.date = { $gte: startOfWeek, $lt: endOfWeek };
    } else if (requestedPeriod === 'last_week') {
      effectivePeriod = 'last_week';
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - dayOfWeek);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7); // Go back 7 more days
      dateFilter.date = { $gte: startOfLastWeek, $lt: startOfThisWeek };
    } else if (requestedPeriod === 'all') {
      effectivePeriod = 'all-time';
      // No date filter needed, dateFilter remains {}
    } else {
      // Default case: 'today' (also catches requestedPeriod === 'today' or undefined)
      effectivePeriod = 'today';
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1); // Start of tomorrow
      dateFilter.date = { $gte: today, $lt: tomorrow };
    }

    // --- Aggregation Pipeline ---
    const summary = await Attendance.aggregate([
      // 1. Filter by date FIRST for performance
      {
        $match: dateFilter,
      },

      // 2. Add a field: 1 if 'present'/'late', 0 if 'absent'
      {
        $addFields: {
          attended: {
            $cond: {
              if: { $in: ['$status', ['present', 'late']] },
              then: 1,
              else: 0,
            },
          },
        },
      },

      // 3. Group by class and subject to get total counts
      {
        $group: {
          _id: {
            class: '$class',
            subject: '$subject',
          },
          totalAttended: { $sum: '$attended' },
          totalRecords: { $sum: 1 },
        },
      },

      // 4. Calculate percentage
      {
        $addFields: {
          attendancePercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: {
                      // Handle division by zero
                      if: { $eq: ['$totalRecords', 0] },
                      then: 0,
                      else: { $divide: ['$totalAttended', '$totalRecords'] },
                    },
                  },
                  100,
                ],
              },
              2, // Round to 2 decimal places
            ],
          },
        },
      },

      // 5. Look up Class details
      {
        $lookup: {
          from: 'classes',
          localField: '_id.class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      {
        $unwind: '$classInfo',
      },

      // 6. Look up Subject details
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subject',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      {
        $unwind: '$subjectInfo',
      },

      // 7. Group by Class to nest subjects
      {
        $group: {
          _id: '$_id.class',
          className: { $first: '$classInfo.className' },
          subjects: {
            $push: {
              subjectId: '$_id.subject',
              subjectName: '$subjectInfo.subjectName',
              attendancePercentage: '$attendancePercentage',
              totalRecords: '$totalRecords',
            },
          },
        },
      },

      // 8. Add numeric field for sorting (1, 2, ... 10)
      {
        $addFields: {
          classNameInt: { $toInt: '$className' },
        },
      },

      // 9. Sort by class name
      {
        $sort: {
          classNameInt: 1,
        },
      },

      // 10. Final formatting
      {
        $project: {
          _id: 0,
          classId: '$_id',
          className: 1,
          subjects: 1,
        },
      },
    ]);

    return res.json({
      message: `Attendance summary retrieved for period: ${effectivePeriod}`,
      summary: summary,
    });
  } catch (err) {
    console.error('Get Attendance Summary Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- DELETE USER BY ID (Admin) ----------------------
exports.deleteUserById = async (req, res) => {
  try {
    const { id: userId } = req.params;

    // 1. Validate the ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // 2. Find the user to be deleted
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. CRITICAL: Prevent deleting an admin
    // This assumes your admin role is named 'admin' as per your middleware
    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Cannot delete an admin account via this route.',
      });
    }

    // 4. Perform the delete
    // WARNING: This is a HARD delete. This will remove the user from the
    // database. This does NOT clean up references to this user in other
    // collections (e.g., a parent's linkedStudents, an attendance record's
    // 'markedBy' field, etc.).

    await User.findByIdAndDelete(userId);

    return res.json({
      message: `User '${user.fullName}' (Role: ${user.role}) deleted successfully.`,
    });
  } catch (err) {
    console.error('Delete User Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};


// controllers/adminController.js or studentController.js

exports.getTotalStudentsCount = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });

    res.status(200).json({
      totalStudents
    });
  } catch (error) {
    console.error('Get Total Students Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// ==============================
// GET TOTAL TEACHERS & PARENTS COUNT
// ==============================
exports.getUserCounts = async (req, res) => {
  try {
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalParents = await User.countDocuments({ role: 'parent' , teacherStatus: 'approved'});

    return res.status(200).json({
      totalTeachers,
      totalParents
    });
  } catch (error) {
    console.error('Get User Counts Error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};




// ---------------------- ADMIN SEND ANNOUNCEMENT ----------------------
exports.sendAnnouncementToGroups = async (req, res) => {
  try {
    const { title, message, recipients } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient group is required' });
    }

    // If 'all' is selected, ignore other roles
    const finalRecipients = recipients.includes('all') ? ['all'] : recipients;

    const announcements = [];

    for (const role of finalRecipients) {
      const announcement = new Announcement({
        title,
        message,
        targetAudience: role,
        createdBy: adminId
      });
      await announcement.save();
      announcements.push(announcement);
    }

    return res.status(201).json({
      message: 'Announcements sent successfully',
      count: announcements.length,
      announcements
    });
  } catch (err) {
    console.error('Admin Send Announcement Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};




// ---------------------- ADMIN FETCH ASSIGNED SUBJECT DETAILS ----------------------
exports.getAssignedSubjectDetails = async (req, res) => {
  try {
    // 1. Fetch only approved scheduled subjects
    const scheduledSubjects = await ScheduledSubject.find({ status: 'approved' })
      .populate('class', 'className classCode')
      .populate('subject', 'subjectName subjectCode description')
      .populate('teacher', 'fullName');

    const result = [];

    for (const scheduled of scheduledSubjects) {
      if (!scheduled.teacher || !scheduled.subject || !scheduled.class) {
        continue; // skip incomplete records
      }

      // 2. Fetch notes for this teacher + subject + class (only approved notes)
      const notes = await Note.find({
        uploadedBy: scheduled.teacher._id,
        subject: scheduled.subject._id,
        class: scheduled.class._id,
        status: 'approved'
      }).select('title');

      // 3. Use subject description as syllabus
      const syllabus = scheduled.subject.description || "";

      // 4. Push enriched object
      result.push({
        class: `Class ${scheduled.class.className}`,
        subject: scheduled.subject.subjectName,
        subjectCode: scheduled.subject.subjectCode,
        teacher: scheduled.teacher.fullName,
        syllabus, // now a string from subject.description
        notes: notes.map(n => n.title)
      });
    }

    return res.json({
      message: 'Approved assigned subject details fetched successfully',
      count: result.length,
      subjects: result
    });
  } catch (err) {
    console.error('Get Assigned Subject Details Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};