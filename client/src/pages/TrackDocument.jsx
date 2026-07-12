import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  acceptDocument,
  forwardDocument,
  getDocument,
  getUsers,
  rerouteDocument,
} from "../services/api";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

const badgeClass = (status) => {
  if (status === "current") return "bg-orange-100 text-orange-800";
  if (status === "completed") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
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
      <div
        className="relative h-screen bg-gray-900 bg-cover bg-center bg-no-repeat bg-fixed auth-wallpaper-animate"
        style={{ backgroundImage: `url(${authWallpaper})` }}
      >
        <div className="absolute inset-0 bg-slate-900/45"></div>
        <div className="relative z-10 h-full flex items-center justify-center text-white text-lg font-semibold">
          Loading tracking page...
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
      <div className="max-w-5xl mx-auto h-full bg-white/95 backdrop-blur-sm p-8 rounded shadow-md border border-gray-100 flex flex-col">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-200 transition"
        >
          {"<"} Back
        </button>
        <h2 className="text-2xl font-bold mb-2">Track Workflow Document</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Sender and recipients can track current holder and workflow progress in real time.
        </p>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Tracking ID</label>
          <form onSubmit={handleTrack}>
            <div className="flex gap-2">
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Enter tracking ID (e.g., DOC-ABC12345)"
                required
                className="flex-1 border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? "Loading..." : "Track"}
              </button>
            </div>
          </form>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
        {success && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</p>}

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {document && (
          <div className="space-y-6 pb-1">
            <section className="bg-gray-50 border border-gray-200 rounded p-5">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{document.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p><span className="font-bold">Tracking ID:</span> {document.trackingId}</p>
                <p><span className="font-bold">Status:</span> {document.status}</p>
                <p><span className="font-bold">Sender:</span> {document.sender?.name} ({document.sender?.email})</p>
                <p><span className="font-bold">Current Holder:</span> {document.currentHolder?.name || "Completed"}</p>
                <p className="md:col-span-2"><span className="font-bold">Description:</span> {document.content || "N/A"}</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-bold text-gray-800 mb-3">Workflow Sequence</h4>
              <div className="space-y-2">
                <div className="p-3 rounded border border-green-200 bg-green-50">
                  <p className="font-semibold text-green-800">Sender: {document.sender?.name}</p>
                </div>
                {document.route?.map((step, index) => (
                  <div key={`${step.userId}-${index}`} className="p-3 rounded border border-gray-200 bg-white flex justify-between items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">Step {index + 1}: {step.name}</p>
                      <p className="text-sm text-gray-600">{step.email}</p>
                      <p className="text-xs text-gray-500">
                        Notified: {formatDateTime(step.notifiedAt)} | Received: {formatDateTime(step.receivedAt)} | Accepted: {formatDateTime(step.acceptedAt)} | Completed: {formatDateTime(step.completedAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass(step.status)}`}>
                      {step.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {(document.workflow?.canAccept || document.workflow?.canForward || document.workflow?.canReroute) && (
              <section className="bg-orange-50 border border-orange-200 rounded p-5 space-y-4">
                <h4 className="text-lg font-bold text-orange-900">Current Holder Actions</h4>
                <p className="text-sm text-orange-800">
                  You currently hold this document and can forward it or update the remaining route.
                </p>

                <div className="bg-white border border-orange-200 rounded p-3">
                  <p className="text-sm text-gray-700 mb-2">
                    Receive Acknowledgement:{" "}
                    <span className="font-semibold">
                      {currentStep?.acceptedAt ? `Accepted at ${formatDateTime(currentStep.acceptedAt)}` : "Pending acceptance"}
                    </span>
                  </p>
                  <button
                    onClick={handleAccept}
                    disabled={loading || !document.workflow?.canAccept}
                    className="bg-orange-600 text-white px-4 py-2 rounded font-semibold hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    Accept Document
                  </button>
                </div>

                <div>
                  {document.workflow?.canSelectNext && pendingUsers.length > 0 && (
                    <div className="mb-3">
                      <label className="block font-semibold text-gray-700 mb-1">
                        Select Next Receiver (optional)
                      </label>
                      <select
                        value={selectedNextUserId}
                        onChange={(e) => setSelectedNextUserId(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Use default sequence</option>
                        {pendingUsers.map((step, index) => (
                          <option key={`${step.userId}-${index}`} value={step.userId}>
                            {step.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="block font-semibold text-gray-700 mb-2">Forward Remarks (optional)</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="2"
                    className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                  ></textarea>
                  <button
                    onClick={handleForward}
                    disabled={loading || !document.workflow?.canForward}
                    className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    Forward To Next Step
                  </button>
                  {!document.workflow?.canForward && (
                    <p className="text-xs text-orange-800 mt-2">
                      Please accept the document first before forwarding.
                    </p>
                  )}
                </div>

                <div className="border-t border-orange-200 pt-4">
                  <h5 className="font-bold text-gray-800 mb-2">Reroute Workflow</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Insert User</label>
                      <select
                        value={rerouteUserId}
                        onChange={(e) => setRerouteUserId(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select user</option>
                        {rerouteCandidates.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Insert Before (optional)</label>
                      <select
                        value={beforeUserId}
                        onChange={(e) => setBeforeUserId(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Next available step</option>
                        {pendingUsers.map((step, index) => (
                          <option key={`${step.userId}-${index}`} value={step.userId}>
                            {step.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block font-semibold text-gray-700 mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      value={rerouteReason}
                      onChange={(e) => setRerouteReason(e.target.value)}
                      className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleReroute}
                    disabled={loading}
                    className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    Update Route
                  </button>
                </div>
              </section>
            )}

            <section>
              <h4 className="text-lg font-bold text-gray-800 mb-3">History</h4>
              {document.history?.length ? (
                <ul className="space-y-2">
                  {document.history
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <li key={`${entry.action}-${index}`} className="p-3 rounded border border-gray-200 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800">{entry.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.actorName || "System"} | {formatDateTime(entry.timestamp)}
                        </p>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500">No history available.</p>
              )}
            </section>
          </div>
        )}
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 w-full bg-gray-200 text-gray-700 py-3 rounded font-bold hover:bg-gray-300 transition"
        >
          Back to Dashboard
        </button>
      </div>
      </div>
    </div>
  );
}
