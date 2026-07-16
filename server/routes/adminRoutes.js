const express = require("express");
const router = express.Router();

// ── Middleware ──
const { protect, authorizeRoles, requireSuperAdmin } = require("../middleware/authMiddleware");

// ── Controller methods ──
const {
  createUser,
  createAdmin,
  toggleUserStatus,
  getAllUsers,
  deleteUser,
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

module.exports = router;
