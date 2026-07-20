import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyNotifications, markAllNotificationsRead } from "../services/api";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

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
      <div
        className="relative h-screen bg-gray-900 bg-cover bg-center bg-no-repeat bg-fixed auth-wallpaper-animate"
        style={{ backgroundImage: `url(${authWallpaper})` }}
      >
        <div className="absolute inset-0 bg-slate-900/45"></div>
        <div className="relative z-10 h-full flex items-center justify-center text-white text-lg font-semibold">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen overflow-hidden bg-gray-900 bg-cover bg-center bg-no-repeat bg-fixed auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45"></div>
      <div className="relative z-10 h-full p-6">
      <div className="max-w-6xl mx-auto h-full theme-card backdrop-blur-sm p-8 rounded shadow-md flex flex-col">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold theme-text-main">Notifications</h2>
            <p className="text-sm theme-text-muted">
              Unread: <span className="font-semibold">{unreadCount}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading || notifications.length === 0}
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-500"
            >
              {actionLoading ? "Marking..." : "Mark All Read"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-semibold"
            >
              Back
            </button>
          </div>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={`p-4 rounded border ${
                    notification.isRead
                      ? "theme-bg-secondary theme-border"
                      : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-700/40"
                  }`}
                >
                  <p className="text-base theme-text-main">{notification.message}</p>
                  <p className="text-sm theme-text-muted mt-1">{formatDateTime(notification.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
