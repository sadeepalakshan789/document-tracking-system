import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  deleteDocument,
  downloadDocumentFile,
  downloadDocumentVersion,
  getCurrentUser,
  getMyDocuments,
  getMyNotifications,
  getDocumentVersions,
  previewDocumentFile,
  uploadDocumentFile,
} from "../services/api";

const getPhotoStorageKey = (userId) => `profilePhoto:${userId}`;
const LIVE_REFRESH_MS = 3000;

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const routeSummary = (doc) => {
  const steps = doc.route || [];
  if (!steps.length) return "No route";
  return `${doc.sender?.name || "Sender"} -> ${steps.map((s) => s.name).join(" -> ")}`;
};

const getReceiptStatus = (doc) => {
  const currentStep = doc.route?.find((step) => step.status === "current");
  if (!currentStep) return "Accepted";
  return currentStep.acceptedAt ? "Accepted" : "Pending";
};

const stepCircleClass = (step) => {
  if (step.status === "completed") {
    return "bg-emerald-600 text-white";
  }

  if (step.status === "current") {
    return step.acceptedAt ? "bg-teal-600 text-white" : "bg-yellow-400 text-gray-900";
  }

  return "bg-gray-200 text-gray-700";
};

const stepStatusLabel = (step) => {
  if (step.status === "completed") return "Completed";
  if (step.status === "current") return step.acceptedAt ? "Current (Accepted)" : "Current";
  return "Pending";
};

const connectorProgressPercent = (route = []) => {
  if (route.length <= 1) return 0;

  const greenSegments = route
    .slice(1)
    .filter((step) => step.status === "completed" || (step.status === "current" && step.acceptedAt))
    .length;

  return (greenSegments / (route.length - 1)) * 100;
};

const isWorkflowComplete = (doc) => {
  if (!doc?.route?.length) return false;
  return doc.status === "Completed" && doc.route.every((step) => step.status === "completed");
};

