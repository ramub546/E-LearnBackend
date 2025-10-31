mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      default: 'admin',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
    },

    // ✅ RESET PASSWORD FIELDS (NEW)
    resetPasswordOtp: {
      code: String,
      expiresAt: Date,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Compare password method
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('AdminUser', adminSchema);
