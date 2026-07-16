import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetAllUsers,
  adminCreateAdmin,
  adminCreateUser,
  adminToggleStatus,
  adminDeleteUser,
  getCampusPositions,
} from "../services/api";
import { getUserId } from "../utils/auth";

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
  const normalizedRole = role ? role.toUpperCase() : "NORMAL_USER";
  
  const map = {
    "SUPER_ADMIN": "bg-purple-500/20 text-purple-300 border-purple-500/40",
    "SUB_ADMIN": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "NORMAL_USER": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        map[normalizedRole] ?? map.NORMAL_USER
      }`}
    >
      {normalizedRole}
    </span>
  );
}

/** Pill badge for status */
function StatusBadge({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Blocked
    </span>
  );
}

/** Full-screen confirmation dialog */
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-red-500/20" : "bg-yellow-500/20"
            }`}
          >
            <svg
              className={`w-5 h-5 ${danger ? "text-red-400" : "text-yellow-400"}`}
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
          <h3 className="text-white font-semibold text-base">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
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
  const navigate = useNavigate();
  const currentUserId = getUserId();

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
    const matchesRole = roleFilter === "all" || (u.role && u.role.toUpperCase() === roleFilter.toUpperCase());
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role && (u.role.toUpperCase() === "ADMIN" || u.role.toUpperCase() === "SUB_ADMIN")).length,
    regularUsers: users.filter((u) => u.role && (u.role.toUpperCase() === "USER" || u.role.toUpperCase() === "NORMAL_USER")).length,
    blocked: users.filter((u) => u.status === "blocked").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.749z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Super Admin</h1>
              <p className="text-xs text-slate-400 leading-tight">Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/login");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-white hover:bg-red-600/30 transition"
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
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Admin Management</h2>
          <p className="text-slate-400 mt-1 text-sm">Manage admin accounts, user statuses, and access control across the Document Tracking System.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Accounts", value: stats.total, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Admins / Sub-Admins", value: stats.admins, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { label: "Regular Users", value: stats.regularUsers, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Blocked", value: stats.blocked, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 flex flex-col gap-1 ${s.bg}`}>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-slate-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        <section className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Create New User / Admin</h3>
              <p className="text-xs text-slate-400">The new account will be pre-verified and immediately active.</p>
            </div>
          </div>

          <Alert type={formAlert.type} message={formAlert.message} onClose={() => setFormAlert({ type: "", message: "" })} />

          <form onSubmit={handleCreateUser} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Full Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. Saman Perera" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition" disabled={formLoading} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email Address <span className="text-red-400">*</span></label>
                <input type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition" disabled={formLoading} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-purple-500 transition" disabled={formLoading} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition" tabIndex={-1}>
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Position <span className="text-red-400">*</span></label>
                <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition" disabled={formLoading || loadingPositions}>
                  <option value="">{loadingPositions ? "Loading positions..." : "Select Position"}</option>
                  {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role <span className="text-red-400">*</span></label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition" disabled={formLoading}>
                  <option value="NORMAL_USER">Normal User</option>
                  <option value="SUB_ADMIN">Sub Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-sm font-semibold text-white transition">
                {formLoading ? "Creating…" : "Create User / Admin"}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">All Accounts</h3>
              <p className="text-xs text-slate-400 mt-0.5">{filteredUsers.length} of {users.length} accounts shown</p>
            </div>

            <div className="relative w-full sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
            </div>

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition">
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SUB_ADMIN">Sub Admin</option>
              <option value="NORMAL_USER">User</option>
            </select>

            <button onClick={fetchUsers} disabled={loadingUsers} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition">
              <svg className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              Refresh
            </button>
          </div>

          {tableAlert.message && <div className="px-6"><Alert type={tableAlert.type} message={tableAlert.message} onClose={() => setTableAlert({ type: "", message: "" })} /></div>}

          {loadingUsers ? (
            <div className="px-6 pb-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-700/30 rounded-lg animate-pulse" />)}
            </div>
          ) : usersError ? (
            <div className="px-6 pb-8 text-center"><p className="text-red-400 text-sm">{usersError}</p><button onClick={fetchUsers} className="mt-3 text-sm text-blue-400 hover:underline">Try again</button></div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 pb-8 text-center text-slate-500 text-sm">{search || roleFilter !== "all" ? "No accounts match your filters." : "No accounts found."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-slate-700/60 bg-slate-900/40">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {filteredUsers.map((user) => {
                    const isSelf = user._id === currentUserId;
                    
                    // Case-insensitive check to identify Super Admins properly
                    const isSuperAdminRow = user.role && user.role.toUpperCase() === "SUPER_ADMIN";
                    
                    // Super Admins cannot be blocked/deleted via the interface
                    const actionsDisabled = isSelf || isSuperAdminRow;
                    const isActionLoading = actionLoadingId === user._id;

                    return (
                      <tr key={user._id} className={`group hover:bg-slate-700/20 transition ${isSelf ? "bg-purple-900/10" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white leading-tight">
                                {user.name}
                                {isSelf && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-300 font-medium">You</span>}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 sm:hidden">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 hidden sm:table-cell">{user.email}</td>
                        <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                        <td className="px-6 py-4"><StatusBadge status={user.status || "active"} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => requestToggleStatus(user)}
                              disabled={actionsDisabled || isActionLoading}
                              title={isSelf ? "You cannot change your own status" : isSuperAdminRow ? "Super-admin accounts cannot be blocked" : user.status === "active" ? "Block this user" : "Unblock this user"}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${actionsDisabled ? "opacity-30 cursor-not-allowed bg-slate-700 text-slate-400" : user.status === "active" ? "bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/40" : "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-600/40"}`}
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
                              onClick={() => requestDelete(user)}
                              disabled={actionsDisabled || isActionLoading}
                              title={isSelf ? "You cannot delete your own account" : isSuperAdminRow ? "Super-admin accounts cannot be deleted" : "Delete this user"}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${actionsDisabled ? "opacity-30 cursor-not-allowed bg-slate-700 text-slate-400" : "bg-red-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/40"}`}
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
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />
    </div>
  );
}