const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destination selector: put files under uploads/students/profile or uploads/students/government
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const base = path.join(process.cwd(), 'uploads', 'students');
    let sub = 'profile';
    if (file.fieldname === 'governmentProof' || file.fieldname === 'government') sub = 'government';
    const uploadPath = path.join(base, sub);
    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  },
});

// File filter: allow only images
const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG and JPG files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Export the configured multer instance. Usage in routes:
// const uploadStudentFiles = require('../middleware/uploadStudentFiles');
// router.post('/student-request', uploadStudentFiles.fields([{ name: 'profilePicture' }, { name: 'governmentProof' }]), controller.studentRequest);
module.exports = upload;
