import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDocuments, getCurrentUser } from "../services/api";
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
        <div className="max-w-6xl mx-auto h-full bg-white/95 backdrop-blur-sm p-8 rounded shadow-md border border-gray-100 flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Workflow Documents</h1>
              <p className="text-sm text-gray-600">
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

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded">
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-gray-800">{documents.length}</p>
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
                  <div key={doc._id} className="border border-gray-200 rounded p-4 bg-gray-50">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">{doc.title}</h2>
                        <p className="text-sm text-gray-600">Tracking ID: {doc.trackingId}</p>
                        <p className="text-sm text-gray-600">Status: {doc.status}</p>
                        <p className="text-sm text-gray-600">
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
