const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─────────────────────────────────────────────
//  User Schema
//  Stores all application users (user / admin / super-admin).
//  Existing fields (name, position, verified, otp, otpExpires) are
//  preserved so that authController.js continues to work without
//  any modification.
// ─────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // Display name (used throughout the app)
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // Unique login identifier
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Campus / department position (existing field – kept as-is)
    position: {
      type: String,
      default: "",
      trim: true,
    },

    // Hashed password – never returned in queries (select: false)
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // excluded from queries by default
    },

    // RBAC role – 'super-admin' is the highest privilege level
    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },

    // Account status – 'blocked' users are denied access at middleware level
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    // Email-verification fields (used by authController.js)
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    avatar: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    emailAlerts: {
      type: Boolean,
      default: true,
    },
    inAppNotifications: {
      type: Boolean,
      default: true,
    },

    // ── Password Reset OTP fields ─────────────────────────────────────
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
    resetOtpVerified: { type: Boolean, default: false },
    resetOtpAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

// ─────────────────────────────────────────────
//  Pre-save hook: Hash the password before saving
//  Only runs when the password field has been modified so that
//  re-saving a document for other field changes does not re-hash
//  an already-hashed password.
// ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  // Skip hashing if password was not changed
  if (!this.isModified("password")) {
    if (typeof next === "function") return next();
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (typeof next === "function") return next();
  } catch (err) {
    if (typeof next === "function") return next(err);
    throw err;
  }
});

// ─────────────────────────────────────────────
//  Instance method: comparePassword
//  Safely compares a plain-text candidate password against the
//  stored hash.  The caller must explicitly include the password
//  field with .select("+password") when querying, because it is
//  excluded by default (select: false).
// ─────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
