const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');

// ---------------------- GET STUDENT SUBJECTS ----------------------
exports.getStudentSubjects = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .populate({
        path: 'class',
        populate: {
          path: 'subjects',
          model: 'Subject'
        }
      });

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.class) {
      return res.status(400).json({ message: 'Student is not assigned to any class' });
    }

    return res.json({
      message: 'Student subjects retrieved successfully',
      class: student.class.className,
      subjects: student.class.subjects
    });
  } catch (err) {
    console.error('Get Student Subjects Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ALL CLASSES ----------------------
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('subjects')
      .sort({ className: 1 });

    return res.json({
      message: 'Classes retrieved successfully',
      classes: classes
    });
  } catch (err) {
    console.error('Get All Classes Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET CLASS BY ID ----------------------
exports.getClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId)
      .populate('subjects');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    return res.json({
      message: 'Class retrieved successfully',
      class: classData
    });
  } catch (err) {
    console.error('Get Class By ID Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};