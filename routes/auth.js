const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const parentController = require('../controllers/parentController');
const teacherController = require('../controllers/teacherController');
const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const forgetPasswordController = require('../controllers/forgetPasswordController');
const announcementController = require('../controllers/announcementController');
const classController = require('../controllers/classController');
const logoutController = require('../controllers/logoutController');
const uploadStudentFiles = require('../middleware/uploadStudentFiles');



// ✅ STUDENT ROUTES
router.post('/student-register', authController.register);
// Student registration request (no password, no OTP). Accepts multipart/form-data
// Student registration request (no password, no OTP). Accepts multipart/form-data
router.post('/student-request', uploadStudentFiles.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'governmentProof', maxCount: 1 }
]), authController.studentRequest);
router.post('/verify-otp', authController.verifyOtp);
router.post('/student-login', authController.login);
router.get('/student-profile', protect, authController.getProfile);

// ✅ PARENT ROUTES
router.post('/parent-register', parentController.registerParent);
router.post('/parent-login', parentController.loginParent);
router.get('/parent-profile', protect, parentController.getParentProfile);

// ✅ TEACHER ROUTES
router.post('/teacher-signup', teacherController.teacherSignup);
router.post('/teacher-login', teacherController.teacherLogin);
router.get('/teacher-profile', protect, teacherController.getTeacherProfile);

// ✅ ADMIN AUTH ROUTES
router.post('/admin-register', adminAuthController.adminRegister);
router.post('/admin-verify-otp', adminAuthController.verifyAdminOtp);
router.post('/admin-login', adminAuthController.adminLogin);
router.get('/admin-profile', protect, adminAuthController.getAdminProfile);

// ✅ ADMIN TEACHER MANAGEMENT ROUTES (Using Email)
router.get('/admin/pending-teachers', protect, authorize('admin'), adminController.getPendingTeachers);
router.get('/admin/teachers', protect, authorize('admin'), adminController.getAllTeachers);
router.get('/admin/teachers/:teacherEmail', protect, authorize('admin'), adminController.getTeacherByEmail);
router.put('/admin/approve-teacher/:teacherEmail', protect, authorize('admin'), adminController.approveTeacherByEmail);
router.put('/admin/reject-teacher/:teacherEmail', protect, authorize('admin'), adminController.rejectTeacherByEmail);


// ✅ ADMIN STUDENT & PARENT ROUTES
router.get('/admin/students', protect, authorize('admin'), adminController.getAllStudents);
router.get('/admin/parents', protect, authorize('admin'), adminController.getAllParents);
router.get('/admin/parents-with-students', protect, authorize('admin'), adminController.getParentsWithStudents);


// ✅ ANNOUNCEMENT ROUTES
router.post('/admin/announcementsByAdmin', protect, authorize('admin'), announcementController.createAnnouncement);
router.get('/admin/announcementsByAdmin', protect, authorize('admin'), announcementController.getAllAnnouncements);
router.get('/announcementsByAdmin', protect, announcementController.getUserAnnouncements);

// ✅ FORGET PASSWORD ROUTES (Available for all users)
router.post('/forgot-password', forgetPasswordController.requestPasswordReset);
router.post('/verify-reset-otp', forgetPasswordController.verifyResetOtp);
router.post('/reset-password', forgetPasswordController.resetPassword);
router.post('/resend-reset-otp', forgetPasswordController.resendResetOtp);

// ✅ CLASS & SUBJECT ROUTES
router.get('/student/subjects', protect, classController.getStudentSubjects);
router.get('/classes', protect, classController.getAllClasses);
router.get('/classes/:classId', protect, classController.getClassById);

// ✅ SINGLE LOGOUT ROUTE FOR ALL USERS
router.post('/logout', protect, logoutController.logout);


module.exports = router;