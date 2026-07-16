const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);
const allowedMimeTypes = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
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
  const resolvedPath = path.resolve(uploadRoot, storedFileName || "");
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
      message: "File is too large. Maximum allowed size is 10 MB.",
    };
  }

  const extension = getFileExtension(file.originalname);
  const expectedMimeType = allowedMimeTypes.get(extension);
  const mimeMatches = expectedMimeType && file.mimetype === expectedMimeType;
  const extensionAllowed = allowedExtensions.has(extension);

  if (!extensionAllowed || !mimeMatches) {
    return {
      valid: false,
      message: "Only PDF, DOC, DOCX, XLS, and XLSX files are allowed.",
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
  getAllowedMimeTypes,
  ensureUploadDirectory,
  getFileExtension,
  sanitizeFilename,
  buildStoredFileName,
  resolveStoredFilePath,
  validateFileUpload,
  deleteStoredFile,
};
