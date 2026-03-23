import React, { useState } from "react";
import { getDocument } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function TrackDocument() {
  const [documentId, setDocumentId] = useState("");
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleTrack = async () => {
    if (!documentId.trim()) {
      setError("Please enter a document ID");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await getDocument(documentId);
      setDocument(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Document not found");
      setDocument(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6">Track Document</h2>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Document ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="Enter document ID"
              className="flex-1 border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleTrack}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded font-bold hover:bg-blue-600 transition disabled:bg-gray-400"
            >
              {loading ? "Tracking..." : "Track"}
            </button>
          </div>
        </div>

        {error && (
          <p className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</p>
        )}

        {document && (
          <div className="bg-gray-50 p-6 rounded border border-gray-200">
            <h3 className="text-xl font-bold mb-4">{document.title}</h3>
            <div className="space-y-3">
              <p>
                <span className="font-bold">Status:</span>{" "}
                <span className={`px-3 py-1 rounded ${document.status === "completed" ? "bg-green-200" : "bg-yellow-200"}`}>
                  {document.status}
                </span>
              </p>
              <p>
                <span className="font-bold">Category:</span> {document.category}
              </p>
              <p>
                <span className="font-bold">Created:</span>{" "}
                {new Date(document.createdAt).toLocaleDateString()}
              </p>
              <p>
                <span className="font-bold">Description:</span>
              </p>
              <p className="text-gray-700">{document.description}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 w-full bg-gray-300 text-gray-700 py-3 rounded font-bold hover:bg-gray-400 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
