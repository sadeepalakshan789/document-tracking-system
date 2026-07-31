const Document = require("../models/Document");

const isSameId = (a, b) => String(a) === String(b);

const loadDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    req.document = document;
    return next();
  } catch (error) {
    console.error("loadDocument error:", error.message);
    return res.status(500).json({ message: "Failed to load document" });
  }
};

const authorizeDocumentAccess = (req, res, next) => {
  const document = req.document;

  if (!document || !req.user) {
    return res.status(403).json({ message: "You are not authorized to access this document" });
  }

  const isSuperAdmin = req.user?.role?.toLowerCase() === 'superadmin' || req.user?.role?.toLowerCase() === 'super_admin' || req.user?.role?.toLowerCase() === 'super-admin' || req.user?.role?.toLowerCase() === 'admin' || req.user?.isSuperAdmin === true;

  if (isSuperAdmin) {
    return next();
  }

  const isSender = document.sender?.userId && isSameId(document.sender.userId, req.user.id);
  const isRecipient = document.route?.some((step) => isSameId(step.userId, req.user.id));

  if (isSender || isRecipient) {
    return next();
  }

  return res.status(403).json({ message: "You are not authorized to access this document" });
};

const authorizeFileAccess = (req, res, next) => {
  return authorizeDocumentAccess(req, res, next);
};

module.exports = {
  loadDocument,
  authorizeDocumentAccess,
  authorizeFileAccess,
};
