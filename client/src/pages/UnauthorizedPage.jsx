import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * UnauthorizedPage
 * Shown when a logged-in user tries to access a route their role
 * does not permit.  Provides a clear message in both Sinhala and English
 * and a button to go back to the dashboard.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4">
      {/* Icon */}
      <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/40">
        <svg
          className="w-12 h-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* HTTP status */}
      <p className="text-red-400 font-mono text-sm tracking-widest mb-2 uppercase">
        403 Forbidden
      </p>

      {/* Access Denied message */}
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
        Access Denied
      </h1>

      {/* English sub-message */}
      <p className="text-slate-400 text-center max-w-md mb-8">
        You do not have permission to access this page. Please contact your
        system administrator if you believe this is a mistake.
      </p>

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-medium"
        >
          ← Go Back
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-medium"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
