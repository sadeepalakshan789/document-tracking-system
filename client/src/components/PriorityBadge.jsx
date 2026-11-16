import React from "react";

export function PriorityBadge({ priority = "Normal", showNormal = false, className = "" }) {
  const norm = String(priority || "Normal").trim().toLowerCase();

  if (norm === "urgent") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-sm animate-pulse ${className}`}
        title="Urgent Priority - Expedited Workflow"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        🔥 URGENT
      </span>
    );
  }

  if (norm === "confidential") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-sm ${className}`}
        title="Confidential Workflow - Restricted Access"
      >
        <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        CONFIDENTIAL
      </span>
    );
  }

  if (showNormal) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${className}`}
      >
        NORMAL
      </span>
    );
  }

  return null;
}

export function DueDateBadge({ dueDate, isOverdue = false, isCompleted = false, className = "" }) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;

  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const pastDue = !isCompleted && (isOverdue || diffMs < 0);

  if (pastDue) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-700 shadow-sm animate-pulse ${className}`}
        title={`Overdue! Scheduled deadline was ${due.toLocaleString()}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        OVERDUE
      </span>
    );
  }

  if (isCompleted) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium ${className}`}
      >
        <span>Due: {due.toLocaleDateString()}</span>
      </span>
    );
  }

  // Still within deadline
  const diffHours = Math.round(diffMs / (3600 * 1000));
  const diffDays = Math.round(diffMs / (24 * 3600 * 1000));

  let label = "";
  let badgeStyle = "";

  if (diffHours <= 1) {
    label = "Due in <1h";
    badgeStyle = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse";
  } else if (diffHours < 24) {
    label = `Due in ${diffHours}h`;
    badgeStyle = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800";
  } else if (diffDays <= 3) {
    label = `Due in ${diffDays}d`;
    badgeStyle = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300 dark:border-sky-800";
  } else {
    label = `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${badgeStyle} ${className}`}
      title={`Target SLA Deadline: ${due.toLocaleString()}`}
    >
      <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </span>
  );
}

export default PriorityBadge;
