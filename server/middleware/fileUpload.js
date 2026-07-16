const multer = require("multer");
const path = require("path");
const { ensureUploadDirectory, getUploadRoot } = require("../utils/fileUtils");

ensureUploadDirectory();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadRoot()),
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;
