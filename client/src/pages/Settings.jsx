import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100 text-lg font-semibold transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-none border border-slate-200/80 dark:border-slate-800 flex flex-col space-y-6 transition-all duration-300">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure your general profile options and preferences.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Reset
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
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@organization.com"
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Campus Position</label>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              disabled={positionsLoading}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300 disabled:opacity-60"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {positionsLoading ? "Loading positions..." : "Select Position"}
              </option>
              {!positions.includes(form.position) && form.position && (
                <option value={form.position} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{form.position}</option>
              )}
              {positions.map((position) => (
                <option key={position} value={position} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {position}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Change Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Leave blank if you do not wish to update your security password.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Current account password"
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="New password string"
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input
                type="password"
                name="confirmNewPassword"
                value={form.confirmNewPassword}
                onChange={handleChange}
                placeholder="Repeat new password"
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        <div className="pt-3">
          <button
            onClick={handleSave}
            disabled={saving || positionsLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving Changes..." : "Save Settings Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
