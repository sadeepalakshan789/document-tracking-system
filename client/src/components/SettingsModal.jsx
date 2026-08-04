import React, { useState, useEffect } from "react";
import { getAdminSettings, updateAdminSettings, getAuditLogs } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("documents");
  const { currentTheme, setTheme: setGlobalTheme } = useTheme();

  // Individual Settings States
  const [theme, setTheme] = useState(currentTheme);
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState(["PDF", "JPEG", "Docx"]);
  const [autoArchiveDuration, setAutoArchiveDuration] = useState("30 days");
  const [slaDeadline, setSlaDeadline] = useState(24);
  const [enableAutoReminder, setEnableAutoReminder] = useState(true);
  const [minPasswordLength, setMinPasswordLength] = useState(6);
  const [passwordComplexity, setPasswordComplexity] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Sync local theme state with the global context whenever context changes
  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  // Load Settings
  useEffect(() => {
    if (!isOpen) return;

    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await getAdminSettings();
        if (res.data) {
          const s = res.data;
          // 💡 Note: Since 'theme' and 'positions' have been removed from the Backend Schema, 
          // they are handled as local states relevant only to the remaining system workflow.
          setMaxFileSize(s.maxFileSize ?? 10);
          setAllowedTypes(s.allowedTypes || ["PDF", "JPEG", "Docx"]);
          setAutoArchiveDuration(s.autoArchiveDuration || "30 days");
          s.slaDeadline !== undefined && setSlaDeadline(s.slaDeadline);
          s.enableAutoReminder !== undefined && setEnableAutoReminder(s.enableAutoReminder);
          s.minPasswordLength !== undefined && setMinPasswordLength(s.minPasswordLength);
          s.passwordComplexity !== undefined && setPasswordComplexity(s.passwordComplexity);
          s.sessionTimeout !== undefined && setSessionTimeout(s.sessionTimeout);
        }
      } catch (err) {
        console.error("SETTINGS FETCH ERROR DETAILS:", err.response?.status, err.response?.data, err.message);
        setAlert({ type: "error", message: "Failed to load system settings." });
      } finally {
        setLoadingSettings(false);
      }
    };

    // Reads the current theme from the browser and sets it to local state
    const savedTheme = localStorage.getItem("super-admin-theme") || currentTheme;
    setTheme(savedTheme);

    fetchSettings();
  }, [isOpen, currentTheme]);

  // Load Audit Logs when Audit Logs tab is selected
  useEffect(() => {
    if (!isOpen || activeTab !== "logs") return;

    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const res = await getAuditLogs();
        setLogs(res.data?.logs || []);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

 
  const handleThemeToggle = (newTheme) => {
    setTheme(newTheme);             // local UI state
    setGlobalTheme(newTheme);       // Saves to user_theme_<accountId> & applies DOM theme
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert({ type: "", message: "" });


    const payload = {
      maxFileSize,
      allowedTypes,
      autoArchiveDuration,
      slaDeadline,
      enableAutoReminder,
      minPasswordLength,
      passwordComplexity,
      sessionTimeout
    };

    try {
      const res = await updateAdminSettings(payload);
      if (res.data) {
        const s = res.data;
        setMaxFileSize(s.maxFileSize ?? 10);
        setAllowedTypes(s.allowedTypes || ["PDF", "JPEG", "Docx"]);
        setAutoArchiveDuration(s.autoArchiveDuration || "30 days");
        s.slaDeadline !== undefined && setSlaDeadline(s.slaDeadline);
        s.enableAutoReminder !== undefined && setEnableAutoReminder(s.enableAutoReminder);
        s.minPasswordLength !== undefined && setMinPasswordLength(s.minPasswordLength);
        s.passwordComplexity !== undefined && setPasswordComplexity(s.passwordComplexity);
        s.sessionTimeout !== undefined && setSessionTimeout(s.sessionTimeout);
      }
      setAlert({ type: "success", message: "Configurations saved successfully!" });
      setTimeout(() => setAlert({ type: "", message: "" }), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setAlert({ type: "error", message: err.response?.data?.message || "Failed to save configurations." });
    } finally {
      setSaving(false);
    }
  };

  // Document controls checkbox handler
  const handleAllowedTypeChange = (type) => {
    setAllowedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const tabs = [
    { id: "documents", label: "Document Controls", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
    { id: "workflow", label: "Workflow & Routes", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A1 1 0 0021 18.82V8.058a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 2" />
      </svg>
    )},
    { id: "security", label: "User & Security", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { id: "logs", label: "Audit Logs", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: "about", label: "App Details & Credits", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-5xl h-[85vh] rounded-2xl flex overflow-hidden shadow-2xl animate-fade-in text-white">
        
        {/* Subtle Close Icon at Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400 animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">System Settings</h2>
                <p className="text-[10px] text-slate-400">Super Admin Panel</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === "documents" && "Configure storage, limits, formats, and auto-archive schedules."}
                {activeTab === "workflow" && "Set defaults for routes, workflow parameters, and email rules."}
                {activeTab === "security" && "Manage password strengths, user roles, timeouts, and university policies."}
                {activeTab === "logs" && "Track operations and modifications performed by system administrators."}
              </p>
            </div>
            
            {alert.message && (
              <div className={`px-4 py-2 rounded-lg text-xs border font-medium ${
                alert.type === "success" 
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/50" 
                  : "bg-red-950/40 text-red-300 border-red-500/50"
              }`}>
                {alert.message}
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="flex-1 pr-2">
            {loadingSettings ? (
              <div className="flex items-center justify-center h-48">
                <svg className="w-8 h-8 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <>
                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Max File Size (MB)</label>
                      <input
                        type="number"
                        min="1"
                        value={maxFileSize}
                        onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 10)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition max-w-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Allowed Formats</label>
                      <div className="flex flex-wrap gap-4">
                        {["PDF", "JPEG", "Docx"].map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 select-none">
                            <input
                              type="checkbox"
                              checked={allowedTypes.includes(type)}
                              onChange={() => handleAllowedTypeChange(type)}
                              className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Auto-Archive Duration</label>
                      <select
                        value={autoArchiveDuration}
                        onChange={(e) => setAutoArchiveDuration(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition max-w-sm"
                      >
                        <option value="30 days">30 Days</option>
                        <option value="6 months">6 Months</option>
                        <option value="1 year">1 Year</option>
                        <option value="never">Never Archive</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Workflow & Routes Tab */}
                {activeTab === "workflow" && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase">SLA Deadline (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        value={slaDeadline}
                        onChange={(e) => setSlaDeadline(parseInt(e.target.value) || 24)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition max-w-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 py-1">
                      <input
                        type="checkbox"
                        id="reminderCheck"
                        checked={enableAutoReminder}
                        onChange={(e) => setEnableAutoReminder(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="reminderCheck" className="text-sm font-medium text-slate-300 cursor-pointer">
                        Enable Auto-Reminder notification and alerts prior to expiration
                      </label>
                    </div>
                  </div>
                )}

                {/* User & Security Tab */}
                {activeTab === "security" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Minimum Password Length</label>
                        <input
                          type="number"
                          min="4"
                          value={minPasswordLength}
                          onChange={(e) => setMinPasswordLength(parseInt(e.target.value) || 6)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Session Timeout (Minutes)</label>
                        <select
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 60)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                        >
                          <option value="15">15 Minutes</option>
                          <option value="30">30 Minutes</option>
                          <option value="60">60 Minutes (1 Hour)</option>
                          <option value="120">120 Minutes (2 Hours)</option>
                          <option value="240">240 Minutes (4 Hours)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 py-1">
                      <input
                        type="checkbox"
                        id="complexityCheck"
                        checked={passwordComplexity}
                        onChange={(e) => setPasswordComplexity(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="complexityCheck" className="text-sm font-medium text-slate-300 cursor-pointer">
                        Require strict password complexity (numbers, uppercase, and symbols)
                      </label>
                    </div>

                    
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl max-w-xl">
                      <p className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Campus Positions Dynamic Synchronization
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Campus structural roles and dynamic tags are now centralized and updated automatically via the main system initializer to protect integrity across user groups.
                      </p>
                    </div>
                  </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === "logs" && (
                  <div className="space-y-4">
                    {loadingLogs ? (
                      <div className="flex items-center justify-center py-12">
                        <svg className="w-6 h-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : !Array.isArray(logs) || logs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No system operations have been logged yet.</p>
                    ) : (
                      <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-[48vh] overflow-y-auto bg-slate-950">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900/60 sticky top-0 border-b border-slate-800">
                            <tr>
                              <th className="px-5 py-3 text-slate-400 uppercase font-semibold">Action</th>
                              <th className="px-5 py-3 text-slate-400 uppercase font-semibold">Performed By</th>
                              <th className="px-5 py-3 text-slate-400 uppercase font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {logs.map((log) => (
                              <tr key={log._id} className="hover:bg-slate-900/40 transition">
                                <td className="px-5 py-3 text-slate-200 font-medium">{log.action}</td>
                                <td className="px-5 py-3 text-slate-300">
                                  {log.actorId ? (
                                    <div>
                                      <p className="font-semibold">{log.actorId.name}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5">{log.actorId.email}</p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic">Unknown Actor</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-slate-400 font-semibold">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "about" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="border-b border-slate-800 pb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🌸</span> App Details &amp; Credits
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">System specifications, developer credits, and release details.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Developer Team</span>
                        <p className="font-bold text-purple-400 text-base">Team CodeBloom</p>
                        <p className="text-[11px] text-slate-400">Core Engineering &amp; UI Design</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Application</span>
                        <p className="font-bold text-white text-base">Document Workflow Tracking System</p>
                        <p className="text-[11px] text-slate-400">Enterprise Document Tracking</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Version</span>
                        <p className="font-bold text-emerald-400 text-base">v1.0.0</p>
                        <p className="text-[11px] text-slate-400">Production Build</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
                      <h4 className="font-bold text-white uppercase tracking-wider">System Architecture &amp; Credits</h4>
                      <p className="text-slate-400 leading-relaxed">
                        Built with React 18, Node.js, Express, MongoDB, Socket.io real-time tracking, and Tailwind CSS. Designed and developed by Team CodeBloom.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Save Controls */}
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              disabled={saving || loadingSettings}
            >
              Cancel
            </button>
            {activeTab !== "logs" && activeTab !== "about" && (
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-900/30"
                disabled={saving || loadingSettings}
              >
                {saving ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Configurations"
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}