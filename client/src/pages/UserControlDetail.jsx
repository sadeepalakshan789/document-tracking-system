import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminGetUserById,
  adminUpdateUser,
  adminToggleStatus,
  adminDeleteUser,
  adminGetUserActivity,
  getCampusPositions,
  getDocument,
} from "../services/api";
import { getUserId } from "../utils/auth";

// ─────────────────────────────────────────────────────────────────────────────
//  Small helper components
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ type, message, onClose }) {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-900/70 border-emerald-500/60 text-emerald-200",
    error: "bg-red-900/70 border-red-500/60 text-red-200",
    info: "bg-blue-900/70 border-blue-500/60 text-blue-200",
  };
  return (
    <div
      className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm mb-5 ${
        styles[type] ?? styles.info
      }`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="opacity-60 hover:opacity-100 transition shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    "super-admin": "bg-purple-500/20 text-purple-300 border-purple-500/40",
    admin: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    user: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  };
  const label =
    role === "super-admin"
      ? "Super Admin"
      : role === "admin"
      ? "Admin"
      : "Normal User";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        map[role] ?? map.user
      }`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Blocked
    </span>
  );
}

function StepBadge({ status }) {
  const map = {
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    current: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
        map[status] ?? map.pending
      }`}
    >
      {status}
    </span>
  );
}

function DocStatusBadge({ status }) {
  const map = {
    Submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Reviewed: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    Approved: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    Delivered: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "In Transit": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Completed: "bg-green-500/20 text-green-300 border-green-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        map[status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"
      }`}
    >
      {status}
    </span>
  );
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", danger = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-red-500/20" : "bg-amber-500/20"
            }`}
          >
            <svg
              className={`w-5 h-5 ${danger ? "text-red-400" : "text-amber-400"}`}
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
              danger ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
      <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

function MetaRow({ icon, label, value, mono = false, valueColor = "text-slate-200" }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm mt-0.5 ${valueColor} ${mono ? "font-mono text-xs break-all" : ""}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

// ── SVG icon constants ────────────────────────────────────────────────────────
const calendarIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const shieldIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const checkIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const idIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────

const getConnectorPercent = (route = []) => {
  if (route.length <= 1) return 0;
  const greenSegments = route
    .slice(1)
    .filter((step) => step.status === "completed" || (step.status === "current" && step.acceptedAt))
    .length;
  return (greenSegments / (route.length - 1)) * 100;
};

const getStepCircleClass = (step) => {
  if (step.status === "completed") {
    return "bg-emerald-600 border-emerald-500 text-white";
  }
  if (step.status === "current") {
    return step.acceptedAt ? "bg-teal-600 border-teal-500 text-white" : "bg-amber-500 border-amber-400 text-slate-950";
  }
  return "bg-slate-800 border-slate-750 text-slate-400";
};

const getStepStatusLabel = (step) => {
  if (step.status === "completed") return "Completed";
  if (step.status === "current") return step.acceptedAt ? "Current (Accepted)" : "Current";
  return "Pending";
};

const isWorkflowCompleted = (doc) => {
  if (!doc?.route?.length) return false;
  return doc.status === "Completed" && doc.route.every((step) => step.status === "completed");
};

const getStatusToneClass = (tone) => {
  if (tone === "success") return "text-emerald-400";
  if (tone === "warning") return "text-amber-400";
  return "text-slate-400";
};

const ACTIVITY_TABS = ["Sent Documents", "Workflow Steps", "Action Log"];

export default function UserControlDetail() {
  const params = useParams();
  const id = params.id || params.userId;
  const navigate = useNavigate();
  const currentUserId = getUserId();

  // ── User data ──
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");

  // ── Edit form ──
  const [editRole, setEditRole] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [positions, setPositions] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveAlert, setSaveAlert] = useState({ type: "", message: "" });

  // ── Document tracking modal ──
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocLoading, setSelectedDocLoading] = useState(false);
  const [selectedDocError, setSelectedDocError] = useState("");

  const handleOpenDocModal = async (trackingId) => {
    setSelectedDocLoading(true);
    setSelectedDocError("");
    setSelectedDoc({ trackingId, title: "Loading...", route: [], history: [] });
    try {
      const res = await getDocument(trackingId);
      setSelectedDoc(res.data);
    } catch (err) {
      console.error("Failed to load document location:", err);
      setSelectedDocError(err.response?.data?.message || "Failed to load document tracking details.");
    } finally {
      setSelectedDocLoading(false);
    }
  };

  // ── Block/Delete ──
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false });

  // ── Activity ──
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // ─── Fetch user ─────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    setLoadingUser(true);
    setUserError("");
    try {
      if (!id || id === "undefined") {
        throw new Error("No valid user ID provided.");
      }
      const res = await adminGetUserById(id);
      const u = res.data.user;
      if (!u) throw new Error("Response missing user object");
      setUser(u);
      setEditRole(u.role);
      setEditPosition(u.position || "");
    } catch (err) {
      // Log the full error so it is visible in the browser console
      console.error("[UserControlDetail] fetchUser failed:", err.response?.status, err.response?.data ?? err.message);
      setUserError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load user. Please try again."
      );
    } finally {
      setLoadingUser(false);
    }
  }, [id]);

  // ─── Fetch activity ──────────────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await adminGetUserActivity(id);
      setActivity(res.data);
    } catch (err) {
      console.error("[UserControlDetail] fetchActivity failed:", err.response?.status, err.response?.data ?? err.message);
      // Degrade gracefully — show empty tabs rather than a hard error
      setActivity({ sentDocuments: [], workflowSteps: [], actionLog: [] });
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  // ─── Boot: fire both requests in parallel ────────────────────────────────────
  useEffect(() => {
    // Run user + activity fetches in parallel; positions load independently
    Promise.all([
      fetchUser(),
      fetchActivity(),
      getCampusPositions()
        .then((res) => setPositions(res.data || []))
        .catch(() => {}),
    ]);
  }, [fetchUser, fetchActivity]);

  // ─── Save changes ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveAlert({ type: "", message: "" });
    setSaveLoading(true);
    try {
      const res = await adminUpdateUser(id, { role: editRole, position: editPosition });
      setUser((u) => ({ ...u, ...res.data.user }));
      setSaveAlert({ type: "success", message: "Changes saved successfully!" });
    } catch (err) {
      setSaveAlert({ type: "error", message: err.response?.data?.message || "Failed to save changes." });
    } finally {
      setSaveLoading(false);
    }
  };

  // ─── Toggle block/unblock ────────────────────────────────────────────────────
  const handleToggleStatus = () => {
    const action = user.status === "active" ? "block" : "unblock";
    setConfirmModal({
      open: true,
      danger: action === "block",
      title: action === "block" ? "Block Account" : "Unblock Account",
      message: `Are you sure you want to ${action} "${user.name}"? ${
        action === "block"
          ? "They will immediately lose access to the system."
          : "They will regain full system access."
      }`,
      confirmText: action === "block" ? "Block" : "Unblock",
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setActionLoading(true);
        setSaveAlert({ type: "", message: "" });
        try {
          await adminToggleStatus(id);
          await fetchUser();
          setSaveAlert({
            type: "success",
            message: `Account ${action === "block" ? "blocked" : "unblocked"} successfully.`,
          });
        } catch (err) {
          setSaveAlert({ type: "error", message: err.response?.data?.message || `Failed to ${action} account.` });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // ─── Delete account ──────────────────────────────────────────────────────────
  const handleDelete = () => {
    setConfirmModal({
      open: true,
      danger: true,
      title: "Delete Account",
      message: `This will permanently delete "${user?.name}" (${user?.email}). This action CANNOT be undone.`,
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setActionLoading(true);
        try {
          await adminDeleteUser(id);
          navigate("/super-admin-dashboard", { replace: true });
        } catch (err) {
          setSaveAlert({ type: "error", message: err.response?.data?.message || "Failed to delete account." });
          setActionLoading(false);
        }
      },
    });
  };

  const isSelf = currentUserId === id;
  const isSuperAdminTarget = user?.role === "super-admin";
  const actionsBlocked = isSelf || isSuperAdminTarget;

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

  // ─────────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Navbar ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/super-admin-dashboard")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition group"
              aria-label="Back to Admin Management"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-slate-500 leading-tight">Super Admin</p>
                <p className="text-sm font-semibold text-white leading-tight">User Control</p>
              </div>
            </button>
            {user && (
              <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-sm ml-2">
                <span>/</span>
                <span className="text-slate-300 font-medium truncate max-w-[200px]">{user.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/super-admin-dashboard")}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}
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

        {/* ── Loading / Error ─────────────────────────────────────────────────── */}
        {loadingUser ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
            <p className="text-slate-400 text-sm">Loading user profile…</p>
          </div>
        ) : userError ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-red-400 text-sm">{userError}</p>
            <button onClick={fetchUser} className="text-sm text-blue-400 hover:underline">Try again</button>
          </div>
        ) : (
          <>
            {/* ── Page heading ─────────────────────────────────────────────────── */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">User Control</h2>
              <p className="text-slate-400 mt-1 text-sm">
                View and manage this user's account properties and document activity.
              </p>
            </div>

            {/* ── Inline toast ─────────────────────────────────────────────────── */}
            <Toast
              type={saveAlert.type}
              message={saveAlert.message}
              onClose={() => setSaveAlert({ type: "", message: "" })}
            />

            {/* ── Top Grid: Profile + Controls ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* ── Profile hero card ────────────────────────────────────────────── */}
              <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-purple-500/20">
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <StatusBadge status={user.status || "active"} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2 flex-wrap">
                      {user.name}
                      {isSelf && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-300 font-medium">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <RoleBadge role={user.role} />
                    {user.position && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600/40 text-slate-300 border border-slate-600/60">
                        {user.position}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-700/60 pt-4 space-y-3.5">
                  <MetaRow icon={calendarIcon} label="Joined" value={fmtDate(user.createdAt)} />
                  <MetaRow icon={shieldIcon} label="Role"
                    value={user.role === "super-admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Normal User"} />
                  <MetaRow icon={checkIcon} label="Verified"
                    value={user.verified ? "Yes" : "No"}
                    valueColor={user.verified ? "text-emerald-400" : "text-red-400"} />
                  <MetaRow icon={idIcon} label="User ID" value={user._id} mono />
                </div>
              </div>

              {/* ── Admin Controls ───────────────────────────────────────────────── */}
              <div className="lg:col-span-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Admin Controls</h3>
                    <p className="text-xs text-slate-400">Modify role, position, and account status.</p>
                  </div>
                </div>

                {actionsBlocked && (
                  <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {isSelf
                      ? "You cannot modify your own account via this panel."
                      : "Super Admin accounts are protected from modification."}
                  </div>
                )}

                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={actionsBlocked || saveLoading}
                    className="bg-slate-900/70 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="user">Normal User</option>
                    <option value="admin">Admin (Sub-Admin)</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                </div>

                {/* Position */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Position</label>
                  {positions.length > 0 ? (
                    <select
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      disabled={actionsBlocked || saveLoading}
                      className="bg-slate-900/70 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">— No Position —</option>
                      {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      placeholder="e.g. Lecturer, Administrator"
                      disabled={actionsBlocked || saveLoading}
                      className="bg-slate-900/70 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={actionsBlocked || saveLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition shadow-lg shadow-purple-500/20"
                >
                  {saveLoading ? (
                    <><Spinner /> Saving…</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>

                <div className="border-t border-slate-700/60" />

                {/* Block / Delete */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleToggleStatus}
                    disabled={actionsBlocked || actionLoading}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      user?.status === "active"
                        ? "bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/35"
                        : "bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-600/35"
                    }`}
                  >
                    {actionLoading ? <Spinner /> : user?.status === "active" ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Block Account
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Unblock Account
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={actionsBlocked || actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600/35 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? <Spinner /> : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Document Activity ─────────────────────────────────────────────── */}
            <section className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-slate-700/60">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Document Activity</h3>
                    <p className="text-xs text-slate-400">Documents sent, workflow assignments, and action history.</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl w-fit">
                  {ACTIVITY_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(i)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === i
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      }`}
                    >
                      {tab}
                      {activity && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === i ? "bg-purple-500/50" : "bg-slate-600/60"}`}>
                          {i === 0
                            ? activity.sentDocuments?.length ?? 0
                            : i === 1
                            ? activity.workflowSteps?.length ?? 0
                            : activity.actionLog?.length ?? 0}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activityLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : !activity ? (
                  <p className="text-slate-500 text-sm text-center py-8">Could not load activity data.</p>
                ) : (
                  <>
                    {/* ── Tab 0: Sent Documents ────────────────────────────────── */}
                    {activeTab === 0 && (
                      activity.sentDocuments.length === 0 ? (
                        <EmptyState label="No documents sent by this user." />
                      ) : (
                        <div className="space-y-3">
                          {activity.sentDocuments.map((doc) => (
                            <div
                              key={doc._id}
                              onClick={() => handleOpenDocModal(doc.trackingId)}
                              className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 hover:border-slate-500 hover:bg-slate-900/60 transition cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                                  <p className="text-xs text-slate-500 font-mono">{doc.trackingId}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <DocStatusBadge status={doc.status} />
                                <span className="text-xs text-slate-500 hidden sm:block">{fmtDate(doc.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* ── Tab 1: Workflow Steps ────────────────────────────────── */}
                    {activeTab === 1 && (
                      activity.workflowSteps.length === 0 ? (
                        <EmptyState label="This user has no workflow assignments." />
                      ) : (
                        <div className="space-y-3">
                          {activity.workflowSteps.map((step, idx) => (
                            <div
                              key={`${step.docId}-${idx}`}
                              onClick={() => handleOpenDocModal(step.trackingId)}
                              className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 hover:border-slate-500 hover:bg-slate-900/60 transition cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  step.stepStatus === "completed" ? "bg-emerald-600/20 border border-emerald-500/30"
                                    : step.stepStatus === "current" ? "bg-blue-600/20 border border-blue-500/30"
                                    : "bg-amber-600/20 border border-amber-500/30"}`}>
                                  <svg className={`w-4 h-4 ${step.stepStatus === "completed" ? "text-emerald-400" : step.stepStatus === "current" ? "text-blue-400" : "text-amber-400"}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    {step.stepStatus === "completed"
                                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      : step.stepStatus === "current"
                                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                      : <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{step.title}</p>
                                  <p className="text-xs text-slate-500 font-mono">{step.trackingId}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StepBadge status={step.stepStatus} />
                                <DocStatusBadge status={step.docStatus} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* ── Tab 2: Action Log ────────────────────────────────────── */}
                    {activeTab === 2 && (
                      activity.actionLog.length === 0 ? (
                        <EmptyState label="No action log entries found for this user." />
                      ) : (
                        <div className="space-y-3">
                          {activity.actionLog.map((entry, idx) => (
                            <div
                              key={`${entry.docId}-${idx}`}
                              onClick={() => handleOpenDocModal(entry.trackingId)}
                              className="flex items-start gap-4 bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 hover:border-slate-500 hover:bg-slate-900/60 transition cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                    {entry.action}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono">{entry.trackingId}</span>
                                </div>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{entry.description}</p>
                                <p className="text-xs text-slate-500 mt-1">{fmtDateTime(entry.timestamp)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Confirm Modal ─────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
      />

      {/* ── Document Detail Modal ─────────────────────────────────────────────────── */}
      {selectedDoc && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedDoc(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-700 text-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700/60 sticky top-0 bg-slate-800 z-10">
              <div>
                <h3 className="text-lg font-bold text-white">Document Tracker</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Tracking ID: {selectedDoc.trackingId}</p>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {selectedDocLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <p className="text-slate-400 text-sm">Fetching workflow updates…</p>
                </div>
              ) : selectedDocError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-red-400 text-sm">{selectedDocError}</p>
                  <button 
                    onClick={() => handleOpenDocModal(selectedDoc.trackingId)}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-semibold transition"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Title & Sender Info */}
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-base">{selectedDoc.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Sender: <span className="font-semibold text-slate-200">{selectedDoc.sender?.name || "N/A"} ({selectedDoc.sender?.email || "—"})</span>
                      </p>
                    </div>
                    <div className="text-xs bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg shrink-0 w-fit">
                      Receivers in path: <span className="font-semibold text-purple-300">{selectedDoc.route?.length || 0}</span>
                    </div>
                  </div>

                  {/* Horizontal Stepper Line */}
                  <div className="relative py-6 bg-slate-900/30 rounded-xl border border-slate-700/30 px-4">
                    {selectedDoc.route?.length > 1 && (
                      <>
                        <div className="absolute left-16 right-16 top-[56px] h-1.5 bg-slate-800 rounded"></div>
                        <div
                          className="absolute left-16 top-[56px] h-1.5 bg-emerald-500 rounded transition-all duration-500"
                          style={{ width: `calc((100% - 8rem) * ${getConnectorPercent(selectedDoc.route) / 100})` }}
                        ></div>
                      </>
                    )}

                    <div className="relative flex justify-between gap-6 overflow-x-auto pb-2">
                      {selectedDoc.route?.map((step, index) => (
                        <div key={`${step.userId}-${index}`} className="min-w-[96px] text-center shrink-0">
                          <div
                            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                              step.status === "completed"
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : step.status === "current"
                                ? step.acceptedAt
                                  ? "bg-teal-600 border-teal-500 text-white"
                                  : "bg-amber-500 border-amber-400 text-slate-950"
                                : "bg-slate-850 border-slate-750 text-slate-450"
                            }`}
                            title={getStepStatusLabel(step)}
                          >
                            {index + 1}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 mt-2 leading-tight truncate max-w-[100px] mx-auto">
                            {step.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{getStepStatusLabel(step)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Workflow Summary Panel */}
                  {(() => {
                    const route = selectedDoc.route || [];
                    const currentIndex = route.findIndex((step) => step.status === "current");
                    const currentStep = currentIndex >= 0 ? route[currentIndex] : null;
                    const nextStep =
                      currentIndex >= 0
                        ? route.slice(currentIndex + 1).find((step) => step.status === "pending")
                        : route.find((step) => step.status === "pending") || null;

                    const completed = isWorkflowCompleted(selectedDoc);
                    const latestHistory = selectedDoc.history?.length
                      ? selectedDoc.history[selectedDoc.history.length - 1]
                      : null;

                    const currentReceipt = completed
                      ? { label: "Completed", tone: "success", at: null }
                      : currentStep?.acceptedAt
                        ? { label: "Accepted", tone: "success", at: currentStep.acceptedAt }
                        : currentStep
                          ? { label: "Pending acceptance", tone: "warning", at: null }
                          : { label: "Not available", tone: "muted", at: null };

                    const nextReceipt = completed
                      ? { label: "Not applicable", tone: "muted" }
                      : nextStep
                        ? { label: "Pending", tone: "warning" }
                        : { label: "Waiting for next assignment", tone: "muted" };

                    return (
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
                          <p className="text-sm font-bold text-white">Live Workflow Summary</p>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              completed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            }`}
                          >
                            {selectedDoc.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-slate-400 font-medium">Current Location</p>
                            <p className="font-semibold text-slate-200 mt-1">{completed ? "Workflow Completed" : currentStep?.name || "No active holder"}</p>
                          </div>
                          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-slate-400 font-medium">Next Location</p>
                            <p className="font-semibold text-slate-200 mt-1">{completed ? "None (workflow finished)" : nextStep?.name || "No next step"}</p>
                          </div>
                          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-slate-400 font-medium">Current Receipt</p>
                            <p className={`font-semibold mt-1 ${getStatusToneClass(currentReceipt.tone)}`}>
                              {currentReceipt.label}
                            </p>
                            {currentReceipt.at && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                at {fmtDateTime(currentReceipt.at)}
                              </p>
                            )}
                          </div>
                          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-slate-400 font-medium">Next Receipt</p>
                            <p className={`font-semibold mt-1 ${getStatusToneClass(nextReceipt.tone)}`}>
                              {nextReceipt.label}
                            </p>
                          </div>
                          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3 sm:col-span-2">
                            <p className="text-slate-400 font-medium">Progress</p>
                            <p className="font-semibold text-slate-200 mt-1">
                              {route.filter((step) => step.status === "completed").length} / {route.length} steps completed
                            </p>
                          </div>
                        </div>

                        {/* Logs underneath */}
                        <div className="border-t border-slate-700/50 pt-3 space-y-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-300 block">Last Activity:</span>
                            <p className="text-slate-200 mt-0.5 leading-relaxed">{latestHistory?.description || "No recent activity"}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(latestHistory?.timestamp || selectedDoc.updatedAt)}</p>
                          </div>
                          <div className="pt-1.5">
                            <span className="font-bold text-slate-300 block">Workflow Route:</span>
                            <p className="text-slate-200 mt-0.5 font-medium leading-relaxed">
                              {selectedDoc.sender?.name || "Sender"} &rarr; {route.map((s) => s.name).join(" &rarr; ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
