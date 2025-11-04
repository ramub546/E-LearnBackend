const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const {
  downloadAssignment,
  getClassAssignments,
} = require('../controllers/studentController');

const upload = require('../middleware/uploadMiddleware');

// Apply 'protect' middleware to ALL routes in this file
router.use(protect); // ADDED BY SHUBHAM

// -------------- SHUBHAM -------------------
// --- Student's "My" Data Routes ---
// Use the NEW function names from the controller
router.get('/me', studentController.getMyProfile);
router.get('/class', studentController.getMyClassData);
router.get('/subjects', studentController.getMySubjects);
router.get('/tests', studentController.getMyAvailableTests);
router.get('/attendance', studentController.getMyAttendance); // ?subjectCode=, start and end date
router.get('/attendance/summary', studentController.getMyAttendanceSummary);

// --- Assignment Routes ---
router.get('/assignments/pending', studentController.getMyPendingAssignments);

router.get(
  '/assignments/submitted',
  studentController.getMySubmittedAssignments
);

router.post(
  '/assignments/:assignmentId/submit',
  upload.single('assignmentFile'),
  studentController.submitAssignment
);

router.get('/upcoming-deadlines', studentController.getMyUpcomingDeadlines); // for student calendar, fetches today, tomorrow and day after tomorrow assignments & tests

// -------------RAMU--------------
router.get('/assignments', getClassAssignments);
router.get('/download-assignment/:id', downloadAssignment);

router.get('/marks/:subjectName', studentController.getMyMarksBySubject);

// ✅ STUDENT NOTES ROUTES
router.get('/notes', studentController.getStudentNotes); // All notes grouped by subject
router.get('/notes/:subjectName', studentController.getStudentNotesBySubject); // Notes by specific subject
router.get('/notes/download/:id', studentController.downloadNote);



router.get('/announcements', protect, studentController.getStudentAnnouncements);


module.exports = router;
