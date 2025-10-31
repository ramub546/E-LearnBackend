// models/Note.js                                   Namrata
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🧾 Note Schema
 * Stores uploaded teacher notes (PDF/DOCX ≤10MB) for admin approval.
 * Teachers upload → status: "pending"
 * Admin approves/rejects → status updated accordingly.
 * Students can access only approved notes.
 */

const noteSchema = new Schema(
  {
    // ---------------------- BASIC DETAILS ----------------------
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ---------------------- FILE STORAGE ----------------------
    fileData: {
      type: Buffer, // binary file data stored directly in MongoDB
      required: [true, 'File data is required'],
    },
    fileMimeType: {
      type: String,
      required: [true, 'File MIME type is required'],
    },
    fileName: {
      type: String,
      required: [true, 'Original file name is required'],
    },
    fileSizeMB: {
      type: Number,
      max: [10, 'File size exceeds 10MB limit'],
    },

    // ---------------------- RELATIONS ----------------------
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // teacher
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
    },

    // ---------------------- APPROVAL STATUS ----------------------
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false, // removes __v field
  }
);

// ---------------------- INDEXES ----------------------
// Optimizes queries for filtering by uploader or status
noteSchema.index({ uploadedBy: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
