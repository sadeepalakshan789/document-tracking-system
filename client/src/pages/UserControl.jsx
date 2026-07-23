import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminUsers } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export default function UserControl() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const adminCount = useMemo(
    () => users.filter((user) => String(user.role || "").toLowerCase() === "admin").length,
    [users]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    let normalizedRole = "";
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      normalizedRole = String(currentUser?.role || "").trim().toLowerCase();
    } catch {
      normalizedRole = "";
    }

    if (!token) {
      navigate("/login");
      return;
    }

    if (normalizedRole !== "admin") {
      navigate("/dashboard");
      return;
    }

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getAdminUsers();
        setUsers(response.data || []);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/dashboard");
          return;
        }
        setError(err.response?.data?.message || "Failed to load user control data");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100 text-lg font-semibold transition-colors duration-300">
        Loading user control...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 rounded-3xl shadow-xl dark:shadow-none border border-slate-200/80 dark:border-slate-800 transition-all duration-300">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Control</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Admin-only user visibility panel.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Back
          </button>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 transition-all duration-300">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{users.length}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl p-4 transition-all duration-300">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Admin Users</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{adminCount}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4 transition-all duration-300">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">Verified Users</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {users.filter((user) => !!user.verified).length}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-300">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Name</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Email</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Position</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Role</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Verified</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">Created</th>
                <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 font-bold">User Activities</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-slate-500 dark:text-slate-400 text-center">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition-colors"
                    onClick={() => navigate(`/user-control/${user._id}`, { state: { user } })}
                    title="Click to open user profile"
                  >
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">{user.name}</td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">{user.email}</td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">{user.position || "N/A"}</td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 uppercase">{user.role}</td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">
                      {user.verified ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/user-control/${user._id}`, { state: { user } });
                        }}
                        className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-300"
                      >
                        User Activities
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
