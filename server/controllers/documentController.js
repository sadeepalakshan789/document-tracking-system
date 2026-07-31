const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendNotificationEmail } = require("../utils/sendEmail"); // 💡 Import Brevo Helper utility

const {
  buildStoredFileName,
  deleteStoredFile,
  ensureUploadDirectory,
  getFileExtension,
  resolveStoredFilePath,
  validateFileUpload,
} = require("../utils/fileUtils");

const isSameId = (a, b) => String(a) === String(b);

// Asynchronous background email dispatcher (Optimized & Fixed)
const dispatchBackgroundEmails = async (notifications) => {
  try {
    for (const notif of notifications) {
      if (!notif.userId) continue;

      // 1. Fetch the target recipient details directly
      const user = await User.findById(notif.userId).select("name email emailAlerts");
      if (!user || !user.email) {
        console.log(`[Email Queue] Skipped: User not found or has no email for ID ${notif.userId}`);
        continue;
      }

      // Check recipient preferences
      if (user.emailAlerts === false) {
        console.log(`[Email Queue] Skipped: Email alerts disabled by recipient (${user.email})`);
        continue;
      }

      // 2. Prevent sending notification emails to the action actor/creator themselves if it's a system notification
      if (notif.type === "system") {
        console.log(`[Email Queue] Skipped: Creator system notification email for ${user.email}`);
        continue;
      }

      // 💡 Log the attempt in terminal to confirm it reaches this block
      console.log(`[Email Queue] Triggering Brevo email transmission to: ${user.email}`);

      // 3. Dispatch using the Brevo utility
      sendNotificationEmail(
        user.email,
        user.name,
        `Document Update: ${notif.trackingId}`,
        notif.message
      ).catch((err) => {
        console.error("Brevo Email Dispatcher Link Failed:", err.response ? JSON.stringify(err.response.body) : err.message);
      });
    }
  } catch (error) {
    console.error("Email dispatch queue error:", error.message);
  }
};

// Check In-App Notification preferences before saving
const createNotifications = async (notifications) => {
  try {
    if (!notifications || notifications.length === 0) return [];

    const uniqueUserIds = [...new Set(notifications.map((n) => String(n.userId)))];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select("_id inAppNotifications");
    const prefsMap = new Map(users.map((u) => [String(u._id), u.inAppNotifications !== false]));

    const allowedNotifications = [];
    for (const notif of notifications) {
      const allowed = prefsMap.has(String(notif.userId)) ? prefsMap.get(String(notif.userId)) : true;
      if (allowed) {
        allowedNotifications.push(notif);
      } else {
        console.log(`[Notification] Skipped: In-app alerts disabled by recipient (${notif.userId})`);
      }
    }

    if (allowedNotifications.length > 0) {
      await Notification.insertMany(allowedNotifications);
    }
    return allowedNotifications;
  } catch (error) {
    console.error("createNotifications error:", error.message);
    return [];
  }
};

const buildDocumentResponse = (doc, currentUserId) => {
  const currentHolderId = doc.currentHolder?.userId ? String(doc.currentHolder.userId) : null;
  const currentUser = String(currentUserId);
  const currentStep =
    doc.currentHolderIndex >= 0 && doc.currentHolderIndex < doc.route.length
      ? doc.route[doc.currentHolderIndex]
      : null;
  const isCurrentHolder = !!currentHolderId && currentHolderId === currentUser;

  return {
    ...doc.toObject(),
    workflow: {
      totalSteps: doc.route.length,
      completedSteps: doc.route.filter((step) => step.status === "completed").length,
      pendingSteps: doc.route.filter((step) => step.status === "pending").length,
      currentHolder: doc.currentHolder,
      canAccept: isCurrentHolder && !!currentStep && !currentStep.acceptedAt,
      canForward: isCurrentHolder && !!currentStep && !!currentStep.acceptedAt,
      canSelectNext:
        isCurrentHolder &&
        !!currentStep &&
        !!currentStep.acceptedAt &&
        doc.route.some((step) => step.status === "pending"),
      canReroute: isCurrentHolder,
    },
  };
};

const canAccessDocument = (doc, userId, role = "") => {
  const roleLower = String(role || "").toLowerCase();
  if (roleLower === "superadmin" || roleLower === "super_admin" || roleLower === "super-admin" || roleLower === "admin") return true;
  const isSender = doc.sender?.userId && isSameId(doc.sender.userId, userId);
  const isInRoute = doc.route.some((step) => isSameId(step.userId, userId));
  return isSender || isInRoute;
};

