import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetAllUsers,
  adminCreateAdmin,
  adminCreateUser,
  adminToggleStatus,
  adminDeleteUser,
  getCampusPositions,
  getCurrentUser,
  uploadAvatar,
} from "../services/api";
import { getUserId } from "../utils/auth";
import SettingsModal from "../components/SettingsModal";
import { connectSocket } from "../services/socket";
import SupportInbox from "../components/SupportInbox";

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

/** Pill badge for role */
function RoleBadge({ role }) {
  const normalizedRole = role ? role.toUpperCase().replace(/-/g, "_") : "NORMAL_USER";
  
  const isVioletRole = ["SUPER_ADMIN", "SUB_ADMIN", "ADMIN"].includes(normalizedRole);
  
  if (isVioletRole) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800">
        {normalizedRole}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
      {normalizedRole}
    </span>
  );
}

/** Pill badge for status */
function StatusBadge({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Blocked
    </span>
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
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-red-500/20" : "bg-yellow-500/20"
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition text-white ${
              danger
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
  const [activeTab, setActiveTab] = useState("accounts");
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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
      message: `Are you sure you want to ${action} "${user.name}"? ${
        action === "block"
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    
    // Capitalization agnostic filter
    const matchesRole = roleFilter === "all" || (u.role && u.role.toUpperCase().replace(/-/g, "_") === roleFilter.toUpperCase());
    return matchesSearch && matchesRole;
  });

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

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              title="Settings"
              className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("currentUser");
                localStorage.removeItem("user");
                window.dispatchEvent(new Event("authChange"));
                navigate("/login");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-300 hover:text-white hover:bg-red-600/80 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Admin Management</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage admin accounts, user statuses, and access control across the Document Tracking System.</p>
        </div>

        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "accounts"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Accounts Manager
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "support"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Support Inbox
            {unreadSupportCount > 0 && (
              <span className="bg-indigo-600 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold animate-pulse">
                {unreadSupportCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "accounts" && (
          <>
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

        <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200">
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

        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
          <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">All Accounts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{filteredUsers.length} of {users.length} accounts shown</p>
            </div>

            <div className="relative w-full sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3.5 py-2 text-sm focus:outline-none transition" />
            </div>

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-sm focus:outline-none transition">
              <option value="all" className="bg-white dark:bg-slate-800">All Roles</option>
              <option value="SUPER_ADMIN" className="bg-white dark:bg-slate-800">Super Admin</option>
              <option value="SUB_ADMIN" className="bg-white dark:bg-slate-800">Sub Admin</option>
              <option value="NORMAL_USER" className="bg-white dark:bg-slate-800">User</option>
            </select>

            <button onClick={fetchUsers} disabled={loadingUsers} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <svg className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              Refresh
            </button>
          </div>

          {tableAlert.message && <div className="px-6"><Alert type={tableAlert.type} message={tableAlert.message} onClose={() => setTableAlert({ type: "", message: "" })} /></div>}

          {loadingUsers ? (
            <div className="px-6 pb-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />)}
            </div>
          ) : usersError ? (
            <div className="px-6 pb-8 text-center"><p className="text-red-500 dark:text-red-400 text-sm">{usersError}</p><button onClick={fetchUsers} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Try again</button></div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 pb-8 text-center text-slate-500 text-sm">{search || roleFilter !== "all" ? "No accounts match your filters." : "No accounts found."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredUsers.map((user) => {
                    const isSelf = user._id === currentUserId;
                    const isSuperAdminRow = user.role && user.role.toUpperCase().replace(/-/g, "_") === "SUPER_ADMIN";
                    const actionsDisabled = isSelf || isSuperAdminRow;
                    const isActionLoading = actionLoadingId === user._id;

                    return (
                      <tr
                        key={user._id}
                        onClick={() => navigate(`/admin/users/${user._id}`)}
                        className={`group cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors ${isSelf ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white leading-tight">
                                {user.name}
                                {isSelf && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-medium">You</span>}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">{user.email}</td>
                        <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                        <td className="px-6 py-4"><StatusBadge status={user.status || "active"} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); requestToggleStatus(user); }}
                              disabled={actionsDisabled || isActionLoading}
                              title={isSelf ? "You cannot change your own status" : isSuperAdminRow ? "Super-admin accounts cannot be blocked" : user.status === "active" ? "Block this user" : "Unblock this user"}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${actionsDisabled ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400" : user.status === "active" ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60" : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"}`}
                            >
                              {isActionLoading ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                              ) : user.status === "active" ? (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Block</>
                              ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Unblock</>
                              )}
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); requestDelete(user); }}
                              disabled={actionsDisabled || isActionLoading}
                              title={isSelf ? "You cannot delete your own account" : isSuperAdminRow ? "Super-admin accounts cannot be deleted" : "Delete this user"}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${actionsDisabled ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400" : "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-200 dark:hover:bg-rose-900/60"}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )}

    {activeTab === "support" && (
      <SupportInbox currentUser={currentUser} />
    )}
  </main>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
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