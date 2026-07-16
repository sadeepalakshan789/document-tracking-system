import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument, getCurrentUser, getUsers, uploadDocumentFile } from "../services/api";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

export default function CreateDocument() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [checkedUserIds, setCheckedUserIds] = useState([]);
  const [workflowUsers, setWorkflowUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [usersRes, meRes] = await Promise.all([getUsers(), getCurrentUser()]);
        setUsers(usersRes.data || []);
        setCurrentUser(meRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(workflowUsers.map((user) => String(user._id)));
    return users.filter((user) => !selectedIds.has(String(user._id)));
  }, [users, workflowUsers]);

  const recipientOptions = useMemo(() => {
    const filtered = availableUsers.filter((user) => String(user._id) !== String(currentUser?._id));
    if (!recipientSearch.trim()) {
      return filtered;
    }

    const searchTerm = recipientSearch.trim().toLowerCase();
    return filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
  }, [availableUsers, currentUser, recipientSearch]);

  const addRecipientsByIds = (ids) => {
    const uniqueIds = [...new Set(ids.map((id) => String(id)))].filter(Boolean);
    if (!uniqueIds.length) return;

    setWorkflowUsers((prev) => {
      const existingIds = new Set(prev.map((user) => String(user._id)));
      const pickedUsers = uniqueIds
        .map((id) => users.find((user) => String(user._id) === id))
        .filter((user) => user && !existingIds.has(String(user._id)));

      return [...prev, ...pickedUsers];
    });
  };

  const handleAddCheckedRecipients = () => {
    if (!checkedUserIds.length) return;
    addRecipientsByIds(checkedUserIds);
    setCheckedUserIds([]);
  };

  const handleCheckboxToggle = (userId) => {
    setCheckedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveRecipient = (userId) => {
    setWorkflowUsers((prev) => prev.filter((user) => user._id !== userId));
  };

  const moveRecipient = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= workflowUsers.length) return;

    setWorkflowUsers((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setFileError("");

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!workflowUsers.length) {
      setError("Please add at least one recipient to the workflow");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        routeUserIds: workflowUsers.map((user) => user._id),
      };

      const res = await createDocument(payload);
      const uploadId = res.data.trackingId || res.data._id;

      if (!uploadId) {
        throw new Error("Document created but upload id is missing from response");
      }

      if (selectedFile) {
        const fileForm = new FormData();
        fileForm.append("file", selectedFile);
        try {
          await uploadDocumentFile(uploadId, fileForm);
        } catch (uploadErr) {
          const uploadMessage = uploadErr.response?.data?.message || uploadErr.message || "Failed to upload document file";
          setError(`Document created, but file upload failed: ${uploadMessage}`);
          setSubmitting(false);
          return;
        }
      }

      setMessage(`Document created. Tracking ID: ${uploadId}`);
      setSelectedFile(null);

      setTimeout(() => {
        navigate(`/track-document/${uploadId}`);
      }, 1200);
    } catch (err) {
      const apiMessage = err.response?.data?.message || "Failed to create document";
      setError(apiMessage);
    } finally {
      setSubmitting(false);
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
          Loading create document form...
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
      <div className="max-w-4xl mx-auto h-full bg-white/95 backdrop-blur-sm p-8 rounded shadow-md border border-gray-100 flex flex-col">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-200 transition"
        >
          {"<"} Back
        </button>
        <h2 className="text-2xl font-bold mb-2">Create Workflow Document</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Define recipients in exact order. Everyone is notified immediately, and the document starts with recipient #1.
        </p>

        {error && <p className="mb-4 p-3 rounded bg-red-100 text-red-700">{error}</p>}
        {message && <p className="mb-4 p-3 rounded bg-green-100 text-green-700">{message}</p>}

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Description / Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="4"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div className="rounded border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Attach a document file</h3>
            <p className="text-sm text-gray-600 mb-3">
              Optional: upload a file to attach to this workflow document. Supported formats include PDF, DOCX, XLSX, JPG, PNG.
            </p>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-700">Selected file: {selectedFile.name}</p>
            )}
            {fileError && <p className="mt-2 text-sm text-red-700">{fileError}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Workflow Sequence</h3>

            <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
              <p className="font-semibold text-gray-800 mb-2">Select recipients</p>
            </div>

            <div className="mb-3">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="recipientSearch">
                  Search recipients
                </label>
                <input
                  id="recipientSearch"
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded p-3 bg-white space-y-2">
                {recipientOptions.length === 0 ? (
                  <p className="text-sm text-gray-600">No matching users found.</p>
                ) : (
                  recipientOptions.map((user) => (
                    <label key={user._id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={checkedUserIds.includes(user._id)}
                        onChange={() => handleCheckboxToggle(user._id)}
                      />
                      {user.name} ({user.email})
                    </label>
                  ))
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleAddCheckedRecipients}
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
                >
                  Add Checked Users
                </button>
                <button
                  type="button"
                  onClick={() => setCheckedUserIds([])}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-300"
                >
                  Clear Checks
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm font-semibold">
                Sender: {currentUser?.name} ({currentUser?.email})
              </div>

              {workflowUsers.length === 0 ? (
                <p className="text-gray-600 text-sm">No recipients added yet.</p>
              ) : (
                workflowUsers.map((user, index) => (
                  <div key={user._id} className="p-3 rounded border border-gray-200 bg-white flex justify-between items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Step {index + 1}: {user.name}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveRecipient(index, -1)}
                        className="bg-gray-100 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-200"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRecipient(index, 1)}
                        className="bg-gray-100 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-200"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(user._id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-semibold hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {submitting ? "Creating..." : "Create Document Workflow"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded font-bold hover:bg-gray-300 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
