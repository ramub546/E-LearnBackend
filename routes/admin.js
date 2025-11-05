const express = require('express'); //Namrata
const router = express.Router();
const {
  getPendingNotes,
  approveNote,
  rejectNote,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware'); // JWT auth middleware
const adminController = require('../controllers/adminController'); //Neww

// ✅ Only admin middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};

// ✅ Routes for notes approval
router.get('/notes/pending', protect, adminOnly, getPendingNotes);
router.patch('/notes/:id/approve', protect, adminOnly, approveNote);
router.patch('/notes/:id/reject', protect, adminOnly, rejectNote);

//Neww
router.get(
  '/subjects/pending',
  protect,
  adminOnly,
  adminController.getPendingScheduledSubjects
);
router.post(
  '/subjects/approve',
  protect,
  adminOnly,
  adminController.approveScheduledSubject
);

// Add these routes for admin announcement management
router.get(
  '/pending-announcements',
  protect,
  adminController.getPendingAnnouncements
);
router.put(
  '/approve-announcement/:id',
  protect,
  adminController.approveAnnouncement
);
router.put(
  '/reject-announcement/:id',
  protect,
  adminController.rejectAnnouncement
);
router.get('/all-announcements', protect, adminController.getAllAnnouncements);

// -----------------SHUBHAM-------------
router.get(
  '/results/summary',
  protect,
  adminOnly,
  adminController.getSubjectResultsSummary
);

// eg: GET /api/admin/attendance/summary?period=this_week or period=last_week
// default period=today
router.get(
  '/attendance/summary',
  protect,
  adminOnly,
  adminController.getAttendanceSummary
);

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, adminOnly, adminController.deleteUserById);

// Add these routes for admin announcement management
router.get(
  '/pending-announcements',
  protect,
  adminController.getPendingAnnouncements
);
router.put(
  '/approve-announcement/:id',
  protect,
  adminController.approveAnnouncement
);
router.put(
  '/reject-announcement/:id',
  protect,
  adminController.rejectAnnouncement
);

module.exports = router;
