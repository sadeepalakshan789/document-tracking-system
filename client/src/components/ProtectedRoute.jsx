import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthPayload } from "../utils/auth";

/**
 * ProtectedRoute
 * ─────────────────────────────────────────────────────────────────
 * A wrapper that enforces authentication AND role-based access.
 *
 * Props:
 *   children      – The component to render when access is granted.
 *   allowedRoles  – Array of role strings allowed to visit this route.
 *                   Example: ["super-admin"]  or  ["super-admin", "admin"]
 *                   If omitted or empty, any authenticated user is allowed.
 *
 * Behavior:
 *   1. No token / expired token  →  redirect to /login
 *   2. Token present but role not allowed  →  redirect to /unauthorized
 *   3. Token present and role allowed  →  render children
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const payload = getAuthPayload(); // null when not logged in or token expired

  // ── Case 1: Not authenticated ─────────────────────────────────
  if (!payload) {
    // Preserve the page the user was trying to visit so we can redirect
    // back after a successful login (optional UX improvement).
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Case 2: Authenticated but wrong role ──────────────────────
  if (allowedRoles.length > 0) {
    const userRole = payload.role ? payload.role.toUpperCase() : "";
    const allowedRolesUpper = allowedRoles.map(r => r.toUpperCase());
    if (!allowedRolesUpper.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // ── Case 3: Fully authorized ──────────────────────────────────
  return children;
};

export default ProtectedRoute;
