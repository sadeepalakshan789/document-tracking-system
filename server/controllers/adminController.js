const User = require("../models/User");
const Document = require("../models/Document");
const mongoose = require("mongoose");

// ─────────────────────────────────────────────
//  createUser (Updated: Supports any role dynamically)
//  Route:  POST /api/admin/create-user
//  Access: super-admin only
// ─────────────────────────────────────────────
const createUser = async (req, res) => {
  try {
  
    const { name, email, position, password, role } = req.body;

    // ── Validate required fields ──
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // ── Normalize the email ──
    const normalizedEmail = email.trim().toLowerCase();

    // ── Prevent duplicate accounts ──
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists" });
    }

    // ── Map/transform role explicitly to database enum values ──
    let finalRole = "user";
    if (role === "SUB_ADMIN" || role === "admin") finalRole = "admin";
    if (role === "SUPER_ADMIN" || role === "super-admin") finalRole = "super-admin";

    // ── Create the user dynamically with the selected role ──
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      position: position ? position.trim() : "",
      password, 
      role: finalRole, 
      status: "active",
      verified: true, 
    });

    // ── Return safe response ──
    return res.status(201).json({
      message: `${newUser.role.toUpperCase()} account created successfully`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        position: newUser.position,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("createUser error:", error.message);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists" });
    }
    return res.status(500).json({ message: "Failed to create user account" });
  }
};


const createAdmin = createUser;

