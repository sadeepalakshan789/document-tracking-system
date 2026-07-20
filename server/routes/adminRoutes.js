const express = require("express");
const router = express.Router();

// ── Middleware ──
const { protect, authorizeRoles, requireSuperAdmin } = require("../middleware/authMiddleware");
const verifySuperAdmin = requireSuperAdmin;

// ── Controller methods ──
const {
  getSettings,
  updateSettings,
  getAuditLogs,
} = require("../controllers/settingsController");
const {
  createUser,
  createAdmin,
  toggleUserStatus,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUser,
  getUserDocumentActivity,
} = require("../controllers/adminController");

// ─────────────────────────────────────────────
//  All routes below require a valid JWT token.
//  The protect middleware is applied first on every route.
//  authorizeRoles(...) then restricts access by role.
// ─────────────────────────────────────────────

/**
 * POST /api/admin/create-user
 * Create a new user (of any role).
 * Access: super-admin only
 */
router.post(
  "/create-user",
  protect,
  requireSuperAdmin,
  createUser
);

/**
 * POST /api/admin/create-admin
 * Create a new admin account.
 * Access: super-admin only
 */
router.post(
  "/create-admin",
  protect,
  requireSuperAdmin,
  createAdmin
);

/**
 * PATCH /api/admin/toggle-status/:userId
 * Toggle a user's or admin's account status between active ↔ blocked.
 * Access: super-admin only
 */
router.patch(
  "/toggle-status/:userId",
  protect,
  authorizeRoles("super-admin", "SUPER_ADMIN"),
  toggleUserStatus
);

/**
 * DELETE /api/admin/user/:userId
 * Permanently delete a user or admin account.
 * Access: super-admin only
 */
router.delete(
  "/user/:userId",
  protect,
  authorizeRoles("super-admin", "SUPER_ADMIN"),
  deleteUser
);

/**
 * GET /api/admin/users
 * Fetch all users and admins (excluding passwords).
 * Access: super-admin and admin
 */
router.get(
  "/users",
  protect,
  authorizeRoles("super-admin", "admin", "SUPER_ADMIN"),
  getAllUsers
);

/**
 * GET /api/admin/users/:userId/activity
 * Get a user's document activity (sent docs, workflow steps, action log).
 * Access: super-admin only
 * NOTE: Must be declared BEFORE /users/:userId so Express does not
 *       treat the literal string "activity" as a :userId parameter.
 */
router.get(
  "/users/:userId/activity",
  protect,
  requireSuperAdmin,
  getUserDocumentActivity
);

/**
 * GET /api/admin/users/:userId
 * Fetch a single user's full profile.
 * Access: super-admin only
 */
router.get(
  "/users/:userId",
  protect,
  requireSuperAdmin,
  getUserById
);

/**
 * PUT /api/admin/users/:userId
 * Update a user's role, position, and/or status.
 * Access: super-admin only
 */
router.put(
  "/users/:userId",
  protect,
  requireSuperAdmin,
  updateUser
);

/**
 * GET /api/admin/settings
 * Fetch global settings configurations.
 * Access: super-admin only
 */
router.get("/settings", protect, verifySuperAdmin, getSettings);

/**
 * PUT /api/admin/settings
 * Update global settings configurations and sync positions.
 * Access: super-admin only
 */
router.put("/settings", protect, verifySuperAdmin, updateSettings);

/**
 * GET /api/admin/audit-logs
 * Fetch all system audit logs.
 * Access: super-admin only
 */
router.get("/audit-logs", protect, verifySuperAdmin, getAuditLogs);

module.exports = router;
