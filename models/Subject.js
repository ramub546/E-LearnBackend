const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  subjectName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);