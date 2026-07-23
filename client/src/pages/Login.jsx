import React, { useState } from "react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    // Clear any previous error before a new attempt
    setError("");

    // Basic client-side validation
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your email or username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ identifier: identifier.trim(), password });
      const userData = res.data;

      // ── Persist auth data to localStorage ──────────────────────────────
      // 1. JWT token  (read by the Axios interceptor in api.js for every request)
      localStorage.setItem("token", userData.token);

      // 2. Full user object  (read by Dashboard and other pages for role checks
      //    without an extra API round-trip)
      const userObj = {
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        position: userData.position || "",
        role: userData.role,
        status: userData.status || "active",
      };

      localStorage.setItem("user", JSON.stringify(userObj));
      localStorage.setItem("currentUser", JSON.stringify(userObj));

      // Dispatch event for instant account-specific theme sync
      window.dispatchEvent(new Event("authChange"));

      // ── Role-based redirect ─────────────────────────────────────────────
      const userRole = userData.role ? String(userData.role).toUpperCase() : "";
      if (userRole === "SUPER_ADMIN" || userRole === "SUPER-ADMIN" || userRole === "ADMIN") {
        navigate("/super-admin-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to server. Please ensure the backend is running on port 5000.");
        return;
      }

      const errorData = err.response?.data;

      // OTP verification required – redirect to the verify page
      if (errorData?.needsOTP) {
        navigate("/verify-otp", { state: { email: errorData?.email || identifier.trim() } });
        return;
      }

      setError(errorData?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Allow submitting with the Enter key from either input field
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-slate-950 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      {/* Smooth Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-900/60 to-slate-950/80 backdrop-blur-[2px]" />

      {/* Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/75 border border-slate-700/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a3 3 0 003 3h15a3 3 0 003-3v-6a1 1 0 00-1-1h-2.14a2 2 0 00-1.637.863L16 18.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to Document Tracking System</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 mb-6 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email or Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                id="login-email"
                type="text"
                placeholder="Enter your email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out disabled:opacity-60"
              />
            </div>
          </div>

          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
