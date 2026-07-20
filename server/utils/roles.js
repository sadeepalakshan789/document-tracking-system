const SUPER_ADMIN_ROLE = "super-admin";
const ADMIN_ROLE = "admin";
const USER_ROLE = "user";
const SUPER_ADMIN_POSITION = "Admin (Super)";

const normalizeString = (str = "") => String(str || "").trim().toLowerCase();

const isSuperAdminRole = (role = "") => {
  const norm = normalizeString(role);
  return norm === "super-admin" || norm === "super_admin" || norm === "superadmin";
};

const isAdminRole = (role = "") => {
  const norm = normalizeString(role);
  return norm === "admin" || norm === "sub_admin" || norm === "sub-admin";
};

const isSuperAdminPosition = (position = "") => {
  const norm = normalizeString(position);
  return norm === "admin (super)" || norm === "super admin" || norm === "super-admin";
};

const isAdminPosition = (position = "") => {
  const norm = normalizeString(position);
  return (
    norm === "admin" ||
    norm === "administrator" ||
    norm === "sub admin" ||
    norm === "sub-admin"
  );
};

const isSuperAdminUser = (user = {}) => {
  return isSuperAdminRole(user.role) || isSuperAdminPosition(user.position);
};

const isAdminUser = (user = {}) => {
  return (
    isSuperAdminUser(user) ||
    isAdminRole(user.role) ||
    isAdminPosition(user.position)
  );
};

const getEffectiveRole = (user = {}) => {
  if (isSuperAdminRole(user.role)) return SUPER_ADMIN_ROLE;
  if (isAdminRole(user.role)) return ADMIN_ROLE;
  if (isSuperAdminPosition(user.position)) return SUPER_ADMIN_ROLE;
  if (isAdminPosition(user.position)) return ADMIN_ROLE;
  return USER_ROLE;
};

const resolveRoleFromPosition = (position = "", fallbackRole = USER_ROLE) => {
  if (isSuperAdminPosition(position)) return SUPER_ADMIN_ROLE;
  if (isAdminPosition(position)) return ADMIN_ROLE;
  return fallbackRole;
};

module.exports = {
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  USER_ROLE,
  SUPER_ADMIN_POSITION,
  isSuperAdminRole,
  isAdminRole,
  isSuperAdminPosition,
  isAdminPosition,
  isSuperAdminUser,
  isAdminUser,
  getEffectiveRole,
  resolveRoleFromPosition,
};

