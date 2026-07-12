import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCampusPositions, getCurrentUser, updateCurrentUser } from "../services/api";

export default function Settings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [userRes, positionsRes] = await Promise.all([
          getCurrentUser(),
          getCampusPositions(),
        ]);

        const userData = userRes.data;
        setForm((previous) => ({
          ...previous,
          name: userData.name || "",
          email: userData.email || "",
          position: userData.position || "",
        }));
        setPositions(positionsRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load settings");
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          navigate("/login");
        }
      } finally {
        setLoading(false);
        setPositionsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const userRes = await getCurrentUser();
      const userData = userRes.data;
      setForm({
        name: userData.name || "",
        email: userData.email || "",
        position: userData.position || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset form");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const selectedPosition = form.position.trim();

    if (!trimmedName || !trimmedEmail || !selectedPosition) {
      setError("Name, email, and position are required.");
      setSuccess("");
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      position: selectedPosition,
    };

    const includePasswordChange =
      !!form.currentPassword || !!form.newPassword || !!form.confirmNewPassword;

    if (includePasswordChange) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
      payload.confirmNewPassword = form.confirmNewPassword;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await updateCurrentUser(payload);
      const updatedUser = res.data;

      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem("currentUser") || "{}")),
          ...updatedUser,
        })
      );

      setForm((previous) => ({
        ...previous,
        name: updatedUser.name || trimmedName,
        email: updatedUser.email || trimmedEmail,
        position: updatedUser.position || selectedPosition,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));

      setSuccess(updatedUser.message || "Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-700 text-lg font-semibold">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded shadow-md border border-gray-100">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Account Settings</h2>
            <p className="text-sm text-gray-500">Update your profile details and password.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-semibold"
            >
              Reset
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-semibold"
            >
              Back
            </button>
          </div>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded text-sm mb-3">{error}</p>}
        {success && <p className="bg-green-100 text-green-700 p-3 rounded text-sm mb-3">{success}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Campus Position</label>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              disabled={positionsLoading}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">{positionsLoading ? "Loading positions..." : "Select Position"}</option>
              {!positions.includes(form.position) && form.position && (
                <option value={form.position}>{form.position}</option>
              )}
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Change Password (optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Current password"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="New password"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              name="confirmNewPassword"
              value={form.confirmNewPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || positionsLoading}
          className="mt-5 bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save Profile Changes"}
        </button>
      </div>
    </div>
  );
}
