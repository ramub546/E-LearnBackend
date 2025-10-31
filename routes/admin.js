const express = require('express');
const router = express.Router();
const { getPendingNotes, approveNote, rejectNote } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware'); // JWT auth middleware

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

module.exports = router;
