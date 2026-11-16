import React, { useEffect, useMemo, useState } from "react";
import {
  adminGetUserById,
  adminUpdateUser,
  adminToggleStatus,
  adminDeleteUser,
  adminGetUserActivity,
  adminReassignDocument,
  deleteDocument,
  getCampusPositions,
  getUsers,
} from "../services/api";
import TrackDocumentModal from "./TrackDocumentModal";

function AlertBanner({ type, message, onClose }) {
  if (!message) return null;
  const styles = {
    success:
      "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
    error:
      "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
    info:
      "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
  };
  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm mb-4 shadow-sm ${
        styles[type] ?? styles.info
      }`}
    >
      <span className="flex-1 font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-60 hover:opacity-100 transition ml-2 shrink-0 cursor-pointer"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

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

function StatusBadge({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Blocked
    </span>
  );
}

function DocStatusBadge({ status }) {
  const map = {
    Completed: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    "In Transit": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    Submitted: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    Reviewed: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
    Approved: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    Delivered: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
        map[status] || "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      }`}
    >
      {status || "Active"}
    </span>
  );
}

function DocRoleBadge({ roleInDoc }) {
  if (roleInDoc === "Current Holder") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Current Holder
      </span>
    );
  }
  if (roleInDoc === "Creator") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
        Creator
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      Participant
    </span>
  );
}

