const mongoose = require('mongoose');
const { Schema } = mongoose;

// --- MODIFIED SCHEMA ---
// Added fileData, fileMimeType, and fileName to support
// storing file submissions in the database.
const assignmentSubmissionSchema = new Schema({
  assignment: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // For text-based submissions
  content: String,

  // For file-based submissions
  fileData: Buffer,
  fileMimeType: String,
  fileName: String,

  status: {
    type: String,
    enum: ['submitted', 'graded', 'late'],
    default: 'submitted',
  },
  grade: Number,
  remark: String, // Teacher's feedback
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const AssignmentSubmission = mongoose.model(
  'AssignmentSubmission',
  assignmentSubmissionSchema
);

module.exports = AssignmentSubmission;
