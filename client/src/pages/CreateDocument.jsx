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

      setMessage(`Document created successfully. Tracking ID: ${uploadId}`);
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
        <div className="max-w-4xl mx-auto h-full theme-card backdrop-blur-sm p-8 rounded shadow-md flex flex-col">
          <h2 className="text-2xl font-bold theme-text-main mb-2">Create Workflow Document</h2>
          <p className="theme-text-muted mb-6 text-sm">
            Define recipients in exact order. Everyone is notified immediately, and the document starts with recipient #1.
          </p>

          {error && <p className="mb-4 p-3 rounded bg-red-100 text-red-700 font-medium text-sm">{error}</p>}
          {message && <p className="mb-4 p-3 rounded bg-green-100 text-green-700 font-medium text-sm">{message}</p>}

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
              <div>
                <label className="block theme-text-sec font-bold mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter document title..."
                  className="w-full theme-input border p-3 rounded"
                />
              </div>

              <div>
                <label className="block theme-text-sec font-bold mb-2">Description / Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="4"
                  placeholder="Enter details or notes regarding this document..."
                  className="w-full theme-input border p-3 rounded"
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

              <div className="theme-bg-secondary theme-border border rounded p-4 space-y-4">
                <h3 className="text-lg font-bold theme-text-main">Workflow Sequence</h3>

                {/* Recipient Selection Card with Search Bar */}
                <div className="p-4 rounded-xl border border-gray-200 theme-bg-card shadow-sm space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <label className="font-bold text-sm theme-text-main">Select Recipients</label>
                    <span className="text-xs theme-text-muted">
                      {filteredRecipientOptions.length} available
                    </span>
                  </div>

                  {/* Search Bar for Recipients */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search recipients by name, email or position..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full theme-input border p-2.5 pl-9 rounded-xl text-sm focus:outline-none"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {recipientSearch && (
                      <button
                        type="button"
                        onClick={() => setRecipientSearch("")}
                        className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
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

                {/* Workflow Sequence List */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm font-semibold flex justify-between items-center">
                    <span>Sender: {currentUser?.name} ({currentUser?.email})</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-green-200/60 text-green-900 font-bold">Creator</span>
                  </div>

                  {workflowUsers.length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-2">No recipients added to sequence yet.</p>
                  ) : (
                    workflowUsers.map((user, index) => (
                      <div key={user._id} className="p-3 rounded-xl border border-gray-200 bg-white dark:bg-slate-900 flex justify-between items-center gap-2 shadow-sm">
                        <div>
                          <p className="font-bold text-sm theme-text-main">
                            Step {index + 1}: {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email} {user.position ? `• ${user.position}` : ""}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveRecipient(index, -1)}
                            disabled={index === 0}
                            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRecipient(index, 1)}
                            disabled={index === workflowUsers.length - 1}
                            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(user._id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1 rounded-lg text-xs font-semibold"
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

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-400 shadow"
              >
                {submitting ? "Creating Workflow..." : "Create Document Workflow"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
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
