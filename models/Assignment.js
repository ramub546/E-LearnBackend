const mongoose = require('mongoose');
const { Schema } = mongoose;

const assignmentSchema = new Schema(
  {
    assignmentName: {
      type: String,
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: String,
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    dueDate: Date,
  },

  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
