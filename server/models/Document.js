const mongoose = require("mongoose");

const routeStepSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "current", "completed"],
      default: "pending",
    },
    notifiedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    overdueNotified: { type: Boolean, default: false },
  },
  { _id: false }
);

const senderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const currentHolderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    email: { type: String },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    originalFileName: { type: String },
    storedFileName: { type: String },
    filePath: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date },
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String },
      email: { type: String },
    },
  },
  { _id: false }
);

const docSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },
    trackingId: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ["Submitted", "Reviewed", "Approved", "Delivered", "In Transit", "Completed"],
      default: "In Transit",
    },
    priority: {
      type: String,
      enum: ["Normal", "Urgent", "Confidential"],
      default: "Normal",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    overdueNotified: {
      type: Boolean,
      default: false,
    },
    sender: { type: senderSchema, required: true },
    route: { type: [routeStepSchema], default: [] },
    currentHolderIndex: { type: Number, default: 0 },
    currentHolder: { type: currentHolderSchema, default: null },
    file: { type: fileSchema, default: null },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

docSchema.index({ "sender.userId": 1 });
docSchema.index({ "route.userId": 1 });
docSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model("Document", docSchema);
