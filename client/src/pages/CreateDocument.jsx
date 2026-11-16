import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    // Exclude the current user and super-admin accounts from the pick list
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
          .map(line => line.trim())
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100 text-lg font-semibold transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading document form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-none border border-slate-200/80 dark:border-slate-800 flex flex-col space-y-6 transition-all duration-300">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            Create Workflow Document
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs leading-relaxed">
            Define recipient sequence in exact workflow order. All members are alerted immediately when it is their turn to accept/forward.
          </p>
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
          {/* Left Block: Fields & Uploads (7 columns) */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Enter document title..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              />
            </div>

            {/* Pre-defined Options */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pre-defined Options
              </label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_OPTIONS.map((option) => {
                  const isChecked = content.includes(option.sentence);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleOptionToggle(option)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-250 cursor-pointer ${
                        isChecked
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                        isChecked 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      }`}>
                        {isChecked && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
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

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description / Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="5"
                placeholder="Enter details or notes regarding this document..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
              ></textarea>
            </div>

            <div className="bg-slate-55 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 shadow-sm transition-all duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Attach a Document File (Optional)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload a file to bundle with this workflow. Supported formats include PDF, DOCX, XLSX, JPG, PNG.
              </p>
              
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-600 dark:file:text-white dark:hover:file:bg-indigo-500 file:cursor-pointer file:transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                />
              </div>

              {selectedFile && (
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex items-center gap-2 text-xs transition-all duration-300">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Selected file: <strong className="text-slate-900 dark:text-slate-100">{selectedFile.name}</strong></span>
                </div>
              )}
              {fileError && <p className="text-xs text-red-400 mt-2">{fileError}</p>}
            </div>
          </div>

          {/* Right Block: Route Sequencing (5 columns) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-55 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-4 shadow-sm transition-all duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Workflow Sequence</h3>

              {/* Recipient Search & Add */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-500 dark:text-slate-400">Pick Recipients</label>
                  <span className="text-slate-500 dark:text-slate-400">{recipientOptions.length} available</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name, position, or email..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 p-2 pl-8 rounded-lg text-xs focus:outline-none transition-all duration-300"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 space-y-1.5 scrollbar-thin transition-all duration-300">
                  {recipientOptions.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">No matching users found.</p>
                  ) : (
                    recipientOptions.map((user) => (
                      <label key={user._id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={checkedUserIds.includes(user._id)}
                          onChange={() => handleCheckboxToggle(user._id)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Add Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckedUserIds([])}
                    className="border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Clear Checks
                  </button>
                </div>
              </div>

              {/* List of Workflow steps */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl border border-emerald-500/20 dark:border-emerald-900/50 bg-emerald-500/10 dark:bg-emerald-955/20 text-emerald-400 dark:text-emerald-300 text-xs font-bold flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="truncate"><span className="text-slate-500 dark:text-slate-400">Creator:</span> {currentUser?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-normal truncate mt-0.5">{currentUser?.email}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">Initiator</span>
                </div>

                {workflowUsers.length === 0 ? (
                  <p className="text-xs text-slate-550 dark:text-slate-400 italic py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No recipients added to the sequence yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                    {workflowUsers.map((user, index) => (
                      <div key={user._id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-2 shadow-sm premium-card transition-all duration-300">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            Step {index + 1}: {user.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user.email} {user.position ? `• ${user.position}` : ""}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveRecipient(index, -1)}
                            disabled={index === 0}
                            className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 p-1 rounded-md text-[10px] font-semibold border border-slate-300 dark:border-slate-700 transition-all duration-300"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRecipient(index, 1)}
                            disabled={index === workflowUsers.length - 1}
                            className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 p-1 rounded-md text-[10px] font-semibold border border-slate-300 dark:border-slate-700 transition-all duration-300"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(user._id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1 px-1.5 rounded-md text-[10px] font-bold border border-red-500/20 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  }
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-60"
              >
                {submitting ? "Creating Workflow..." : "Create Workflow"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 py-3 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
