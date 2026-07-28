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
      className="relative flex justify-center items-center min-h-screen bg-gradient-to-b from-[#0b1329] to-[#030712] overflow-hidden"
    >
      {/* Top-left Minimalist Designer Signature */}
      <div className="absolute top-6 left-6 text-[10px] tracking-widest font-sans font-medium text-slate-500/60 uppercase select-none pointer-events-none">
        Arshia • UI/UX Designer
      </div>

      {/* Soft blue/purple neon halo background glow behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Premium Matte-Charcoal Frosted Glass Card (Compact max-w-sm & rounded-2xl / border-radius 16px) */}
      <div
        className="relative z-10 w-full max-w-sm p-6 mx-4 bg-[#14161a]/90 border border-white/[0.12] rounded-2xl text-white shadow-[0_0_50px_rgba(59,130,246,0.15),_0_0_30px_rgba(168,85,247,0.1),_0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300"
        style={{ backdropFilter: "blur(16px)" }}
      >
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-5">
          {/* Circular Metallic Badge with Glowing Document Icon */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#4b5263] via-[#20232b] to-[#0c0d0f] p-[2px] shadow-xl shadow-black/50 flex items-center justify-center mb-2.5 relative before:absolute before:inset-0 before:rounded-full before:bg-white/5 before:blur-[1px]">
            <div className="w-full h-full rounded-full bg-[#16171b] flex items-center justify-center shadow-inner relative overflow-hidden group">
              {/* Soft blue neon glow background inside the ring */}
              <div className="absolute inset-0 bg-blue-500/10 blur-[6px] animate-pulse" />
              {/* Custom Elegant Document/File icon */}
              <svg className="w-5 h-5 text-blue-400 relative z-10 drop-shadow-[0_0_6px_rgba(59,130,246,0.7)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          {/* Bold White Title */}
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Welcome</h2>
          {/* Small Uppercase Subtitle */}
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-80">SIGN IN TO DOCUMENT TRACKING SYSTEM</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-2.5 mb-4 text-sm flex items-start gap-2.5 shadow-sm">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="space-y-4">
          {/* Email / Username Field */}
          <div>
            <label htmlFor="login-email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none opacity-80">
              EMAIL OR USERNAME
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                className="w-full bg-[#121316]/90 border border-[#2d3139]/80 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#4b5263] focus:ring-1 focus:ring-[#4b5263]/30 transition-all duration-200 shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none opacity-80">
              PASSWORD
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                className="w-full bg-[#121316]/90 border border-[#2d3139]/80 rounded-xl py-2.5 pl-12 pr-12 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#4b5263] focus:ring-1 focus:ring-[#4b5263]/30 transition-all duration-200 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.9 4.24a9.124 9.124 0 011.8-.18c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.4M9.9 9.9L14 14M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Options Row */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2d3139] bg-[#121316] text-blue-600 focus:ring-blue-500/20 focus:outline-none accent-blue-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Forgot password function is currently under development.");
                }}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
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
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-xl font-bold transition shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 border border-t-white/10 border-b-black/20"
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