function ConfirmDialog({ isOpen, title, message, danger = true, onConfirm, onCancel, confirmText = "Confirm" }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              danger ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition cursor-pointer ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReassignModal({ isOpen, doc, users = [], currentHolderUser, onClose, onReassigned }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !doc) return null;

  // Filter out super-admins and the current holder
  const eligibleUsers = (users || []).filter((u) => {
    const isHolder =
      u._id === doc.currentHolder?.userId ||
      (currentHolderUser && u._id === currentHolderUser._id);
    const isSuper =
      u.role && ["SUPER_ADMIN", "super-admin", "SUPERADMIN"].includes(u.role.toUpperCase().replace(/-/g, "_"));
    return !isHolder && !isSuper;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId) {
      setError("Please select an active user to receive this workflow document.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await adminReassignDocument(doc.trackingId, { targetUserId, reason });
      onReassigned();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reassign document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reassign Document</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Transfer document workflow ownership.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{doc.title}</p>
            <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">{doc.trackingId}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Current Holder: <span className="font-medium text-slate-700 dark:text-slate-300">{doc.currentHolder?.name || currentHolderUser?.name || "Unknown"}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              New Assignee / Recipient <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Select an active user</option>
              {eligibleUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email}){u.position ? ` — ${u.position}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Administrative Transfer Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Account blocked, staff reassignment, workload balancing"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Reassigning…
                </>
              ) : (
                "Confirm Reassignment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserProfileControlDrawer({
  user,
  onBack,
  onClose,
  currentUserId,
  onUserUpdated,
  onUserDeleted,
  positions: initialPositions = [],
  allUsers = [],
}) {
  const [profile, setProfile] = useState(user);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [positions, setPositions] = useState(initialPositions);
  const [userList, setUserList] = useState(allUsers);

  const [editRole, setEditRole] = useState(user?.role || "NORMAL_USER");
  const [editPosition, setEditPosition] = useState(user?.position || "");
  const [savingChanges, setSavingChanges] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDocId, setCopiedDocId] = useState(null);

  // Workflow Activities State
  const [userDocuments, setUserDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [inspectTrackingId, setInspectTrackingId] = useState(null);
  const [reassignDoc, setReassignDoc] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    danger: true,
    confirmText: "Confirm",
    onConfirm: null,
  });

  const fetchWorkflowActivities = async (userId) => {
    if (!userId) return;
    setLoadingDocs(true);
    try {
      const res = await adminGetUserActivity(userId);
      setUserDocuments(res.data?.documents || []);
    } catch (err) {
      console.error("Failed to load user workflow activities:", err);
      setUserDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch complete profile and workflow activities on mount
  useEffect(() => {
    if (!user?._id) return;
    setProfile(user);
    setEditRole(user.role ? user.role.toUpperCase().replace(/-/g, "_") : "NORMAL_USER");
    setEditPosition(user.position || "");

    let isMounted = true;
    const fetchLatest = async () => {
      setLoadingProfile(true);
      try {
        const res = await adminGetUserById(user._id);
        if (isMounted && res.data?.user) {
          const fresh = res.data.user;
          setProfile(fresh);
          setEditRole(fresh.role ? fresh.role.toUpperCase().replace(/-/g, "_") : "NORMAL_USER");
          setEditPosition(fresh.position || "");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };
    fetchLatest();
    fetchWorkflowActivities(user._id);

    if (!positions || positions.length === 0) {
      getCampusPositions()
        .then((res) => {
          if (isMounted && res.data) setPositions(res.data);
        })
        .catch((err) => console.error("Failed to load positions:", err));
    }

    if (!userList || userList.length === 0) {
      getUsers()
        .then((res) => {
          if (isMounted && res.data) setUserList(res.data);
        })
        .catch((err) => console.error("Failed to load users for reassign:", err));
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Handle Esc key to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (inspectTrackingId) {
          setInspectTrackingId(null);
          return;
        }
        if (reassignDoc) {
          setReassignDoc(null);
          return;
        }
        e.stopPropagation();
        onBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, inspectTrackingId, reassignDoc]);

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (!profile?.email) return;
    navigator.clipboard.writeText(profile.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyId = (e) => {
    e.stopPropagation();
    if (!profile?._id) return;
    navigator.clipboard.writeText(profile._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyDocTrackingId = (trackingId, e) => {
    e.stopPropagation();
    if (!trackingId) return;
    navigator.clipboard.writeText(trackingId);
    setCopiedDocId(trackingId);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });
    setSavingChanges(true);
    try {
      const res = await adminUpdateUser(profile._id, {
        role: editRole,
        position: editPosition,
      });
      const updatedUser = res.data?.user || { ...profile, role: editRole, position: editPosition };
      setProfile((prev) => ({ ...prev, ...updatedUser }));
      setAlert({ type: "success", message: "Role and position updated successfully!" });
      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to update user profile.",
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleToggleStatus = () => {
    const action = profile.status === "active" ? "block" : "unblock";
    setConfirmDialog({
      isOpen: true,
      danger: action === "block",
      title: action === "block" ? "Block Account" : "Unblock Account",
      message: `Are you sure you want to ${action} "${profile.name}"? ${
        action === "block"
          ? "They will immediately lose access to the system."
          : "They will regain full system access."
      }`,
      confirmText: action === "block" ? "Block Account" : "Unblock Account",
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
        setActionLoading(true);
        setAlert({ type: "", message: "" });
        try {
          await adminToggleStatus(profile._id);
          const newStatus = profile.status === "active" ? "blocked" : "active";
          const updatedUser = { ...profile, status: newStatus };
          setProfile(updatedUser);
          setAlert({
            type: "success",
            message: `Account ${action === "block" ? "blocked" : "unblocked"} successfully.`,
          });
          if (onUserUpdated) {
            onUserUpdated(updatedUser);
          }
        } catch (err) {
          setAlert({
            type: "error",
            message: err.response?.data?.message || `Failed to ${action} account.`,
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteUser = () => {
    setConfirmDialog({
      isOpen: true,
      danger: true,
      title: "Delete Account",
      message: `This will permanently delete "${profile?.name}" (${profile?.email}). This action cannot be undone.`,
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
        setActionLoading(true);
        try {
          await adminDeleteUser(profile._id);
          if (onUserDeleted) {
            onUserDeleted(profile._id);
          }
          onBack();
        } catch (err) {
          setAlert({
            type: "error",
            message: err.response?.data?.message || "Failed to delete account.",
          });
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteDocument = (doc) => {
    setConfirmDialog({
      isOpen: true,
      danger: true,
      title: "Cancel / Delete Workflow",
      message: `Are you sure you want to permanently cancel and delete document "${doc.title}" (${doc.trackingId})? This action cannot be undone.`,
      confirmText: "Delete Workflow",
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
        try {
          await deleteDocument(doc.trackingId);
          setAlert({
            type: "success",
            message: `Document "${doc.title}" (${doc.trackingId}) was deleted successfully.`,
          });
          fetchWorkflowActivities(profile._id);
          if (onUserUpdated) onUserUpdated(profile);
        } catch (err) {
          setAlert({
            type: "error",
            message: err.response?.data?.message || "Failed to delete document.",
          });
        }
      },
    });
  };

  const isSelf = currentUserId === profile?._id;
  const isSuperAdminTarget =
    profile?.role && profile.role.toUpperCase().replace(/-/g, "_") === "SUPER_ADMIN";
  const actionsBlocked = isSelf || isSuperAdminTarget;

  const initials = profile?.name
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  // Robust Joined Date formatting (derives from MongoDB ObjectId timestamp if createdAt is missing)
  const formattedJoinedDate = useMemo(() => {
    if (profile?.createdAt) {
      const d = new Date(profile.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      }
    }
    if (profile?._id && typeof profile._id === "string" && profile._id.length >= 8) {
      const timestamp = parseInt(profile._id.substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        }
      }
    }
    return "—";
  }, [profile?.createdAt, profile?._id]);

  // Tab Counts
  const counts = useMemo(() => {
    const all = userDocuments.length;
    const assigned = userDocuments.filter((d) => d.isAssigned).length;
    const created = userDocuments.filter((d) => d.isCreator).length;
    const completed = userDocuments.filter((d) => d.isCompleted).length;
    return { all, assigned, created, completed };
  }, [userDocuments]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    if (activeFilterTab === "assigned") {
      return userDocuments.filter((d) => d.isAssigned);
    }
    if (activeFilterTab === "created") {
      return userDocuments.filter((d) => d.isCreator);
    }
    if (activeFilterTab === "completed") {
      return userDocuments.filter((d) => d.isCompleted);
    }
    return userDocuments;
  }, [userDocuments, activeFilterTab]);

  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-slate-900 rounded-3xl flex flex-col overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer group"
          >
            <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to All Accounts</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            User Profile &amp; Control
            {loadingProfile && (
              <svg className="w-3 h-3 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-8 space-y-6 scrollbar-thin">
        {alert.message && (
          <AlertBanner
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: "", message: "" })}
          />
        )}

        {/* Header Profile Banner Card */}
        <div className="relative bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-extrabold text-2xl flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-md shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                {profile?.name}
              </h2>
              {isSelf && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                {profile?.email}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Copy email address"
              >
                {copiedEmail ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Inline Pills: never overlapping the avatar */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatusBadge status={profile?.status || "active"} />
              <RoleBadge role={profile?.role} />
              {profile?.position && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  {profile.position}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats / Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Joined Date (Properly derived & formatted) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Joined Date
              </span>
              <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {formattedJoinedDate}
            </p>
          </div>

          {/* Card 2: Account Status */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Account Status
              </span>
              <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="mt-0.5">
              <StatusBadge status={profile?.status || "active"} />
            </div>
          </div>

          {/* Card 3: Email Verification */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Verified
              </span>
              <svg className="w-4 h-4 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {profile?.verified !== false ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Pending
                </span>
              )}
            </p>
          </div>

          {/* Card 4: User ID */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                User ID
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                title="Copy User ID"
              >
                {copiedId ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate" title={profile?._id}>
              {profile?._id || "—"}
            </p>
          </div>
        </div>

        {/* Organized Action Controls: Role & Position Settings */}
        <section className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Role &amp; Position Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure permission hierarchy and campus role.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isSelf || savingChanges}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition cursor-pointer"
                >
                  <option value="NORMAL_USER">Normal User</option>
                  <option value="SUB_ADMIN">Sub Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                {isSelf && (
                  <p className="text-[11px] text-slate-400 mt-1">You cannot modify your own administrator role.</p>
                )}
              </div>

              {/* Position Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Campus Position
                </label>
                <select
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  disabled={savingChanges}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition cursor-pointer"
                >
                  <option value="">Select Position</option>
                  {positions &&
                    positions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  {editPosition && !positions.includes(editPosition) && (
                    <option value={editPosition}>{editPosition}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingChanges}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {savingChanges ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving Changes…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* User Workflow Activities & Management Section */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  User Workflow Activities
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track, inspect, reassign, or cancel workflows associated with this account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchWorkflowActivities(profile?._id)}
              disabled={loadingDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <svg className={`w-3.5 h-3.5 ${loadingDocs ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Activity Filter Tabs with Live Count Badges */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setActiveFilterTab("all")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilterTab === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilterTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab("assigned")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilterTab === "assigned"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Currently Assigned
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilterTab === "assigned" ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
              }`}>
                {counts.assigned}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab("created")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilterTab === "created"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Created
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilterTab === "created" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {counts.created}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab("completed")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilterTab === "completed"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Completed
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilterTab === "completed" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {counts.completed}
              </span>
            </button>
          </div>

          {/* Document List */}
          {loadingDocs ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
              <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              No workflow documents found for this filter tab.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const formattedDate = doc.updatedAt || doc.createdAt
                  ? new Date(doc.updatedAt || doc.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                return (
                  <div
                    key={doc._id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all shadow-xs group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </h4>
                        <DocStatusBadge status={doc.status} />
                        <DocRoleBadge roleInDoc={doc.roleInDoc} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {/* Tracking ID with Copy */}
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                            {doc.trackingId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyDocTrackingId(doc.trackingId, e)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="Copy Tracking ID"
                          >
                            {copiedDocId === doc.trackingId ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>

                        <span>•</span>
                        <span>Updated: {formattedDate}</span>

                        {doc.currentHolder?.name && (
                          <>
                            <span>•</span>
                            <span className="truncate">
                              Holder: <strong className="font-medium text-slate-700 dark:text-slate-300">{doc.currentHolder.name}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Controls for Workflow */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                      {/* Inspect Details Button */}
                      <button
                        type="button"
                        onClick={() => setInspectTrackingId(doc.trackingId)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Inspect step-by-step history and preview attachments"
                      >
                        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Inspect
                      </button>

                      {/* Reassign / Transfer Document Button */}
                      {!doc.isCompleted && (
                        <button
                          type="button"
                          onClick={() => setReassignDoc(doc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Transfer document from this user to another active user"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          Reassign
                        </button>
                      )}

                      {/* Cancel / Delete Document Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer flex items-center gap-1"
                        title="Cancel and delete this workflow document"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Access Control & Danger Zone */}
        <section className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Access Control &amp; Danger Zone
              </h3>
              <p className="text-xs text-rose-700/70 dark:text-rose-400/80">
                Manage temporary access suspension or permanent user record deletion.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Block / Unblock Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 shadow-xs">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {profile?.status === "active" ? "Block User Account" : "Unblock User Account"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {profile?.status === "active"
                    ? "Temporarily revoke access to documents, approvals, and workflow routing."
                    : "Restore full system access and allow the user to sign in normally."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionsBlocked || actionLoading}
                title={
                  isSelf
                    ? "You cannot block your own account"
                    : isSuperAdminTarget
                    ? "Super-admin accounts cannot be blocked"
                    : profile?.status === "active"
                    ? "Block this user"
                    : "Unblock this user"
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer ${
                  actionsBlocked
                    ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500"
                    : profile?.status === "active"
                    ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
                }`}
              >
                {actionLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : profile?.status === "active" ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Block Account
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Unblock Account
                  </>
                )}
              </button>
            </div>

            {/* Delete Account Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 shadow-xs">
              <div>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Delete User Permanently
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Permanently remove this account and credentials. This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionsBlocked || actionLoading}
                title={
                  isSelf
                    ? "You cannot delete your own account"
                    : isSuperAdminTarget
                    ? "Super-admin accounts cannot be deleted"
                    : "Delete this user"
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer ${
                  actionsBlocked
                    ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500"
                    : "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-200"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
      />

      {/* Reassign Document Modal */}
      <ReassignModal
        isOpen={Boolean(reassignDoc)}
        doc={reassignDoc}
        users={userList}
        currentHolderUser={profile}
        onClose={() => setReassignDoc(null)}
        onReassigned={() => {
          setAlert({
            type: "success",
            message: `Document "${reassignDoc?.title}" was reassigned successfully.`,
          });
          fetchWorkflowActivities(profile?._id);
          if (onUserUpdated) onUserUpdated(profile);
        }}
      />

      {/* Inspect Workflow Details Modal */}
      {inspectTrackingId && (
        <TrackDocumentModal
          isOpen={Boolean(inspectTrackingId)}
          initialTrackingId={inspectTrackingId}
          onClose={() => setInspectTrackingId(null)}
          onDocumentUpdated={() => {
            fetchWorkflowActivities(profile?._id);
            if (onUserUpdated) onUserUpdated(profile);
          }}
        />
      )}
    </div>
  );
}
