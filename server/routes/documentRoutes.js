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
  uploadDocumentFile,
  getDocumentFilePreview,
  downloadDocumentFile,
  getDocumentVersions,
  downloadDocumentVersion,
  deleteDocument,
} = require("../controllers/documentController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/fileUpload");
const { handleSingleUpload } = upload;
const { loadDocument, authorizeFileAccess } = require("../middleware/fileAccess");

const router = express.Router();

router.post("/create", protect, createDocument);
router.get("/mine", protect, getMyDocuments);
router.get("/all", protect, getAllDocuments);
router.put("/:id/accept", protect, acceptDocument);
router.put("/:id/forward", protect, forwardDocument);
router.put("/:id/reroute", protect, rerouteDocument);
router.put("/:id/status", protect, updateDocumentStatus);
router.post("/:id/upload", protect, loadDocument, authorizeFileAccess, handleSingleUpload("file"), uploadDocumentFile);
router.get("/:id/preview", protect, loadDocument, authorizeFileAccess, getDocumentFilePreview);
router.get("/:id/download", protect, loadDocument, authorizeFileAccess, downloadDocumentFile);
router.get("/:id/versions", protect, loadDocument, authorizeFileAccess, getDocumentVersions);
router.get("/:id/versions/:versionNumber/download", protect, loadDocument, authorizeFileAccess, downloadDocumentVersion);
router.delete("/:id", protect, loadDocument, authorizeFileAccess, deleteDocument);
router.get("/:id", protect, getDocument);

module.exports = router;

