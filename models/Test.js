const mongoose = require('mongoose');
const { Schema } = mongoose;

const testSchema = new Schema(
  {
    testTitle: {
      type: String,
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    availableFrom: Date,
    availableUntil: Date,
    testLink: String,
  },
  { timestamps: true }
);

const Test = mongoose.model('Test', testSchema);

module.exports = Test;
