const express = require('express');
const router = express.Router();
const {
  protect,
  isParent,
  parentViewChild,
} = require('../middleware/authMiddleware');

const parentController = require('../controllers/parentController');

// --- Private Parent Routes ---

// @route   GET api/parent/profile
// @desc    Get logged-in parent's *own* profile
// @access  Private (Parent only)
router.get('/profile', protect, isParent, parentController.getParentProfile);

// Import the ENTIRE student controller
const studentController = require('../controllers/studentController');

const childMiddleware = [protect, isParent, parentViewChild];

// @route   GET api/parent/child/:studentId/profile
// @desc    Get child's profile
router.get(
  '/child/:studentId/profile',
  childMiddleware,
  studentController.getMyProfile
);

// @route   GET api/parent/child/:studentId/class
// @desc    Get child's class data
router.get(
  '/child/:studentId/class',
  childMiddleware,
  studentController.getMyClassData
);

// @route   GET api/parent/child/:studentId/subjects
// @desc    Get child's subjects
router.get(
  '/child/:studentId/subjects',
  childMiddleware,
  studentController.getMySubjects
);

// @route   GET api/parent/child/:studentId/assignments/pending
// @desc    Get child's pending assignments
router.get(
  '/child/:studentId/assignments/pending',
  childMiddleware,
  studentController.getMyPendingAssignments
);

// @route   GET api/parent/child/:studentId/assignments/submitted
// @desc    Get child's submitted assignments
router.get(
  '/child/:studentId/assignments/submitted',
  childMiddleware,
  studentController.getMySubmittedAssignments
);

// @route   GET api/parent/child/:studentId/attendance
// @desc    Get child's attendance (with optional ?subjectCode=, ?startDate=)
router.get(
  '/child/:studentId/attendance',
  childMiddleware,
  studentController.getMyAttendance
);

// @route   GET api/parent/child/:studentId/attendance/summary
// @desc    Get child's attendance summary
router.get(
  '/child/:studentId/attendance/summary',
  childMiddleware,
  studentController.getMyAttendanceSummary
);

// @route   GET api/parent/child/:studentId/tests
// @desc    Get child's available tests
router.get(
  '/child/:studentId/tests',
  childMiddleware,
  studentController.getMyAvailableTests
);

// @route   GET api/parent/child/:studentId/marks/:subjectName
// @desc    Get child's marks for a specific subject
router.get(
  '/child/:studentId/marks/:subjectName',
  childMiddleware,
  studentController.getMyMarksBySubject
);

// @route   GET api/parent/child/:studentId/notes
// @desc    Get all approved notes for child's class
router.get(
  '/child/:studentId/notes',
  childMiddleware,
  studentController.getStudentNotes
);

// @route   GET api/parent/child/:studentId/notes/:subjectName
// @desc    Get child's class notes by subject
router.get(
  '/child/:studentId/notes/:subjectName',
  childMiddleware,
  studentController.getStudentNotesBySubject
);

// @route   GET api/parent/child/:studentId/upcoming-deadlines
// @desc    Get child's upcoming deadlines
router.get(
  '/child/:studentId/upcoming-deadlines',
  childMiddleware,
  studentController.getMyUpcomingDeadlines
);

router.get('/announcements', protect, parentController.getParentAnnouncements);
module.exports = router;

module.exports = router;
