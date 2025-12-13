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
    // ------------------------- ADDITION: Student-only fields -------------------------
    // These fields are intended to be used only for users with role: 'student'.
    // Lightweight validators below allow the fields to be present only when
    // the document's `role` is 'student'. They are NOT required by schema;
    // admin can populate/edit them later.
    registrationSource: {
      type: String,
      enum: ['student', 'parent', 'admin'],
      // allow undefined for non-students; if set, ensure role is 'student'
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          return this.role === 'student';
        },
        message: 'registrationSource should only be set for student users',
      },
    },
    studentStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      // Default to 'pending' only for students. Use a function so `this.role`
      // is available when the document is created. For non-students the field
      // will be left undefined which avoids validation conflicts.
      default: function () {
        return this.role === 'student' ? 'pending' : undefined;
      },
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          return this.role === 'student';
        },
        message: 'studentStatus should only be set for student users',
      },
    },
    profilePicture: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return this.role === 'student';
        },
        message: 'profilePicture should only be set for student users',
      },
    },
    governmentProof: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return this.role === 'student';
        },
        message: 'governmentProof should only be set for student users',
      },
    },
    parentDetails: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    address: {
      country: { type: String, trim: true },
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      pincode: { type: String, trim: true },
      fullAddress: { type: String, trim: true },
    },
    academicYear: {
      type: String,
      trim: true,
    },
    howDidYouFindUs: {
      type: String,
      trim: true,
    },
    // ----------------------- END: Student-only fields -----------------------

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
    gender: { 
      type: String, 
      enum: ['Male', 'Female', 'Other'], 
      trim: true 
    },
    countryRegion: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
  subjectSpecialization: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject' 
  }],
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
