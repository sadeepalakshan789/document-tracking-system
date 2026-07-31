import React, { useState } from "react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [identifier, setIdentifier] = useState("sadeepala099@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      className="relative flex justify-center items-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: "url('/geometric_nodes_highres_v2.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Soft white backdrop blur overlay to soften background lines */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm pointer-events-none" />

      {/* Crisp White Card with high contrast shadow & border */}
      <div
        className="relative z-10 w-full max-w-sm p-6 mx-4 bg-[#FFFFFF]/90 border border-slate-200 rounded-2xl text-slate-800 shadow-2xl shadow-slate-300/50 transition-all duration-300"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-5">
          {/* Circular soft blue/indigo icon container */}
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100/80 flex items-center justify-center mb-2.5 shadow-sm">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          {/* Bold Slate Title */}
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] font-sans">Welcome</h2>
          {/* Small Uppercase Subtitle */}
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">SIGN IN TO DOCUMENT TRACKING SYSTEM</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 mb-4 text-sm flex items-start gap-2.5 shadow-sm">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="space-y-4">
          {/* Email / Username Field */}
          <div>
            <label htmlFor="login-email" className="block text-[10px] font-bold text-[#334155] uppercase tracking-widest mb-1.5 select-none">
              EMAIL OR USERNAME
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="login-password" className="block text-[10px] font-bold text-[#334155] uppercase tracking-widest mb-1.5 select-none">
              PASSWORD
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl py-2.5 pl-12 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 z-10 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none transition-colors pointer-events-auto"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.9 4.24a9.124 9.124 0 011.8-.18c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.4M9.9 9.9L14 14M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Options Row */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#334155] hover:text-[#0F172A] select-none transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] bg-[#F1F5F9] text-indigo-600 focus:ring-indigo-500/20 focus:outline-none accent-indigo-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Forgot password function is currently under development.");
                }}
                className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
              >
                Forgot Password?
              </a>
            </div>
          </div>

          {/* Full-width Sign In Action Button */}
          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 border border-t-white/15 border-b-black/10"
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
