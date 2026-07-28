import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyNotifications, markAllNotificationsRead } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const fetchNotifications = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        setError("");

        const res = await getMyNotifications();
        setNotifications(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load notifications");
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          navigate("/login");
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchNotifications(true);
  }, [fetchNotifications, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const intervalId = setInterval(() => {
      fetchNotifications(false);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsRead();
      await fetchNotifications(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark all notifications as read");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary flex items-center justify-center theme-text-main text-lg font-semibold">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary text-[var(--text-main)] py-8 px-4 md:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto theme-card rounded-3xl p-6 md:p-8 shadow-xl border theme-border flex flex-col space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b theme-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-6 h-6 animate-swing" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-main">System Notifications</h2>
              <p className="text-xs theme-text-muted mt-0.5">
                You have <span className="font-semibold text-indigo-400">{unreadCount}</span> unread alert{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading || notifications.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/5 disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Mark All Read"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 border border-dashed theme-border rounded-2xl">
              <p className="text-sm theme-text-muted">You are all caught up! No notifications yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={`p-4 rounded-2xl border transition shadow-sm premium-card ${
                    notification.isRead
                      ? "theme-bg-secondary/40 theme-border"
                      : "bg-indigo-500/5 border-indigo-500/30 dark:bg-indigo-950/20 dark:border-indigo-700/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notification.isRead ? "bg-slate-500/30" : "bg-indigo-500 animate-ping"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs leading-relaxed ${notification.isRead ? "theme-text-sec" : "theme-text-main font-semibold"}`}>
                        {notification.message}
                      </p>
                      <p className="text-[10px] theme-text-muted mt-1">{formatDateTime(notification.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
