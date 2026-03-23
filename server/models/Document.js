const mongoose = require("mongoose");

const docSchema = new mongoose.Schema({
  title: String,
  content: String,
  trackingId: { type: String, unique: true },
  status: { type: String, enum:["Submitted","Reviewed","Approved","Delivered"], default:"Submitted" },
  sender: String,
  receiver: String,
  history: [{ action: String, timestamp: Date }]
});

module.exports = mongoose.model("Document", docSchema);