const statusToneClass = (tone) => {
  if (tone === "success") return "text-emerald-700";
  if (tone === "warning") return "text-yellow-700";
  return "text-gray-600";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const documentsSectionRef = useRef(null);

  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [selectedTrackingId, setSelectedTrackingId] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [activeCardFilter, setActiveCardFilter] = useState("all");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingDocumentId, setUploadingDocumentId] = useState("");
  const [actionDocumentId, setActionDocumentId] = useState("");
  const [versionHistoryByDoc, setVersionHistoryByDoc] = useState({});

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const needsMyAction = useMemo(
    () => documents.filter((doc) => doc.workflow?.canAccept),
    [documents]
  );

  const unreadRelatedDocuments = useMemo(() => {
    const unreadTrackingIds = new Set(
      notifications
        .filter((notification) => !notification.isRead && notification.trackingId)
        .map((notification) => notification.trackingId)
    );

    return documents.filter((doc) => unreadTrackingIds.has(doc.trackingId));
  }, [documents, notifications]);

  const filteredDocuments = useMemo(() => {
    const baseDocuments =
      activeCardFilter === "action"
        ? needsMyAction
        : activeCardFilter === "notification"
        ? unreadRelatedDocuments
        : documents;

    return baseDocuments;
  }, [activeCardFilter, documents, needsMyAction, unreadRelatedDocuments]);

  const searchResults = useMemo(() => {
    const normalizedSearch = documentSearch.trim().toLowerCase();
    if (!normalizedSearch) return null;

    return documents.filter((doc) => {
      const title = String(doc.title || "").toLowerCase();
      const trackingId = String(doc.trackingId || "").toLowerCase();
      const senderName = String(doc.sender?.name || "").toLowerCase();
      const currentHolder = String(doc.currentHolder?.name || "").toLowerCase();
      const status = String(doc.status || "").toLowerCase();
      const routeSummaryText = String(routeSummary(doc)).toLowerCase();
      const updatedDate = formatDateTime(doc.updatedAt).toLowerCase();
      const createdDate = formatDateTime(doc.createdAt).toLowerCase();
      const isoUpdated = String(doc.updatedAt || "").toLowerCase();
      const isoCreated = String(doc.createdAt || "").toLowerCase();

      return (
        title.includes(normalizedSearch) ||
        trackingId.includes(normalizedSearch) ||
        senderName.includes(normalizedSearch) ||
        currentHolder.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        routeSummaryText.includes(normalizedSearch) ||
        updatedDate.includes(normalizedSearch) ||
        createdDate.includes(normalizedSearch) ||
        isoUpdated.includes(normalizedSearch) ||
        isoCreated.includes(normalizedSearch)
      );
    });
  }, [documentSearch, documents]);

  const displayedDocuments = useMemo(() => {
    return searchResults !== null ? searchResults : filteredDocuments;
  }, [searchResults, filteredDocuments]);

  const filteredDocumentsTitle = useMemo(() => {
    const query = documentSearch.trim();
    if (query) return `Search results for "${query}"`;
    if (activeCardFilter === "action") return "Documents Awaiting My Acceptance";
    if (activeCardFilter === "notification") return "Documents Related To Unread Notifications";
    return "Documents Assigned To Me";
  }, [activeCardFilter, documentSearch]);

  const canViewUserControl = useMemo(() => {
    const normalizedRole = String(user?.role || "").trim().toLowerCase();
    return normalizedRole === "admin";
  }, [user?.role]);

  const trackedDocument = useMemo(
    () => documents.find((doc) => doc.trackingId === selectedTrackingId) || null,
    [documents, selectedTrackingId]
  );

  const trackedLocation = useMemo(() => {
    if (!trackedDocument) return null;

    const route = trackedDocument.route || [];
    const currentIndex = route.findIndex((step) => step.status === "current");
    const currentStep = currentIndex >= 0 ? route[currentIndex] : null;
    const nextStep =
      currentIndex >= 0
        ? route.slice(currentIndex + 1).find((step) => step.status === "pending")
        : route.find((step) => step.status === "pending") || null;

    const completed = isWorkflowComplete(trackedDocument);
    const latestHistory = trackedDocument.history?.length
      ? trackedDocument.history[trackedDocument.history.length - 1]
      : null;

    const currentReceipt = completed
      ? { label: "Completed", tone: "success", at: null }
      : currentStep?.acceptedAt
        ? { label: "Accepted", tone: "success", at: currentStep.acceptedAt }
        : currentStep
          ? { label: "Pending acceptance", tone: "warning", at: null }
          : { label: "Not available", tone: "muted", at: null };

    const nextReceipt = completed
      ? { label: "Not applicable", tone: "muted" }
      : nextStep
        ? { label: "Pending", tone: "warning" }
        : { label: "Waiting for next assignment", tone: "muted" };

    return {
      isCompleted: completed,
      currentStep,
      nextStep,
      currentLocation: completed ? "Workflow Completed" : currentStep?.name || "No active holder",
      nextLocation: completed ? "None (workflow finished)" : nextStep?.name || "No next step",
      currentReceipt,
      nextReceipt,
      completedSteps: route.filter((step) => step.status === "completed").length,
      totalSteps: route.length,
      lastActivityDescription: latestHistory?.description || "No recent activity",
      lastActivityAt: latestHistory?.timestamp || trackedDocument.updatedAt,
    };
  }, [trackedDocument]);

  const fetchDashboardData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        setError("");

        // 💡 Note: The 'getAllDocuments()' API call that conflicted with global settings has been completely removed.
        // This ensures the normal user's theme remains 100% independent from the Super Admin.
        const [userRes, docsRes, notificationsRes] = await Promise.all([
          getCurrentUser(),
          getMyDocuments(),
          getMyNotifications(),
        ]);

        setUser(userRes.data);
        setDocuments(docsRes.data || []);
        setNotifications(notificationsRes.data || []);
        setLastSyncedAt(new Date());

        localStorage.setItem("currentUser", JSON.stringify(userRes.data));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  const fetchDashboardDataRef = useRef(fetchDashboardData);
  useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchDashboardDataRef.current(true);
  }, []);

  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!user || hasRedirectedRef.current) return;

    if (user.role === "super-admin") {
      hasRedirectedRef.current = true;
      navigate("/super-admin-dashboard", { replace: true });
    } else if (user.role === "admin") {
      hasRedirectedRef.current = true;
      navigate("/admin-dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const intervalId = setInterval(() => {
      fetchDashboardDataRef.current(false);
    }, LIVE_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const handleWindowFocus = () => {
      fetchDashboardDataRef.current(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardDataRef.current(false);
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    const savedPhoto = localStorage.getItem(getPhotoStorageKey(user._id));
    setProfilePhoto(savedPhoto || "");
  }, [user?._id]);

  useEffect(() => {
    if (!documents.length) {
      setSelectedTrackingId("");
      return;
    }

    const exists = documents.some((doc) => doc.trackingId === selectedTrackingId);
    if (!selectedTrackingId || !exists) {
      setSelectedTrackingId(documents[0].trackingId);
    }
  }, [documents, selectedTrackingId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?._id) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || "");
      setProfilePhoto(imageData);
      localStorage.setItem(getPhotoStorageKey(user._id), imageData);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (!user?._id) return;
    localStorage.removeItem(getPhotoStorageKey(user._id));
    setProfilePhoto("");
  };

  const handleCardFilterClick = (filter) => {
    setActiveCardFilter(filter);
    documentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleUploadFile = async (doc, event) => {
    event.preventDefault();
    const file = selectedFiles[doc.trackingId];
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      const res = await uploadDocumentFile(doc.trackingId, formData);
      setDocuments((prev) => prev.map((item) => (item.trackingId === doc.trackingId ? res.data.document : item)));
      setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: null }));
      setSuccess(`Uploaded ${file.name}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingDocumentId("");
    }
  };

  const handlePreviewFile = async (doc) => {
    try {
      setActionDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      const res = await previewDocumentFile(doc.trackingId);
      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to preview file");
    } finally {
      setActionDocumentId("");
    }
  };

  const handleDownloadFile = async (doc) => {
    try {
      setActionDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      const res = await downloadDocumentFile(doc.trackingId);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file?.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      setSuccess("File downloaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to download file");
    } finally {
      setActionDocumentId("");
    }
  };

  const handleShowVersions = async (doc) => {
    try {
      setActionDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      const res = await getDocumentVersions(doc.trackingId);
      setVersionHistoryByDoc((prev) => ({ ...prev, [doc.trackingId]: res.data.versions || [] }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load version history");
    } finally {
      setActionDocumentId("");
    }
  };

  const handleDownloadVersion = async (doc, version) => {
    try {
      setActionDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      const res = await downloadDocumentVersion(doc.trackingId, version.versionNumber);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = version.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      setSuccess(`Downloaded ${version.originalFileName}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to download version");
    } finally {
      setActionDocumentId("");
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm("Delete this document and its uploaded file?")) {
      return;
    }

    try {
      setActionDocumentId(doc.trackingId);
      setError("");
      setSuccess("");
      await deleteDocument(doc.trackingId);
      setDocuments((prev) => prev.filter((item) => item.trackingId !== doc.trackingId));
      setSuccess("Document deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete document");
    } finally {
      setActionDocumentId("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary flex items-center justify-center theme-text-main text-lg font-semibold">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <label className="relative w-[2cm] h-[2cm] rounded-full overflow-hidden bg-blue-900 flex items-center justify-center border border-white/20 cursor-pointer hover:ring-2 hover:ring-white/40 transition">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight truncate">{user?.name || "User"}</p>
              <p className="text-sm text-blue-100 leading-tight truncate">
                {user?.position || "Position not set"}
              </p>
              <p className="text-sm text-blue-100/90 leading-tight mt-0.5">Click photo to update</p>
            </div>
          </div>

          <div className="order-first md:order-none md:flex-1 md:px-6 flex justify-center">
            <div className="relative w-full max-w-[420px]">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                value={documentSearch}
                onChange={(e) => setDocumentSearch(e.target.value)}
                placeholder="Search documents by title, tracking ID, sender, holder, status, route, or date"
                className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 ease-in-out focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex flex-col items-end md:items-end">
            <h1 className="text-2xl font-bold">Document Workflow Dashboard</h1>
            <p className="text-sm text-blue-100">Signed in as {user?.email || "-"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1550px] xl:ml-4 xl:mr-auto p-6 space-y-6">
        {error && <p className="p-3 rounded text-sm font-medium" style={{backgroundColor: 'var(--error-bg)', color: 'var(--error-text)'}}>{error}</p>}
        {success && <p className="p-3 rounded text-sm font-medium" style={{backgroundColor: 'var(--success-bg)', color: 'var(--success-text)'}}>{success}</p>}

        {documentSearch.trim() !== "" ? (
          <div className="theme-card rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Search Results</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Found {searchResults.length} matching {searchResults.length === 1 ? "document" : "documents"} for "{documentSearch}"
                </p>
              </div>
              <button
                onClick={() => setDocumentSearch("")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-medium">No matches found</p>
                <p className="text-sm text-gray-400 mt-1">Try checking for typos or searching by a different term/tracking number.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.map((doc) => {
                  const isDocWorkflowComplete = isWorkflowComplete(doc);
                  return (
                    <div key={doc._id} className="border border-gray-200 rounded-2xl p-5 bg-slate-50/35 hover:bg-slate-50 transition">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{doc.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isDocWorkflowComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                              {doc.status}
                            </span>
                          </div>
                          <p className="text-sm font-mono text-gray-500 mt-1">Tracking ID: {doc.trackingId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/track-document/${doc.trackingId}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                          >
                            Open Workflow
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs text-gray-600 bg-white border border-gray-150 rounded-xl p-3">
                        <div>
                          <span className="font-semibold block text-gray-800">Sender</span>
                          <span>{doc.sender?.name} ({doc.sender?.email})</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-800">Current Holder</span>
                          <span>{doc.currentHolder?.name || "Workflow Completed"}</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-800">Last Updated</span>
                          <span>{formatDateTime(doc.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
            <aside className="xl:col-span-2 xl:-ml-3 xl:pr-4 xl:border-r xl:border-slate-300/70">
              <section className="w-full theme-bg-card theme-border border rounded-3xl p-4">
                <h2 className="text-sm font-bold theme-text-main">Control Panel</h2>
                <p className="text-xs theme-text-sec mt-1">Quick actions for your account.</p>

                <div className="space-y-3 mt-4">
                  <button
                    onClick={() => navigate("/workflow-documents")}
                    className="w-[calc(100%+1.5cm)] flex items-center justify-between rounded-2xl border border-indigo-200 theme-bg-card px-3 py-3 text-left hover:bg-indigo-50 transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        W
                      </span>
                      <span>
                        <span className="block font-semibold theme-text-main">Workflow Documents</span>
                        <span className="block text-xs text-slate-500">View all documents</span>
                      </span>
                    </span>
                    <span className="text-slate-400 text-sm font-bold">{">"}</span>
                  </button>

                  <button
                    onClick={() => navigate("/notifications")}
                    className="w-[calc(100%+1.5cm)] flex items-center justify-between rounded-2xl border border-blue-200 theme-bg-card px-3 py-3 text-left hover:bg-blue-50 transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        N
                      </span>
                      <span>
                        <span className="block font-semibold theme-text-main">Notifications</span>
                        <span className="block text-xs text-slate-500">Inbox and alerts</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="inline-flex min-w-[24px] h-[24px] px-1 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      <span className="text-slate-400 text-sm font-bold">{">"}</span>
                    </span>
                  </button>

                <button
                  onClick={() => navigate("/settings")}
                  className="w-[calc(100%+1.5cm)] flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-left hover:bg-emerald-50 transition"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      S
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-800">Settings</span>
                      <span className="block text-xs text-slate-500">Profile and security</span>
                    </span>
                  </span>
                  <span className="text-slate-400 text-sm font-bold">{">"}</span>
                </button>

                {canViewUserControl && (
                  <button
                    onClick={() => navigate("/user-control")}
                    className="w-[calc(100%+1.5cm)] flex items-center justify-between rounded-2xl border border-amber-200 bg-white px-3 py-3 text-left hover:bg-amber-50 transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        U
                      </span>
                      <span>
                        <span className="block font-semibold text-slate-800">User Control</span>
                        <span className="block text-xs text-slate-500">Manage user access</span>
                      </span>
                    </span>
                    <span className="text-slate-400 text-sm font-bold">{">"}</span>
                  </button>
                )}

                  <button
                    onClick={handleLogout}
                    className="w-[calc(100%+1.5cm)] flex items-center justify-between rounded-2xl border border-red-700 bg-red-600 px-3 py-3 text-left hover:bg-red-700 transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold">
                        L
                      </span>
                      <span>
                        <span className="block font-semibold text-white">Logout</span>
                        <span className="block text-xs text-red-100">Sign out safely</span>
                      </span>
                    </span>
                    <span className="text-red-100 text-sm font-bold">{">"}</span>
                  </button>
                </div>
              </section>
            </aside>

            <aside className="xl:col-span-5 xl:pl-2">
              <section className="theme-card p-5 rounded shadow-sm h-full">
                <h2 className="text-lg font-bold theme-text-main">Document Current Location</h2>
                <p className="text-xs theme-text-muted mt-1">
                  Live refreshes every {LIVE_REFRESH_MS / 1000} seconds
                </p>
                <p className="text-xs theme-text-muted">Last sync: {formatDateTime(lastSyncedAt)}</p>

                {documents.length === 0 ? (
                  <p className="text-gray-500 text-sm mt-4">No documents available to track.</p>
                ) : (
                  <>
                    <label className="block text-sm text-gray-700 font-semibold mt-4 mb-2">
                      Select Document
                    </label>
                    <select
                      value={selectedTrackingId}
                      onChange={(e) => setSelectedTrackingId(e.target.value)}
                      className="w-full theme-input border p-2 rounded text-sm focus:outline-none"
                    >
                      {documents.map((doc) => (
                        <option key={doc._id} value={doc.trackingId}>
                          {doc.trackingId} - {doc.title}
                        </option>
                      ))}
                    </select>

                    {trackedDocument && (
                      <div className="mt-4">
                        <div className="theme-bg-secondary theme-border border rounded p-3">
                          <p className="text-xs text-gray-600">
                            Sender:{" "}
                            <span className="font-semibold text-gray-800">
                              {trackedDocument.sender?.name || "N/A"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Receivers in path:{" "}
                            <span className="font-semibold text-gray-800">
                              {trackedDocument.route?.length || 0}
                            </span>
                          </p>
                        </div>

                        <div className="relative pt-6 pb-2">
                          {trackedDocument.route?.length > 1 && (
                            <>
                              <div className="absolute left-14 right-14 top-[58px] h-2 bg-gray-200 rounded"></div>
                              <div
                                className="absolute left-14 top-[58px] h-2 bg-emerald-500 rounded transition-all duration-300"
                                style={{ width: `calc((100% - 7rem) * ${connectorProgressPercent(trackedDocument.route) / 100})` }}
                              ></div>
                            </>
                          )}

                          <div className="relative flex gap-4 overflow-x-auto pb-2">
                            {trackedDocument.route?.map((step, index) => (
                              <div key={`${step.userId}-${index}`} className="min-w-[96px] text-center">
                                <div
                                  className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${stepCircleClass(step)}`}
                                  title={stepStatusLabel(step)}
                                >
                                  {index + 1}
                                </div>
                                <p className="text-xs font-semibold text-gray-700 mt-2 leading-tight">
                                  {step.name}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1">{stepStatusLabel(step)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 theme-bg-secondary theme-border border rounded p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800">Live Workflow Summary</p>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${trackedLocation?.isCompleted
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                                }`}
                            >
                              {trackedDocument.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="theme-card rounded p-2">
                              <p className="theme-text-muted">Current Location</p>
                              <p className="font-semibold theme-text-main">{trackedLocation?.currentLocation}</p>
                            </div>
                            <div className="theme-card rounded p-2">
                              <p className="theme-text-muted">Next Location</p>
                              <p className="font-semibold theme-text-main">{trackedLocation?.nextLocation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </aside>

            <div className="xl:col-span-5 space-y-6">
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => handleCardFilterClick("all")}
                  className={`theme-bg-card p-5 rounded shadow-sm border text-left transition ${
                    activeCardFilter === "all"
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-[var(--border-color)] hover:border-blue-200"
                    }`}
                >
                  <p className="text-sm theme-text-muted">Assigned To Me</p>
                  <p className="text-3xl font-bold theme-text-main">{documents.length}</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardFilterClick("action")}
                  className={`theme-bg-card p-5 rounded shadow-sm border text-left transition ${
                    activeCardFilter === "action"
                    ? "border-orange-500 ring-2 ring-orange-100"
                    : "border-[var(--border-color)] hover:border-orange-200"
                    }`}
                >
                  <p className="text-sm theme-text-muted">Needs My Action</p>
                  <p className="text-3xl font-bold text-orange-600">{needsMyAction.length}</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardFilterClick("notification")}
                  className={`theme-bg-card p-5 rounded shadow-sm border text-left transition ${
                    activeCardFilter === "notification"
                    ? "border-purple-500 ring-2 ring-purple-100"
                    : "border-[var(--border-color)] hover:border-purple-200"
                    }`}
                >
                  <p className="text-sm theme-text-muted">Unread Notifications</p>
                  <p className="text-3xl font-bold text-purple-700">{unreadCount}</p>
                </button>

                <div className="theme-card p-5 rounded shadow-sm flex flex-col gap-2">
                  <button
                    onClick={() => navigate("/create-document")}
                    className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
                  >
                    Create Document
                  </button>
                  <button
                    onClick={() => navigate("/track-document")}
                    className="w-full bg-emerald-600 text-white py-2 rounded font-semibold hover:bg-emerald-700 transition"
                  >
                    Track Document
                  </button>
                </div>
              </section>

            <section ref={documentsSectionRef} className="bg-white p-6 rounded shadow-sm border border-gray-100">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 border-b border-gray-100 pb-4">
    <div>
      <h2 className="text-xl font-bold text-gray-800">{filteredDocumentsTitle}</h2>
      <p className="text-xs text-gray-500 mt-1">Showing all records matching your selected filter view.</p>
    </div>

    <div className="flex gap-2">
      {activeCardFilter !== "all" && (
        <button
          onClick={() => setActiveCardFilter("all")}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          Show All
        </button>
      )}
      <button
        onClick={() => fetchDashboardData(false)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
      >
        Refresh
      </button>
    </div>
  </div>

  {displayedDocuments.length === 0 ? (
    <p className="text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-xl text-sm">
      {documentSearch && "No documents match your search query."}
      {!documentSearch && activeCardFilter === "all" && "No documents are currently assigned to you."}
      {!documentSearch && activeCardFilter === "action" && "No documents are currently awaiting your acceptance."}
      {!documentSearch && activeCardFilter === "notification" && "No documents are linked to unread notifications."}
    </p>
  ) : (
    <div className="space-y-3">
      {displayedDocuments.map((doc) => (
        <div key={doc._id} className="border border-gray-200 rounded p-4 bg-gray-50">
          <div className="flex flex-wrap justify-between gap-3 items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{doc.title}</h3>
              <p className="text-sm text-gray-600">Tracking ID: {doc.trackingId}</p>
              <p className="text-sm text-gray-600">Status: {doc.status}</p>
              <p className="text-sm text-gray-600">
                Receipt Status:{" "}
                <span className={`font-semibold ${getReceiptStatus(doc) === "Accepted" ? "text-emerald-700" : "text-yellow-700"}`}>
                  {getReceiptStatus(doc)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Current Holder: {doc.currentHolder?.name || "Completed"}
              </p>
            </div>
            <div className="flex gap-2">
              {(doc.workflow?.canAccept || doc.workflow?.canForward) && (
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                  Action Required
                </span>
              )}
              <button
                onClick={() => navigate(`/track-document/${doc.trackingId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition"
              >
                Open Workflow
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-2">Route: {routeSummary(doc)}</p>
          <p className="text-xs text-gray-500 mt-1">Updated: {formatDateTime(doc.updatedAt)}</p>

          <div className="mt-4 rounded border border-blue-100 bg-blue-50 p-3">
            <div className="flex flex-wrap gap-2">
              {!doc.file ? (
                <form onSubmit={(event) => handleUploadFile(doc, event)} className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    onChange={(event) =>
                      setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: event.target.files?.[0] || null }))
                    }
                    className="border border-gray-300 p-2 rounded text-sm bg-white"
                  />
                  <button
                    type="submit"
                    disabled={uploadingDocumentId === doc.trackingId}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {uploadingDocumentId === doc.trackingId ? "Uploading..." : "Upload File"}
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreviewFile(doc)}
                    disabled={actionDocumentId === doc.trackingId}
                    className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    Preview File
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(doc)}
                    disabled={actionDocumentId === doc.trackingId}
                    className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    Download File
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShowVersions(doc)}
                    disabled={actionDocumentId === doc.trackingId}
                    className="bg-amber-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-amber-700 disabled:bg-gray-400"
                  >
                    Version History
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc)}
                    disabled={actionDocumentId === doc.trackingId}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Delete Document
                  </button>
                </>
              )}
            </div>

            {doc.file && (
              <div className="mt-3 text-sm text-gray-700">
                <p className="font-semibold">Attached file: {doc.file.originalFileName}</p>
                <p className="text-xs text-gray-500">
                  {doc.file.fileExtension?.toUpperCase()} • {Math.round(doc.file.fileSize / 1024)} KB • Version {doc.file.currentVersion || 1}
                </p>
              </div>
            )}

            {versionHistoryByDoc[doc.trackingId]?.length > 0 && (
              <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                <h4 className="font-semibold text-gray-800 mb-2">Version History</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {versionHistoryByDoc[doc.trackingId].map((version) => (
                    <li key={`${version.versionNumber}-${version.storedFileName}`} className="border-b border-gray-100 pb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">Version {version.versionNumber}: {version.originalFileName}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(version.uploadedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadVersion(doc, version)}
                        className="bg-slate-700 text-white px-2 py-1 rounded text-xs font-semibold"
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</section>

          </div>
        </div>
        )}
      </main>
    </div>
  );
}