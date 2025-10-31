const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true,
  },
  markedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Compound index for faster queries
attendanceSchema.index({ student: 1, subject: 1, date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
