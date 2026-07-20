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
    return res.status(200).json({ user });
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

    return res.status(200).json({
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
      sentDocuments: [],
      workflowSteps: [],
      actionLog: [],
    });
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
};