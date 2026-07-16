const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
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
} = require("../controllers/documentController");
const { protect } = require("../middleware/auth");

const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({ storage: uploadStorage });

const router = express.Router();

router.post("/create", protect, createDocument);
router.post("/:id/upload", protect, upload.single("file"), uploadDocumentFile);
router.get("/mine", protect, getMyDocuments);
router.get("/all", protect, getAllDocuments);
router.put("/:id/accept", protect, acceptDocument);
router.put("/:id/forward", protect, forwardDocument);
router.put("/:id/reroute", protect, rerouteDocument);
router.put("/:id/status", protect, updateDocumentStatus);
router.get("/:id", protect, getDocument);

module.exports = router;
