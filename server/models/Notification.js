const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    trackingId: { type: String },
    type: {
      type: String,
      enum: ["upcoming", "current", "forwarded", "reroute", "completed", "system"],
      default: "system",
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
