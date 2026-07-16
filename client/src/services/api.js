import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const verifyOTP = (data) => API.post("/auth/verify-otp", data);
export const resendOTP = (data) => API.post("/auth/resend-otp", data);
export const getCampusPositions = () => API.get("/auth/positions");
export const getCurrentUser = () => API.get("/auth/me");
export const updateCurrentUser = (data) => API.put("/auth/me", data);
export const getUsers = () => API.get("/auth/users");
export const getAdminUsers = () => API.get("/auth/admin/users");
export const getAdminUserById = (id) => API.get(`/auth/admin/users/${id}`);
export const getAdminUserActivity = (id, limit = 200) =>
  API.get(`/auth/admin/users/${id}/activity`, { params: { limit } });
export const createAdminUser = (data) => API.post("/auth/admin/users", data);
export const updateAdminUser = (id, data) => API.put(`/auth/admin/users/${id}`, data);
export const deleteAdminUser = (id) => API.delete(`/auth/admin/users/${id}`);

export const createDocument = (data) => API.post("/documents/create", data);
export const getDocument = (id) => API.get(`/documents/${id}`);
export const getMyDocuments = () => API.get("/documents/mine");
export const getAllDocuments = () => API.get("/documents/all");
export const acceptDocument = (id) => API.put(`/documents/${id}/accept`);
export const forwardDocument = (id, data = {}) => API.put(`/documents/${id}/forward`, data);
export const rerouteDocument = (id, data) => API.put(`/documents/${id}/reroute`, data);
export const uploadDocumentFile = (id, formData) => API.post(`/documents/${id}/upload`, formData);
export const previewDocumentFile = (id) => API.get(`/documents/${id}/preview`, { responseType: "blob" });
export const downloadDocumentFile = (id) => API.get(`/documents/${id}/download`, { responseType: "blob" });
export const getDocumentVersions = (id) => API.get(`/documents/${id}/versions`);
export const downloadDocumentVersion = (id, versionNumber) =>
  API.get(`/documents/${id}/versions/${versionNumber}/download`, { responseType: "blob" });
export const deleteDocument = (id) => API.delete(`/documents/${id}`);

export const getMyNotifications = () => API.get("/notifications/mine");
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put("/notifications/read-all");

// ── Admin / RBAC endpoints ────────────────────────────────────────────────────
/** GET /api/admin/users – fetch all users & admins (super-admin + admin) */
export const adminGetAllUsers = () => {
  return API.get("/admin/users", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};

/** POST /api/admin/create-user – create a new user account (super-admin only) */
export const adminCreateUser = (data) => API.post("/admin/create-user", data);

/** POST /api/admin/create-admin – create a new admin account (super-admin only) */
export const adminCreateAdmin = (data) => API.post("/admin/create-user", data);

/** PATCH /api/admin/toggle-status/:userId – toggle active ↔ blocked (super-admin only) */
export const adminToggleStatus = (userId) => API.patch(`/admin/toggle-status/${userId}`);

/** DELETE /api/admin/user/:userId – permanently delete a user/admin (super-admin only) */
export const adminDeleteUser = (userId) => API.delete(`/admin/user/${userId}`);

export default API;

