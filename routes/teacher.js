// routes/teacher.js                   //Namrata
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadNote,
  getMyNotes,
  downloadNote,
  scheduleMeeting,
  startInstantMeeting,
  getMyMeetings
} = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware'); // adjust path as needed

// ---------------------- MULTER SETUP (for notes) ----------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF and Word files allowed.'));
    }
    cb(null, true);
  }
});

// ---------------------- NOTES ROUTES ----------------------
router.post('/upload-note', protect, upload.single('file'), uploadNote);
router.get('/my-notes', protect, getMyNotes);
router.get('/download/:id', protect, downloadNote);

// ---------------------- MEETING ROUTES ----------------------
router.post('/schedule-meeting', protect, scheduleMeeting);
router.post('/start-instant-meeting', protect, startInstantMeeting);
router.get('/my-meetings', protect, getMyMeetings);

module.exports = router;
