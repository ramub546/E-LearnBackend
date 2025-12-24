// routes/teacher.js                   //Namrata
const express = require('express');
const router = express.Router();
const multer = require('multer');
const TeacherAnnouncement = require('../models/TeacherAnnouncement');

const teacherController = require('../controllers/teacherController');
const { uploadAssignmentMiddleware, uploadAssignment, getMyAssignments, downloadAssignment, viewNote } = require('../controllers/teacherController');
const {  getClassMarks, getStudentMarks,getMyUploadedMarks, uploadMiddleware, lessonPlannerController, getNextLessonForSubject  } = require('../controllers/teacherController');
const {
  uploadNote,
  getMyNotes,
  downloadNote,
  scheduleMeeting,
  startInstantMeeting,
  getMyMeetings,
  getStudentsByClassAndSubject,
  uploadMarksByRollNumber,
  uploadMultipleMarksByRollNumber
} = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware'); // adjust path as needed

// // ---------------------- MULTER SETUP (for notes) ----------------------
// // Configure multer for file uploads
// const storage = multer.memoryStorage(); // Store file in memory
// const upload = multer({ 
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Allow only specific file types
//     if (file.mimetype === 'application/pdf' || 
//         file.mimetype === 'application/msword' ||
//         file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only PDF and Word documents are allowed'), false);
//     }
//   }
// });

// ✅ TEACHER PROFILE & SUBJECT ROUTES
router.get('/profile', protect, teacherController.getTeacherProfile);
router.put('/update-subjects', protect, teacherController.updateTeacherSubjects);

// ✅ TEACHER NOTES ROUTES
router.post('/upload-note', protect, uploadMiddleware, teacherController.uploadNote);
router.get('/my-notes', protect, teacherController.getMyNotes);
router.get('/approved-notes', protect, teacherController.getApprovedNotes);
router.get('/download/:id', protect, teacherController.downloadNote);
router.get('/note-count-by-class-subject', protect, teacherController.getNotesCountByClassAndSubject);//count of notes
// routes/noteRoutes.js
router.get('/notes/view/:id', viewNote);


// ✅ TEACHER MEETING ROUTES
router.post('/schedule-meeting', protect, teacherController.scheduleMeeting);
router.post('/start-instant-meeting', protect, teacherController.startInstantMeeting);
router.get('/my-meetings', protect, teacherController.getMyMeetings);


router.post('/upload-assignment', protect, uploadAssignmentMiddleware, uploadAssignment);
router.get('/my-assignments', protect, getMyAssignments);
router.get('/download-assignment/:id', protect, downloadAssignment);
// Add these routes

// Change from params to body-based routes
router.post('/student-marks', protect, teacherController.getStudentMarks);
router.post('/class-marks', protect, teacherController.getClassMarks);
router.get('/my-uploaded-marks', protect, teacherController.getMyUploadedMarks);
// Add this route to get students by class and subject
router.get('/students/:className/:subjectName', protect, teacherController.getStudentsByClassAndSubject);

// Add these routes for roll number based marks upload
router.post('/upload-marks-rollnumber', protect, teacherController.uploadMarksByRollNumber);
router.post('/upload-multiple-marks-rollnumber', protect, teacherController.uploadMultipleMarksByRollNumber);
module.exports = router;

// Add Subject feature Neww
router.post('/add-subject', protect, teacherController.addScheduledSubject);
// Optional: Get subjects list for selected class
router.get('/subjects/:teacherId', protect, teacherController.getSubjectsByClass);



router.post('/create-test', protect, teacherController.teacherCreateTest);//forTest
router.get('/my-tests', protect, teacherController.getTeacherTests);
router.get('/test-count-by-class-subject', protect, teacherController.getTotalTestsByTeacherForSubject);



// Add these routes for teacher announcements
router.post('/create-announcement', protect, teacherController.createAnnouncement);
router.get('/my-announcements', protect, teacherController.getMyAnnouncements);
router.put('/update-announcement/:id', protect, teacherController.updateAnnouncement);
router.delete('/delete-announcement/:id', protect, teacherController.deleteAnnouncement);

// Add a lesson
router.post('/add', protect, teacherController.addLesson);
// Get all lessons for the logged-in teacher
router.get('/my-lessons', protect, teacherController.getMyLessons);
// Get next lesson for a subject
router.get('/next-lesson/:subjectId', protect, teacherController.getNextLessonForSubject);
// Get next lesson for logged-in teacher
router.get('/next-lesson', protect, teacherController.getNextLesson);
// Get subjects handled by teacher (for dropdown)
router.get('/my-subjects', protect, teacherController.getSubjectsByTeacher);

