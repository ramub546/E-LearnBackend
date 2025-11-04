const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser'); // ✅ ADD ADMIN IMPORT

exports.protect = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Check both User and AdminUser collections
    let user = await User.findById(decoded.id).select('-passwordHash -otp');
    if (!user) {
      user = await AdminUser.findById(decoded.id).select('-passwordHash -otp');
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user?.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// --------------SHUBHAM -----------------
/**
 * @desc    Middleware to check if the authenticated user is a 'parent'
 */
exports.isParent = (req, res, next) => {
  if (req.user && req.user.role === 'parent') {
    return next();
  }
  return res.status(403).json({
    message: 'Access denied. Parent role required.',
  });
};

/**
 * @desc    Middleware for parents accessing child data.
 * 1. Verifies the parent (from req.user) is linked to the child (from req.params.studentId).
 * 2. If linked, it finds the child's user document.
 * 3. It REPLACES req.user with the child's user document.
 * 4. This allows all 'studentController' functions (which use req.user) to work for the parent.
 */
exports.parentViewChild = async (req, res, next) => {
  try {
    const { studentId } = req.params; // This is the student's roleNumber
    const parent = req.user; // This is the authenticated PARENT

    if (!studentId) {
      return res
        .status(400)
        .json({ message: 'Student ID not provided in URL' });
    }

    // 1. Check if parent is linked to this student
    const isLinked = parent.linkedStudents.some(
      (student) => student.studentId.toUpperCase() === studentId.toUpperCase()
    );

    if (!isLinked) {
      return res.status(403).json({
        message: 'Access Denied: You are not linked to this student.',
      });
    }

    // 2. Find the child's full user document
    const student = await User.findOne({
      roleNumber: studentId.toUpperCase(),
      role: 'student',
    });

    if (!student) {
      return res
        .status(404)
        .json({ message: 'Child student account not found' });
    }

    // 3. CRITICAL STEP: Replace req.user with the STUDENT's document
    // Now, any subsequent controller (e.g., studentController.getMyProfile)
    // will use the STUDENT's ID and data from req.user.
    req.user = student;

    // 4. Proceed to the controller
    next();
  } catch (err) {
    console.error('Parent View Child Middleware Error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};
