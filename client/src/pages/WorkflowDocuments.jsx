import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteDocument,
  downloadDocumentFile,
  downloadDocumentVersion,
  getAllDocuments,
  getCurrentUser,
  getDocumentVersions,
  previewDocumentFile,
  uploadDocumentFile,
} from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const routeSummary = (doc) => {
  const steps = doc.route || [];
  if (!steps.length) return "No route";
  return `${doc.sender?.name || "Sender"} -> ${steps.map((step) => step.name).join(" -> ")}`;
};

export default function WorkflowDocuments() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingDocumentId, setUploadingDocumentId] = useState("");
  const [actionDocumentId, setActionDocumentId] = useState("");
  const [versionHistoryByDoc, setVersionHistoryByDoc] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [userRes, docsRes] = await Promise.all([getCurrentUser(), getAllDocuments()]);
      setUser(userRes.data || null);
      setDocuments(docsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workflow documents");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchData();
  }, [fetchData, navigate]);

  const completedCount = useMemo(
    () => documents.filter((doc) => doc.status === "Completed").length,
    [documents]
  );

  const handleUploadFile = async (doc, event) => {
    event.preventDefault();
    const file = selectedFiles[doc.trackingId];
    if (!file) {
      setError("Please choose a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingDocumentId(doc.trackingId);
      setError("");
      setMessage("");
      const res = await uploadDocumentFile(doc.trackingId, formData);
      setDocuments((prev) => prev.map((item) => (item.trackingId === doc.trackingId ? res.data.document : item)));
      setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: null }));
      setMessage(`Uploaded ${file.name}`);
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
      setMessage("");
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
      setMessage("");
      const res = await downloadDocumentFile(doc.trackingId);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file?.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      setMessage("File downloaded successfully");
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
      setMessage("");
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
      setMessage("");
      const res = await downloadDocumentVersion(doc.trackingId, version.versionNumber);
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = version.originalFileName || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      setMessage(`Downloaded ${version.originalFileName}`);
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
      setMessage("");
      await deleteDocument(doc.trackingId);
      setDocuments((prev) => prev.filter((item) => item.trackingId !== doc.trackingId));
      setMessage("Document deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete document");
    } finally {
      setActionDocumentId("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary flex items-center justify-center theme-text-main text-lg font-semibold">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading workflow documents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary text-[var(--text-main)] pt-8 pb-36 px-4 md:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto theme-card rounded-3xl p-6 md:p-8 shadow-xl border theme-border flex flex-col space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b theme-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold theme-text-main">Workflow Documents</h1>
              <p className="text-xs theme-text-muted mt-0.5">
                All workflow documents linked to <span className="font-semibold text-blue-400">{user?.email || "your account"}</span>.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              ← Dashboard
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/5"
            >
              Refresh
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
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="theme-bg-secondary/40 border theme-border p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-semibold theme-text-muted uppercase tracking-wider mb-1">Total Documents</span>
            <span className="text-xl font-bold theme-text-main">{documents.length}</span>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">In Transit</span>
            <span className="text-xl font-bold text-amber-400">{documents.length - completedCount}</span>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Completed</span>
            <span className="text-xl font-bold text-emerald-400">{completedCount}</span>
          </div>
        </section>

        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="text-center py-12 border border-dashed theme-border rounded-3xl">
              <p className="text-sm theme-text-muted italic">No workflow documents found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc._id} className="theme-border border rounded-3xl p-5 theme-bg-secondary/20 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold theme-text-main truncate">{doc.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] theme-text-sec">
                        <span className="font-semibold theme-text-muted">Tracking ID:</span>
                        <span className="font-mono">{doc.trackingId}</span>
                        <span className="theme-text-muted">•</span>
                        <span className="font-semibold theme-text-muted">Status:</span>
                        <span className="font-semibold text-blue-400">{doc.status}</span>
                        <span className="theme-text-muted">•</span>
                        <span className="font-semibold theme-text-muted">Holder:</span>
                        <span>{doc.currentHolder?.name || "Completed"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center shrink-0">
                      {doc.workflow?.canAccept && (
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Awaiting Acceptance
                        </span>
                      )}
                      {doc.workflow?.canForward && (
                        <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Ready To Forward
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/track-document/${doc.trackingId}`)}
                        className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-200 inline-flex items-center gap-1.5 border border-indigo-400/30 cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>View Timeline</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs theme-text-sec bg-slate-950/10 border theme-border rounded-xl p-3 space-y-1">
                    <p className="truncate"><span className="font-semibold theme-text-muted">Route:</span> {routeSummary(doc)}</p>
                    <p className="text-[10px] theme-text-muted">Updated: {formatDateTime(doc.updatedAt)}</p>
                  </div>

                  {/* File Uploads/Actions */}
                  <div className="rounded-2xl border border-blue-900/20 bg-blue-950/10 p-4 shadow-inner">
                    <p className="text-xs font-bold theme-text-main mb-2.5">File Attachments</p>
                    
                    <form onSubmit={(event) => handleUploadFile(doc, event)} className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        onChange={(event) =>
                          setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: event.target.files?.[0] || null }))
                        }
                        className="flex-1 min-w-[200px] text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-600 dark:file:text-white dark:hover:file:bg-indigo-500 file:cursor-pointer file:transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={uploadingDocumentId === doc.trackingId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:bg-slate-700 shadow-md shadow-indigo-500/5 shrink-0"
                      >
                        {uploadingDocumentId === doc.trackingId ? "Uploading..." : "Upload File"}
                      </button>
                    </form>

                    {doc.file ? (
                      <div className="mt-3 rounded-xl border theme-border bg-slate-950/30 p-3 space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <div className="min-w-0">
                            <p className="font-semibold truncate theme-text-main">{doc.file.originalFileName}</p>
                            <p className="text-[10px] theme-text-muted mt-0.5">
                              {doc.file.fileExtension?.toUpperCase()} • {Math.round(doc.file.fileSize / 1024)} KB • Version {doc.file.currentVersion || 1}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePreviewFile(doc)}
                            disabled={actionDocumentId === doc.trackingId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition disabled:bg-slate-700 shadow-sm"
                          >
                            Preview
                          </button>
                           <button
                            type="button"
                            onClick={() => handleDownloadFile(doc)}
                            disabled={actionDocumentId === doc.trackingId}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition disabled:bg-slate-700 shadow-sm"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowVersions(doc)}
                            disabled={actionDocumentId === doc.trackingId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition disabled:bg-slate-700 shadow-sm"
                          >
                            Versions
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={actionDocumentId === doc.trackingId}
                            className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition disabled:bg-slate-700 shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] theme-text-muted italic mt-2.5">No file uploaded yet.</p>
                    )}

                    {versionHistoryByDoc[doc.trackingId]?.length > 0 && (
                      <div className="mt-3 rounded-xl border theme-border bg-slate-950/40 p-3 space-y-2 shadow-inner">
                        <h4 className="font-bold text-xs theme-text-main uppercase tracking-wider border-b theme-border pb-1">Version History</h4>
                        <ul className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                          {versionHistoryByDoc[doc.trackingId].map((version) => (
                            <li key={`${version.versionNumber}-${version.storedFileName}`} className="pb-1.5 border-b theme-border-subtle flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold truncate theme-text-main text-[11px]">V{version.versionNumber}: {version.originalFileName}</p>
                                <p className="text-[9px] theme-text-muted">{formatDateTime(version.uploadedAt)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadVersion(doc, version)}
                                className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition shrink-0"
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
        </div>
      </div>
    </div>
  );
}
