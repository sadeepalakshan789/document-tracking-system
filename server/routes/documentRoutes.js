const express = require("express");
const { createDocument, getDocument, updateDocumentStatus, getAllDocuments } = require("../controllers/documentController");
const { protect } = require("../middleware/auth");
const router = express.Router();

// Secured Routes
router.post("/create", protect, createDocument);
router.get("/all", protect, getAllDocuments);
router.get("/:id", protect, getDocument);
router.put("/:id/status", protect, updateDocumentStatus);

module.exports = router;