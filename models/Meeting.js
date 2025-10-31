// models/Meeting.js                               Namrata
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Meeting Schema is:
 * Stores scheduled or instant meetings created by teachers.
 * Teachers can schedule a meeting for a future date/time or start one instantly.
 * Admins (optionally) can view or moderate meetings.
 */

const meetingSchema = new Schema(
  {
    // ---------------------- BASIC DETAILS ----------------------
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ---------------------- SCHEDULING DETAILS ----------------------
    date: {
      type: Date,
      required: [true, 'Meeting date and time are required'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Meeting duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    isInstant: {
      type: Boolean,
      default: false,
    },

    // ---------------------- HOST & RELATIONS ----------------------
    hostedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // teacher or host
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },

    // ---------------------- ONLINE MEETING DETAILS ----------------------
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingPlatform: {
      type: String,
      enum: ['zoom', 'google_meet', 'custom', 'none'],
      default: 'none',
    },

    // ---------------------- STATUS ----------------------
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    // ---------------------- METADATA ----------------------
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false, // remove __v
  }
);

// ---------------------- INDEXES ----------------------
// Speeds up queries for teacher meetings or date filters
meetingSchema.index({ hostedBy: 1, date: -1, status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
