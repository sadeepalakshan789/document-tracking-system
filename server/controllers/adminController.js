const User = require("../models/User");

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


module.exports = {
  createUser,
  createAdmin,
  toggleUserStatus,
  getAllUsers,
  deleteUser,
};