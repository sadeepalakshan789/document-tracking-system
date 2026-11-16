import React, { useEffect, useMemo, useState } from "react";
import { createDocument, getCurrentUser, getUsers, uploadDocumentFile } from "../services/api";

const PREDEFINED_OPTIONS = [
  {
    label: "Urgent Approval Needed",
    sentence: "Urgent approval needed for the attached document."
  },
  {
    label: "For Review & Feedback",
    sentence: "Sent for review and feedback."
  },
  {
    label: "Standard Forwarding",
    sentence: "Standard forwarding of workflow document."
  }
];

export default function CreateDocumentModal({
  isOpen,
  onClose,
  onDocumentCreated,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [checkedUserIds, setCheckedUserIds] = useState([]);
  const [workflowUsers, setWorkflowUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setRecipientSearch("");
    setCheckedUserIds([]);
    setWorkflowUsers([]);
    setMessage("");
    setError("");
    setSelectedFile(null);
    setFileError("");
  };

  useEffect(() => {
    if (!isOpen) return;

    resetForm();

    const loadData = async () => {
      try {
        setLoading(true);
        const [usersRes, meRes] = await Promise.all([getUsers(), getCurrentUser()]);
        setUsers(usersRes.data || []);
        setCurrentUser(meRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load workflow users");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(workflowUsers.map((user) => String(user._id)));
    return users.filter((user) => !selectedIds.has(String(user._id)));
  }, [users, workflowUsers]);

  const recipientOptions = useMemo(() => {
    const filtered = availableUsers.filter(
      (user) =>
        String(user._id) !== String(currentUser?._id) &&
        String(user.role || "").toLowerCase() !== "super-admin"
    );
    if (!recipientSearch.trim()) {
      return filtered;
    }

    const searchTerm = recipientSearch.trim().toLowerCase();
    return filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        String(user.position || "").toLowerCase().includes(searchTerm)
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

  const handleOptionToggle = (option) => {
    const hasSentence = content.includes(option.sentence);
    if (!hasSentence) {
      setContent((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}\n${option.sentence}` : option.sentence;
      });
    } else {
      setContent((prev) => {
        const nextContent = prev.replace(option.sentence, "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n");
        return nextContent;
      });
    }
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
      setError("Please add at least one recipient to the workflow sequence");
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
        throw new Error("Document created but tracking id is missing from response");
      }

      if (selectedFile) {
        const fileForm = new FormData();
        fileForm.append("file", selectedFile);
        try {
          await uploadDocumentFile(uploadId, fileForm);
        } catch (uploadErr) {
          const uploadMessage = uploadErr.response?.data?.message || uploadErr.message || "Failed to upload file";
          setError(`Document created, but file upload failed: ${uploadMessage}`);
          setSubmitting(false);
          return;
        }
      }

      setMessage(`Document created successfully! Tracking ID: ${uploadId}`);
      setSelectedFile(null);

      // Seamless auto-close and dashboard refresh without full reload
      setTimeout(() => {
        onDocumentCreated?.(uploadId);
        onClose();
      }, 900);
    } catch (err) {
      const apiMessage = err.response?.data?.message || "Failed to create document";
      setError(apiMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                Create Workflow Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define recipient sequence in exact workflow order. All members are notified when it is their turn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 flex-shrink-0">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-slate-500 text-sm">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading document form...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Title, Options, Description, File (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Enter document title..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                {/* Predefined Options */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Quick Purpose Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_OPTIONS.map((option) => {
                      const isChecked = content.includes(option.sentence);
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => handleOptionToggle(option)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                            isChecked
                              ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description / Content */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Description / Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows="4"
                    placeholder="Enter details, instructions, or notes regarding this document..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  ></textarea>
                </div>

                {/* File Attachment */}
                <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Attach a File (Optional)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Upload a file to bundle with this workflow (PDF, DOCX, XLSX, JPG, PNG).
                  </p>

                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-600 dark:file:text-white dark:hover:file:bg-indigo-500 file:cursor-pointer transition duration-150"
                  />

                  {selectedFile && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl flex items-center gap-2 text-xs">
                      <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span className="truncate">
                        Selected: <strong className="text-slate-900 dark:text-slate-100">{selectedFile.name}</strong>
                      </span>
                    </div>
                  )}
                  {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                </div>
              </div>

              {/* Right Column: Workflow Route Sequencing (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Workflow Sequence *
                  </h3>

                  {/* Recipient Picker */}
                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-slate-500 dark:text-slate-400">Pick Recipients</label>
                      <span className="text-[11px] text-slate-400">{recipientOptions.length} available</span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search name, position, email..."
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-1.5 pl-7 rounded-lg text-xs focus:outline-none transition-all"
                      />
                      <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 space-y-1 scrollbar-thin">
                      {recipientOptions.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">No matching users</p>
                      ) : (
                        recipientOptions.map((user) => (
                          <label key={user._id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={checkedUserIds.includes(user._id)}
                              onChange={() => handleCheckboxToggle(user._id)}
                              className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate">{user.position || user.name} ({user.name})</span>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddCheckedRecipients}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                      >
                        Add Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckedUserIds([])}
                        className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Workflow Steps List */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl border border-emerald-500/20 dark:border-emerald-900/50 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex justify-between items-center">
                      <div className="min-w-0">
                        <p className="truncate"><span className="text-slate-400 font-normal">Initiator:</span> {currentUser?.name}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold shrink-0">Creator</span>
                    </div>

                    {workflowUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No recipients added yet. Pick at least one recipient above.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                        {workflowUsers.map((user, index) => (
                          <div key={user._id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-2 shadow-sm">
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                Step {index + 1}: {user.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {user.position ? `${user.position} • ` : ""}{user.email}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveRecipient(index, -1)}
                                disabled={index === 0}
                                className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                title="Move up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRecipient(index, 1)}
                                disabled={index === workflowUsers.length - 1}
                                className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                title="Move down"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(user._id)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-500/20 transition cursor-pointer"
                                title="Remove recipient"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Creating Workflow...</span>
                  </>
                ) : (
                  <span>+ Create Workflow Document</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
