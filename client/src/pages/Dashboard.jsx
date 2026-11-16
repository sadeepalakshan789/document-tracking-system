import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import SupportChatWidget from "../components/SupportChatWidget";
import UserGuideModal from "../components/UserGuideModal";
import WorkflowDocumentsModal from "../components/WorkflowDocumentsModal";
import NotificationsModal, { isIncomingNotification } from "../components/NotificationsModal";
import UserSettingsModal from "../components/UserSettingsModal";
import WorkflowCalendar from "../components/WorkflowCalendar";
import CreateDocumentModal from "../components/CreateDocumentModal";
import TrackDocumentModal from "../components/TrackDocumentModal";
import {
  deleteDocument,
  downloadDocumentFile,
  downloadDocumentVersion,
  getCurrentUser,
  getMyDocuments,
  getTrackerDocuments,
  getMyNotifications,
  getDocumentVersions,
  previewDocumentFile,
  uploadDocumentFile,
} from "../services/api";

const getPhotoStorageKey = (userId) => `profilePhoto:${userId}`;
const LIVE_REFRESH_MS = 30000;

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

const matchDocumentGlobal = (doc, query) => {
  if (!query) return true;
  const q = query.toLowerCase().trim();

  // 1. Document ID / Tracking ID
  const trackingId = String(doc.trackingId || "").toLowerCase();
  if (trackingId.includes(q)) return true;

  // 2. Title
  const title = String(doc.title || "").toLowerCase();
  if (title.includes(q)) return true;

  // 3. Status
  const status = String(doc.status || "").toLowerCase();
  if (status.includes(q)) return true;

  // 4. Sender Name / Email
  const senderName = String(doc.sender?.name || "").toLowerCase();
  const senderEmail = String(doc.sender?.email || "").toLowerCase();
  if (senderName.includes(q) || senderEmail.includes(q)) return true;

  // 5. Recipient names / emails and step statuses / dates / step numbers
  const steps = doc.route || [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNum = i + 1;

    // Step numbers: e.g., "step 1", "1", "2"
    if (`step ${stepNum}`.includes(q) || String(stepNum) === q) return true;

    // Recipient name / email
    const recName = String(step.name || "").toLowerCase();
    const recEmail = String(step.email || "").toLowerCase();
    if (recName.includes(q) || recEmail.includes(q)) return true;

    // Step status
    const stepStatus = String(step.status || "").toLowerCase();
    if (stepStatus.includes(q)) return true;

    // Step dates
    if (step.acceptedAt && formatDateTime(step.acceptedAt).toLowerCase().includes(q)) return true;
    if (step.completedAt && formatDateTime(step.completedAt).toLowerCase().includes(q)) return true;
    if (step.notifiedAt && formatDateTime(step.notifiedAt).toLowerCase().includes(q)) return true;
    if (step.receivedAt && formatDateTime(step.receivedAt).toLowerCase().includes(q)) return true;
  }

  // 6. Current Holder Name / Email
  const holderName = String(doc.currentHolder?.name || "").toLowerCase();
  const holderEmail = String(doc.currentHolder?.email || "").toLowerCase();
  if (holderName.includes(q) || holderEmail.includes(q)) return true;

  // 7. Dates (Created / Updated)
  if (doc.createdAt && formatDateTime(doc.createdAt).toLowerCase().includes(q)) return true;
  if (doc.updatedAt && formatDateTime(doc.updatedAt).toLowerCase().includes(q)) return true;
  if (doc.createdAt && String(doc.createdAt).toLowerCase().includes(q)) return true;
  if (doc.updatedAt && String(doc.updatedAt).toLowerCase().includes(q)) return true;

  return false;
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
  const [trackerDocuments, setTrackerDocuments] = useState([]);
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
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackModalDocumentId, setTrackModalDocumentId] = useState("");

  // Documents where the logged-in user is the active current holder AND needs to accept.
  // The backend already enforces this via getMyDocuments, but we add a client-side
  // guard (canAccept) as a defensive double-check against any stale state.
  const needsMyAction = useMemo(
    () => documents.filter((doc) => doc.workflow?.canAccept === true),
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
    // "action" sub-filter: already-strict needsMyAction list
    // "notification" sub-filter: docs with unread notifications
    // "all" (default): the full documents array which the backend has already scoped
    //   to only docs where the user is the active holder with a pending step
    const baseDocuments =
      activeCardFilter === "action"
        ? needsMyAction
        : activeCardFilter === "notification"
          ? unreadRelatedDocuments
          : documents; // backend already enforces: currentHolder === me AND !acceptedAt

    return baseDocuments;
  }, [activeCardFilter, documents, needsMyAction, unreadRelatedDocuments]);

  const allAccessibleDocuments = useMemo(() => {
    const uniqueDocs = new Map();
    documents.forEach((doc) => {
      if (doc && doc.trackingId) {
        uniqueDocs.set(doc.trackingId, doc);
      }
    });
    trackerDocuments.forEach((doc) => {
      if (doc && doc.trackingId) {
        uniqueDocs.set(doc.trackingId, doc);
      }
    });
    return Array.from(uniqueDocs.values());
  }, [documents, trackerDocuments]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.isRead &&
          isIncomingNotification(notification, user, allAccessibleDocuments)
      ).length,
    [notifications, user, allAccessibleDocuments]
  );

  const searchResults = useMemo(() => {
    const query = documentSearch.trim();
    if (!query) return null;
    return allAccessibleDocuments.filter((doc) => matchDocumentGlobal(doc, query));
  }, [documentSearch, allAccessibleDocuments]);

  const filteredTrackerDocuments = useMemo(() => {
    const query = documentSearch.trim();
    if (!query) return trackerDocuments;
    return trackerDocuments.filter((doc) => matchDocumentGlobal(doc, query));
  }, [documentSearch, trackerDocuments]);

  const displayedDocuments = useMemo(() => {
    return searchResults !== null ? searchResults : filteredDocuments;
  }, [searchResults, filteredDocuments]);

  const filteredDocumentsTitle = useMemo(() => {
    const query = documentSearch.trim();
    if (query) return `Search results for "${query}"`;
    if (activeCardFilter === "action") return "Pending Acceptance — Action Required";
    if (activeCardFilter === "notification") return "Documents Related To Unread Notifications";
    return "Documents Assigned To Me — Pending Acceptance";
  }, [activeCardFilter, documentSearch]);

  const canViewUserControl = useMemo(() => {
    const normalizedRole = String(user?.role || "").trim().toLowerCase();
    return normalizedRole === "admin";
  }, [user?.role]);

  const trackedDocument = useMemo(
    () => trackerDocuments.find((doc) => doc.trackingId === selectedTrackingId) || null,
    [trackerDocuments, selectedTrackingId]
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

  const lastFetchTimeRef = useRef(0);

  const fetchDashboardData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        setError("");

        const [userRes, docsRes, trackerDocsRes, notificationsRes] = await Promise.all([
          getCurrentUser(),
          getMyDocuments(),
          getTrackerDocuments(),
          getMyNotifications(),
        ]);

        const newUser = userRes.data;
        const newDocs = docsRes.data || [];
        const newTrackerDocs = trackerDocsRes.data || [];
        const newNotifications = notificationsRes.data || [];

        const hasChanged = (oldVal, newVal) => {
          if (oldVal === newVal) return false;
          return JSON.stringify(oldVal) !== JSON.stringify(newVal);
        };

        setUser((prev) => (hasChanged(prev, newUser) ? newUser : prev));
        setDocuments((prev) => (hasChanged(prev, newDocs) ? newDocs : prev));
        setTrackerDocuments((prev) => (hasChanged(prev, newTrackerDocs) ? newTrackerDocs : prev));
        setNotifications((prev) => (hasChanged(prev, newNotifications) ? newNotifications : prev));

        if (showLoader) {
          setLastSyncedAt(new Date());
        }

        const prevUserStr = localStorage.getItem("currentUser");
        const newUserStr = JSON.stringify(newUser);
        if (prevUserStr !== newUserStr) {
          localStorage.setItem("currentUser", newUserStr);
        }

        lastFetchTimeRef.current = Date.now();
      } catch (err) {
        if (showLoader) {
          setError(err.response?.data?.message || "Failed to load dashboard data");
        }
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
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
      // Pause polling while any modal is open or while user is typing in any input/textarea
      const isInputActive =
        typeof document !== "undefined" &&
        (document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.tagName === "SELECT");

      if (
        isWorkflowModalOpen ||
        isNotificationsModalOpen ||
        isSettingsModalOpen ||
        isGuideModalOpen ||
        isCalendarModalOpen ||
        isCreateModalOpen ||
        isTrackModalOpen ||
        isInputActive
      ) {
        return;
      }

      fetchDashboardDataRef.current(false);
    }, LIVE_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [
    isWorkflowModalOpen,
    isNotificationsModalOpen,
    isSettingsModalOpen,
    isGuideModalOpen,
    isCalendarModalOpen,
    isCreateModalOpen,
    isTrackModalOpen,
  ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const handleWindowFocus = () => {
      if (
        isWorkflowModalOpen ||
        isNotificationsModalOpen ||
        isSettingsModalOpen ||
        isGuideModalOpen ||
        isCalendarModalOpen ||
        isCreateModalOpen ||
        isTrackModalOpen
      ) {
        return;
      }
      if (Date.now() - lastFetchTimeRef.current > 20000) {
        fetchDashboardDataRef.current(false);
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isWorkflowModalOpen &&
        !isNotificationsModalOpen &&
        !isSettingsModalOpen &&
        !isGuideModalOpen &&
        !isCalendarModalOpen &&
        !isCreateModalOpen &&
        !isTrackModalOpen &&
        Date.now() - lastFetchTimeRef.current > 20000
      ) {
        fetchDashboardDataRef.current(false);
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isWorkflowModalOpen,
    isNotificationsModalOpen,
    isSettingsModalOpen,
    isGuideModalOpen,
    isCalendarModalOpen,
    isCreateModalOpen,
    isTrackModalOpen,
  ]);

  useEffect(() => {
    if (!user?._id) return;
    const savedPhoto = localStorage.getItem(getPhotoStorageKey(user._id));
    setProfilePhoto(savedPhoto || "");
  }, [user?._id]);

  useEffect(() => {
    if (!trackerDocuments.length) {
      setSelectedTrackingId("");
      return;
    }

    const exists = trackerDocuments.some((doc) => doc.trackingId === selectedTrackingId);
    if (!selectedTrackingId || !exists) {
      setSelectedTrackingId(trackerDocuments[0].trackingId);
    }
  }, [trackerDocuments, selectedTrackingId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const handleCardClick = (doc, e) => {
    const interactiveTags = ["BUTTON", "INPUT", "A", "SELECT", "OPTION", "LABEL"];
    if (
      interactiveTags.includes(e.target.tagName) ||
      e.target.closest("button") ||
      e.target.closest("form") ||
      e.target.closest("input")
    ) {
      return;
    }
    setTrackModalDocumentId(doc.trackingId);
    setIsTrackModalOpen(true);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?._id) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 500;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setProfilePhoto(compressedDataUrl);

        try {
          localStorage.setItem(getPhotoStorageKey(user._id), compressedDataUrl);
          setError("");
        } catch (storageError) {
          console.error("Local storage photo write failed:", storageError);
          setError("Failed to save image to browser storage (quota exceeded).");
        }
      };
      img.src = e.target.result;
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
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file?.originalFileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setSuccess("File downloaded successfully");
    } catch (err) {
      let message = "Unable to download file";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) message = parsed.message;
        } catch {}
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
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
      const versionNum = version.versionNumber ?? 1;
      const res = await downloadDocumentVersion(doc.trackingId, versionNum);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = version.originalFileName || doc.file?.originalFileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setSuccess(`Downloaded ${version.originalFileName || 'document'}`);
    } catch (err) {
      let message = "Unable to download version";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) message = parsed.message;
        } catch {}
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100 text-lg font-semibold transition-colors duration-300">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-gradient-to-r from-slate-900 via-indigo-955 to-slate-900 text-white py-3 px-6 md:px-8 shadow-lg w-full border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="w-full max-w-[1550px] mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Far Left: Logo / Dashboard Title */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white whitespace-nowrap">
              Document Workflow Dashboard
            </h1>
            <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide whitespace-nowrap flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              by CodeBloom
            </span>
          </div>

          {/* Center: Search input field */}
          <div className="flex-1 flex justify-center px-4 md:px-12">
            <div className="relative w-full max-w-[550px]">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-indigo-200">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
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
                placeholder="Search Documents . . . . . ."
                className="w-full rounded-full border border-indigo-500/30 bg-slate-800/80 py-2.5 pl-12 pr-4 text-sm text-white placeholder-slate-400 shadow-sm transition-all duration-300 focus:bg-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Far Right: User Profile Section */}
          <div className="flex items-center gap-4">
            {/* Left Block: Avatar and Click Text */}
            <div className="flex flex-col items-center gap-1">
              <label className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-violet-500 text-white ring-2 ring-indigo-400/30 flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-indigo-200/80 font-medium whitespace-nowrap">

              </span>
            </div>

            {/* Right Block: Stacked User Details */}
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-sm md:text-base font-bold text-white leading-tight truncate">
                {user?.name || "Sadeepa1"}
              </p>
              <p className="text-xs text-indigo-200 leading-tight mt-0.5 truncate">
                {user?.position || "Management Assistant"}
              </p>
              <p className="text-[11px] text-indigo-200/60 leading-tight mt-1 truncate">
                Signed in as {user?.email || "sadeepala099@gmail.com"}
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-[1550px] mx-auto p-6 pb-36 space-y-6">
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

        {documentSearch.trim() !== "" ? (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Search Results</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Found {searchResults.length} matching {searchResults.length === 1 ? "document" : "documents"} for "{documentSearch}"
                </p>
              </div>
              <button
                onClick={() => setDocumentSearch("")}
                className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-semibold">No matches found</p>
                <p className="text-sm mt-1">Try checking for typos or searching by a different term/tracking number.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((doc) => {
                  const isDocWorkflowComplete = isWorkflowComplete(doc);
                  const isCurrentHolderMe = doc.currentHolder?._id === user?._id;
                  const docRequiresAction = (doc.workflow?.canAccept || doc.workflow?.canForward) && isCurrentHolderMe;

                  let badgeClass = "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 font-semibold px-3 py-1 rounded-full";
                  if (isDocWorkflowComplete) {
                    badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-semibold px-3 py-1 rounded-full";
                  } else if (docRequiresAction) {
                    badgeClass = "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold px-3 py-1 rounded-full";
                  }

                  return (
                    <div
                      key={doc._id}
                      onClick={(e) => handleCardClick(doc, e)}
                      className="bg-slate-50/50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-5 transition-all duration-300 premium-card cursor-pointer"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{doc.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                              {doc.status}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">Tracking ID: {doc.trackingId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTrackModalDocumentId(doc.trackingId);
                              setIsTrackModalOpen(true);
                            }}
                            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-200 inline-flex items-center gap-2 border border-indigo-400/30 cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>View Timeline</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs text-slate-600 dark:text-slate-355 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 transition-all duration-300">
                        <div>
                          <span className="font-semibold block text-slate-900 dark:text-slate-100">Sender</span>
                          <span className="text-slate-700 dark:text-slate-300">{doc.sender?.name} ({doc.sender?.email})</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-slate-900 dark:text-slate-100">Current Holder</span>
                          <span className="text-slate-700 dark:text-slate-300">{doc.currentHolder?.name || "Workflow Completed"}</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-slate-900 dark:text-slate-100">Last Updated</span>
                          <span className="text-slate-700 dark:text-slate-300">{formatDateTime(doc.updatedAt)}</span>
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
            {/* Sidebar Navigation */}
            <aside className="xl:col-span-3 space-y-6">
              <section className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Control Panel</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quick actions for your account.</p>
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    onClick={() => setIsWorkflowModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 group-hover:scale-105 transition-transform">
                        W
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">Workflow Documents</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">View all documents</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  <button
                    onClick={() => setIsNotificationsModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold border border-blue-500/20 group-hover:scale-105 transition-transform">
                        N
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          Notifications
                          {unreadCount > 0 && (
                            <span className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-purple-500 text-white text-[9px] font-bold leading-none font-sans">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">Inbox and alerts</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        S
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">Settings</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">Profile and security</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  {canViewUserControl && (
                    <button
                      onClick={() => navigate("/user-control")}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 group-hover:scale-105 transition-transform">
                          U
                        </span>
                        <span>
                          <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">User Control</span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400">Manage user access</span>
                        </span>
                      </span>
                      <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsGuideModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 group-hover:scale-105 transition-transform">
                        📖
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">Help &amp; User Guide</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">App usage guidelines &amp; FAQs</span>
                      </span>
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-955/20 p-3 text-left hover:bg-red-100 dark:hover:bg-red-950/40 transition-all duration-300 group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold border border-red-500/20 group-hover:scale-105 transition-transform">
                        L
                      </span>
                      <span>
                        <span className="block font-semibold text-xs text-red-700">Logout</span>
                        <span className="block text-[10px] text-red-500">Sign out safely</span>
                      </span>
                    </span>
                    <span className="text-red-600 group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                  </button>
                </div>
              </section>

              {/* Monthly Workflow Calendar */}
              <WorkflowCalendar
                documents={allAccessibleDocuments.length > 0 ? allAccessibleDocuments : (trackerDocuments.length > 0 ? trackerDocuments : documents)}
                onSelectDocument={(trackingId) => {
                  setTrackModalDocumentId(trackingId);
                  setIsTrackModalOpen(true);
                }}
                onModalStateChange={(isOpen) => setIsCalendarModalOpen(isOpen)}
              />
            </aside>

            {/* Document Location Tracker */}
            <aside className="xl:col-span-4">
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all rounded-xl p-6 shadow-sm h-full space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Location Tracker</h2>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Refreshes every {LIVE_REFRESH_MS / 1000}s</span>
                    <span>Sync: {formatDateTime(lastSyncedAt)}</span>
                  </div>
                </div>

                {filteredTrackerDocuments.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-4 text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    {documentSearch.trim() ? "No matching documents found." : "No documents available to track."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">
                        Select Document
                      </label>
                      <select
                        value={selectedTrackingId}
                        onChange={(e) => setSelectedTrackingId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                      >
                        {filteredTrackerDocuments.map((doc) => (
                          <option key={doc._id} value={doc.trackingId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                            {doc.trackingId} - {doc.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {trackedDocument && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 space-y-1.5 shadow-sm transition-all duration-300">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Sender:{" "}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {trackedDocument.sender?.name || "N/A"}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Receivers in path:{" "}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {trackedDocument.route?.length || 0}
                            </span>
                          </p>
                        </div>

                        {/* Interactive Timeline Stepper */}
                        <div className="relative pt-6 pb-2 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/60 shadow-sm transition-all duration-300">
                          <div className="relative flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                            {trackedDocument.route?.length > 1 && (
                              <div className="absolute left-12 right-12 top-[24px] -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden pointer-events-none">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                  style={{ width: `${connectorProgressPercent(trackedDocument.route)}%` }}
                                ></div>
                              </div>
                            )}

                            {trackedDocument.route?.map((step, index) => {
                              const isCompleted = step.status === "completed";
                              const isCurrent = step.status === "current";
                              const isAccepted = step.acceptedAt;

                              let circleColor = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700";
                              let pulse = "";

                              if (isCompleted) {
                                circleColor = "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20";
                              } else if (isCurrent) {
                                if (isAccepted) {
                                  circleColor = "bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-lg shadow-teal-500/20";
                                } else {
                                  circleColor = "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-lg shadow-amber-500/20";
                                  pulse = "animate-pulse";
                                }
                              }

                              return (
                                <div key={`${step.userId}-${index}`} className="min-w-[96px] text-center shrink-0 z-10">
                                  <div
                                    className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-bold leading-none transition-all duration-300 ${circleColor} ${pulse}`}
                                    title={stepStatusLabel(step)}
                                  >
                                    {index + 1}
                                  </div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2 leading-tight truncate px-1">
                                    {step.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{stepStatusLabel(step)}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tracker Details Footer */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 space-y-3 shadow-sm transition-all duration-300">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Live Workflow Summary</p>
                            <span
                              className={`rounded-full text-xs font-semibold border px-3 py-1 ${trackedLocation?.isCompleted
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                                }`}
                            >
                              {trackedDocument.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-sm transition-all duration-300">
                              <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Current Location</p>
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{trackedLocation?.currentLocation}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-sm transition-all duration-300">
                              <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Next Location</p>
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{trackedLocation?.nextLocation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </aside>

            {/* Document Feed Column */}
            <div className="xl:col-span-5 space-y-6">
              {/* Stats badges */}
              <section className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleCardFilterClick("all")}
                  className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 rounded-xl border text-left transition-all duration-300 premium-card ${activeCardFilter === "all"
                    ? "border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/10"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none"
                    }`}
                >
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Assigned</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{documents.length}</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardFilterClick("action")}
                  className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 rounded-xl border text-left transition-all duration-300 premium-card ${activeCardFilter === "action"
                    ? "border-amber-500 ring-2 ring-amber-500/10"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-lg dark:shadow-none"
                    }`}
                >
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Action</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{needsMyAction.length}</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardFilterClick("notification")}
                  className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 rounded-xl border text-left transition-all duration-300 premium-card ${activeCardFilter === "notification"
                    ? "border-rose-500 ring-2 ring-rose-500/10"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-lg dark:shadow-none"
                    }`}
                >
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Alerts</p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{unreadCount}</p>
                </button>
              </section>

              {/* Action Buttons Column */}
              <section className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-xl p-4 grid grid-cols-2 gap-3 shadow-sm">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Document
                </button>
                <button
                  onClick={() => {
                    setTrackModalDocumentId("");
                    setIsTrackModalOpen(true);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold transition shadow-lg shadow-slate-500/10 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Track Document
                </button>
              </section>

              {/* Core document feed */}
              <section ref={documentsSectionRef} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{filteredDocumentsTitle}</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Only documents where <strong>you are the active current holder</strong> and acceptance is still pending.</p>
                  </div>

                  <div className="flex gap-1.5">
                    {activeCardFilter !== "all" && (
                      <button
                        onClick={() => setActiveCardFilter("all")}
                        className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                      >
                        Show All
                      </button>
                    )}
                    <button
                      onClick={() => fetchDashboardData(false)}
                      className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {displayedDocuments.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed">
                    {documentSearch && "No documents match your search query."}
                    {!documentSearch && activeCardFilter === "all" && "No documents are currently waiting for your acceptance. You are either not the active holder on any document, or you have already accepted all documents assigned to you."}
                    {!documentSearch && activeCardFilter === "action" && "No documents are currently awaiting your acceptance."}
                    {!documentSearch && activeCardFilter === "notification" && "No documents are linked to unread notifications."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {displayedDocuments.map((doc) => {
                      const requiresAction = doc.workflow?.canAccept || doc.workflow?.canForward;
                      const isComplete = isWorkflowComplete(doc);
                      let statusBadge = "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 font-semibold px-3 py-1 rounded-full";
                      if (isComplete) {
                        statusBadge = "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-semibold px-3 py-1 rounded-full";
                      } else if (requiresAction) {
                        statusBadge = "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold px-3 py-1 rounded-full";
                      }

                      return (
                        <div key={doc._id} onClick={(e) => handleCardClick(doc, e)} className="border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/60 space-y-3 premium-card cursor-pointer">
                          <div className="flex flex-wrap justify-between gap-3 items-start">
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{doc.title}</h3>
                              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">ID: {doc.trackingId}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                                {doc.status}
                              </span>
                              {requiresAction && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold px-3 py-1 rounded-full text-[10px]">
                                  Action Needed
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 transition-all duration-300">
                            <div>
                              <span className="font-semibold block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Receipt Status</span>
                              <span className={`font-bold ${getReceiptStatus(doc) === "Accepted" ? "text-emerald-600" : "text-amber-600"}`}>
                                {getReceiptStatus(doc)}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Current Holder</span>
                              <span className="font-medium truncate block text-slate-800 dark:text-slate-200">{doc.currentHolder?.name || "Workflow Completed"}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            <p className="truncate"><span className="font-semibold text-slate-500 dark:text-slate-400">Route:</span> {routeSummary(doc)}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Updated: {formatDateTime(doc.updatedAt)}</p>
                          </div>

                          {/* File Actions Container */}
                          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 shadow-sm dark:shadow-none transition-all duration-300">
                            <div className="flex flex-wrap gap-2 items-center">
                              {!doc.file ? (
                                <form onSubmit={(event) => handleUploadFile(doc, event)} className="flex flex-wrap items-center gap-2 w-full">
                                  <input
                                    type="file"
                                    onChange={(event) =>
                                      setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: event.target.files?.[0] || null }))
                                    }
                                    className="block w-full max-w-[200px] text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-600 dark:file:text-white dark:hover:file:bg-indigo-500 file:cursor-pointer file:transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                                  />
                                  <button
                                    type="submit"
                                    disabled={uploadingDocumentId === doc.trackingId}
                                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:bg-slate-300"
                                  >
                                    {uploadingDocumentId === doc.trackingId ? "Uploading..." : "Upload File"}
                                  </button>
                                </form>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewFile(doc)}
                                    disabled={actionDocumentId === doc.trackingId}
                                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:bg-slate-350"
                                  >
                                    Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(doc)}
                                    disabled={actionDocumentId === doc.trackingId}
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-355 shadow-sm"
                                  >
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShowVersions(doc)}
                                    disabled={actionDocumentId === doc.trackingId}
                                    className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 disabled:bg-slate-100"
                                  >
                                    Versions
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    disabled={actionDocumentId === doc.trackingId}
                                    className="bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-305 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-955/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 disabled:bg-slate-100"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setTrackModalDocumentId(doc.trackingId);
                                  setIsTrackModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-200 inline-flex items-center gap-2 border border-indigo-400/30 cursor-pointer ml-auto shrink-0"
                              >
                                <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>View Timeline</span>
                              </button>
                            </div>

                            {doc.file && (
                              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center gap-2 transition-all duration-300">
                                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <div className="min-w-0">
                                  <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{doc.file.originalFileName}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {doc.file.fileExtension?.toUpperCase()} • {Math.round(doc.file.fileSize / 1024)} KB • Version {doc.file.currentVersion || 1}
                                  </p>
                                </div>
                              </div>
                            )}

                            {versionHistoryByDoc[doc.trackingId]?.length > 0 && (
                              <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2 shadow-sm transition-all duration-300">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1">Version History</h4>
                                <ul className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                                  {versionHistoryByDoc[doc.trackingId].map((version) => (
                                    <li key={`${version.versionNumber}-${version.storedFileName}`} className="pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate text-slate-800 dark:text-slate-200 text-[11px]">V{version.versionNumber}: {version.originalFileName}</p>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400">{formatDateTime(version.uploadedAt)}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadVersion(doc, version)}
                                        className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all duration-300 shrink-0"
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
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      <SupportChatWidget currentUser={user} />
      <UserGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
      <WorkflowDocumentsModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        documents={allAccessibleDocuments.length > 0 ? allAccessibleDocuments : (trackerDocuments.length > 0 ? trackerDocuments : documents)}
        currentUser={user}
        onSelectDocument={(trackingId) => {
          setIsWorkflowModalOpen(false);
          setTrackModalDocumentId(trackingId);
          setIsTrackModalOpen(true);
        }}
      />
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        currentUser={user}
        documents={allAccessibleDocuments}
        onNotificationsUpdated={fetchDashboardData}
        onSelectDocument={(trackingId) => {
          setIsNotificationsModalOpen(false);
          setTrackModalDocumentId(trackingId);
          setIsTrackModalOpen(true);
        }}
      />
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={user}
        onUserUpdated={(updatedUser) => {
          setUser(updatedUser);
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        }}
      />
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onDocumentCreated={() => {
          fetchDashboardData(false);
        }}
      />
      <TrackDocumentModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialTrackingId={trackModalDocumentId}
        documents={allAccessibleDocuments}
        onDocumentUpdated={() => {
          fetchDashboardData(false);
        }}
      />
    </div>
  );
}