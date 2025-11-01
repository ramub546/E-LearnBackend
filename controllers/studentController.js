const User = require('../models/User');
const Note = require('../models/Note');
const Subject = require('../models/Subject');
// ---------------------- GET STUDENT NOTES BY SUBJECT ----------------------
exports.getStudentNotes = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).populate('class');
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.class) {
      return res.status(400).json({ message: 'Student is not assigned to any class' });
    }

    // Get approved notes for student's class
    const notes = await Note.find({
      class: student.class._id,
      status: 'approved'
    })
    .populate('uploadedBy', 'fullName')
    .populate('subject', 'subjectName subjectCode')
    .select('-fileData')
    .sort({ createdAt: -1 });

    // Group notes by subject
    const notesBySubject = {};
    notes.forEach(note => {
      const subjectName = note.subject.subjectName;
      if (!notesBySubject[subjectName]) {
        notesBySubject[subjectName] = [];
      }
      notesBySubject[subjectName].push(note);
    });

    return res.json({
      message: 'Student notes retrieved successfully',
      class: student.class.className,
      notesBySubject: notesBySubject
    });
  } catch (err) {
    console.error('Get Student Notes Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// ---------------------- DOWNLOAD NOTE ----------------------
exports.downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'fullName email role')
      .populate('class');

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const user = req.user;

    // Admin and teacher who uploaded can always download
    if (user.role === 'admin' || (user.role === 'teacher' && note.uploadedBy._id.toString() === user.id)) {
      // Allow download
    }
    // For students: check if note is approved AND student is in same class
    else if (user.role === 'student') {
      const student = await User.findById(user.id).populate('class');
      
      if (!student.class || student.class._id.toString() !== note.class._id.toString()) {
        return res.status(403).json({ message: 'This note is not available for your class' });
      }
      
      if (note.status !== 'approved') {
        return res.status(403).json({ message: 'This note is not approved yet' });
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
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- GET STUDENT NOTES BY SPECIFIC SUBJECT ----------------------
exports.getStudentNotesBySubject = async (req, res) => {
  try {
    const { subjectName } = req.params;
    const student = await User.findById(req.user.id).populate('class');
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find subject by name for student's class
    const subject = await Subject.findOne({
      subjectName: new RegExp(subjectName, 'i'),
      class: student.class._id
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found for your class' });
    }

    // Get approved notes for this specific subject and class
    const notes = await Note.find({
      class: student.class._id,
      subject: subject._id,
      status: 'approved'
    })
    .populate('uploadedBy', 'fullName')
    .populate('subject', 'subjectName')
    .select('-fileData')
    .sort({ createdAt: -1 });

    return res.json({
      message: `Notes for ${subject.subjectName} retrieved successfully`,
      subject: subject.subjectName,
      notes: notes
    });
  } catch (err) {
    console.error('Get Student Notes By Subject Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET CLASS ASSIGNMENTS ----------------------
exports.getClassAssignments = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const assignments = await Assignment.find({ 
      class: student.class,
      status: 'active'
    })
      .populate('subject', 'subjectName')
      .populate('uploadedBy', 'fullName')
      .select('-fileData')
      .sort({ dueDate: 1 });

    return res.json(assignments);
  } catch (error) {
    console.error('Get Class Assignments Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------- DOWNLOAD ASSIGNMENT (Student) ----------------------
exports.downloadAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('class', 'className');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const student = await User.findById(req.user.id);
    
    // Check if student is in the same class
    if (student.class.toString() !== assignment.class._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.set('Content-Type', assignment.fileMimeType);
    res.set('Content-Disposition', `attachment; filename="${assignment.fileName}"`);
    return res.send(assignment.fileData);

  } catch (error) {
    console.error('Download Assignment Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};