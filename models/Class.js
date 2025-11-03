const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      unique: true,
      enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    classCode: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', classSchema);
