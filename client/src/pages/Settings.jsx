import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, updateCurrentUser, updateNotificationPreferences } from "../services/api";

const isAdminOrSuperAdmin = (role) => {
  if (!role) return false;
  const r = String(role).toLowerCase().trim();
  return r === "admin" || r === "superadmin" || r === "super-admin" || r === "super_admin";
};

export default function Settings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    phone: "",
    emailAlerts: true,
    inAppNotifications: true,
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

        const userRes = await getCurrentUser();

        const userData = userRes.data;
        setForm((previous) => ({
          ...previous,
          name: userData.name || "",
          email: userData.email || "",
          position: userData.position || "",
          role: userData.role || "",
          phone: userData.phone || "",
          emailAlerts: userData.emailAlerts !== undefined ? userData.emailAlerts : true,
          inAppNotifications: userData.inAppNotifications !== undefined ? userData.inAppNotifications : true,
        }));
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

  const isAdmin = isAdminOrSuperAdmin(form.role);

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
        role: userData.role || "",
        phone: userData.phone || "",
        emailAlerts: userData.emailAlerts !== undefined ? userData.emailAlerts : true,
        inAppNotifications: userData.inAppNotifications !== undefined ? userData.inAppNotifications : true,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset form");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = {};
    const trimmedName = form.name.trim();

    if (trimmedName) {
      payload.name = trimmedName;
    }
    if (form.phone !== undefined) {
      payload.phone = form.phone.trim();
    }
    if (form.emailAlerts !== undefined) {
      payload.emailAlerts = form.emailAlerts;
    }
    if (form.inAppNotifications !== undefined) {
      payload.inAppNotifications = form.inAppNotifications;
    }
    if (isAdmin && form.position && form.position.trim()) {
      payload.position = form.position.trim();
    }

    const includePasswordChange =
      !!form.currentPassword || !!form.newPassword || !!form.confirmNewPassword;

    if (includePasswordChange) {
      if (!form.currentPassword) {
        setError("Current password is required to change password.");
        setSuccess("");
        return;
      }
      if (!form.newPassword) {
        setError("New password is required to change password.");
        setSuccess("");
        return;
      }
      if (form.newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        setSuccess("");
        return;
      }
      if (form.newPassword === form.currentPassword) {
        setError("New password must be different from your current password.");
        setSuccess("");
        return;
      }
      if (form.newPassword !== form.confirmNewPassword) {
        setError("New password and confirmation do not match.");
        setSuccess("");
        return;
      }

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

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem("user") || "{}")),
          ...updatedUser,
        })
      );

      setForm((previous) => ({
        ...previous,
        name: updatedUser.name || trimmedName,
        email: updatedUser.email || form.email,
        position: updatedUser.position || form.position,
        phone: updatedUser.phone || form.phone,
        emailAlerts: updatedUser.emailAlerts !== undefined ? updatedUser.emailAlerts : form.emailAlerts,
        inAppNotifications: updatedUser.inAppNotifications !== undefined ? updatedUser.inAppNotifications : form.inAppNotifications,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setSuccess(updatedUser.message || "Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotificationPreference = async (field, currentValue) => {
    const newValue = !currentValue;

    // 1. Optimistically update UI
    setForm((prev) => ({ ...prev, [field]: newValue }));
    setError("");
    setSuccess("");

    try {
      // 2. API patch request without form validations
      const payload = { [field]: newValue };
      const res = await updateNotificationPreferences(payload);
      const updatedUser = res.data;

      // 3. Sync local storage keys
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem("currentUser") || "{}")),
          ...updatedUser,
        })
      );
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem("user") || "{}")),
          ...updatedUser,
        })
      );

      setSuccess("Notification preference updated.");
    } catch (err) {
      // 4. Rollback to original value on error
      setForm((prev) => ({ ...prev, [field]: currentValue }));
      setError(err.response?.data?.message || "Failed to update preference.");
      setSuccess("");
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Phone Number / Contact Info</label>
            <input
              type="text"
              name="phone"
              value={form.phone || ""}
              onChange={handleChange}
              placeholder="e.g. +1 555-0199"
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              disabled
              readOnly
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl text-sm cursor-not-allowed transition-all duration-300 opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Campus Position</label>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400 font-medium">Read-only</span>
              )}
            </div>
            <input
              type="text"
              name="position"
              value={form.position}
              disabled={!isAdmin}
              readOnly={!isAdmin}
              onChange={handleChange}
              placeholder={isAdmin ? "e.g. Manager" : "Not assigned"}
              className={`w-full p-3 rounded-xl text-sm transition-all duration-300 ${isAdmin
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60"
                }`}
            />
          </div>

          <div className="md:col-span-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {isAdmin
                ? "As an Administrator, you can update your Position directly. Primary email remains fixed."
                : "To update your primary email or campus position, please contact the System Administrator."}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Notification Preferences</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize how you receive updates and alerts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="pr-4">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Email Alerts</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receive email notifications when a document is assigned or its status changes.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotificationPreference("emailAlerts", form.emailAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.emailAlerts ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.emailAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="pr-4">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">In-App Notifications</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receive real-time system and popup alerts within the app.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotificationPreference("inAppNotifications", form.inAppNotifications)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.inAppNotifications ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.inAppNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
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
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="Current account password"
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition pointer-events-auto"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="New password string"
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition pointer-events-auto"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmNewPassword"
                  value={form.confirmNewPassword}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition pointer-events-auto"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* App Details & Credits Section */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              🌸
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">App Details &amp; Credits</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">System specification and engineering attribution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Developer Team</span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">Team CodeBloom</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Application</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Document Workflow Tracking System</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Version</span>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">v1.0.0</p>
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
