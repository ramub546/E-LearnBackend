// In a new file, e.g., /middleware/uploadMiddleware.js

const multer = require('multer');

// Configure storage to be in-memory (we'll get a 'buffer')
const storage = multer.memoryStorage();

// --- PDF-only File Filter ---
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error('File upload rejected: Only PDF files are allowed.'), false);
  }
};

// Set limits (e.g., 10MB)
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
};

// Initialize multer with storage, limits, and filter
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter,
});

module.exports = upload;
