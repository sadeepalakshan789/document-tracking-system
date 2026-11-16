import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "../services/api";

const isItemRead = (n) => Boolean(n?.isRead ?? n?.read ?? false);

export const isIncomingNotification = (notification, user, documents = []) => {
  if (!notification) return false;

  const currentUserId = user?._id ? String(user._id) : "";
  const currentUserName = (user?.name || "").trim().toLowerCase();
  const currentUserEmail = (user?.email || "").trim().toLowerCase();

  const msg = String(notification.message || "").trim();
  const msgLower = msg.toLowerCase();
  const notifType = String(notification.type || "").toLowerCase();

  // 1. Exclude outgoing action notifications initiated by the user
  if (
    msgLower.startsWith("you created") ||
    msgLower.startsWith("you sent") ||
    msgLower.startsWith("you forwarded") ||
    msgLower.startsWith("you dispatched") ||
    msgLower.startsWith("you rerouted") ||
    msgLower.startsWith("you updated") ||
    msgLower.startsWith("you accepted") ||
    msgLower.startsWith("you completed")
  ) {
    return false;
  }

  // 2. Check if the notification relates to a document sent/created by the current user
  const doc = documents.find(
    (d) =>
      (notification.trackingId && d.trackingId === notification.trackingId) ||
      (notification.documentId && (String(d._id) === String(notification.documentId) || d._id === notification.documentId))
  );

  if (doc) {
    const senderUserId = doc.sender?.userId ? String(doc.sender.userId) : "";
    const senderEmail = (doc.sender?.email || "").trim().toLowerCase();
    const senderName = (doc.sender?.name || "").trim().toLowerCase();

    const isCurrentUserSender =
      (currentUserId && senderUserId === currentUserId) ||
      (currentUserEmail && senderEmail === currentUserEmail) ||
      (currentUserName && senderName === currentUserName);

    // If current user is the creator/sender of this document:
    // Exclude outgoing tracking updates on this document
    // (unless the user is explicitly currently acting as a recipient step in the route, e.g. "is now with you")
    if (isCurrentUserSender) {
      if (notifType !== "current" && !msgLower.includes("is now with you")) {
        return false;
      }
    }
  }

  // 3. Exclude sender tracking alerts (e.g. "[Actor] accepted document [ID]", "[Actor] forwarded document [ID] to [Next]", "[Actor] changed the route of document [ID]")
  // In the backend, these notifications are sent to document.sender.userId
  if (
    notifType === "forwarded" ||
    (notifType === "system" && msgLower.includes("accepted document")) ||
    (notifType === "reroute" && (msgLower.includes("changed the route") || msgLower.includes("route of document")))
  ) {
    return false;
  }

  // 4. Exclude completed workflow notifications if the document was sent/created by current user
  if (notifType === "completed" || msgLower.includes("workflow completed")) {
    if (doc) {
      const senderUserId = doc.sender?.userId ? String(doc.sender.userId) : "";
      if (currentUserId && senderUserId === currentUserId) {
        return false;
      }
    }
  }

  // 5. Explicitly incoming notifications where current user is recipient:
  // - type: "current" -> "Document [ID] is now with you. You are step X of Y." or "Document [ID] is now with you."
  // - type: "upcoming" -> "You have been added to workflow for document [ID]. Your position is X of Y."
  // - type: "reroute" when message is: "You were added to workflow for document [ID] by [Actor]."
  // - Messages indicating incoming delivery / review to the recipient
  if (
    notifType === "current" ||
    notifType === "upcoming" ||
    msgLower.includes("is now with you") ||
    msgLower.includes("added to workflow") ||
    msgLower.includes("you were added") ||
    msgLower.includes("assigned to you") ||
    msgLower.includes("pending your") ||
    msgLower.includes("for your review") ||
    msgLower.includes("for your approval")
  ) {
    return true;
  }

  return true;
};

const getCategory = (notification) => {
  const t = String(notification?.type || notification?.category || notification?.badge || "").toLowerCase();
  const m = String(notification?.message || "").toLowerCase();
  if (
    t === "current" ||
    t === "approval" ||
    t === "approvals" ||
    t.includes("approv") ||
    m.includes("is now with you") ||
    m.includes("approv") ||
    m.includes("action required") ||
    m.includes("pending your") ||
    m.includes("for your review") ||
    m.includes("for your approval") ||
    m.includes("review") ||
    m.includes("sign")
  ) {
    return "approval";
  }
  if (
    t === "status" ||
    t === "status update" ||
    t === "status updates" ||
    t === "status_update" ||
    t === "status-update" ||
    t === "forwarded" ||
    t === "completed" ||
    t === "reroute" ||
    t === "upcoming" ||
    m.includes("workflow completed") ||
    m.includes("completed") ||
    m.includes("transit") ||
    m.includes("forward") ||
    m.includes("receiv") ||
    m.includes("dispatch") ||
    m.includes("added to workflow")
  ) {
    return "status";
  }
  return "alert";
};

const isApprovalNotification = (n) => {
  const type = String(n?.type || "").trim().toLowerCase();
  const category = String(n?.category || "").trim().toLowerCase();
  const badge = String(n?.badge || "").trim().toLowerCase();
  const tag = String(n?.tag || "").trim().toLowerCase();

  if (
    type === "approval" ||
    type === "approvals" ||
    type.includes("approv") ||
    category === "approval" ||
    category === "approvals" ||
    category.includes("approv") ||
    badge === "approval" ||
    badge === "approvals" ||
    badge.includes("approv") ||
    tag === "approval" ||
    tag === "approvals"
  ) {
    return true;
  }

  return getCategory(n) === "approval";
};

