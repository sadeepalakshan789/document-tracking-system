import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const badgeClass = (status) => {
  if (status === "current") return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
  if (status === "completed") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
  return "bg-slate-800/60 text-slate-400 border border-slate-750";
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export default function TrackDocument() {
  const navigate = useNavigate();
  const { trackingId: trackingIdParam } = useParams();

  const [documentId, setDocumentId] = useState(trackingIdParam || "");
  const [document, setDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
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

  const loadBaseData = async () => {
    try {
      const [usersRes] = await Promise.all([getUsers()]);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setPageLoading(false);
    }
  };

  const fetchDocument = async (id) => {
    if (!id) return;

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
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loadBaseData();
  }, [navigate]);

  useEffect(() => {
    if (trackingIdParam) {
      fetchDocument(trackingIdParam);
    }
  }, [trackingIdParam]);

  const handleTrack = async (e) => {
    e.preventDefault();

    if (!documentId.trim()) {
      setError("Please enter a document tracking ID");
      return;
    }

    await fetchDocument(documentId);
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
      setSuccess("Document forwarded successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to forward document");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError("");
      const res = await acceptDocument(document.trackingId);
      setDocument(res.data);
      setSuccess("Document accepted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept document");
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
      const message = err.response?.data?.message || "Unable to preview file";
      setError(message);
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
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = document.file?.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message = err.response?.data?.message || "Unable to download file";
      setError(message);
    } finally {
      setLoadingFileAction(false);
    }
  };

  const handleDownloadVersion = async (version) => {
    if (!document) return;
    try {
      setLoadingFileAction(true);
      setError("");
      const res = await downloadDocumentVersion(document.trackingId, version.versionNumber);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = version.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message = err.response?.data?.message || "Unable to download version";
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

  const handleDeleteDocument = async () => {
    if (!document) return;
    if (!window.confirm("Delete this document and its uploaded file?")) return;

    try {
      setLoadingFileAction(true);
      setError("");
      await deleteDocument(document.trackingId);
      setDocument(null);
      setSuccess("Document deleted successfully.");
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
      return !isSender && !usedRouteUserIds.has(id);
    });
  }, [document, users, usedRouteUserIds]);

  const currentStep = useMemo(() => {
    if (!document?.route?.length) return null;
    if (document.currentHolderIndex < 0 || document.currentHolderIndex >= document.route.length) {
      return null;
    }
    return document.route[document.currentHolderIndex];
  }, [document]);

  useEffect(() => {
    if (!selectedNextUserId) {
      return;
    }

    const exists = pendingUsers.some(
      (step) => String(step.userId) === String(selectedNextUserId)
    );

    if (!exists) {
      setSelectedNextUserId("");
    }
  }, [pendingUsers, selectedNextUserId]);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100 text-lg font-semibold transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading tracking details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 py-8 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-none border border-slate-200/80 dark:border-slate-800 flex flex-col space-y-6 transition-all duration-300">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            Track Workflow Document
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs leading-relaxed">
            Sender and workflow path recipients can track the document status and progression history in real time.
          </p>
        </div>
        {/* Tracking search input */}
        <div className="bg-slate-55 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm transition-all duration-300 space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document Tracking ID</label>
          <form onSubmit={handleTrack}>
            <div className="flex gap-2">
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Enter tracking ID (e.g., DOC-ABC12345)"
                required
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-60"
              >
                {loading ? "Searching..." : "Track"}
              </button>
            </div>
          </form>
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

        <div className="space-y-6">
          {document && (
            <div className="space-y-6">
              {/* Document Overview Card */}
              <section className="bg-slate-55 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 space-y-4 shadow-sm transition-all duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{document.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20`}>
                    {document.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <p><span className="font-semibold text-slate-500 dark:text-slate-400">Tracking ID:</span> <span className="font-mono">{document.trackingId}</span></p>
                  <p><span className="font-semibold text-slate-500 dark:text-slate-400">Sender:</span> {document.sender?.name} ({document.sender?.email})</p>
                  <p><span className="font-semibold text-slate-500 dark:text-slate-400">Current Holder:</span> {document.currentHolder?.name || "Completed"}</p>
                  <p className="md:col-span-2"><span className="font-semibold text-slate-500 dark:text-slate-400">Description:</span> {document.content || "N/A"}</p>
                </div>
              </section>
              {/* Document Files upload/actions */}
              <section className="bg-slate-55 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 space-y-4 shadow-sm transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Document Assets & Files</h4>
                
                <div className="space-y-4">
                  <form onSubmit={handleFileUpload} className="flex flex-col gap-2 md:flex-row items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="flex-1 w-full text-xs text-slate-505 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-455 hover:file:bg-indigo-500/20 file:transition file:cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={uploadingFile || loadingFileAction}
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shrink-0 w-full md:w-auto shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                      {uploadingFile ? "Uploading..." : "Upload Attachment"}
                    </button>
                  </form>
 
                   {document.file ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{document.file.originalFileName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {document.file.fileExtension?.toUpperCase()} • {Math.round(document.file.fileSize / 1024)} KB • Version {document.file.currentVersion || 1}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePreview}
                          disabled={loadingFileAction}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shadow-md shadow-indigo-500/5"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          disabled={loadingFileAction}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shadow-md shadow-slate-500/5"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={handleShowVersions}
                          disabled={loadingFileAction}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shadow-md shadow-indigo-500/5"
                        >
                          Versions
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteDocument}
                          disabled={loadingFileAction}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shadow-md shadow-red-500/5"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No file uploaded yet.</p>
                  )}
 
                  {showVersions && versionHistory.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm transition-all duration-300">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">Version History</h5>
                      <ul className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                        {versionHistory.map((version) => (
                          <li key={`${version.versionNumber}-${version.storedFileName}`} className="pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-slate-800 dark:text-slate-100">Version {version.versionNumber}: {version.originalFileName}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{formatDateTime(version.uploadedAt)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadVersion(version)}
                              className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition shrink-0"
                            >
                              Download
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* Stepper Timeline Progress */}
              <section className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 space-y-4 shadow-sm transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Workflow Sequence Progress</h4>
                
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-emerald-500/20 dark:border-emerald-900/50 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-400 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm">
                    <span>Sender: {document.sender?.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-black">Creator</span>
                  </div>
 
                   <div className="space-y-2">
                    {document.route?.map((step, index) => (
                      <div key={`${step.userId}-${index}`} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3 shadow-sm premium-card transition-all duration-300">
                        <div className="min-w-0 space-y-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            Step {index + 1}: {step.name}
                          </p>
                          <p className="text-[10px] text-slate-550 dark:text-slate-400 font-medium truncate">{step.email}</p>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                            {step.notifiedAt && `Notified: ${formatDateTime(step.notifiedAt)} `}
                            {step.acceptedAt && `• Accepted: ${formatDateTime(step.acceptedAt)} `}
                            {step.completedAt && `• Completed: ${formatDateTime(step.completedAt)}`}
                          </p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-inner ${badgeClass(step.status)}`}>
                          {step.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Action Forms for Holder */}
              {(document.workflow?.canAccept || document.workflow?.canForward || document.workflow?.canReroute) && (
                <section className="bg-amber-500/5 border border-amber-500/20 dark:border-amber-900/40 rounded-3xl p-6 space-y-5 shadow-lg dark:shadow-none transition-all duration-300">
                  <div>
                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Current Holder Operations</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      You are in possession of this document. Perform acceptance, forward to default receivers, or adjust remaining routes.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-all duration-300">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Acknowledge Status:{" "}
                      <span className={`font-bold ${currentStep?.acceptedAt ? "text-emerald-500" : "text-amber-500 animate-pulse"}`}>
                        {currentStep?.acceptedAt ? `Accepted at ${formatDateTime(currentStep.acceptedAt)}` : "Pending Acceptance"}
                      </span>
                    </p>
                    <button
                      onClick={handleAccept}
                      disabled={loading || !document.workflow?.canAccept}
                      className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white py-2 rounded-xl text-xs font-bold transition-all duration-300 disabled:opacity-50 shadow-sm"
                    >
                      Accept Document
                    </button>
                  </div>

                  <div className="space-y-4">
                    {document.workflow?.canSelectNext && pendingUsers.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Select Next Receiver (Optional Override)
                        </label>
                        <select
                          value={selectedNextUserId}
                          onChange={(e) => setSelectedNextUserId(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none transition-all duration-300"
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Use default sequence</option>
                          {pendingUsers.map((step, index) => (
                            <option key={`${step.userId}-${index}`} value={step.userId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                              {step.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Forward Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows="2"
                        placeholder="Add annotations or descriptions for the next receiver..."
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none transition-all duration-300"
                      ></textarea>
                      <button
                        onClick={handleForward}
                        disabled={loading || !document.workflow?.canForward}
                        className="mt-2.5 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                      >
                        Forward Document To Next Step
                      </button>
                      {!document.workflow?.canForward && (
                        <p className="text-[10px] text-amber-500 font-medium mt-2">
                          * Please accept the document first before forwarding.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reroute Panel */}
                  <div className="border-t border-slate-200 dark:border-slate-700/40 pt-4 space-y-4">
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Modify Workflow Route (Reroute)</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1.5">Insert User</label>
                        <select
                          value={rerouteUserId}
                          onChange={(e) => setRerouteUserId(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none transition-all duration-300"
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Select user</option>
                          {rerouteCandidates.map((user) => (
                            <option key={user._id} value={user._id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                              {user.name} ({user.position || "Position not set"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1.5">Insert Before Step</label>
                        <select
                          value={beforeUserId}
                          onChange={(e) => setBeforeUserId(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none transition-all duration-300"
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Next available step</option>
                          {pendingUsers.map((step, index) => (
                            <option key={`${step.userId}-${index}`} value={step.userId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                              {step.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1.5">Rerouting Reason</label>
                      <input
                        type="text"
                        value={rerouteReason}
                        onChange={(e) => setRerouteReason(e.target.value)}
                        placeholder="Add reason for route change..."
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-xs focus:outline-none transition-all duration-300"
                      />
                    </div>

                    <button
                      onClick={handleReroute}
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition"
                    >
                      Update Route Sequence
                    </button>
                  </div>
                </section>
              )}

              {/* History Timeline */}
              <section className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 space-y-4 shadow-sm transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Workflow Event History</h4>
                
                {document.history?.length ? (
                  <ul className="space-y-2 pr-1 max-h-72 overflow-y-auto scrollbar-thin">
                    {document.history
                      .slice()
                      .reverse()
                      .map((entry, index) => (
                        <li key={`${entry.action}-${index}`} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 premium-card transition-all duration-300">
                          <p className="text-xs font-semibold text-slate-850 dark:text-slate-200">{entry.description}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {entry.actorName || "System"} • {formatDateTime(entry.timestamp)}
                          </p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No event logs available.</p>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="flex justify-start pt-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 shadow-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
