const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─────────────────────────────────────────────
//  protect
//  Verifies the JWT Bearer token sent in the Authorization header.
//  On success it attaches the full user object to req.user and
//  additionally blocks users whose account status is 'blocked'.
//
//  Usage:  router.get("/route", protect, handler)
// ─────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // ── 1. Extract the Bearer token from the Authorization header ──
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // ── 2. Reject if no token is present ──
  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }

  try {
    // ── 3. Verify the token signature and expiry ──
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    );

    // ── 4. Load the user from DB (include password field is NOT needed here) ──
    //       We select status explicitly because it was added after the original
    //       schema and is not fetched by default in older code paths.
    const user = await User.findById(decoded.id).select(
      "_id name email position role status verified"
    );

    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    // ── 5. Block access for suspended accounts ──
    if (user.status === "blocked") {
      return res.status(403).json({
        message:
          "Your account has been blocked. Please contact the administrator for further details",
      });
    }

    // ── 6. Attach user payload to request so downstream handlers can use it ──
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: user.role,
      status: user.status,
      verified: user.verified,
    };

    return next();
  } catch (error) {
    console.error("protect middleware error:", error.message);
    return res
      .status(401)
      .json({ message: "Not authorized, token is invalid or expired" });
  }
};

// ─────────────────────────────────────────────
//  authorizeRoles(...allowedRoles)
//  A factory that returns a middleware which checks whether the
//  authenticated user's role is in the list of allowed roles.
//  Must be used AFTER the protect middleware so that req.user exists.
//
//  Usage:  router.delete("/route", protect, authorizeRoles("super-admin"), handler)
//          router.get("/route",    protect, authorizeRoles("super-admin", "admin"), handler)
// ─────────────────────────────────────────────
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is guaranteed to exist because protect runs first
    if (!req.user) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to perform this action!",
      });
    }
    const normRole = (req.user.role || "").toLowerCase().replace(/_/g, "-");
    // Fallback check: automatically grant access to any admin route for SUPER_ADMIN
    if (normRole === "super-admin") {
      return next();
    }
    const allowedRolesNormalized = allowedRoles.map((role) => role.toLowerCase().replace(/_/g, "-"));
    if (!allowedRolesNormalized.includes(normRole)) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to perform this action!",
      });
    }
    return next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  const normRole = (req.user?.role || "").toLowerCase().replace(/_/g, "-");
  if (!req.user || normRole !== "super-admin") {
    return res.status(403).json({
      message: "Access denied. Only SUPER_ADMIN can perform this action.",
    });
  }
  next();
};

// ─────────────────────────────────────────────
//  Legacy export kept for backward compatibility.
//  Existing routes that import { protect, admin } from "./middleware/auth"
//  will continue to work because auth.js is not changed.
//  New routes should import from this file (authMiddleware.js).
// ─────────────────────────────────────────────
module.exports = { protect, authorizeRoles, requireSuperAdmin };
