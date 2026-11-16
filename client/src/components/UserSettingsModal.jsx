import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, updateCurrentUser, updateNotificationPreferences } from "../services/api";

const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
      aria-checked={checked}
      role="switch"
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  </div>
);

const roleBadgeStyle = (role) => {
  if (!role) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const r = String(role).toLowerCase();
  if (r === "admin") return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  if (r === "superadmin" || r === "super_admin" || r === "super-admin") return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
};

const isAdminOrSuperAdmin = (role) => {
  if (!role) return false;
  const r = String(role).toLowerCase().trim();
  return r === "admin" || r === "superadmin" || r === "super-admin" || r === "super_admin";
};

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: "None", color: "bg-slate-200 dark:bg-slate-700", width: "0%" };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-rose-500", width: "33%" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-amber-500", width: "66%" };
  return { score: 3, label: "Strong", color: "bg-emerald-500", width: "100%" };
};

const EyeIcon = ({ show, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
    tabIndex={-1}
  >
    {show ? (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )}
  </button>
);

// ─────────────────────────────────────────────
//  SecuritySection Component (Defined Outside Parent)
//  Localizes all password change input state so typing never re-renders the parent modal.
// ─────────────────────────────────────────────
const SecuritySection = ({ currentUser, onUserUpdated, onNotification }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const hasMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleCancel = () => {
    setIsExpanded(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setError("");
  };

  const handlePasswordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      };

      const res = await updateCurrentUser(payload);
      const updatedUser = res?.data || res;

      if (updatedUser) {
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUserUpdated) onUserUpdated(updatedUser);
      }

      handleCancel();
      if (onNotification) {
        onNotification({ type: "success", message: "Password updated successfully!" });
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(err?.response?.data?.message || err?.message || "Failed to update password.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Security</h3>
        </div>
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setIsExpanded(true);
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Update Password
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {!isExpanded ? (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full w-full transition-all duration-300" />
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            ✓ Password set
          </span>
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                disabled={saving}
                onChange={(e) => {
                  setError("");
                  setCurrentPassword(e.target.value);
                }}
                placeholder="Enter current password"
                className="w-full pr-10 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <EyeIcon show={showCurrentPw} onClick={() => setShowCurrentPw((v) => !v)} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">New Password</label>
              {newPassword && (
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  strength.score === 3 ? "text-emerald-600 dark:text-emerald-400" :
                  strength.score === 2 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                }`}>
                  Strength: {strength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                disabled={saving}
                onChange={(e) => {
                  setError("");
                  setNewPassword(e.target.value);
                }}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full pr-10 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <EyeIcon show={showNewPw} onClick={() => setShowNewPw((v) => !v)} />
              </div>
            </div>
            {newPassword && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                disabled={saving}
                onChange={(e) => {
                  setError("");
                  setConfirmPassword(e.target.value);
                }}
                placeholder="Re-enter new password"
                className="w-full pr-10 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <EyeIcon show={showConfirmPw} onClick={() => setShowConfirmPw((v) => !v)} />
              </div>
            </div>
            {hasMismatch && (
              <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ✕ Cancel
            </button>

            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={saving || !currentPassword || !newPassword}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{saving ? "Updating..." : "Save Password"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
//  UserSettingsModal Component
// ─────────────────────────────────────────────
export default function UserSettingsModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [form, setForm] = useState({
    name: "", email: "", role: "", position: "", phone: "",
    emailAlerts: true, inAppNotifications: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const populateForm = useCallback((user) => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      position: user.position || "",
      phone: user.phone || user.phoneNumber || "",
      emailAlerts: user.emailAlerts !== undefined ? Boolean(user.emailAlerts) : true,
      inAppNotifications: user.inAppNotifications !== undefined ? Boolean(user.inAppNotifications) : true,
    });
  }, []);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCurrentUser();
      const userData = res?.data || res;
      populateForm(userData);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  }, [populateForm]);

  // Only re-initialize when transitioning from closed to open.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setError("");
      setSuccess("");
      populateForm(currentUser);
      loadUserData();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentUser, populateForm, loadUserData]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const isAdmin = useMemo(
    () => isAdminOrSuperAdmin(form.role || currentUser?.role),
    [form.role, currentUser?.role]
  );

  if (!isOpen) return null;

  const setField = (key, value) => {
    setError("");
    setSuccess("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTogglePreference = async (key, val) => {
    setField(key, val);
    try {
      const res = await updateNotificationPreferences({ [key]: val });
      const updatedUser = res?.data || res;
      if (updatedUser) {
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUserUpdated) onUserUpdated(updatedUser);
      }
    } catch {
      setField(key, !val);
      setError("Failed to update notification preference. Please try again.");
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    setSaving(true);
    try {
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
      if (isAdmin && form.position !== undefined && form.position.trim()) {
        payload.position = form.position.trim();
      }

      const res = await updateCurrentUser(payload);
      const updatedUser = res?.data || res;

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setSuccess(updatedUser.message || "Settings saved successfully!");
      setForm((prev) => ({
        ...prev,
        name: updatedUser.name || prev.name,
        position: updatedUser.position || prev.position,
        phone: updatedUser.phone || prev.phone,
      }));

      if (onUserUpdated) onUserUpdated(updatedUser);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(err?.response?.data?.message || err?.message || "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
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
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Profile & security preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5">
          {loading && !form.email ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Section 1 — User Profile */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">User Profile</h3>
                  {form.role && (
                    <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeStyle(form.role)}`}>
                      {form.role}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Position / Role</label>
                      {!isAdmin && (
                        <span className="text-[10px] text-slate-400 font-medium">Read-only</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={form.position}
                      disabled={!isAdmin}
                      readOnly={!isAdmin}
                      onChange={(e) => setField("position", e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        isAdmin
                          ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                      }`}
                      placeholder={isAdmin ? "e.g. Manager" : "Not assigned"}
                    />
                    {!isAdmin && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic">
                        Contact an Administrator to update your position.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. +94 70 000 0000"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 — Notifications */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Notification Preferences</h3>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  <Toggle
                    checked={form.emailAlerts}
                    onChange={(v) => handleTogglePreference("emailAlerts", v)}
                    disabled={saving}
                    label="Email Alerts"
                    description="Receive document updates and approvals via email"
                  />
                  <Toggle
                    checked={form.inAppNotifications}
                    onChange={(v) => handleTogglePreference("inAppNotifications", v)}
                    disabled={saving}
                    label="In-App Notifications"
                    description="Show notifications inside the dashboard"
                  />
                </div>
              </div>

              {/* Section 3 — Security (Localized, smooth input handling) */}
              <SecuritySection
                currentUser={currentUser}
                onUserUpdated={onUserUpdated}
                onNotification={({ type, message }) => {
                  if (type === "success") {
                    setSuccess(message);
                    setError("");
                  } else {
                    setError(message);
                    setSuccess("");
                  }
                }}
              />

              {/* Feedback messages */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fade-in">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{success}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
