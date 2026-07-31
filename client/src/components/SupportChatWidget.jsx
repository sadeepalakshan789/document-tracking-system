import React, { useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../services/socket";
import API from "../services/api";

export default function SupportChatWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadAlert, setUnreadAlert] = useState(false);

  const messagesEndRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    if (!currentUser?._id) return;

    // Join the support session room
    socket.emit("join_session", { sessionId: currentUser._id });

    // Listen to incoming messages
    const handleReceiveMessage = (msg) => {
      if (msg.sessionId === currentUser._id) {
        setMessages((prev) => {
          // Avoid duplicate appends
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        // Show alert if the widget is closed and the message is from admin
        if (!isOpen && msg.senderRole === "super-admin") {
          setUnreadAlert(true);
        }
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [currentUser?._id, isOpen, socket]);

  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      if (currentUser?._id) {
        setLoading(true);
        API.get(`/chat/history/${currentUser._id}`)
          .then((res) => setMessages(res.data || []))
          .catch((err) => console.error("Failed to load chat history:", err))
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener("openSupportChat", handleOpenEvent);
    return () => window.removeEventListener("openSupportChat", handleOpenEvent);
  }, [currentUser?._id]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadAlert(false);
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && currentUser?._id) {
      setLoading(true);
      try {
        const res = await API.get(`/chat/history/${currentUser._id}`);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser?._id) return;

    const payload = {
      sessionId: currentUser._id,
      senderId: currentUser._id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: inputText.trim(),
      userPageUrl: window.location.href,
    };

    socket.emit("send_message", payload);
    setInputText("");
  };

  if (!currentUser?._id) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Chat Button */}
      <button
        onClick={handleOpenToggle}
        className="relative w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all duration-300 group border border-indigo-400/20"
        title="Live Support Chat"
        id="support-chat-fab"
      >
        {isOpen ? (
          <svg className="w-6 h-6 transition-transform duration-300 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}

        {/* Unread Alert Indicator */}
        {unreadAlert && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full border border-white dark:border-slate-900 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
            !
          </span>
        )}
      </button>

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[380px] h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white flex items-center justify-between border-b border-indigo-700/30">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm border border-white/20">
                🎧
              </span>
              <div>
                <h4 className="font-bold text-sm leading-tight">Live System Support</h4>
                <span className="text-[10px] text-indigo-200">Super Admins are online</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-indigo-100 transition opacity-80 hover:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/40 space-y-3.5 scrollbar-thin">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs gap-2">
                <svg className="w-6 h-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Loading support chat history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <span className="text-4xl">👋</span>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">How can we help you?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Type your question below. Any online Super Admin will be able to reply to you in real-time.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderRole !== "super-admin";
                return (
                  <div
                    key={msg._id || index}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                      <span>{msg.senderName}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs shadow-sm leading-relaxed ${
                        isMe
                          ? "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-tr-none"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200 rounded-tl-none"
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

          {/* Footer Input Area */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your issue..."
              required
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
