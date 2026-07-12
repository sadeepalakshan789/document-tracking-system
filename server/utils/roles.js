const ADMIN_ROLE = "admin";
const USER_ROLE = "user";
const SUPER_ADMIN_POSITION = "Admin (Super)";

const normalizePosition = (position = "") => position.trim().toLowerCase();

const isSuperAdminPosition = (position = "") =>
  normalizePosition(position) === normalizePosition(SUPER_ADMIN_POSITION);

const isAdminUser = (user = {}) => {
  const normalizedRole = String(user.role || "").trim().toLowerCase();
  return normalizedRole === ADMIN_ROLE || isSuperAdminPosition(user.position);
};

const getEffectiveRole = (user = {}) => (isAdminUser(user) ? ADMIN_ROLE : USER_ROLE);

const resolveRoleFromPosition = (position = "", fallbackRole = USER_ROLE) =>
  isSuperAdminPosition(position) ? ADMIN_ROLE : fallbackRole;

module.exports = {
  ADMIN_ROLE,
  USER_ROLE,
  SUPER_ADMIN_POSITION,
  isSuperAdminPosition,
  isAdminUser,
  getEffectiveRole,
  resolveRoleFromPosition,
};
