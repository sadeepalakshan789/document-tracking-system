const Document = require("../models/Document");
const crypto = require("crypto");

const createDocument = async (req, res) => {
  const { title, content, receiver } = req.body;

  if (!title || !receiver) {
    return res.status(400).json({ message: "Please add title and receiver" });
  }

  const trackingId = "DOC-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  const doc = await Document.create({
    title,
    content,
    trackingId,
    status: "Submitted",
    sender: req.user.email, // Assigned by auth middleware
    receiver,
    history: [{ action: "Document Created & Submitted", timestamp: new Date() }],
  });

  res.status(201).json(doc);
};

const getDocument = async (req, res) => {
  const doc = await Document.findOne({ trackingId: req.params.id });
  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }
  res.json(doc);
};

const updateDocumentStatus = async (req, res) => {
  const { status, remarks } = req.body;
  const doc = await Document.findOne({ trackingId: req.params.id });

  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }

  // E.g., status: "Reviewed", "Approved", "Delivered"
  doc.status = status;
  doc.history.push({
    action: `Status updated to ${status} by ${req.user.email}. Remarks: ${remarks || "None"}`,
    timestamp: new Date()
  });

  await doc.save();
  res.json(doc);
};

// Admins or dashboard overview
const getAllDocuments = async (req, res) => {
  const docs = await Document.find().sort({ "history.timestamp": -1 });
  res.json(docs);
};

module.exports = { createDocument, getDocument, updateDocumentStatus, getAllDocuments };
