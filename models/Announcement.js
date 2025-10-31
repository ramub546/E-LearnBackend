const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  targetAudience: {
    type: String,
    enum: ['student', 'teacher', 'parent', 'all'],
    default: 'all'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);