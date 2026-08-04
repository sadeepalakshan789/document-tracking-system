import React from "react";

export default function UserGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Help &amp; User Guide</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Document Tracking System usage guidelines &amp; FAQs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          
          {/* Section 1: Creating Documents */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">1</span>
              Creating Documents &amp; Starting Workflows
            </h3>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed pl-1">
              <li>Click the <strong className="text-slate-900 dark:text-white">+ Create Document</strong> button on your dashboard header or control panel.</li>
              <li>Fill in document details including Title, Tracking ID, Category, and optional File Attachments.</li>
              <li>Define the sequential routing order by selecting recipient team members in sequence.</li>
              <li>Submit to dispatch the document along its custom approval path.</li>
            </ol>
          </div>

          {/* Section 2: Tracking Documents & Status Indicators */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">2</span>
              Tracking Documents &amp; Status Indicators
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Click the <strong className="text-indigo-600 dark:text-indigo-400">View Timeline</strong> button on any document card to view its real-time step-by-step progress history.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">⏳ Pending</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">Document created; awaiting initial recipient acceptance.</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">🚀 In Transit</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">Actively moving through assigned approval steps.</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">✅ Completed</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">Successfully reviewed &amp; signed off by all recipients.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Live Assistance Note */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              💬
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Need Direct Super Admin Support?</h4>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                If you encounter system issues or need immediate help, click the <strong className="text-indigo-900 dark:text-white font-bold">floating chat icon</strong> located on the bottom-right corner of your screen to open a direct live messaging session with a Super Admin.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Close */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/20 active:scale-95"
          >
            Got It, Close
          </button>
        </div>

      </div>
    </div>
  );
}
