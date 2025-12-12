// models/LessonPlanner.js
const mongoose = require('mongoose');

const lessonPlannerSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String, // 'HH:mm' format
    required: true
  },
  endTime: {
    type: String, // 'HH:mm' format
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('LessonPlanner', lessonPlannerSchema);