const canAccessFile = (doc, userId) => {
  const isSender = doc.sender?.userId && isSameId(doc.sender.userId, userId);
  const isInRoute = doc.route.some((step) => isSameId(step.userId, userId));
  return isSender || isInRoute;
};

const canPreviewDownloadFile = (doc, userId, userRole = "") => {
  if (!doc || !userId) return false;
  const roleLower = String(userRole || "").toLowerCase();
  if (roleLower === "superadmin" || roleLower === "super_admin" || roleLower === "super-admin" || roleLower === "admin") return true;
  const isSender = doc.sender?.userId && isSameId(doc.sender.userId, userId);
  const isRecipient = doc.route.some((step) => isSameId(step.userId, userId));
  return isSender || isRecipient;
};

const createDocument = async (req, res) => {
  try {
    const { title, content = "", routeUserIds = [], receiver } = req.body;

    const routeIds = Array.isArray(routeUserIds) ? routeUserIds : receiver ? [receiver] : [];

    if (!title || routeIds.length === 0) {
      return res.status(400).json({ message: "Please provide title and at least one recipient" });
    }

    const normalizedRouteIds = routeIds.map(String);
    const uniqueRouteIds = [...new Set(normalizedRouteIds)];

    if (uniqueRouteIds.length !== normalizedRouteIds.length) {
      return res.status(400).json({ message: "Duplicate recipients are not allowed in the workflow" });
    }

    if (uniqueRouteIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "Invalid recipient id in workflow" });
    }

    if (uniqueRouteIds.some((id) => isSameId(id, req.user.id))) {
      return res.status(400).json({ message: "Sender cannot be a recipient in the workflow" });
    }

    const users = await User.find({ _id: { $in: uniqueRouteIds } }).select("_id name email role");
    if (users.length !== uniqueRouteIds.length) {
      return res.status(400).json({ message: "One or more selected recipients do not exist" });
    }

    // Block super-admin accounts from being added to a workflow path
    const superAdminRecipient = users.find((u) => u.role === "super-admin");
    if (superAdminRecipient) {
      return res.status(400).json({
        message: `Super Admin accounts cannot be added to a document workflow. Please select only regular users or campus officers.`,
      });
    }

    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const orderedUsers = uniqueRouteIds.map((id) => usersById.get(id));

    const now = new Date();
    const route = orderedUsers.map((user, index) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      status: index === 0 ? "current" : "pending",
      notifiedAt: now,
      receivedAt: index === 0 ? now : undefined,
    }));

    const trackingId = `DOC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const document = await Document.create({
      title,
      content,
      trackingId,
      status: "In Transit",
      sender: {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      route,
      currentHolderIndex: 0,
      currentHolder: {
        userId: route[0].userId,
        name: route[0].name,
        email: route[0].email,
      },
      history: [
        {
          action: "DOCUMENT_CREATED",
          description: `${req.user.name} created document ${trackingId} and notified all selected recipients before dispatch.`,
          actorId: req.user.id,
          actorName: req.user.name,
          timestamp: now,
        },
        {
          action: "DOCUMENT_DISPATCHED",
          description: `Document is now with ${route[0].name}. Workflow order: ${[req.user.name, ...route.map((r) => r.name)].join(" -> ")}`,
          actorId: req.user.id,
          actorName: req.user.name,
          timestamp: now,
        },
      ],
    });

    const notifications = [];
    for (let index = 0; index < route.length; index += 1) {
      const step = route[index];
      const isCurrent = index === 0;
      notifications.push({
        userId: step.userId,
        documentId: document._id,
        trackingId,
        type: isCurrent ? "current" : "upcoming",
        message: isCurrent
          ? `Document ${trackingId} is now with you. You are step ${index + 1} of ${route.length}.`
          : `You have been added to workflow for document ${trackingId}. Your position is ${index + 1} of ${route.length}.`,
      });
    }

    notifications.push({
      userId: req.user.id,
      documentId: document._id,
      trackingId,
      type: "system",
      message: `You created document ${trackingId} with ${route.length} recipients in sequence.`,
    });

    await createNotifications(notifications);

    // 🚀 Initiate background email dispatch
    dispatchBackgroundEmails(notifications);

    return res.status(201).json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("createDocument error:", error.message);
    return res.status(500).json({ message: "Failed to create document" });
  }
};

const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    console.log("Tracker Access Check User Role:", req.user?.role);

    const isSuperAdmin = req.user?.role?.toLowerCase() === 'superadmin' || req.user?.role?.toLowerCase() === 'super_admin' || req.user?.role?.toLowerCase() === 'super-admin' || req.user?.role?.toLowerCase() === 'admin' || req.user?.isSuperAdmin === true;
    const isSender = document.sender?.userId && isSameId(document.sender.userId, req.user.id);
    const isReceiver = document.route?.some((step) => isSameId(step.userId, req.user.id));
    const isHolder = document.currentHolder?.userId && isSameId(document.currentHolder.userId, req.user.id);

    if (isSuperAdmin || isSender || isReceiver || isHolder) {
      return res.json(buildDocumentResponse(document, req.user.id));
    } else {
      return res.status(403).json({ message: "You are not allowed to access this document" });
    }
  } catch (error) {
    console.error("getDocument error:", error.message);
    return res.status(500).json({ message: "Failed to fetch document" });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    // Condition 1: The current holder MUST be the logged-in user
    const documents = await Document.find({
      "currentHolder.userId": req.user.id,
    }).sort({ updatedAt: -1 });

    // Condition 2: The receipt status for the logged-in user MUST be "Pending" (!currentStep.acceptedAt)
    const actionableDocuments = documents.filter((doc) => {
      const currentStep =
        doc.currentHolderIndex >= 0 && doc.currentHolderIndex < doc.route.length
          ? doc.route[doc.currentHolderIndex]
          : null;

      if (!currentStep) return false;

      // Must not be accepted yet
      return !currentStep.acceptedAt;
    });

    const formattedDocuments = actionableDocuments.map((doc) =>
      buildDocumentResponse(doc, req.user.id)
    );

    return res.json(formattedDocuments);
  } catch (error) {
    console.error("getMyDocuments error:", error.message);
    return res.status(500).json({ message: "Failed to fetch documents" });
  }
};

const acceptDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to access this document" });
    }

    if (!document.currentHolder?.userId || !isSameId(document.currentHolder.userId, req.user.id)) {
      return res.status(403).json({ message: "Only the current holder can accept this document" });
    }

    if (document.currentHolderIndex < 0 || document.currentHolderIndex >= document.route.length) {
      return res.status(400).json({ message: "Invalid workflow state" });
    }

    const now = new Date();
    const currentStep = document.route[document.currentHolderIndex];

    if (currentStep.acceptedAt) {
      return res.json(buildDocumentResponse(document, req.user.id));
    }

    if (!currentStep.receivedAt) {
      currentStep.receivedAt = now;
    }
    currentStep.acceptedAt = now;

    document.history.push({
      action: "DOCUMENT_ACCEPTED",
      description: `${req.user.name} accepted document ${document.trackingId}.`,
      actorId: req.user.id,
      actorName: req.user.name,
      timestamp: now,
    });

    await document.save();

    const newNotifs = [
      {
        userId: document.sender.userId,
        documentId: document._id,
        trackingId: document.trackingId,
        type: "system",
        message: `${req.user.name} accepted document ${document.trackingId}.`,
      },
    ];

    await createNotifications(newNotifs);

    // 🚀 Background email dispatch
    dispatchBackgroundEmails(newNotifs);

    return res.json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("acceptDocument error:", error.message);
    return res.status(500).json({ message: "Failed to accept document" });
  }
};

const forwardDocument = async (req, res) => {
  try {
    const { remarks = "", nextUserId } = req.body;
    const document = await Document.findOne({ trackingId: req.params.id });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to access this document" });
    }

    if (!document.currentHolder?.userId || !isSameId(document.currentHolder.userId, req.user.id)) {
      return res.status(403).json({ message: "Only the current holder can forward the document" });
    }

    if (document.currentHolderIndex < 0 || document.currentHolderIndex >= document.route.length) {
      return res.status(400).json({ message: "Invalid workflow state" });
    }

    const now = new Date();
    const currentStep = document.route[document.currentHolderIndex];

    if (!currentStep.acceptedAt) {
      return res.status(400).json({ message: "Please accept the document before forwarding it" });
    }

    currentStep.status = "completed";
    currentStep.completedAt = now;

    const nextIndex = document.currentHolderIndex + 1;
    const hasNext = nextIndex < document.route.length;

    const newNotifs = [];

    if (hasNext) {
      let selectedNextIndex = nextIndex;

      if (nextUserId) {
        if (!mongoose.Types.ObjectId.isValid(String(nextUserId))) {
          return res.status(400).json({ message: "nextUserId is invalid" });
        }

        selectedNextIndex = document.route.findIndex(
          (step, index) =>
            index > document.currentHolderIndex &&
            step.status === "pending" &&
            isSameId(step.userId, nextUserId)
        );

        if (selectedNextIndex === -1) {
          return res.status(400).json({ message: "Selected next user is not available in pending route" });
        }

        if (selectedNextIndex !== nextIndex) {
          const [selectedStep] = document.route.splice(selectedNextIndex, 1);
          document.route.splice(nextIndex, 0, selectedStep);
        }
      }

      const nextStep = document.route[nextIndex];
      nextStep.status = "current";
      nextStep.receivedAt = now;
      nextStep.acceptedAt = undefined;

      document.currentHolderIndex = nextIndex;
      document.currentHolder = {
        userId: nextStep.userId,
        name: nextStep.name,
        email: nextStep.email,
      };
      document.status = "In Transit";

      document.history.push({
        action: "DOCUMENT_FORWARDED",
        description: `${req.user.name} forwarded document to ${nextStep.name}.${nextUserId ? " Next receiver selected by current holder." : ""}${remarks ? ` Remarks: ${remarks}` : ""}`,
        actorId: req.user.id,
        actorName: req.user.name,
        timestamp: now,
      });

      newNotifs.push(
        {
          userId: nextStep.userId,
          documentId: document._id,
          trackingId: document.trackingId,
          type: "current",
          message: `Document ${document.trackingId} is now with you.`,
        },
        {
          userId: document.sender.userId,
          documentId: document._id,
          trackingId: document.trackingId,
          type: "forwarded",
          message: `${req.user.name} forwarded document ${document.trackingId} to ${nextStep.name}.`,
        }
      );
    } else {
      document.currentHolderIndex = -1;
      document.currentHolder = null;
      document.status = "Completed";

      document.history.push({
        action: "WORKFLOW_COMPLETED",
        description: `${req.user.name} completed the final step.${remarks ? ` Remarks: ${remarks}` : ""}`,
        actorId: req.user.id,
        actorName: req.user.name,
        timestamp: now,
      });

      const recipients = document.route.map((step) => step.userId);
      const userIds = [...new Set([String(document.sender.userId), ...recipients.map(String)])];

      userIds.forEach((uId) => {
        newNotifs.push({
          userId: uId,
          documentId: document._id,
          trackingId: document.trackingId,
          type: "completed",
          message: `Workflow completed for document ${document.trackingId}.`,
        });
      });
    }

    await createNotifications(newNotifs);
    await document.save();

    // 🚀 Background email dispatch
    dispatchBackgroundEmails(newNotifs);

    return res.json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("forwardDocument error:", error.message);
    return res.status(500).json({ message: "Failed to forward document" });
  }
};

const rerouteDocument = async (req, res) => {
  try {
    const { insertUserId, beforeUserId, reason = "" } = req.body;

    if (!insertUserId) {
      return res.status(400).json({ message: "insertUserId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(insertUserId))) {
      return res.status(400).json({ message: "insertUserId is invalid" });
    }

    const document = await Document.findOne({ trackingId: req.params.id });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to access this document" });
    }

    if (!document.currentHolder?.userId || !isSameId(document.currentHolder.userId, req.user.id)) {
      return res.status(403).json({ message: "Only the current holder can change the route" });
    }

    if (isSameId(insertUserId, document.sender.userId)) {
      return res.status(400).json({ message: "Sender cannot be inserted into route" });
    }

    const alreadyInUpcomingRoute = document.route.some(
      (step, index) => index > document.currentHolderIndex && step.status !== "completed" && isSameId(step.userId, insertUserId)
    );

    if (alreadyInUpcomingRoute) {
      return res.status(400).json({ message: "Selected user is already in remaining workflow" });
    }

    const userToInsert = await User.findById(insertUserId).select("_id name email role");
    if (!userToInsert) {
      return res.status(404).json({ message: "User to insert was not found" });
    }

    // Block super-admin accounts from being inserted into a workflow path
    if (userToInsert.role === "super-admin") {
      return res.status(400).json({
        message: "Super Admin accounts cannot be added to a document workflow.",
      });
    }

    const defaultInsertIndex = document.currentHolderIndex + 1;
    let insertIndex = defaultInsertIndex;

    if (beforeUserId) {
      if (!mongoose.Types.ObjectId.isValid(String(beforeUserId))) {
        return res.status(400).json({ message: "beforeUserId is invalid" });
      }

      const locatedIndex = document.route.findIndex(
        (step, index) =>
          index >= defaultInsertIndex &&
          step.status === "pending" &&
          isSameId(step.userId, beforeUserId)
      );

      if (locatedIndex === -1) {
        return res.status(400).json({ message: "beforeUserId was not found in pending route" });
      }

      insertIndex = locatedIndex;
    }

    const now = new Date();
    document.route.splice(insertIndex, 0, {
      userId: userToInsert._id,
      name: userToInsert.name,
      email: userToInsert.email,
      status: "pending",
      notifiedAt: now,
    });

    document.history.push({
      action: "ROUTE_CHANGED",
      description: `${req.user.name} inserted ${userToInsert.name} into workflow at position ${insertIndex + 1}.${reason ? ` Reason: ${reason}` : ""}`,
      actorId: req.user.id,
      actorName: req.user.name,
      timestamp: now,
    });

    await document.save();

    const newNotifs = [
      {
        userId: userToInsert._id,
        documentId: document._id,
        trackingId: document.trackingId,
        type: "reroute",
        message: `You were added to workflow for document ${document.trackingId} by ${req.user.name}.`,
      },
      {
        userId: document.sender.userId,
        documentId: document._id,
        trackingId: document.trackingId,
        type: "reroute",
        message: `${req.user.name} changed the route of document ${document.trackingId} and added ${userToInsert.name}.`,
      },
    ];

    await createNotifications(newNotifs);

    // 🚀 Background email dispatch
    dispatchBackgroundEmails(newNotifs);

    return res.json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("rerouteDocument error:", error.message);
    return res.status(500).json({ message: "Failed to reroute document" });
  }
};

const updateDocumentStatus = async (req, res) => {
  return forwardDocument(req, res);
};

const getTrackerDocuments = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select("position");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const department = currentUser.position || "";

    let departmentUserIds = [];
    if (department) {
      const usersInDept = await User.find({ position: department }).select("_id");
      departmentUserIds = usersInDept.map((u) => u._id);
    }

    const documents = await Document.find({
      $or: [
        { "currentHolder.userId": req.user.id },
        { "sender.userId": req.user.id },
        { "currentHolder.userId": { $in: departmentUserIds } },
      ],
    }).sort({ updatedAt: -1 });

    return res.json(documents.map((doc) => buildDocumentResponse(doc, req.user.id)));
  } catch (error) {
    console.error("getTrackerDocuments error:", error.message);
    return res.status(500).json({ message: "Failed to fetch tracker documents" });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [{ "sender.userId": req.user.id }, { "route.userId": req.user.id }],
    }).sort({ updatedAt: -1 });

    return res.json(documents.map((doc) => buildDocumentResponse(doc, req.user.id)));
  } catch (error) {
    console.error("getAllDocuments error:", error.message);
    return res.status(500).json({ message: "Failed to fetch documents" });
  }
};

const uploadDocumentFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded" });
    }

    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to manage this document" });
    }

    const validation = validateFileUpload(req.file);
    if (!validation.valid) {
      deleteStoredFile(req.file.filename);
      return res.status(400).json({ message: validation.message });
    }

    ensureUploadDirectory();
    const storedFileName = buildStoredFileName(req.file.originalname);
    const sourcePath = path.resolve(req.file.destination, req.file.filename);
    const targetPath = resolveStoredFilePath(storedFileName);
    fs.renameSync(sourcePath, targetPath);

    const createdAt = new Date();
    const fileExtension = getFileExtension(req.file.originalname);
    const filePayload = {
      originalFileName: req.file.originalname,
      storedFileName,
      filePath: `/uploads/${storedFileName}`,
      fileExtension,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: createdAt,
      uploadedBy: {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      currentVersion: 1,
      versions: [],
    };

    let previousVersions = [];
    let nextVersion = 1;

    if (document.file) {
      nextVersion = (document.file.currentVersion || 0) + 1;
      previousVersions = document.file.versions || [];
      previousVersions.push({
        versionNumber: document.file.currentVersion || 1,
        originalFileName: document.file.originalFileName,
        storedFileName: document.file.storedFileName,
        filePath: document.file.filePath,
        fileExtension: document.file.fileExtension,
        mimeType: document.file.mimeType,
        fileSize: document.file.fileSize,
        uploadedAt: document.file.uploadedAt,
        uploadedBy: document.file.uploadedBy,
      });
    }

    document.file = {
      ...filePayload,
      versions: previousVersions,
      currentVersion: nextVersion,
    };

    document.history.push({
      action: "DOCUMENT_FILE_UPLOADED",
      description: `${req.user.name} uploaded a file for document ${document.trackingId}.`,
      actorId: req.user.id,
      actorName: req.user.name,
      timestamp: createdAt,
    });

    await document.save();

    return res.status(201).json({
      message: "File uploaded successfully",
      file: document.file,
      document: buildDocumentResponse(document, req.user.id),
    });
  } catch (error) {
    console.error("uploadDocumentFile error:", error.message);
    return res.status(500).json({ message: "Failed to upload document file" });
  }
};

const getDocumentFilePreview = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canPreviewDownloadFile(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not authorized to preview this file" });
    }

    if (!document.file?.storedFileName) {
      return res.status(404).json({ message: "No file attached to this document" });
    }

    const filePath = resolveStoredFilePath(document.file.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    const extension = getFileExtension(document.file.originalFileName || document.file.storedFileName);
    const previewableTypes = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp"]);

    if (!previewableTypes.has(extension)) {
      return res.status(400).json({ message: "Preview is not available for this file type. Please download the file." });
    }

    res.setHeader("Content-Type", document.file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${document.file.originalFileName}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error("getDocumentFilePreview error:", error.message);
    return res.status(500).json({ message: "Failed to preview document file" });
  }
};

const downloadDocumentFile = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canPreviewDownloadFile(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not authorized to download this file" });
    }

    if (!document.file?.storedFileName) {
      return res.status(404).json({ message: "No file attached to this document" });
    }

    const filePath = resolveStoredFilePath(document.file.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    res.setHeader("Content-Type", document.file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${document.file.originalFileName}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error("downloadDocumentFile error:", error.message);
    return res.status(500).json({ message: "Failed to download document file" });
  }
};

const getDocumentVersions = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canPreviewDownloadFile(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not authorized to access file versions" });
    }

    const versions = [
      {
        versionNumber: document.file?.currentVersion || 1,
        originalFileName: document.file?.originalFileName,
        storedFileName: document.file?.storedFileName,
        filePath: document.file?.filePath,
        fileExtension: document.file?.fileExtension,
        mimeType: document.file?.mimeType,
        fileSize: document.file?.fileSize,
        uploadedAt: document.file?.uploadedAt,
        uploadedBy: document.file?.uploadedBy,
      },
      ...(document.file?.versions || []),
    ];

    return res.json({ versions });
  } catch (error) {
    console.error("getDocumentVersions error:", error.message);
    return res.status(500).json({ message: "Failed to fetch document versions" });
  }
};

const downloadDocumentVersion = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canPreviewDownloadFile(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not authorized to download this file version" });
    }

    const requestedVersion = Number(req.params.versionNumber);
    const currentVersion = document.file?.currentVersion || 1;
    const matchingVersion = requestedVersion === currentVersion
      ? document.file
      : (document.file?.versions || []).find((version) => version.versionNumber === requestedVersion);

    if (!matchingVersion?.storedFileName) {
      return res.status(404).json({ message: "Requested version was not found" });
    }

    const filePath = resolveStoredFilePath(matchingVersion.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Requested version file was not found on disk" });
    }

    res.setHeader("Content-Type", matchingVersion.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${matchingVersion.originalFileName}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error("downloadDocumentVersion error:", error.message);
    return res.status(500).json({ message: "Failed to download document version" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ trackingId: req.params.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(document, req.user.id, req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to delete this document" });
    }

    if (document.file?.storedFileName) {
      deleteStoredFile(document.file.storedFileName);
    }

    await Document.deleteOne({ _id: document._id });

    return res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("deleteDocument error:", error.message);
    return res.status(500).json({ message: "Failed to delete document" });
  }
};

module.exports = {
  createDocument,
  getDocument,
  getMyDocuments,
  acceptDocument,
  forwardDocument,
  rerouteDocument,
  updateDocumentStatus,
  getAllDocuments,
  uploadDocumentFile,
  getDocumentFilePreview,
  downloadDocumentFile,
  getDocumentVersions,
  downloadDocumentVersion,
  deleteDocument,
  getTrackerDocuments,
};