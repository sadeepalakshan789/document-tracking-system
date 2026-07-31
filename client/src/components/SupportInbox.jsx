import React, { useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../services/socket";
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

export default function SupportInbox({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    // Join the admin room to receive session updates and list updates
    socket.emit("join_admin_panel");

    const handleSessionListUpdate = (sessList) => {
      setSessions(sessList || []);
      // If we have a selected session, update its properties in the local active selection (e.g. unread count)
      if (selectedSession) {
        const updated = sessList.find((s) => s.sessionId === selectedSession.sessionId);
        if (updated) {
          setSelectedSession(updated);
        }
      }
    };

    const handleReceiveMessage = (msg) => {
      // If the message belongs to our currently open session, append it
      if (selectedSession && msg.sessionId === selectedSession.sessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        // Auto-ack to server to clear unread flag on database
        socket.emit("mark_as_read", { sessionId: selectedSession.sessionId });
      }
    };

    socket.on("session_list_updated", handleSessionListUpdate);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("session_list_updated", handleSessionListUpdate);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [selectedSession, socket]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setHistoryLoading(true);
    setMessages([]);

    // Join the specific room for real-time alerts
    socket.emit("join_session", { sessionId: session.sessionId });

    // Mark messages as read on the backend
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
      senderName: currentUser.name,
      senderRole: "super-admin",
      message: replyText.trim(),
    };

    socket.emit("send_message", payload);
    setReplyText("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-[650px] shadow-lg flex overflow-hidden transition-all duration-300">
      {/* Sessions list (Left Column) */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Support Inbox</h3>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">
            Active help requests from campus officers
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              No active support chats found. Admins will be notified when a user opens chat.
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = selectedSession?.sessionId === sess.sessionId;
              return (
                <button
                  key={sess.sessionId}
                  onClick={() => handleSelectSession(sess)}
                  className={`w-full text-left p-4 transition-all duration-200 flex gap-3 items-start border-l-4 ${
                    isActive
                      ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-500"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 shrink-0">
                    {sess.user?.name?.charAt(0).toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {sess.user?.name}
                      </p>
                      <span className="text-[9px] text-slate-455 dark:text-slate-500 shrink-0">
                        {fmtTime(sess.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {sess.lastMessage}
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

      {/* Conversation Thread (Right Column) */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm z-10">
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {selectedSession.user?.name}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedSession.user?.email} • Position: {selectedSession.user?.position || "Staff"}
                </p>
              </div>

              {selectedSession.userPageUrl && (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 px-2.5 py-1 rounded-lg text-[9px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate shrink-0">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">On page: </span>
                  <a
                    href={selectedSession.userPageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-indigo-500 hover:text-indigo-600"
                  >
                    {selectedSession.userPageUrl.replace("http://localhost:3000", "") || "/"}
                  </a>
                </div>
              )}
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 scrollbar-thin">
              {historyLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <svg className="w-6 h-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Loading chat history...</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderRole === "super-admin";
                  return (
                    <div
                      key={msg._id || index}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-500 dark:text-slate-400">
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
                        className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-xs shadow-sm leading-relaxed ${
                          isMe
                            ? "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none"
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

            {/* Input area */}
            <form
              onSubmit={handleSendReply}
              className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center bg-white dark:bg-slate-900"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply to the user..."
                required
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition disabled:opacity-50 shrink-0"
              >
                Send Reply
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <span className="text-5xl animate-bounce">💬</span>
            <p className="font-bold text-base text-slate-700 dark:text-slate-200">Support Conversation Window</p>
            <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm leading-relaxed">
              Select an active user chat session from the list on the left to see conversation history and reply to them in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
