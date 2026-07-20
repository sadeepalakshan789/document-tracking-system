const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getUploadRoot, UPLOAD_ROOT } = require("../utils/fileUtils");

// Robust upload directory resolution with fallbacks
const resolveUploadDir = () => {
  if (typeof getUploadRoot === "function") {
    return getUploadRoot();
  }
  if (UPLOAD_ROOT) {
    return UPLOAD_ROOT;
  }
  return path.join(__dirname, "..", "uploads");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = resolveUploadDir();
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + sanitizedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB limit
  },
});

const handleSingleUpload = (fieldName = "file") => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File size exceeds the 1 GB maximum limit." });
        }
        return res.status(400).json({ message: err.message || "File upload failed." });
      }
      next();
    });
  };
};

module.exports = upload;
module.exports.handleSingleUpload = handleSingleUpload;
