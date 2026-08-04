import React from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { currentTheme, toggleTheme } = useTheme();
  const location = useLocation();

  // Hide floating theme toggle button on Login & Auth routes
  if (["/login", "/register", "/verify-otp", "/"].includes(location.pathname)) {
    return null;
  }

  const isDark = currentTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`fixed bottom-[86px] right-6 z-50 w-[50px] h-[50px] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border border-t-[#6b7280]/60 border-r-[#4b5563]/40 border-b-[#1f2937]/80 border-l-[#4b5563]/40 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),_inset_0_1.5px_1px_rgba(255,255,255,0.15)] bg-gradient-to-b from-[#374151] to-[#111827] text-amber-400 hover:text-amber-300 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),_0_0_15px_rgba(245,158,11,0.25)] ${className}`}
    >
      {isDark ? (
        /* Sun Icon */
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"
          />
        </svg>
      ) : (
        /* Moon Icon */
        <svg className="w-5 h-5 shrink-0 text-slate-300 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
