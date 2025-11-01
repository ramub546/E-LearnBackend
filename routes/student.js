const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

// ✅ STUDENT NOTES ROUTES
router.get('/notes', protect, studentController.getStudentNotes); // All notes grouped by subject
router.get('/notes/:subjectName', protect, studentController.getStudentNotesBySubject); // Notes by specific subject
router.get('/notes/download/:id', protect, studentController.downloadNote);

module.exports = router;