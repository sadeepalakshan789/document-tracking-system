import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDocuments } from "../services/api";

const getNormalizedStatus = (doc) => {
  const s = String(doc?.status || "").trim();
  const lower = s.toLowerCase();
  if (lower === "completed" || (Array.isArray(doc?.route) && doc.route.length > 0 && doc.route.every((r) => r.status === "completed"))) {
    return "Completed";
  }
  if (lower === "pending" || lower === "submitted" || doc?.workflow?.canAccept) {
    return "Pending";
  }
  return "In Transit";
};

const getHolderDisplay = (currentHolder) => {
  if (!currentHolder) return "—";
  if (typeof currentHolder === "object") {
    return currentHolder.name || currentHolder.position || currentHolder.email || "—";
  }
  return String(currentHolder);
};

const StatusBadge = ({ status }) => {
  const map = {
    Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "In Transit": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse",
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
      {status === "Completed" && "✅ "}
      {status === "In Transit" && "🚀 "}
      {status === "Pending" && "⏳ "}
      {status}
    </span>
  );
};

const RouteBar = ({ current, total }) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{current}/{total}</span>
    </div>
  );
};

export default function WorkflowDocumentsModal({
  isOpen,
  onClose,
  documents: propDocuments = [],
  onSelectDocument,
}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState(Array.isArray(propDocuments) ? propDocuments : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [copiedId, setCopiedId] = useState(null);

  const fetchDocs = useCallback(async (showLoader = false) => {
    if (showLoader && documents.length === 0) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await getAllDocuments();
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : Array.isArray(res?.data?.documents)
        ? res.data.documents
        : [];

      const hasChanged = (oldVal, newVal) => {
        if (oldVal === newVal) return false;
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      };

      if (list.length > 0) {
        setDocuments((prev) => (hasChanged(prev, list) ? list : prev));
      } else if (Array.isArray(propDocuments) && propDocuments.length > 0) {
        setDocuments((prev) => (hasChanged(prev, propDocuments) ? propDocuments : prev));
      }
    } catch (err) {
      if (documents.length === 0) {
        setError("Failed to load documents. Please try again.");
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [propDocuments, documents.length]);

  const fetchDocsRef = useRef(fetchDocs);
  useEffect(() => {
    fetchDocsRef.current = fetchDocs;
  });

  useEffect(() => {
    if (Array.isArray(propDocuments) && propDocuments.length > 0) {
      setDocuments((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(propDocuments)) {
          return prev;
        }
        return propDocuments;
      });
    }
  }, [propDocuments]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSearchQuery("");
      setStatusFilter("All");
      fetchDocsRef.current(documents.length === 0);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, documents.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statuses = ["All", "Pending", "In Transit", "Completed"];

  const filtered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const holderStr = typeof doc.currentHolder === "object"
      ? `${doc.currentHolder?.name || ""} ${doc.currentHolder?.position || ""} ${doc.currentHolder?.email || ""}`
      : String(doc.currentHolder || "");
    const matchSearch =
      !q ||
      (doc.title || "").toLowerCase().includes(q) ||
      (doc.trackingId || "").toLowerCase().includes(q) ||
      holderStr.toLowerCase().includes(q);
    const norm = getNormalizedStatus(doc);
    const matchStatus = statusFilter === "All" || norm === statusFilter;
    return matchSearch && matchStatus;
  });

  const countFor = (s) => (s === "All" ? documents.length : documents.filter((d) => getNormalizedStatus(d) === s).length);

  const handleCopy = (trackingId, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trackingId).catch(() => {});
    setCopiedId(trackingId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRowClick = (trackingId) => {
    if (!trackingId) return;
    if (onSelectDocument) {
      onSelectDocument(trackingId);
    } else {
      navigate(`/track-document/${trackingId}`);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-4xl max-h-[85vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Workflow Documents</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">All documents in your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search title, tracking ID, holder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {s} <span className="opacity-70">({countFor(s)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && documents.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : error && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-rose-500 text-sm">{error}</p>
              <button onClick={fetchDocs} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Document</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Tracking ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide hidden md:table-cell">Current Holder</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide hidden lg:table-cell">Route</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide hidden sm:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const routeTotal = Array.isArray(doc.route) && doc.route.length > 0
                    ? doc.route.length
                    : (doc.workflow?.totalSteps || 0);
                  const routeCurrent = Array.isArray(doc.route) && doc.route.length > 0
                    ? doc.route.filter((r) => r.status === "completed" || r.acceptedAt || r.receivedAt).length
                    : (doc.workflow?.completedSteps || 0);
                  const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : "—";
                  const holderName = getHolderDisplay(doc.currentHolder);
                  const normStatus = getNormalizedStatus(doc);
                  const targetTrackingId = doc.trackingId || doc._id;

                  return (
                    <tr
                      key={doc._id || doc.trackingId}
                      onClick={() => handleRowClick(targetTrackingId)}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors group"
                      title="Click to view full workflow details"
                    >
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.title || "Untitled"}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{doc.trackingId}</code>
                          <button
                            onClick={(e) => handleCopy(doc.trackingId, e)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Copy tracking ID"
                          >
                            {copiedId === doc.trackingId ? (
                              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={normStatus} /></td>
                      <td className="py-3 px-3 hidden md:table-cell text-slate-600 dark:text-slate-300">{holderName}</td>
                      <td className="py-3 px-3 hidden lg:table-cell"><RouteBar current={routeCurrent} total={routeTotal} /></td>
                      <td className="py-3 px-3 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs">{updatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} of {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Got It, Close
          </button>
        </div>
      </div>
    </div>
  );
}
