const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Schema for storing the result of a test taken by a student.
 */
const testResultSchema = new Schema(
  {
    studentID: {
      type: Schema.Types.ObjectId,
      ref: 'User', // References the User model
      required: true,
    },
    testID: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },

    marks: {
      type: Number,
      required: true,
      min: 0, // Marks can't be negative
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

testResultSchema.index({ studentID: 1, testID: 1 }, { unique: true });

const TestResult = mongoose.model('TestResult', testResultSchema);

module.exports = TestResult;
