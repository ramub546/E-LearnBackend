const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  studentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  }
}, { 
  timestamps: true 
});

// Ensure one result per student per test
testResultSchema.index({ studentID: 1, testID: 1 }, { unique: true });

module.exports = mongoose.model('TestResult', testResultSchema);