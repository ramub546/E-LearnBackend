const express = require('express'); //Namrata
const router = express.Router();
const {
  getPendingNotes,
  approveNote,
  rejectNote,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware'); // JWT auth middleware
const adminController = require('../controllers/adminController'); //Neww

// Admin authorization is handled by `authorize('admin')` middleware from authMiddleware

// ✅ Routes for notes approval
router.get('/notes/pending', protect, authorize('admin'), getPendingNotes);
router.patch('/notes/:id/approve', protect, authorize('admin'), approveNote);
router.patch('/notes/:id/reject', protect, authorize('admin'), rejectNote);

//Neww
router.get(
  '/subjects/pending',
  protect,
  authorize('admin'),
  adminController.getPendingScheduledSubjects
);
router.post(
  '/subjects/approve',
  protect,
  authorize('admin'),
  adminController.approveScheduledSubject
);

// Add these routes for admin announcement management
router.get(
  '/pending-announcements',
  protect,
  authorize('admin'),
  adminController.getPendingAnnouncements
);
router.put(
  '/approve-announcement/:id',
  protect,
  authorize('admin'),
  adminController.approveAnnouncement
);
router.put(
  '/reject-announcement/:id',
  protect,
  authorize('admin'),
  adminController.rejectAnnouncement
);
router.get('/all-announcements', protect, authorize('admin'), adminController.getAllAnnouncements);

// -----------------SHUBHAM-------------
router.get(
  '/results/summary',
  protect,
  authorize('admin'),
  adminController.getSubjectResultsSummary
);

// eg: GET /api/admin/attendance/summary?period=this_week or period=last_week
// default period=today
router.get(
  '/attendance/summary',
  protect,
  authorize('admin'),
  adminController.getAttendanceSummary
);

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, authorize('admin'), adminController.deleteUserById);

// Add these routes for admin announcement management
// (Routes above already registered)

router.get('/students/count', protect, authorize('admin'), adminController.getTotalStudentsCount);

// GET /api/admin/students/pending - list pending student registration requests
router.get('/students/pending', protect, authorize('admin'), adminController.getPendingStudents);
// Approve a student registration request
router.post('/students/:id/approve', protect, authorize('admin'), adminController.approveStudent);
// Reject a student registration request
router.post('/students/:id/reject', protect, authorize('admin'), adminController.rejectStudent);

// Get total parents & teachers count
router.get('/user-counts',protect,authorize('admin'),adminController.getUserCounts );

//ADMIN SEND ANNOUNCEMENT
router.post(
  '/send-announcement',
  protect,authorize('admin'), 
  adminController.sendAnnouncementToGroups
);

// ---------------------- SUBJECT DETAILS ROUTE ----------------------
router.get(
  '/assigned-subjects',
  protect,authorize('admin'),
  adminController.getAssignedSubjectDetails
);

module.exports = router;
