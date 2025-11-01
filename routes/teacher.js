// routes/teacher.js                   //Namrata
const express = require('express');
const router = express.Router();
const multer = require('multer');
const teacherController = require('../controllers/teacherController');


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
// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

// ✅ TEACHER PROFILE & SUBJECT ROUTES
router.get('/profile', protect, teacherController.getTeacherProfile);
router.put('/update-subjects', protect, teacherController.updateTeacherSubjects);

// ✅ TEACHER NOTES ROUTES
router.post('/upload-note', protect, upload.single('file'), teacherController.uploadNote);
router.get('/my-notes', protect, teacherController.getMyNotes);
router.get('/download/:id', protect, teacherController.downloadNote);

// ✅ TEACHER MEETING ROUTES
router.post('/schedule-meeting', protect, teacherController.scheduleMeeting);
router.post('/start-instant-meeting', protect, teacherController.startInstantMeeting);
router.get('/my-meetings', protect, teacherController.getMyMeetings);

module.exports = router;
