import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "", compact = false }) {
  const { currentTheme, toggleTheme } = useTheme();
  const isDark = currentTheme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
          isDark
            ? "bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700/80 hover:border-slate-600 shadow-sm"
            : "bg-white/80 border-slate-200 text-indigo-600 hover:bg-slate-100 hover:border-slate-300 shadow-sm"
        } ${className}`}
      >
        {isDark ? (
          /* Sun Icon */
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"
            />
          </svg>
        ) : (
          /* Moon Icon */
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm ${
        isDark
          ? "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          : "bg-white/20 border-white/30 text-white hover:bg-white/30"
      } ${className}`}
    >
      {isDark ? (
        <>
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"
            />
          </svg>
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