// ─────────────────────────────────────────────
//  toggleUserStatus
// ─────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("_id name email role status");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "super-admin") {
      return res.status(403).json({ message: "Super-admin accounts cannot be blocked" });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: "You cannot change your own account status" });
    }

    user.status = user.status === "active" ? "blocked" : "active";
    await user.save();

    return res.status(200).json({
      message: `User status updated to '${user.status}' successfully`,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  } catch (error) {
    console.error("toggleUserStatus error:", error.message);
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID format" });
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

//  getAllUsers
// ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("_id name email position role status verified createdAt")
      .sort({ name: 1 });

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error("getAllUsers error:", error.message);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

// ─────────────────────────────────────────────
//  deleteUser
// ─────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(userId).select("_id name email role");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "super-admin") {
      return res.status(403).json({ message: "Super-admin accounts cannot be deleted" });
    }

    await User.findByIdAndDelete(userId);
    return res.status(200).json({
      message: `Account for '${user.name}' has been permanently deleted`,
      deletedUser: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("deleteUser error:", error.message);
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID format" });
    return res.status(500).json({ message: "Failed to delete user" });
  }
};


// ─────────────────────────────────────────────
//  getUserById
//  Route:  GET /api/admin/users/:userId
//  Access: super-admin only
// ─────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format before hitting the DB (handles Mongoose 7+ BSONError)
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select(
      "_id name email position role status verified createdAt updatedAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toObject();
    if (!userObj.createdAt && user._id) {
      const timestamp = parseInt(user._id.toString().substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) {
        userObj.createdAt = new Date(timestamp);
      }
    }
    return res.status(200).json({ user: userObj });
  } catch (error) {
    console.error("getUserById error:", error.message);
    if (error.name === "CastError" || error.name === "BSONError")
      return res.status(400).json({ message: "Invalid user ID format" });
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

// ─────────────────────────────────────────────
//  updateUser
//  Route:  PUT /api/admin/users/:userId
//  Access: super-admin only
//  Body:   { role?, position?, status? }
// ─────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, position, status } = req.body;

    const user = await User.findById(userId).select(
      "_id name email position role status"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent degrading your own role
    if (userId === req.user.id.toString() && role && role !== user.role) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    // Normalize role to DB enum values
    if (role !== undefined) {
      const r = role.toLowerCase().replace("_", "-");
      if (r === "super-admin" || r === "super_admin") user.role = "super-admin";
      else if (r === "admin" || r === "sub-admin" || r === "sub_admin") user.role = "admin";
      else user.role = "user";
    }

    if (position !== undefined) user.position = position.trim();

    if (status !== undefined) {
      if (![ "active", "blocked" ].includes(status))
        return res.status(400).json({ message: "Invalid status value" });
      if (user.role === "super-admin" && status === "blocked")
        return res.status(403).json({ message: "Super-admin accounts cannot be blocked" });
      if (userId === req.user.id.toString() && status === "blocked")
        return res.status(400).json({ message: "You cannot block your own account" });
      user.status = status;
    }

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        position: user.position,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("updateUser error:", error.message);
    if (error.name === "CastError")
      return res.status(400).json({ message: "Invalid user ID format" });
    return res.status(500).json({ message: "Failed to update user" });
  }
};

// ─────────────────────────────────────────────
//  getUserDocumentActivity
//  Route:  GET /api/admin/users/:userId/activity
//  Access: super-admin only
// ─────────────────────────────────────────────
const getUserDocumentActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format before constructing it (handles Mongoose 7+ BSONError)
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const oid = new mongoose.Types.ObjectId(userId);

    // Documents sent by this user
    const sentDocs = await Document.find({ "sender.userId": oid })
      .select("_id title trackingId status createdAt sender route currentHolder")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Documents where this user is in the workflow route
    const routeDocs = await Document.find({ "route.userId": oid })
      .select("_id title trackingId status createdAt sender route")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Build workflow step entries for this user from routeDocs
    const workflowSteps = [];
    for (const doc of routeDocs) {
      const step = (doc.route || []).find(
        (r) => r.userId && r.userId.toString() === userId
      );
      if (step) {
        workflowSteps.push({
          docId: doc._id,
          title: doc.title,
          trackingId: doc.trackingId,
          docStatus: doc.status,
          stepStatus: step.status,
          notifiedAt: step.notifiedAt,
          completedAt: step.completedAt,
        });
      }
    }

    // Action log: history entries attributed to this user across all documents
    const actionLogDocs = await Document.find({ "history.actorId": oid })
      .select("_id title trackingId history")
      .lean();

    const actionLog = [];
    for (const doc of actionLogDocs) {
      for (const entry of doc.history || []) {
        if (entry.actorId && entry.actorId.toString() === userId) {
          actionLog.push({
            docId: doc._id,
            title: doc.title,
            trackingId: doc.trackingId,
            action: entry.action,
            description: entry.description,
            timestamp: entry.timestamp,
          });
        }
      }
    }

    // Sort action log newest first, cap at 30
    actionLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const trimmedLog = actionLog.slice(0, 30);

    // All workflow documents involving this user
    const rawDocs = await Document.find({
      $or: [
        { "sender.userId": oid },
        { "currentHolder.userId": oid },
        { "route.userId": oid },
      ],
    })
      .select("_id title trackingId status sender currentHolder route createdAt updatedAt file history")
      .sort({ updatedAt: -1 })
      .lean();

    const documents = rawDocs.map((doc) => {
      const isCreator = Boolean(doc.sender?.userId && doc.sender.userId.toString() === userId);
      const isCurrentHolder = Boolean(doc.currentHolder?.userId && doc.currentHolder.userId.toString() === userId);
      const isCompleted = doc.status === "Completed";
      const isAssigned = isCurrentHolder && !isCompleted;

      let roleInDoc = "Participant";
      if (isCurrentHolder) {
        roleInDoc = "Current Holder";
      } else if (isCreator) {
        roleInDoc = "Creator";
      }

      return {
        _id: doc._id,
        title: doc.title,
        trackingId: doc.trackingId,
        status: doc.status,
        sender: doc.sender,
        currentHolder: doc.currentHolder,
        route: doc.route,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        file: doc.file,
        isCreator,
        isCurrentHolder,
        isAssigned,
        isCompleted,
        roleInDoc,
      };
    });

    return res.status(200).json({
      documents,
      sentDocuments: sentDocs,
      workflowSteps,
      actionLog: trimmedLog,
    });
  } catch (error) {
    console.error("getUserDocumentActivity error:", error.message);
    if (error.name === "CastError" || error.name === "BSONError")
      return res.status(400).json({ message: "Invalid user ID format" });
    // Always return empty arrays on unexpected errors so the frontend
    // activity panel degrades gracefully instead of showing a hard failure
    return res.status(200).json({
      documents: [],
      sentDocuments: [],
      workflowSteps: [],
      actionLog: [],
    });
  }
};

// ─────────────────────────────────────────────
//  reassignDocument
//  Route:  PUT /api/admin/documents/:id/reassign
//  Access: super-admin & admin
// ─────────────────────────────────────────────
const reassignDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId, reason = "" } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "Invalid target user ID" });
    }

    const targetUser = await User.findById(targetUserId).select("_id name email role position");
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    if (targetUser.role === "super-admin") {
      return res.status(400).json({ message: "Super-admin accounts cannot hold workflow documents" });
    }

    const document = await Document.findOne({
      $or: [
        { trackingId: id },
        mongoose.isValidObjectId(id) ? { _id: id } : { trackingId: id },
      ],
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const previousHolder = document.currentHolder ? { ...document.currentHolder.toObject() } : null;

    // Set new currentHolder
    document.currentHolder = {
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
    };

    // Update current step in route if present
    const currStepIdx = document.currentHolderIndex ?? 0;
    if (document.route && document.route[currStepIdx]) {
      document.route[currStepIdx].userId = targetUser._id;
      document.route[currStepIdx].name = targetUser.name;
      document.route[currStepIdx].email = targetUser.email;
      document.route[currStepIdx].status = "current";
      document.route[currStepIdx].acceptedAt = null;
      document.route[currStepIdx].notifiedAt = new Date();
    }

    // Add entry to history
    document.history.push({
      action: "Reassigned by Admin",
      description: `Reassigned from ${previousHolder ? previousHolder.name : "Previous Holder"} to ${targetUser.name}.${reason ? ` Reason: ${reason}` : ""}`,
      actorId: req.user.id,
      actorName: req.user.name || "Administrator",
      timestamp: new Date(),
    });

    await document.save();

    return res.status(200).json({
      message: `Document successfully reassigned to ${targetUser.name}`,
      document,
    });
  } catch (error) {
    console.error("reassignDocument error:", error.message);
    return res.status(500).json({ message: "Failed to reassign document" });
  }
};

