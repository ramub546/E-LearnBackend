const mongoose = require('mongoose');

const teacherAnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  announcementType: {
    type: String,
    enum: ['student', 'event'],
    required: true
  },
  // For student announcements
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  // Common fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  // For events
  eventDate: {
    type: Date
  },
  eventLocation: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('TeacherAnnouncement', teacherAnnouncementSchema);