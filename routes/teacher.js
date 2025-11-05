// routes/teacher.js                   //Namrata
const express = require('express');
const router = express.Router();
const multer = require('multer');
const TeacherAnnouncement = require('../models/TeacherAnnouncement');
const teacherController = require('../controllers/teacherController');
const { uploadAssignmentMiddleware, uploadAssignment, getMyAssignments, downloadAssignment } = require('../controllers/teacherController');
const {  getClassMarks, getStudentMarks,getMyUploadedMarks } = require('../controllers/teacherController');
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
router.get('/note-count-by-class-subject', protect, teacherController.getNotesCountByClassAndSubject);//count of notes

// ✅ TEACHER MEETING ROUTES
router.post('/schedule-meeting', protect, teacherController.scheduleMeeting);
router.post('/start-instant-meeting', protect, teacherController.startInstantMeeting);
router.get('/my-meetings', protect, teacherController.getMyMeetings);

//ASSIGNMNET
router.post('/upload-assignment', protect, uploadAssignmentMiddleware, uploadAssignment);
router.get('/my-assignments', protect, getMyAssignments);
router.get('/download-assignment/:id', protect, downloadAssignment);
//get assignment based on subject
router.get('/my-assignments-by-class-subject', protect, teacherController.getMyAssignmentsBySubjectAndClass);
//get assignment status
router.get('/assignments-by-class-subject-status', protect, teacherController.getAssignmentsBySubjectClassStatus);
//count of assignmnet by teacher,class,subject 
router.get('/assignment-count-by-class-subject', protect, teacherController.getAssignmentsCountByClassAndSubject);



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




//get Total Students For Teacher Under Subject
router.get('/total-students-subject', protect, teacherController.getTotalStudentsForTeacherSubject); 
//get Total total number of subjects a teacher is handling
router.get('/total-classes', protect, teacherController.getTotalSubjectsForTeacher); 
//get Total Students For Teacher 
router.get('/total-students', protect, teacherController.getTotalStudentsUnderTeacher);




// Add these routes for teacher announcements
router.post('/create-announcement', protect, teacherController.createAnnouncement);
router.get('/my-announcements', protect, teacherController.getMyAnnouncements);
router.put('/update-announcement/:id', protect, teacherController.updateAnnouncement);
router.delete('/delete-announcement/:id', protect, teacherController.deleteAnnouncement);