// ─────────────────────────────────────────────
//  getSystemReportData
//  Route:  GET /api/admin/reports/data
//  Access: super-admin & admin
// ─────────────────────────────────────────────
const getSystemReportData = async (req, res) => {
  try {
    const { period = "daily", date } = req.query;
    const baseDate = date ? new Date(date) : new Date();

    let startDate;
    let endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999);

    if (period === "weekly") {
      startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Daily
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
    }

    // Query documents
    let reportDocs = await Document.find({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    })
      .select("_id title trackingId status priority dueDate sender currentHolder route currentHolderIndex createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    // Fallback if 0 documents found in exact date range (dev/test env)
    let isFallback = false;
    if (reportDocs.length === 0) {
      reportDocs = await Document.find()
        .select("_id title trackingId status priority dueDate sender currentHolder route currentHolderIndex createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();
      isFallback = true;
    }

    const totalDocs = reportDocs.length;
    const inTransit = reportDocs.filter((d) => d.status === "In Transit").length;
    const completed = reportDocs.filter((d) => d.status === "Completed").length;
    const pendingAcceptance = reportDocs.filter((d) => {
      const currStep = d.route?.[d.currentHolderIndex ?? 0];
      return currStep && !currStep.acceptedAt && d.status !== "Completed";
    }).length;

    const nowMs = Date.now();
    const delayed = reportDocs.filter((d) => {
      if (d.status === "Completed") return false;
      const isPastDue = d.dueDate && new Date(d.dueDate).getTime() < nowMs;
      const updatedMs = new Date(d.updatedAt || d.createdAt).getTime();
      return isPastDue || nowMs - updatedMs > 48 * 3600 * 1000;
    }).length;

    // Users summary
    const users = await User.find().select("_id name email role status createdAt").lean();
    const totalActive = users.filter((u) => u.status === "active").length;
    const totalBlocked = users.filter((u) => u.status === "blocked").length;

    const newUsers = users.filter((u) => {
      let created = u.createdAt;
      if (!created && u._id) {
        created = new Date(parseInt(u._id.toString().substring(0, 8), 16) * 1000);
      }
      return created && created >= startDate && created <= endDate;
    }).length;

    // Top active document handlers
    const handlerCountMap = {};
    for (const d of reportDocs) {
      if (d.currentHolder?.name) {
        handlerCountMap[d.currentHolder.name] = (handlerCountMap[d.currentHolder.name] || 0) + 1;
      }
      for (const step of d.route || []) {
        if (step.name && (step.status === "completed" || step.status === "current")) {
          handlerCountMap[step.name] = (handlerCountMap[step.name] || 0) + 1;
        }
      }
    }

    const topHandlers = Object.entries(handlerCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const documentLog = reportDocs.map((d) => {
      const isOverdue = d.status !== "Completed" && !!(d.dueDate && new Date(d.dueDate).getTime() < nowMs);
      return {
        _id: d._id,
        trackingId: d.trackingId,
        title: d.title,
        priority: d.priority || "Normal",
        dueDate: d.dueDate || null,
        isOverdue,
        createdBy: d.sender?.name || "System",
        currentHolder: d.currentHolder?.name || "None",
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });

    return res.status(200).json({
      period,
      startDate,
      endDate,
      isFallback,
      workflowSummary: {
        total: totalDocs,
        inTransit,
        pendingAcceptance,
        completed,
        delayed,
      },
      userActivity: {
        totalActive,
        totalBlocked,
        newUsersPeriod: newUsers,
        topHandlers,
      },
      documents: documentLog,
    });
  } catch (error) {
    console.error("getSystemReportData error:", error.message);
    return res.status(500).json({ message: "Failed to generate report data" });
  }
};

module.exports = {
  createUser,
  createAdmin,
  toggleUserStatus,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUser,
  getUserDocumentActivity,
  reassignDocument,
  getSystemReportData,
};