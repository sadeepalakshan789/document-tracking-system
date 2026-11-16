import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Helper to convert any valid date representation into a local "YYYY-MM-DD" key
export const toDateKey = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateHeader = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getNormalizedStatus = (doc) => {
  const s = String(doc?.status || "").trim();
  const lower = s.toLowerCase();
  if (
    lower === "completed" ||
    (Array.isArray(doc?.route) && doc.route.length > 0 && doc.route.every((r) => r.status === "completed"))
  ) {
    return "Completed";
  }
  if (lower === "pending" || lower === "submitted" || doc?.workflow?.canAccept) {
    return "Pending";
  }
  return "In Transit";
};

const getHolderDisplay = (currentHolder) => {
  if (!currentHolder) return "Workflow Completed";
  if (typeof currentHolder === "object") {
    return currentHolder.name || currentHolder.position || currentHolder.email || "Workflow Completed";
  }
  return String(currentHolder);
};

const StatusBadge = ({ status }) => {
  const map = {
    Completed: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    "In Transit": "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    Pending: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        map[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700"
      }`}
    >
      {status === "Completed" && "✓ "}
      {status === "In Transit" && "🚀 "}
      {status === "Pending" && "⏳ "}
      {status}
    </span>
  );
};

const RouteBar = ({ current, total }) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
        {current}/{total}
      </span>
    </div>
  );
};

// Date Details Modal Component
export function CalendarDateDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  documents = [],
  onSelectDocument,
}) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (id, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDocumentClick = (trackingId) => {
    if (!trackingId) return;
    if (onSelectDocument) {
      onSelectDocument(trackingId);
    } else {
      navigate(`/track-document/${trackingId}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  const dateHeading = formatDateHeader(selectedDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl shrink-0">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {dateHeading}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {documents.length} workflow document{documents.length !== 1 ? "s" : ""} on this date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents on this date</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  There are no workflow documents created, updated, or in transit on this day.
                </p>
              </div>
            </div>
          ) : (
            documents.map((doc) => {
              const normStatus = getNormalizedStatus(doc);
              const routeTotal =
                Array.isArray(doc.route) && doc.route.length > 0
                  ? doc.route.length
                  : doc.workflow?.totalSteps || 0;
              const routeCurrent =
                Array.isArray(doc.route) && doc.route.length > 0
                  ? doc.route.filter((r) => r.status === "completed" || r.acceptedAt || r.receivedAt).length
                  : doc.workflow?.completedSteps || 0;

              return (
                <div
                  key={doc._id || doc.trackingId}
                  onClick={() => handleDocumentClick(doc.trackingId || doc._id)}
                  className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 rounded-2xl p-4 space-y-3 cursor-pointer group"
                  title="Click to view full workflow timeline & details"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title || "Untitled Document"}
                    </h3>
                    <StatusBadge status={normStatus} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Tracking ID:</span>
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                        {doc.trackingId}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(doc.trackingId, e)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Copy tracking ID"
                      >
                        {copiedId === doc.trackingId ? (
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      View Workflow History →
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                        Sender / Created By
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {doc.sender?.name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                        Current Holder
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {getHolderDisplay(doc.currentHolder)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                        Route Progress
                      </span>
                      <div className="mt-1">
                        <RouteBar current={routeCurrent} total={routeTotal} />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                        Created Date
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 block">
                        {formatDateTime(doc.createdAt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                        Last Updated
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 block">
                        {formatDateTime(doc.updatedAt)}
                      </span>
                    </div>

                    {doc.file && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px] uppercase">
                          Attachment
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block" title={doc.file.originalFileName}>
                          📎 {doc.file.originalFileName}
                        </span>
                      </div>
                    )}
                  </div>

                  {Boolean(doc.content || doc.remarks) && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Notes / Remarks: </span>
                      <span>{doc.content || doc.remarks}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {documents.length} document{documents.length !== 1 ? "s" : ""} on {selectedDate}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Workflow Calendar Section Component
export default function WorkflowCalendar({
  documents = [],
  onSelectDocument,
  onModalStateChange,
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // Notify parent of modal open/close state so background polling can be paused
  useEffect(() => {
    onModalStateChange?.(isDateModalOpen);
  }, [isDateModalOpen, onModalStateChange]);

  // Index documents by date for O(1) cell lookup
  const docsByDateMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(documents)) return map;

    documents.forEach((doc) => {
      if (!doc) return;
      const dateKeys = new Set();
      if (doc.createdAt) dateKeys.add(toDateKey(doc.createdAt));
      if (doc.updatedAt) dateKeys.add(toDateKey(doc.updatedAt));

      if (Array.isArray(doc.route)) {
        doc.route.forEach((step) => {
          if (step.notifiedAt) dateKeys.add(toDateKey(step.notifiedAt));
          if (step.acceptedAt) dateKeys.add(toDateKey(step.acceptedAt));
          if (step.completedAt) dateKeys.add(toDateKey(step.completedAt));
        });
      }

      dateKeys.forEach((key) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        // Avoid duplicate doc references for the same date
        const existing = map.get(key);
        if (!existing.some((d) => (d._id && d._id === doc._id) || (d.trackingId && d.trackingId === doc.trackingId))) {
          existing.push(doc);
        }
      });
    });

    return map;
  }, [documents]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const monthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  // Build grid of days (including padding days from previous and next months)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateKey = toDateKey(prevDate);
      days.push({
        date: prevDate,
        dateKey,
        dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        documents: docsByDateMap.get(dateKey) || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const date = new Date(currentYear, currentMonth, dayNum);
      const dateKey = toDateKey(date);
      days.push({
        date,
        dateKey,
        dayNum,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        documents: docsByDateMap.get(dateKey) || [],
      });
    }

    // Next month padding days to complete 35 or 42 cells matrix (5 or 6 rows)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNum);
      const dateKey = toDateKey(nextDate);
      days.push({
        date: nextDate,
        dateKey,
        dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        documents: docsByDateMap.get(dateKey) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, todayKey, docsByDateMap]);

  const handleDayClick = (day) => {
    setSelectedDateKey(day.dateKey);
    setIsDateModalOpen(true);
  };

  const selectedDateDocs = useMemo(() => {
    if (!selectedDateKey) return [];
    return docsByDateMap.get(selectedDateKey) || [];
  }, [selectedDateKey, docsByDateMap]);

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <>
      <section className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:shadow-none transition-all duration-300 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Calendar Header with Navigation Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 shrink-0">
                📅
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Workflow Calendar
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Monthly document activity
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
              title="Jump to current month & today"
            >
              Today
            </button>
          </div>

          {/* Month Navigator Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Previous Month"
              title="Previous Month"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Next Month"
              title="Next Month"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((day) => (
            <div
              key={day}
              className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 py-0.5 tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const docCount = day.documents.length;
            const hasCompleted = day.documents.some((d) => getNormalizedStatus(d) === "Completed");
            const hasInTransit = day.documents.some((d) => getNormalizedStatus(d) === "In Transit");
            const hasPending = day.documents.some((d) => getNormalizedStatus(d) === "Pending");

            let cellBg = "bg-transparent";
            let textColor = day.isCurrentMonth
              ? "text-slate-800 dark:text-slate-200"
              : "text-slate-400/50 dark:text-slate-600";

            if (day.isToday) {
              cellBg = "bg-indigo-50/90 dark:bg-indigo-950/40 ring-1.5 ring-indigo-500 dark:ring-indigo-400 font-extrabold";
              textColor = "text-indigo-600 dark:text-indigo-400";
            }

            return (
              <button
                key={`${day.dateKey}-${idx}`}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`group relative min-h-[46px] p-1 rounded-xl flex flex-col items-center justify-between transition-all duration-150 cursor-pointer border border-transparent hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:shadow-sm ${cellBg}`}
                title={`${day.dateKey}${docCount > 0 ? ` • ${docCount} document(s)` : ""}`}
              >
                {/* Day number */}
                <span className={`text-[11px] leading-none ${textColor} ${day.isToday ? "font-black" : "font-semibold"}`}>
                  {day.dayNum}
                </span>

                {/* Document indicators or count badge */}
                <div className="min-h-[14px] flex items-center justify-center">
                  {docCount > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-0.5">
                        {hasCompleted && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                            title="Completed documents"
                          />
                        )}
                        {hasInTransit && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-sky-500"
                            title="In transit documents"
                          />
                        )}
                        {hasPending && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500"
                            title="Pending documents"
                          />
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-none">
                        {docCount}
                      </span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* HCI Legend & Quick Help */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Completed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
              <span>In Transit</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Pending</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
            Click any date to view related documents
          </p>
        </div>
      </section>

      {/* Date Details Modal */}
      <CalendarDateDetailsModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        selectedDate={selectedDateKey}
        documents={selectedDateDocs}
        onSelectDocument={onSelectDocument}
      />
    </>
  );
}
