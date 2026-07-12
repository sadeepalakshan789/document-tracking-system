import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument, getCurrentUser, getUsers } from "../services/api";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

export default function CreateDocument() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectionMode, setSelectionMode] = useState("dropdown");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [multiSelectedUserIds, setMultiSelectedUserIds] = useState([]);
  const [checkedUserIds, setCheckedUserIds] = useState([]);
  const [workflowUsers, setWorkflowUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    const selectedIds = new Set(workflowUsers.map((user) => user._id));
    return users.filter((user) => !selectedIds.has(user._id));
  }, [users, workflowUsers]);

  const recipientOptions = useMemo(
    () => availableUsers.filter((user) => user._id !== currentUser?._id),
    [availableUsers, currentUser]
  );

  const addRecipientsByIds = (ids) => {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (!uniqueIds.length) return;

    setWorkflowUsers((prev) => {
      const existingIds = new Set(prev.map((user) => user._id));
      const pickedUsers = uniqueIds
        .map((id) => users.find((user) => user._id === id))
        .filter((user) => user && !existingIds.has(user._id));

      return [...prev, ...pickedUsers];
    });
  };

  const handleAddRecipient = () => {
    if (!selectedUserId) return;
    addRecipientsByIds([selectedUserId]);
    setSelectedUserId("");
  };

  const handleAddMultiSelectedRecipients = () => {
    if (!multiSelectedUserIds.length) return;
    addRecipientsByIds(multiSelectedUserIds);
    setMultiSelectedUserIds([]);
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
      setMessage(`Document created. Tracking ID: ${res.data.trackingId}`);

      setTimeout(() => {
        navigate(`/track-document/${res.data.trackingId}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create document");
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

          <div className="bg-blue-50 border border-blue-100 rounded p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Workflow Sequence</h3>

            <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
              <p className="font-semibold text-gray-800 mb-2">User Selection Option</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="selectionMode"
                    value="dropdown"
                    checked={selectionMode === "dropdown"}
                    onChange={(e) => setSelectionMode(e.target.value)}
                  />
                  Dropdown (single select)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="selectionMode"
                    value="multiselect"
                    checked={selectionMode === "multiselect"}
                    onChange={(e) => setSelectionMode(e.target.value)}
                  />
                  Multi-select list
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="selectionMode"
                    value="checkbox"
                    checked={selectionMode === "checkbox"}
                    onChange={(e) => setSelectionMode(e.target.value)}
                  />
                  Checkbox list
                </label>
              </div>
            </div>

            {selectionMode === "dropdown" && (
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select recipient</option>
                  {recipientOptions.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}

            {selectionMode === "multiselect" && (
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-2">
                  Hold Ctrl (Windows) or Cmd (Mac) to pick multiple users.
                </label>
                <select
                  multiple
                  value={multiSelectedUserIds}
                  onChange={(e) =>
                    setMultiSelectedUserIds(
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                  className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500 min-h-[150px]"
                >
                  {recipientOptions.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMultiSelectedRecipients}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
                >
                  Add Selected Users
                </button>
              </div>
            )}

            {selectionMode === "checkbox" && (
              <div className="mb-3">
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded p-3 bg-white space-y-2">
                  {recipientOptions.length === 0 ? (
                    <p className="text-sm text-gray-600">No available users.</p>
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
            )}

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
