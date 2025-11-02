const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { downloadAssignment, getClassAssignments,getMyMarksBySubject } = require('../controllers/studentController');
// Add this route
router.get('/marks/:subjectName', protect, studentController.getMyMarksBySubject);


router.get('/assignments', protect, getClassAssignments);
router.get('/download-assignment/:id', protect, downloadAssignment);
// ✅ STUDENT NOTES ROUTES
router.get('/notes', protect, studentController.getStudentNotes); // All notes grouped by subject
router.get('/notes/:subjectName', protect, studentController.getStudentNotesBySubject); // Notes by specific subject
router.get('/notes/download/:id', protect, studentController.downloadNote);

module.exports = router;