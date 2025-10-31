const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const otpSchema = new mongoose.Schema(
  {
    code: String,
    expiresAt: Date,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Common fields
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'parent', 'teacher'],
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    otp: otpSchema,

    // ✅ RESET PASSWORD FIELDS (NEW)
    resetPasswordOtp: {
      code: String,
      expiresAt: Date,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
    },

    uniqueId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Student-specific fields
    dob: { type: Date },
    academicRegion: { type: String, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    roleNumber: {
      type: String,
      sparse: true,
    },
    gradeLevel: String,
    gpa: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 5.0, // Or 5.0, depending on your scale
    },

    // Parent-specific fields
    linkedStudents: [
      {
        studentId: { type: String },
        relationship: {
          type: String,
          enum: ['Father', 'Mother', 'Guardian', 'Other'],
        },
      },
    ],

    // Teacher-specific fields
    countryRegion: { type: String, trim: true },
    subjectSpecialization: { type: String },
    qualification: { type: String },
    idProofUrl: { type: String },
    teacherStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('passwordHash')) {
//     return next();
//   }

//   try {
//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(this.passwordHash, salt);
//     this.passwordHash = hash;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('User', userSchema);
