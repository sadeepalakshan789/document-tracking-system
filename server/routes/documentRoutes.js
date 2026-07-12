const express = require("express");
const {
  createDocument,
  getDocument,
  updateDocumentStatus,
  getAllDocuments,
  getMyDocuments,
  acceptDocument,
  forwardDocument,
  rerouteDocument,
} = require("../controllers/documentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/create", protect, createDocument);
router.get("/mine", protect, getMyDocuments);
router.get("/all", protect, getAllDocuments);
router.put("/:id/accept", protect, acceptDocument);
router.put("/:id/forward", protect, forwardDocument);
router.put("/:id/reroute", protect, rerouteDocument);
router.put("/:id/accept", protect, acceptDocument);
router.put("/:id/forward", protect, forwardDocument);
router.put("/:id/reroute", protect, rerouteDocument);
router.put("/:id/status", protect, updateDocumentStatus);
router.get("/:id", protect, getDocument);
router.get("/:id", protect, getDocument);

module.exports = router;

