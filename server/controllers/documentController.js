const crypto = require("crypto");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const User = require("../models/User");
const Notification = require("../models/Notification");

const isSameId = (a, b) => String(a) === String(b);

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

const canAccessDocument = (doc, userId) => {
  const isSender = doc.sender?.userId && isSameId(doc.sender.userId, userId);
  const isInRoute = doc.route.some((step) => isSameId(step.userId, userId));
  return isSender || isInRoute;
};

const createDocument = async (req, res) => {
  try {
    const { title, content = "", routeUserIds = [], receiver } = req.body;

    const routeIds = Array.isArray(routeUserIds)
      ? routeUserIds
      : receiver
        ? [receiver]
        : [];

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

    const users = await User.find({ _id: { $in: uniqueRouteIds } }).select("_id name email");
    if (users.length !== uniqueRouteIds.length) {
      return res.status(400).json({ message: "One or more selected recipients do not exist" });
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

    await Notification.insertMany(notifications);

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

    if (!canAccessDocument(document, req.user.id)) {
      return res.status(403).json({ message: "You are not allowed to access this document" });
    }

    return res.json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("getDocument error:", error.message);
    return res.status(500).json({ message: "Failed to fetch document" });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      "currentHolder.userId": req.user.id,
    }).sort({ updatedAt: -1 });

    const assignedDocuments = documents
      .map((doc) => buildDocumentResponse(doc, req.user.id))
      .filter((doc) => doc.workflow?.canAccept);

    return res.json(assignedDocuments);
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

    if (!canAccessDocument(document, req.user.id)) {
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

    await Notification.insertMany([
      {
        userId: document.sender.userId,
        documentId: document._id,
        trackingId: document.trackingId,
        type: "system",
        message: `${req.user.name} accepted document ${document.trackingId}.`,
      },
    ]);

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

    if (!canAccessDocument(document, req.user.id)) {
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

      await Notification.insertMany([
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
        },
      ]);
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

      await Notification.insertMany(
        userIds.map((userId) => ({
          userId,
          documentId: document._id,
          trackingId: document.trackingId,
          type: "completed",
          message: `Workflow completed for document ${document.trackingId}.`,
        }))
      );
    }

    await document.save();

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

    if (!canAccessDocument(document, req.user.id)) {
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

    const userToInsert = await User.findById(insertUserId).select("_id name email");
    if (!userToInsert) {
      return res.status(404).json({ message: "User to insert was not found" });
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

    await Notification.insertMany([
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
    ]);

    return res.json(buildDocumentResponse(document, req.user.id));
  } catch (error) {
    console.error("rerouteDocument error:", error.message);
    return res.status(500).json({ message: "Failed to reroute document" });
  }
};

const updateDocumentStatus = async (req, res) => {
  return forwardDocument(req, res);
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

module.exports = {
  createDocument,
  getDocument,
  getMyDocuments,
  acceptDocument,
  forwardDocument,
  rerouteDocument,
  updateDocumentStatus,
  getAllDocuments,
};
