import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetAllUsers,
  adminCreateUser,
  adminToggleStatus,
  adminDeleteUser,
  getCampusPositions,
  getCurrentUser,
  uploadAvatar,
} from "../services/api";
import { getUserId } from "../utils/auth";
import UserSettingsModal from "../components/UserSettingsModal";
import AllAccountsModal from "../components/AllAccountsModal";
import SupportInboxModal from "../components/SupportInboxModal";
import ReportsModal from "../components/ReportsModal";
import { connectSocket } from "../services/socket";

// ─────────────────────────────────────────────────────────────────────────────
//  Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Inline toast-style alert banner */
function Alert({ type, message, onClose }) {
  if (!message) return null;

  const styles = {
    success: "bg-emerald-900/60 border-emerald-500 text-emerald-200",
    error: "bg-red-900/60 border-red-500 text-red-200",
    info: "bg-blue-900/60 border-blue-500 text-blue-200",
  };

  return (
    <div
      className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm mb-4 ${styles[type] ?? styles.info}`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-current opacity-60 hover:opacity-100 transition ml-2 shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

const formatRole = (role) => {
  if (!role) return "Super Admin";
  return role.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

/** Full-screen confirmation dialog */
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-500/20" : "bg-yellow-500/20"
              }`}
          >
            <svg
              className={`w-5 h-5 ${danger ? "text-red-500" : "text-yellow-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-slate-900 dark:text-white font-semibold text-base">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition text-white ${danger
              ? "bg-red-600 hover:bg-red-500"
              : "bg-yellow-600 hover:bg-yellow-500"
              }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const currentUserId = getUserId();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit("join_admin_panel");
    const handleList = (list) => {
      const totalUnread = (list || []).reduce((acc, sess) => acc + (sess.unreadCount || 0), 0);
      setUnreadSupportCount(totalUnread);
    };
    socket.on("session_list_updated", handleList);
    return () => socket.off("session_list_updated", handleList);
  }, []);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 5000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getCurrentUser();
        setCurrentUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        localStorage.setItem("currentUser", JSON.stringify(res.data));
      } catch (err) {
        console.error("Failed to fetch profile", err);
        const stored = localStorage.getItem("user") || localStorage.getItem("currentUser");
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      }
    };
    fetchProfile();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size and format
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.type) || file.size > maxSize) {
      showToast("error", "Selected image exceeds the 10MB limit. Please choose a smaller file.");
      e.target.value = "";
      return;
    }

    // Instantly preview the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Trigger API upload request
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await uploadAvatar(formData);
      const updatedUser = { ...currentUser, avatar: res.data.avatar };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      } catch (storageError) {
        console.error("Local storage update failed:", storageError);
      }
      showToast("success", "Profile picture updated successfully!");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to upload avatar.";
      showToast("error", errMsg);
      setPreviewUrl(null);
    }
  };

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "", position: "", role: "NORMAL_USER" });
  const [formLoading, setFormLoading] = useState(false);
  const [formAlert, setFormAlert] = useState({ type: "", message: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [tableAlert, setTableAlert] = useState({ type: "", message: "" });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAllAccountsModalOpen, setIsAllAccountsModalOpen] = useState(false);
  const [isSupportInboxModalOpen, setIsSupportInboxModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const res = await adminGetAllUsers();
      setUsers(res.data.users ?? []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load users. Please try again.";
      setUsersError(msg);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    const fetchPositions = async () => {
      try {
        setLoadingPositions(true);
        const res = await getCampusPositions();
        setPositions(res.data || []);
      } catch (err) {
        console.error("Failed to load positions:", err);
      } finally {
        setLoadingPositions(false);
      }
    };
    fetchPositions();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormAlert({ type: "", message: "" });

    const { name, email, password, position, role } = form;
    if (!name.trim() || !email.trim() || !password.trim() || !position.trim()) {
      setFormAlert({ type: "error", message: "All fields are required." });
      return;
    }
    if (password.length < 6) {
      setFormAlert({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    setFormLoading(true);
    try {
      await adminCreateUser({
        name: name.trim(),
        email: email.trim(),
        password,
        position: position.trim(),
        role: role // 'SUPER_ADMIN', 'SUB_ADMIN', or 'NORMAL_USER'
      });
      setFormAlert({
        type: "success",
        message: `Account for "${name.trim()}" created successfully!`,
      });
      setForm({ name: "", email: "", password: "", position: "", role: "NORMAL_USER" });
      fetchUsers();
    } catch (err) {
      setFormAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to create user. Please try again.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const requestToggleStatus = (user) => {
    const action = user.status === "active" ? "block" : "unblock";
    setConfirmDialog({
      open: true,
      title: `${action === "block" ? "Block" : "Unblock"} User`,
      message: `Are you sure you want to ${action} "${user.name}"? ${action === "block"
        ? "They will immediately lose access to the system."
        : "They will regain access to the system."
        }`,
      danger: action === "block",
      onConfirm: () => executeToggleStatus(user._id, user.name, action),
    });
  };

  const executeToggleStatus = async (userId, name, action) => {
    setConfirmDialog({ open: false });
    setActionLoadingId(userId);
    setTableAlert({ type: "", message: "" });
    try {
      await adminToggleStatus(userId);
      setTableAlert({
        type: "success",
        message: `"${name}" has been ${action === "block" ? "blocked" : "unblocked"} successfully.`,
      });
      fetchUsers();
    } catch (err) {
      setTableAlert({
        type: "error",
        message: err.response?.data?.message || `Failed to ${action} user.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const requestDelete = (user) => {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      message: `This will permanently delete "${user.name}" (${user.email}). This action CANNOT be undone.`,
      danger: true,
      onConfirm: () => executeDelete(user._id, user.name),
    });
  };

  const executeDelete = async (userId, name) => {
    setConfirmDialog({ open: false });
    setActionLoadingId(userId);
    setTableAlert({ type: "", message: "" });
    try {
      await adminDeleteUser(userId);
      setTableAlert({
        type: "success",
        message: `Account for "${name}" has been permanently deleted.`,
      });
      fetchUsers();
    } catch (err) {
      setTableAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to delete user.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role && ["ADMIN", "SUB_ADMIN", "SUPER_ADMIN"].includes(u.role.toUpperCase().replace(/-/g, "_"))).length,
    regularUsers: users.filter((u) => u.role && ["USER", "NORMAL_USER"].includes(u.role.toUpperCase().replace(/-/g, "_"))).length,
    blocked: users.filter((u) => u.status === "blocked").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 text-white shadow-md py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            {/* Interactive Profile Avatar */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-400/30 hover:ring-indigo-400 hover:scale-105 transition-all duration-300 flex items-center justify-center bg-slate-800 shrink-0"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile Avatar Preview"
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : currentUser?.avatar ? (
                <img
                  src={
                    currentUser.avatar.startsWith("data:")
                      ? currentUser.avatar
                      : `http://localhost:5000/uploads/${currentUser.avatar}`
                  }
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(currentUser?.name || "Super Admin")}
                </div>
              )}
              {/* Overlay on hover to signal upload */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                {currentUser?.name || "Super Admin"}
              </h1>
              <p className="text-xs text-indigo-200 leading-tight">
                {currentUser?.role ? formatRole(currentUser.role) : "Super Admin"}
              </p>
            </div>
          </div>

          {/* System Branding Title */}
          <div className="text-right">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight">
              Document Workflow Admin Dashboard
            </h2>
            <p className="text-[11px] font-medium text-indigo-300/80 leading-tight">
              by <span className="font-semibold text-indigo-200">CodeBloom</span>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-px">
          <div className="flex gap-2">
            <span className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400">
              Accounts Manager
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Accounts",
                  value: stats.total,
                  color: "text-indigo-600 dark:text-indigo-400",
                  accent: "border-l-4 border-indigo-500",
                  bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
                  icon: (
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                },
                {
                  label: "Super-Admins",
                  value: stats.admins,
                  color: "text-violet-600 dark:text-violet-400",
                  accent: "border-l-4 border-violet-500",
                  bgColor: "bg-violet-50 dark:bg-violet-950/20",
                  icon: (
                    <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
                {
                  label: "Regular Users",
                  value: stats.regularUsers,
                  color: "text-emerald-600 dark:text-emerald-400",
                  accent: "border-l-4 border-emerald-500",
                  bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
                  icon: (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  label: "Blocked",
                  value: stats.blocked,
                  color: "text-rose-600 dark:text-rose-400",
                  accent: "border-l-4 border-rose-500",
                  bgColor: "bg-rose-50 dark:bg-rose-950/20",
                  icon: (
                    <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <div key={s.label} className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${s.accent}`}>
                  <div className="flex flex-col gap-1">
                    <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase">{s.label}</span>
                  </div>
                  <div className={`p-2 rounded-lg ${s.bgColor} shrink-0`}>
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* CONTROL PANEL */}
              <section className="lg:col-span-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Control Panel</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quick actions for your account.</p>
                </div>

                <div className="space-y-2 mt-4">
                  {/* All Accounts */}
                  <button
                    type="button"
                    onClick={() => setIsAllAccountsModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          All Accounts
                          <span className="inline-flex min-w-[16px] h-4 px-1.5 items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none font-sans">
                            {users.length}
                          </span>
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">View and manage all user &amp; admin accounts</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  {/* Support Inbox */}
                  <button
                    type="button"
                    onClick={() => setIsSupportInboxModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          Support Inbox
                          {unreadSupportCount > 0 && (
                            <span className="inline-flex min-w-[16px] h-4 px-1.5 items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none font-sans animate-pulse">
                              {unreadSupportCount > 99 ? "99+" : unreadSupportCount}
                            </span>
                          )}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">View and manage user support requests</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                        S
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">Settings</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">Profile and security</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  {/* Generate Reports */}
                  <button
                    type="button"
                    onClick={() => setIsReportsModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">
                          Generate Reports
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          Download Daily, Weekly &amp; Monthly system reports
                        </span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-955/20 p-3 text-left hover:bg-red-100 dark:hover:bg-red-950/40 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center font-bold border border-red-500/20 group-hover:scale-105 transition-transform shrink-0">
                        L
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-red-700 dark:text-red-400">Logout</span>
                        <span className="block text-[10px] text-red-500 dark:text-red-400">Sign out safely</span>
                      </span>
                    </span>
                    <span className="text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>
                </div>
              </section>

              {/* Create New User / Admin */}
              <section className="lg:col-span-8 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create New User / Admin</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">The new account will be pre-verified and immediately active.</p>
                  </div>
                </div>

                <Alert type={formAlert.type} message={formAlert.message} onClose={() => setFormAlert({ type: "", message: "" })} />

                <form onSubmit={handleCreateUser} noValidate>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Full Name <span className="text-rose-500">*</span></label>
                      <input type="text" placeholder="e.g. Saman Perera" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none transition" disabled={formLoading} />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Email Address <span className="text-rose-500">*</span></label>
                      <input type="email" autoComplete="new-email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none transition" disabled={formLoading} />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Password <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-3.5 pr-10 text-sm focus:outline-none transition" disabled={formLoading} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition pointer-events-auto" tabIndex={-1}>
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Position <span className="text-rose-500">*</span></label>
                      <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none transition" disabled={formLoading || loadingPositions}>
                        <option value="" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">{loadingPositions ? "Loading positions..." : "Select Position"}</option>
                        {positions && positions.length > 0 && positions.map((p) => (
                          <option key={p} value={p} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Role <span className="text-rose-500">*</span></label>
                      <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none transition" disabled={formLoading}>
                        <option value="NORMAL_USER" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">Normal User</option>
                        <option value="SUB_ADMIN" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">Sub Admin</option>
                        <option value="SUPER_ADMIN" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">Super Admin</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <button type="submit" disabled={formLoading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-md shadow-indigo-500/20 rounded-lg py-2.5 px-5 active:scale-95 disabled:opacity-60 text-sm transition-all h-[42px] border border-transparent">
                        {formLoading ? "Creating…" : "Create User / Admin"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </div>
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        }}
      />

      <AllAccountsModal
        isOpen={isAllAccountsModalOpen}
        onClose={() => setIsAllAccountsModalOpen(false)}
        users={users}
        loadingUsers={loadingUsers}
        usersError={usersError}
        fetchUsers={fetchUsers}
        currentUserId={currentUserId}
        actionLoadingId={actionLoadingId}
        requestToggleStatus={requestToggleStatus}
        requestDelete={requestDelete}
        tableAlert={tableAlert}
        setTableAlert={setTableAlert}
        positions={positions}
      />

      <SupportInboxModal
        isOpen={isSupportInboxModalOpen}
        onClose={() => setIsSupportInboxModalOpen(false)}
        currentUser={currentUser}
      />

      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        currentUser={currentUser}
      />

      {toast.show && (
        <div className="fixed top-5 right-5 z-50 w-80 shadow-2xl transition-all duration-300 animate-fade-in">
          <Alert
            type={toast.type}
            message={toast.message}
            onClose={() => setToast({ show: false, type: "", message: "" })}
          />
        </div>
      )}
    </div>
  );
}