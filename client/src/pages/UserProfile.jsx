import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAdminUserActivity, getAdminUserById, getAdminUsers } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");

  const adminAccessState = useMemo(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (!currentUser) return "unknown";
      const normalizedRole = String(currentUser?.role || "").trim().toLowerCase();
      return normalizedRole === "admin" ? "admin" : "non_admin";
    } catch {
      return "unknown";
    }
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");
      const response = await getAdminUserActivity(userId, 150);
      setActivitySummary(response.data?.summary || null);
      setActivities(response.data?.activities || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/dashboard");
        return;
      }

      if (err.response?.status === 404) {
        setActivitiesError(
          "Activity endpoint not available on current backend. Restart the server to load latest API changes."
        );
        return;
      }

      setActivitiesError(
        err.response?.data?.message || "Failed to load user activity. Please try again."
      );
    } finally {
      setActivitiesLoading(false);
    }
  }, [navigate, userId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (adminAccessState === "non_admin") {
      navigate("/dashboard");
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const stateUser = location.state?.user || null;
        if (stateUser && String(stateUser._id) === String(userId)) {
          setUserProfile(stateUser);
        }

        const response = await getAdminUserById(userId);
        setUserProfile(response.data || null);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/dashboard");
          return;
        }

        try {
          const fallbackRes = await getAdminUsers();
          const fallbackUser = (fallbackRes.data || []).find(
            (item) => String(item?._id) === String(userId)
          );

          if (fallbackUser) {
            setUserProfile(fallbackUser);
            setError("");
            return;
          }
        } catch {
          // Keep the original error below.
        }

        setError(err.response?.data?.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    loadActivities();
  }, [adminAccessState, loadActivities, location.state, navigate, userId]);

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary flex items-center justify-center theme-text-main text-lg font-semibold">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary text-[var(--text-main)] py-8 px-4 md:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto theme-card rounded-3xl p-6 md:p-8 shadow-xl border theme-border flex flex-col space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b theme-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-main">User Profile</h2>
              <p className="text-xs theme-text-muted mt-0.5">Detailed administrative view for member profile and logs.</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/user-control")}
            className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            ← User Control List
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!error && !userProfile && (
          <div className="text-center py-8 border border-dashed theme-border rounded-xl">
            <p className="text-xs theme-text-muted italic">No user data found.</p>
          </div>
        )}

        {!!userProfile && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Full Name</span>
                <span className="text-sm font-bold theme-text-main">{userProfile.name || "N/A"}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Email Address</span>
                <span className="text-sm font-bold theme-text-main truncate">{userProfile.email || "N/A"}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Campus Position</span>
                <span className="text-sm font-bold theme-text-main">{userProfile.position || "N/A"}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Access Role</span>
                <span className="text-sm font-bold theme-text-main uppercase">{userProfile.role || "N/A"}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">OTP Verified</span>
                <span className={`text-sm font-bold ${userProfile.verified ? "text-emerald-500" : "text-amber-500"}`}>
                  {userProfile.verified ? "Yes" : "No"}
                </span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">System Account ID</span>
                <span className="text-xs font-mono theme-text-main break-all">{userProfile._id}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Created At</span>
                <span className="text-xs font-semibold theme-text-main">{formatDateTime(userProfile.createdAt)}</span>
              </div>
              <div className="theme-bg-secondary/40 border theme-border rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Updated At</span>
                <span className="text-xs font-semibold theme-text-main">{formatDateTime(userProfile.updatedAt)}</span>
              </div>
            </div>

            <div className="mt-4 theme-bg-secondary/20 border theme-border rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b theme-border pb-3">
                <div>
                  <h3 className="text-sm font-bold theme-text-main uppercase tracking-wider">User Activities</h3>
                  <p className="text-[10px] theme-text-muted mt-0.5">Trackable document actions, workflow events, and notifications.</p>
                </div>
                <button
                  type="button"
                  onClick={loadActivities}
                  className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  Refresh Logs
                </button>
              </div>

              {!!activitySummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  <div className="theme-bg-secondary/50 border theme-border rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold theme-text-muted block uppercase tracking-wider mb-0.5">Total</span>
                    <span className="font-bold text-sm theme-text-main">{activitySummary.total || 0}</span>
                  </div>
                  <div className="theme-bg-secondary/50 border theme-border rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold theme-text-muted block uppercase tracking-wider mb-0.5">Doc Actions</span>
                    <span className="font-bold text-sm theme-text-main">{activitySummary.documentActions || 0}</span>
                  </div>
                  <div className="theme-bg-secondary/50 border theme-border rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold theme-text-muted block uppercase tracking-wider mb-0.5">Workflow</span>
                    <span className="font-bold text-sm theme-text-main">{activitySummary.workflowSteps || 0}</span>
                  </div>
                  <div className="theme-bg-secondary/50 border theme-border rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold theme-text-muted block uppercase tracking-wider mb-0.5">Created</span>
                    <span className="font-bold text-sm theme-text-main">{activitySummary.documentsCreated || 0}</span>
                  </div>
                  <div className="theme-bg-secondary/50 border theme-border rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-bold theme-text-muted block uppercase tracking-wider mb-0.5">Alerts</span>
                    <span className="font-bold text-sm theme-text-main">{activitySummary.notifications || 0}</span>
                  </div>
                </div>
              )}

              {activitiesError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2 rounded-xl text-xs">
                  {activitiesError}
                </div>
              )}

              {activitiesLoading ? (
                <div className="flex items-center gap-2 text-xs theme-text-muted">
                  <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Fetching activity list...</span>
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs theme-text-muted italic py-2 text-center">No activity found for this user yet.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                  {activities.map((activity) => (
                    <div key={activity.id} className="theme-bg-secondary/40 border theme-border rounded-xl p-3 flex flex-col gap-1 shadow-sm premium-card">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="text-[10px] font-bold theme-text-main uppercase tracking-wider">{activity.action || "ACTIVITY"}</span>
                        <span className="text-[9px] theme-text-muted">{formatDateTime(activity.occurredAt)}</span>
                      </div>
                      <p className="text-xs theme-text-sec leading-relaxed">{activity.description || "No description."}</p>
                      <p className="text-[9px] theme-text-muted mt-0.5">
                        {activity.trackingId ? `Tracking ID: ${activity.trackingId}` : "Tracking ID: N/A"}
                        {activity.documentTitle ? ` • Title: ${activity.documentTitle}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
