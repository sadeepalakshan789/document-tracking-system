import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../services/socket";
import API from "../services/api";

const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return "just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return d.toLocaleDateString();
};

export default function SupportInboxModal({ isOpen, onClose, currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'unread'

  const messagesEndRef = useRef(null);
  const socket = getSocket();

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Join admin room & listen for socket updates
  useEffect(() => {
    if (!isOpen || !socket) return;

    socket.emit("join_admin_panel");

    const handleSessionListUpdate = (sessList) => {
      setSessions(sessList || []);
      // If we have an active session, update its live metadata without overwriting input
      if (selectedSession) {
        const updated = (sessList || []).find((s) => s.sessionId === selectedSession.sessionId);
        if (updated) {
          setSelectedSession((prev) => ({
            ...prev,
            ...updated,
          }));
        }
      }
    };

    const handleReceiveMessage = (msg) => {
      if (selectedSession && msg.sessionId === selectedSession.sessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        socket.emit("mark_as_read", { sessionId: selectedSession.sessionId });
      }
    };

    socket.on("session_list_updated", handleSessionListUpdate);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("session_list_updated", handleSessionListUpdate);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [isOpen, selectedSession, socket]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setHistoryLoading(true);
    setMessages([]);

    socket.emit("join_session", { sessionId: session.sessionId });
    socket.emit("mark_as_read", { sessionId: session.sessionId });

    try {
      const res = await API.get(`/chat/history/${session.sessionId}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load session messages:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSession || !currentUser?._id) return;

    const payload = {
      sessionId: selectedSession.sessionId,
      senderId: currentUser._id,
      senderName: currentUser.name || "Administrator",
      senderRole: "super-admin",
      message: replyText.trim(),
    };

    socket.emit("send_message", payload);
    setReplyText("");
  };

  const totalUnread = useMemo(() => {
    return (sessions || []).reduce((acc, sess) => acc + (sess.unreadCount || 0), 0);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return (sessions || []).filter((sess) => {
      const name = sess.user?.name || "";
      const email = sess.user?.email || "";
      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" || (filter === "unread" && (sess.unreadCount || 0) > 0);

      return matchesSearch && matchesFilter;
    });
  }, [sessions, search, filter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-5xl h-[85vh] max-h-[750px] rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Support Inbox
                </h2>
                {totalUnread > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white animate-pulse">
                    {totalUnread} unread
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {sessions.length} chats
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                View and manage user support requests in real time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Main Content: Split Two-Column Container */}
        <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm">
          {/* Left Column: Sessions List */}
          <div className="w-full md:w-80 lg:w-88 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/60 dark:bg-slate-900/60">
            {/* Filter and Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    filter === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                    filter === "unread"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Unread
                  {totalUnread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Session List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {search || filter !== "all"
                    ? "No support chats match your filter."
                    : "No active support chats found. You will be notified when a user opens a chat."}
                </div>
              ) : (
                filteredSessions.map((sess) => {
                  const isActive = selectedSession?.sessionId === sess.sessionId;
                  const initials = sess.user?.name
                    ? sess.user.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                    : "?";

                  return (
                    <button
                      key={sess.sessionId}
                      type="button"
                      onClick={() => handleSelectSession(sess)}
                      className={`w-full text-left p-3.5 transition-all duration-200 flex gap-3 items-start border-l-4 cursor-pointer ${
                        isActive
                          ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500"
                          : "border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {sess.user?.name || "User"}
                          </p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">
                            {fmtTime(sess.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {sess.lastMessage || "Started a chat"}
                        </p>
                      </div>

                      {sess.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {sess.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Conversation Thread */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
            {selectedSession ? (
              <>
                {/* Session Header */}
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 shadow-2xs z-10 flex-shrink-0">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {selectedSession.user?.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {selectedSession.user?.email}
                      {selectedSession.user?.position ? ` • ${selectedSession.user.position}` : ""}
                    </p>
                  </div>

                  {selectedSession.userPageUrl && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-[9px] text-slate-500 dark:text-slate-400 max-w-[180px] sm:max-w-[240px] truncate shrink-0">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Context: </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                        {selectedSession.userPageUrl.replace("http://localhost:3000", "") || "/"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40 dark:bg-slate-950/30 space-y-3.5 scrollbar-thin">
                  {historyLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No messages yet in this conversation.
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.senderRole === "super-admin" || msg.senderRole === "admin";
                      return (
                        <div
                          key={msg._id || index}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                            <span>{msg.senderName}</span>
                            <span>•</span>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div
                            className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none"
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center bg-white dark:bg-slate-900 flex-shrink-0"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply to the user..."
                    required
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    Send Reply
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <span className="text-4xl">💬</span>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                  Support Conversation Window
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                  Select an active user chat session from the list on the left to see conversation history and reply to them in real time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sessions.length} active conversation{sessions.length !== 1 ? "s" : ""}
            {totalUnread > 0 ? ` • ${totalUnread} unread` : ""}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
