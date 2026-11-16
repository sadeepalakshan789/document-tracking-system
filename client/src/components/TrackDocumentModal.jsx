import React, { useEffect, useMemo, useState } from "react";
import {
  acceptDocument,
  deleteDocument,
  downloadDocumentFile,
  downloadDocumentVersion,
  forwardDocument,
  getDocument,
  getDocumentVersions,
  getUsers,
  previewDocumentFile,
  rerouteDocument,
  uploadDocumentFile,
} from "../services/api";
import { PriorityBadge, DueDateBadge } from "./PriorityBadge";

const badgeClass = (status) => {
  if (status === "current") return "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25";
  if (status === "completed") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25";
  return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TrackDocumentModal({
  isOpen,
  onClose,
  initialTrackingId = "",
  documents = [],
  onDocumentUpdated,
}) {
  const [documentId, setDocumentId] = useState(initialTrackingId || "");
  const [document, setDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [remarks, setRemarks] = useState("");
  const [selectedNextUserId, setSelectedNextUserId] = useState("");
  const [rerouteUserId, setRerouteUserId] = useState("");
  const [beforeUserId, setBeforeUserId] = useState("");
  const [rerouteReason, setRerouteReason] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingFileAction, setLoadingFileAction] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, e) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const fetchDocument = async (id) => {
    if (!id || !id.trim()) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const res = await getDocument(id.trim());
      setDocument(res.data);
    } catch (err) {
      setDocument(null);
      setError(err.response?.data?.message || "Document not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccess("");
    setShowVersions(false);
    setVersionHistory([]);

    const loadUsers = async () => {
      try {
        const usersRes = await getUsers();
        setUsers(usersRes.data || []);
      } catch {
        // silent fallback
      }
    };
    loadUsers();

    if (initialTrackingId) {
      setDocumentId(initialTrackingId);
      fetchDocument(initialTrackingId);
    } else {
      setDocument(null);
      setDocumentId("");
    }
  }, [isOpen, initialTrackingId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleTrack = async (e) => {
    e?.preventDefault();
    if (!documentId.trim()) {
      setError("Please enter a document tracking ID");
      return;
    }
    await fetchDocument(documentId);
  };

  const handleAccept = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError("");
      const res = await acceptDocument(document.trackingId);
      setDocument(res.data);
      setSuccess("Document accepted successfully!");
      onDocumentUpdated?.();
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept document");
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError("");
      const payload = { remarks };
      if (selectedNextUserId) {
        payload.nextUserId = selectedNextUserId;
      }

      const res = await forwardDocument(document.trackingId, payload);
      setDocument(res.data);
      setRemarks("");
      setSelectedNextUserId("");
      setSuccess("Document forwarded successfully!");
      onDocumentUpdated?.();
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to forward document");
    } finally {
      setLoading(false);
    }
  };

  const handleReroute = async () => {
    if (!document) return;
    if (!rerouteUserId) {
      setError("Please select a user to insert into the route");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = {
        insertUserId: rerouteUserId,
        reason: rerouteReason,
      };

      if (beforeUserId) {
        payload.beforeUserId = beforeUserId;
      }

      const res = await rerouteDocument(document.trackingId, payload);
      setDocument(res.data);
      setRerouteUserId("");
      setBeforeUserId("");
      setRerouteReason("");
      setSuccess("Route updated successfully.");
      onDocumentUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reroute document");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!document || !selectedFile) {
      setError("Please choose a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setUploadingFile(true);
      setError("");
      const res = await uploadDocumentFile(document.trackingId, formData);
      setDocument(res.data.document);
      setSelectedFile(null);
      setSuccess(res.data.message || "File uploaded successfully");
      e.target.reset();
      onDocumentUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePreview = async () => {
    if (!document) return;
    try {
      setLoadingFileAction(true);
      setError("");
      const res = await previewDocumentFile(document.trackingId);
      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to preview file");
    } finally {
      setLoadingFileAction(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      setLoadingFileAction(true);
      setError("");
      const res = await downloadDocumentFile(document.trackingId);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = document.file?.originalFileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
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
      setLoadingFileAction(false);
    }
  };

  const handleShowVersions = async () => {
    if (!document) return;
    try {
      setLoadingFileAction(true);
      const res = await getDocumentVersions(document.trackingId);
      setVersionHistory(res.data.versions || []);
      setShowVersions(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load version history");
    } finally {
      setLoadingFileAction(false);
    }
  };

  const handleDownloadVersion = async (version) => {
    if (!document) return;
    try {
      setLoadingFileAction(true);
      setError("");
      const versionNum = version.versionNumber ?? 1;
      const res = await downloadDocumentVersion(document.trackingId, versionNum);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = version.originalFileName || document.file?.originalFileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
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
      setLoadingFileAction(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!document) return;
    if (!window.confirm("Delete this document and its uploaded file?")) return;

    try {
      setLoadingFileAction(true);
      setError("");
      await deleteDocument(document.trackingId);
      setDocument(null);
      setSuccess("Document deleted successfully.");
      onDocumentUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete document");
    } finally {
      setLoadingFileAction(false);
    }
  };

  const pendingUsers = useMemo(() => {
    if (!document?.route) return [];
    return document.route.filter(
      (step, index) => step.status === "pending" && index > document.currentHolderIndex
    );
  }, [document]);

  const usedRouteUserIds = useMemo(() => {
    if (!document?.route) return new Set();
    return new Set(document.route.map((step) => String(step.userId)));
  }, [document]);

  const rerouteCandidates = useMemo(() => {
    if (!document || !users.length) return [];
    return users.filter((user) => {
      const id = String(user._id);
      const isSender = String(document.sender?.userId) === id;
      const isSuperAdmin = String(user.role || "").toLowerCase() === "super-admin";
      return !isSender && !usedRouteUserIds.has(id) && !isSuperAdmin;
    });
  }, [document, users, usedRouteUserIds]);

  const currentStep = useMemo(() => {
    if (!document?.route?.length) return null;
    if (document.currentHolderIndex < 0 || document.currentHolderIndex >= document.route.length) {
      return null;
    }
    return document.route[document.currentHolderIndex];
  }, [document]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                Track Workflow Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect document progress, view step sequence history, and perform actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tracking Search Input Card */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 flex-shrink-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Document Tracking ID
          </label>
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="Enter tracking ID (e.g., DOC-0B50C6B3)..."
              required
              className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-60 cursor-pointer shrink-0"
            >
              {loading ? "Searching..." : "Track"}
            </button>
          </form>

          {/* Quick pick chips from accessible documents */}
          {documents.length > 0 && !document && (
            <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Recent:</span>
              {documents.slice(0, 5).map((d) => (
                <button
                  key={d.trackingId}
                  type="button"
                  onClick={() => {
                    setDocumentId(d.trackingId);
                    fetchDocument(d.trackingId);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 transition cursor-pointer"
                >
                  {d.trackingId}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 flex-shrink-0">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Scrollable Document Details Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {document ? (
            <div className="space-y-4">
              {/* Document Overview Card */}
              <section className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {document.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PriorityBadge priority={document.priority} showNormal={true} />
                    <DueDateBadge
                      dueDate={document.dueDate}
                      isOverdue={document.isOverdue}
                      isCompleted={document.status === "Completed"}
                    />
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {document.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">Tracking ID:</span>{" "}
                    <code className="font-mono text-indigo-600 dark:text-indigo-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {document.trackingId}
                    </code>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(document.trackingId, e)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Copy tracking ID"
                    >
                      {copiedId === document.trackingId ? (
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p>
                    <span className="font-semibold text-slate-400">Sender / Created By:</span>{" "}
                    {document.sender?.name} ({document.sender?.email})
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">Current Holder:</span>{" "}
                    {document.currentHolder?.name || "Workflow Completed"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">Receipt Status:</span>{" "}
                    <span className={`font-semibold ${currentStep?.acceptedAt ? "text-emerald-500" : "text-amber-500"}`}>
                      {currentStep?.acceptedAt ? "Accepted" : "Pending Acceptance"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">SLA Due Date:</span>{" "}
                    {document.dueDate ? (
                      <span className={document.isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "font-semibold text-slate-900 dark:text-slate-100"}>
                        {formatDateTime(document.dueDate)} {document.isOverdue && "(OVERDUE)"}
                      </span>
                    ) : (
                      "No deadline specified"
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">Last Updated:</span>{" "}
                    {formatDateTime(document.updatedAt)}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold text-slate-400">Description / Notes:</span>{" "}
                    {document.content || "N/A"}
                  </p>
                </div>
              </section>

              {/* Document Files / Attachments */}
              <section className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Document Attachments & Files
                </h4>

                <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-2 items-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-600 dark:file:text-white dark:hover:file:bg-indigo-500 file:cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploadingFile || loadingFileAction}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 w-full sm:w-auto cursor-pointer"
                  >
                    {uploadingFile ? "Uploading..." : "Upload File"}
                  </button>
                </form>

                {document.file ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">📎</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {document.file.originalFileName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {document.file.fileExtension?.toUpperCase()} • {Math.round(document.file.fileSize / 1024)} KB • Version {document.file.currentVersion || 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handlePreview}
                        disabled={loadingFileAction}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={loadingFileAction}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={handleShowVersions}
                        disabled={loadingFileAction}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Versions
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteDocument}
                        disabled={loadingFileAction}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>

                    {showVersions && (
                      <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Version History</h5>
                        {versionHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No prior versions recorded.</p>
                        ) : (
                          <ul className="space-y-1.5 text-xs">
                            {versionHistory.map((version) => (
                              <li key={version.versionNumber} className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">v{version.versionNumber}</span>
                                  <span className="text-slate-400 ml-2">{version.originalFileName}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadVersion(version)}
                                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  Download
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No files attached yet.
                  </p>
                )}
              </section>

              {/* Stepper Timeline Progress */}
              <section className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Workflow Sequence Progress
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl border border-emerald-500/20 dark:border-emerald-900/50 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                    <span>Sender: {document.sender?.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 uppercase font-black">
                      Initiator
                    </span>
                  </div>

                  <div className="space-y-2">
                    {document.route?.map((step, index) => (
                      <div
                        key={`${step.userId}-${index}`}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3 shadow-sm"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            Step {index + 1}: {step.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{step.email}</p>
                          <p className="text-[10px] text-slate-400">
                            {step.notifiedAt && `Notified: ${formatDateTime(step.notifiedAt)} `}
                            {step.acceptedAt && `• Accepted: ${formatDateTime(step.acceptedAt)} `}
                            {step.completedAt && `• Completed: ${formatDateTime(step.completedAt)}`}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badgeClass(step.status)}`}>
                          {step.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Current Holder Operations */}
              {(document.workflow?.canAccept || document.workflow?.canForward || document.workflow?.canReroute) && (
                <section className="bg-amber-500/5 border border-amber-500/20 dark:border-amber-900/40 rounded-2xl p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                      Current Holder Operations
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      You currently hold this document. Accept, forward, or adjust route as needed.
                    </p>
                  </div>

                  {document.workflow?.canAccept && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Status:{" "}
                        <span className={`font-bold ${currentStep?.acceptedAt ? "text-emerald-500" : "text-amber-500 animate-pulse"}`}>
                          {currentStep?.acceptedAt ? `Accepted at ${formatDateTime(currentStep.acceptedAt)}` : "Pending Acceptance"}
                        </span>
                      </p>
                      <button
                        onClick={handleAccept}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                      >
                        Accept Document
                      </button>
                    </div>
                  )}

                  {document.workflow?.canForward && (
                    <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Forward Document</h5>

                      {document.workflow?.canSelectNext && pendingUsers.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Next Receiver Override (Optional)
                          </label>
                          <select
                            value={selectedNextUserId}
                            onChange={(e) => setSelectedNextUserId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-xs focus:outline-none"
                          >
                            <option value="">Use default route order</option>
                            {pendingUsers.map((step, index) => (
                              <option key={`${step.userId}-${index}`} value={step.userId}>
                                {step.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Forward Remarks
                        </label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows="2"
                          placeholder="Optional notes for next receiver..."
                          className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-xs focus:outline-none"
                        ></textarea>
                      </div>

                      <button
                        onClick={handleForward}
                        disabled={loading}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Forward Document →
                      </button>
                    </div>
                  )}

                  {document.workflow?.canReroute && rerouteCandidates.length > 0 && (
                    <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Reroute / Insert Route Step</h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            User to Insert *
                          </label>
                          <select
                            value={rerouteUserId}
                            onChange={(e) => setRerouteUserId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-xs focus:outline-none"
                          >
                            <option value="">Select user...</option>
                            {rerouteCandidates.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name} ({u.position || u.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Insert Before (Optional)
                          </label>
                          <select
                            value={beforeUserId}
                            onChange={(e) => setBeforeUserId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-xs focus:outline-none"
                          >
                            <option value="">Append after current step</option>
                            {pendingUsers.map((p) => (
                              <option key={p.userId} value={p.userId}>
                                Before: {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={rerouteReason}
                        onChange={(e) => setRerouteReason(e.target.value)}
                        placeholder="Reason for rerouting..."
                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-xs focus:outline-none"
                      />

                      <button
                        onClick={handleReroute}
                        disabled={loading || !rerouteUserId}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Apply Route Change
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {loading ? "Searching for document..." : "No Document Loaded"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter a valid Tracking ID above to inspect its real-time workflow status.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
