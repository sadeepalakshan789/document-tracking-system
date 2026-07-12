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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-700 text-lg font-semibold">
        Loading user control...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded shadow-md border border-gray-100">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">User Control</h2>
            <p className="text-sm text-gray-500">Admin-only user visibility panel.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-semibold"
          >
            Back
          </button>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="bg-blue-50 border border-blue-100 rounded p-4">
            <p className="text-xs text-blue-700">Total Users</p>
            <p className="text-2xl font-bold text-blue-900">{users.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded p-4">
            <p className="text-xs text-amber-700">Admin Users</p>
            <p className="text-2xl font-bold text-amber-900">{adminCount}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded p-4">
            <p className="text-xs text-emerald-700">Verified Users</p>
            <p className="text-2xl font-bold text-emerald-900">
              {users.filter((user) => !!user.verified).length}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 border-b border-gray-200">Name</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Email</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Position</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Role</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Verified</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Created</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">User Activities</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-gray-500 text-center">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/user-control/${user._id}`, { state: { user } })}
                    title="Click to open user profile"
                  >
                    <td className="px-3 py-2 border-b border-gray-100">{user.name}</td>
                    <td className="px-3 py-2 border-b border-gray-100">{user.email}</td>
                    <td className="px-3 py-2 border-b border-gray-100">{user.position || "N/A"}</td>
                    <td className="px-3 py-2 border-b border-gray-100 uppercase">{user.role}</td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {user.verified ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/user-control/${user._id}`, { state: { user } });
                        }}
                        className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-xs font-semibold hover:bg-blue-200"
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
