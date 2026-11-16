const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB Limit
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const allowedExtensions = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", 
  "jpg", "jpeg", "png", "txt", "zip", 
  "rar", "7z", "csv", "ppt", "pptx"
]);

const allowedMimeTypes = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["txt", "text/plain"],
  ["zip", "application/zip"],
  ["rar", "application/x-rar-compressed"],
  ["7z", "application/x-7z-compressed"],
  ["csv", "text/csv"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
]);

const getAllowedMimeTypes = () => Object.fromEntries(allowedMimeTypes);

const getUploadRoot = () => UPLOAD_ROOT;

const ensureUploadDirectory = () => {
  fs.mkdirSync(getUploadRoot(), { recursive: true });
};

const getFileExtension = (filename = "") => {
  const extension = path.extname(filename || "").slice(1).toLowerCase();
  return extension;
};

const sanitizeFilename = (filename = "") => {
  const baseName = path.basename(filename || "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const cleaned = baseName.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "document";
};

const buildStoredFileName = (originalFilename = "") => {
  const extension = getFileExtension(originalFilename);
  const baseName = sanitizeFilename(path.basename(originalFilename, `.${extension}` || ""));
  const uniqueSuffix = crypto.randomBytes(4).toString("hex");
  const safeBase = baseName || "document";
  const safeExtension = extension || "bin";
  return `${Date.now()}-${uniqueSuffix}-${safeBase}.${safeExtension}`;
};

const resolveStoredFilePath = (storedFileName = "") => {
  const uploadRoot = getUploadRoot();
  const cleanName = path.basename(storedFileName || "");
  const resolvedPath = path.resolve(uploadRoot, cleanName);
  if (!resolvedPath.startsWith(uploadRoot)) {
    throw new Error("Invalid file path");
  }
  return resolvedPath;
};

const validateFileUpload = (file) => {
  if (!file) {
    return { valid: false, message: "Please select a file to upload" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: "File is too large. Maximum allowed size is 1 GB.",
    };
  }

  const extension = getFileExtension(file.originalname);
  const extensionAllowed = allowedExtensions.has(extension);

  if (!extensionAllowed) {
    return {
      valid: false,
      message: `File format (.${extension}) is not allowed. Supported formats include PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT, ZIP.`,
    };
  }

  return { valid: true };
};

const deleteStoredFile = (storedFileName) => {
  if (!storedFileName) {
    return true;
  }

  try {
    const resolvedPath = resolveStoredFilePath(storedFileName);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  MAX_FILE_SIZE_BYTES,
  UPLOAD_ROOT,
  getUploadRoot,
  getAllowedMimeTypes,
  ensureUploadDirectory,
  getFileExtension,
  sanitizeFilename,
  buildStoredFileName,
  resolveStoredFilePath,
  validateFileUpload,
  deleteStoredFile,
};