const isStatusUpdateNotification = (n) => {
  const type = String(n?.type || "").trim().toLowerCase();
  const category = String(n?.category || "").trim().toLowerCase();
  const badge = String(n?.badge || "").trim().toLowerCase();
  const tag = String(n?.tag || "").trim().toLowerCase();

  if (
    type === "status" ||
    type === "status update" ||
    type === "status updates" ||
    type === "status_update" ||
    type === "status-update" ||
    category === "status" ||
    category === "status update" ||
    category === "status updates" ||
    category === "status_update" ||
    category === "status-update" ||
    badge === "status" ||
    badge === "status update" ||
    badge === "status updates" ||
    tag === "status" ||
    tag === "status update"
  ) {
    return true;
  }

  return getCategory(n) === "status";
};

const CategoryIcon = ({ category }) => {
  if (category === "approval") return <span className="text-base">📋</span>;
  if (category === "status") return <span className="text-base">🚀</span>;
  return <span className="text-base">🔔</span>;
};

const CategoryBadge = ({ category }) => {
  const styles = {
    approval: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    status: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    alert: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  const labels = { approval: "Approval", status: "Status Update", alert: "Alert" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[category] || styles.alert}`}>
      {labels[category] || "Alert"}
    </span>
  );
};

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications: propNotifications = [],
  currentUser,
  documents: propDocuments = [],
  onNotificationsUpdated,
  onSelectDocument,
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState(Array.isArray(propNotifications) ? propNotifications : []);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const activeUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, [currentUser]);

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (showLoader && items.length === 0) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await getMyNotifications();
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : Array.isArray(res?.data?.notifications)
        ? res.data.notifications
        : [];

      const hasChanged = (oldVal, newVal) => {
        if (oldVal === newVal) return false;
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      };

      if (list.length > 0) {
        setItems((prev) => (hasChanged(prev, list) ? list : prev));
      } else if (Array.isArray(propNotifications) && propNotifications.length > 0) {
        setItems((prev) => (hasChanged(prev, propNotifications) ? propNotifications : prev));
      }
    } catch {
      if (items.length === 0) {
        setError("Failed to load notifications.");
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [propNotifications, items.length]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  });

  useEffect(() => {
    if (Array.isArray(propNotifications) && propNotifications.length > 0) {
      setItems((prev) => {
        const locallyReadIds = new Set(
          prev.filter((item) => isItemRead(item)).map((item) => String(item._id || item.id))
        );
        const next = propNotifications.map((n) => {
          const id = String(n._id || n.id);
          if (locallyReadIds.has(id)) {
            return { ...n, isRead: true, read: true };
          }
          return n;
        });
        if (JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
    }
  }, [propNotifications]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveFilter("All");
      fetchNotificationsRef.current(items.length === 0);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Only incoming notifications meant for currently logged-in user as recipient
  const receivedItems = useMemo(() => {
    return items.filter((n) => isIncomingNotification(n, activeUser, propDocuments));
  }, [items, activeUser, propDocuments]);

  const unreadCount = useMemo(() => {
    return receivedItems.filter((n) => !isItemRead(n)).length;
  }, [receivedItems]);

  const filtered = useMemo(() => {
    return receivedItems.filter((n) => {
      if (activeFilter === "Unread") return !isItemRead(n);
      if (activeFilter === "Approvals") return isApprovalNotification(n);
      if (activeFilter === "Status Updates") return isStatusUpdateNotification(n);
      return true;
    });
  }, [receivedItems, activeFilter]);

  if (!isOpen) return null;

  const filters = ["All", "Unread", "Approvals", "Status Updates"];

  const handleMarkAll = async () => {
    setActionLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    try {
      await markAllNotificationsRead();
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleCardClick = async (notification) => {
    const notifId = notification._id || notification.id;
    if (!isItemRead(notification)) {
      setItems((prev) =>
        prev.map((n) =>
          (n._id && n._id === notifId) || (n.id && n.id === notifId)
            ? { ...n, isRead: true, read: true }
            : n
        )
      );
      try {
        if (notifId) {
          await markNotificationRead(notifId);
        }
        if (onNotificationsUpdated) onNotificationsUpdated();
      } catch {
        // silent
      }
    }

    const trackingId =
      notification.trackingId ||
      String(notification.message || "").match(/DOC-[A-Za-z0-9_-]+/i)?.[0];

    if (trackingId) {
      if (onSelectDocument) {
        onSelectDocument(trackingId);
      } else {
        navigate(`/track-document/${trackingId}`);
      }
      onClose();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-2xl relative">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notifications & Alerts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter bar + mark all */}
        <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
          <div className="flex gap-2 flex-wrap flex-1">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  activeFilter === f
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              {actionLoading ? "Marking..." : "✓ Mark all as read"}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-rose-500 text-sm">{error}</p>
              <button onClick={fetchNotifications} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <p className="text-sm">No notifications here</p>
            </div>
          ) : (
            filtered.map((n) => {
              const category = getCategory(n);
              const read = isItemRead(n);
              const trackingId =
                n.trackingId ||
                String(n.message || "").match(/DOC-[A-Za-z0-9_-]+/i)?.[0];

              return (
                <div
                  key={n._id || `${trackingId || "notif"}-${n.createdAt}`}
                  onClick={() => handleCardClick(n)}
                  className={`flex gap-3 p-4 rounded-2xl border transition-all cursor-pointer group ${
                    !read
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                      : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  title={trackingId ? "Click to view document workflow details" : undefined}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <CategoryIcon category={category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <CategoryBadge category={category} />
                      {!read && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                    {trackingId && (
                      <p
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(n);
                        }}
                        className="mt-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1 group-hover:underline"
                        title="Click to view document workflow details"
                      >
                        🔗 {trackingId}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "0 unread"} · {receivedItems.length} total
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Got It, Close
          </button>
        </div>
      </div>
    </div>
  );
}
