const User = require('../models/User');
const { sendCustomEmail } = require('../utils/mailer');
const ScheduledSubject = require('../models/scheduledSubject');

// ---------------------- GET PENDING TEACHERS ----------------------
exports.getPendingTeachers = async (req, res) => {
  try {
    const pendingTeachers = await User.find({ 
      role: 'teacher', 
      teacherStatus: 'pending' 
    }).select('-passwordHash -otp');

    return res.json({
      message: 'Pending teachers retrieved successfully',
      count: pendingTeachers.length,
      teachers: pendingTeachers
    });
  } catch (err) {
    console.error('Get Pending Teachers Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
      teachers: teachers
    });
  } catch (err) {
    console.error('Get All Teachers Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET TEACHER BY EMAIL ----------------------
exports.getTeacherByEmail = async (req, res) => {
  try {
    const { teacherEmail } = req.params;

    const teacher = await User.findOne({ 
      email: teacherEmail, 
      role: 'teacher' 
    }).select('-passwordHash -otp');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.json({
      message: 'Teacher retrieved successfully',
      teacher: teacher
    });
  } catch (err) {
    console.error('Get Teacher By Email Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
      teacherStatus: 'pending' 
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Pending teacher not found with this email' });
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

    await sendCustomEmail(teacher.email, 'Teacher Account Approved - Welcome!', approvalEmail);

    return res.json({ 
      message: 'Teacher approved successfully',
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        subjectSpecialization: teacher.subjectSpecialization,
        status: teacher.teacherStatus
      }
    });
  } catch (err) {
    console.error('Approve Teacher Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
      teacherStatus: 'pending' 
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Pending teacher not found with this email' });
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

    await sendCustomEmail(teacher.email, 'Teacher Registration Status Update', rejectionEmail);

    return res.json({ 
      message: 'Teacher rejected successfully'
    });
  } catch (err) {
    console.error('Reject Teacher Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
      students: students
    });
  } catch (err) {
    console.error('Get All Students Error:', err);
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
        const studentDetails = await getLinkedStudentDetails(parent.linkedStudents);
        return {
          ...parent.toObject(),
          linkedStudents: studentDetails
        };
      })
    );

    return res.json({
      message: 'Parents retrieved successfully',
      count: parents.length,
      parents: parentsWithStudentDetails
    });
  } catch (err) {
    console.error('Get All Parents Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
        const studentDetails = await getLinkedStudentDetails(parent.linkedStudents);
        
        return {
          parent: {
            id: parent._id,
            fullName: parent.fullName,
            email: parent.email,
            phone: parent.phone
          },
          linkedStudents: studentDetails
        };
      })
    );

    return res.json({
      message: 'Parents with student details retrieved successfully',
      count: parents.length,
      data: parentsWithFullDetails
    });
  } catch (err) {
    console.error('Get Parents With Students Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
      role: 'student' 
    }).select('fullName class academicRegion roleNumber email');
    
    if (student) {
      studentDetails.push({
        studentId: student.roleNumber,
        studentName: student.fullName,
        studentEmail: student.email,
        class: student.class,
        region: student.academicRegion,
        relationship: link.relationship
      });
    } else {
      studentDetails.push({
        studentId: link.studentId,
        studentName: 'Student not found',
        studentEmail: 'Unknown',
        class: 'Unknown',
        region: 'Unknown',
        relationship: link.relationship
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
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- APPROVE NOTE ----------------------
exports.approveNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const adminId = req.user?.id; // from protect middleware if admin is logged in

    const note = await Note.findById(noteId).populate('uploadedBy', 'email fullName');
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
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- REJECT NOTE ----------------------
exports.rejectNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const { reason } = req.body;

    const note = await Note.findById(noteId).populate('uploadedBy', 'email fullName');
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
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//Neww
// ✅ Get all pending scheduled subjects
exports.getPendingScheduledSubjects = async (req, res) => {
  try {
    const pendingSubjects = await ScheduledSubject.find({ status: 'pending' })
      .populate('teacher', 'fullName email')   // teacher details
      .populate('class', 'className')          // class details
      .populate('subject', 'subjectName');     // subject details

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
    if (!scheduled) return res.status(404).json({ message: 'Scheduled request not found' });

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
      announcements: announcements
    });

  } catch (error) {
    console.error('Get Pending Announcements Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
        approvedAt: new Date()
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
      announcement: announcement
    });

  } catch (error) {
    console.error('Approve Announcement Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
        rejectionReason: rejectionReason
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
      announcement: announcement
    });

  } catch (error) {
    console.error('Reject Announcement Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
      announcements: announcements
    });

  } catch (error) {
    console.error('Get All Announcements Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};