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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-700 text-lg font-semibold">
        Loading user profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md border border-gray-100">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">User Profile</h2>
            <p className="text-sm text-gray-500">Detailed user view for administrators.</p>
          </div>
          <button
            onClick={() => navigate("/user-control")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-semibold"
          >
            Back to User Control
          </button>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">{error}</p>}

        {!error && !userProfile && (
          <p className="text-gray-600 text-sm">No user data found.</p>
        )}

        {!!userProfile && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="text-lg font-semibold text-gray-800">{userProfile.name || "N/A"}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-800">{userProfile.email || "N/A"}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Position</p>
                <p className="text-lg font-semibold text-gray-800">{userProfile.position || "N/A"}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="text-lg font-semibold text-gray-800 uppercase">{userProfile.role || "N/A"}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Verified</p>
                <p className="text-lg font-semibold text-gray-800">
                  {userProfile.verified ? "Yes" : "No"}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <p className="text-sm font-semibold text-gray-800 break-all">{userProfile._id}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Created At</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatDateTime(userProfile.createdAt)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-xs text-gray-500 mb-1">Updated At</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatDateTime(userProfile.updatedAt)}
                </p>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">User Activities</h3>
                  <p className="text-xs text-gray-500">
                    Trackable document actions, workflow events, and notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadActivities}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-xs font-semibold"
                >
                  Refresh Activity
                </button>
              </div>

              {!!activitySummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <p className="text-[11px] text-gray-500">Total</p>
                    <p className="font-bold text-gray-800">{activitySummary.total || 0}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <p className="text-[11px] text-gray-500">Doc Actions</p>
                    <p className="font-bold text-gray-800">{activitySummary.documentActions || 0}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <p className="text-[11px] text-gray-500">Workflow Steps</p>
                    <p className="font-bold text-gray-800">{activitySummary.workflowSteps || 0}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <p className="text-[11px] text-gray-500">Docs Created</p>
                    <p className="font-bold text-gray-800">{activitySummary.documentsCreated || 0}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <p className="text-[11px] text-gray-500">Notifications</p>
                    <p className="font-bold text-gray-800">{activitySummary.notifications || 0}</p>
                  </div>
                </div>
              )}

              {activitiesError && (
                <p className="bg-red-100 text-red-700 p-2 rounded text-xs mb-3">{activitiesError}</p>
              )}

              {activitiesLoading ? (
                <p className="text-sm text-gray-600">Loading activity...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity found for this user yet.</p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {activities.map((activity) => (
                    <div key={activity.id} className="bg-white border border-gray-200 rounded p-3">
                      <div className="flex flex-wrap justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-gray-800">{activity.action || "ACTIVITY"}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(activity.occurredAt)}</p>
                      </div>
                      <p className="text-sm text-gray-700">{activity.description || "No description."}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.trackingId ? `Tracking: ${activity.trackingId}` : "Tracking: N/A"}
                        {activity.documentTitle ? ` | Title: ${activity.documentTitle}` : ""}
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
