const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    theme: { type: String, default: "dark" },
    maxFileSize: { type: Number, default: 10 },
    allowedTypes: { type: [String], default: ["PDF", "JPEG", "Docx"] },
    autoArchiveDuration: { type: String, default: "30 days" },
    slaDeadline: { type: Number, default: 24 },
    enableAutoReminder: { type: Boolean, default: true },
    minPasswordLength: { type: Number, default: 6 },
    passwordComplexity: { type: Boolean, default: false },
    positions: { type: [String], default: ["Lecturer", "Head", "Dean", "Registrar",] },
    sessionTimeout: { type: Number, default: 60 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
