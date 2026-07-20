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
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

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
      <div
        className="relative h-screen bg-gray-900 bg-cover bg-center bg-no-repeat bg-fixed auth-wallpaper-animate"
        style={{ backgroundImage: `url(${authWallpaper})` }}
      >
        <div className="absolute inset-0 bg-slate-900/45"></div>
        <div className="relative z-10 h-full flex items-center justify-center text-white text-lg font-semibold">
          Loading workflow documents...
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen overflow-hidden bg-gray-900 bg-cover bg-center bg-no-repeat bg-fixed auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45"></div>
      <div className="relative z-10 h-full p-6">
        <div className="max-w-6xl mx-auto h-full theme-card backdrop-blur-sm p-8 rounded shadow-md flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold theme-text-main">Workflow Documents</h1>
              <p className="text-sm theme-text-muted">
                All workflow documents linked to {user?.email || "your account"}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-300 transition"
              >
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
          {message && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</p>}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="theme-bg-secondary theme-border border p-4 rounded">
              <p className="text-sm theme-text-muted">Total Documents</p>
              <p className="text-2xl font-bold theme-text-main">{documents.length}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-4 rounded">
              <p className="text-sm text-orange-700">In Transit</p>
              <p className="text-2xl font-bold text-orange-800">{documents.length - completedCount}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded">
              <p className="text-sm text-emerald-700">Completed</p>
              <p className="text-2xl font-bold text-emerald-800">{completedCount}</p>
            </div>
          </section>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <p className="text-gray-500">No workflow documents found.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc._id} className="theme-border border rounded p-4 theme-bg-secondary">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <h2 className="text-lg font-bold theme-text-main">{doc.title}</h2>
                        <p className="text-sm theme-text-muted">Tracking ID: {doc.trackingId}</p>
                        <p className="text-sm theme-text-muted">Status: {doc.status}</p>
                        <p className="text-sm theme-text-muted">
                          Current Holder: {doc.currentHolder?.name || "Completed"}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center">
                        {doc.workflow?.canAccept && (
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                            Awaiting Your Acceptance
                          </span>
                        )}
                        {doc.workflow?.canForward && (
                          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                            Ready To Forward
                          </span>
                        )}
                        <button
                          type="button"
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
                      <p className="text-sm font-semibold text-gray-800 mb-2">Document File Actions</p>
                      <form onSubmit={(event) => handleUploadFile(doc, event)} className="flex flex-col gap-2 md:flex-row">
                        <input
                          type="file"
                          onChange={(event) =>
                            setSelectedFiles((prev) => ({ ...prev, [doc.trackingId]: event.target.files?.[0] || null }))
                          }
                          className="flex-1 border border-gray-300 p-2 rounded"
                        />
                        <button
                          type="submit"
                          disabled={uploadingDocumentId === doc.trackingId}
                          className="bg-blue-600 text-white px-3 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {uploadingDocumentId === doc.trackingId ? "Uploading..." : "Upload File"}
                        </button>
                      </form>

                      {doc.file ? (
                        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                          <p className="text-sm font-semibold text-gray-800">Current file: {doc.file.originalFileName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {doc.file.fileExtension?.toUpperCase()} • {Math.round(doc.file.fileSize / 1024)} KB • Version {doc.file.currentVersion || 1}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => handlePreviewFile(doc)}
                              disabled={actionDocumentId === doc.trackingId}
                              className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(doc)}
                              disabled={actionDocumentId === doc.trackingId}
                              className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
                            >
                              Download
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
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mt-3">No file uploaded yet.</p>
                      )}

                      {versionHistoryByDoc[doc.trackingId]?.length > 0 && (
                        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                          <h4 className="font-semibold text-gray-800 mb-2">Version History</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            {versionHistoryByDoc[doc.trackingId].map((version) => (
                              <li key={`${version.versionNumber}-${version.storedFileName}`} className="border-b border-gray-100 pb-2 flex items-center justify-between gap-2">
                                <div>
                                  <p>Version {version.versionNumber}: {version.originalFileName}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
