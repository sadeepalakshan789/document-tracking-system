import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOTP, resendOTP } from "../services/api";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp) {
      setError("Please enter OTP");
      return;
    }

    setLoading(true);
    setError("");
    setResendSuccess("");

    try {
      const res = await verifyOTP({ email, otp });
      localStorage.setItem("token", res.data.token);
      const userObj = {
        _id: res.data._id,
        name: res.data.name,
        email: res.data.email,
        position: res.data.position,
        role: res.data.role,
      };
      localStorage.setItem("currentUser", JSON.stringify(userObj));
      localStorage.setItem("user", JSON.stringify(userObj));

      const userRole = res.data.role ? String(res.data.role).toUpperCase() : "";
      if (userRole === "SUPER_ADMIN" || userRole === "SUPER-ADMIN" || userRole === "ADMIN") {
        navigate("/super-admin-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError("");
    setResendSuccess("");

    try {
      const res = await resendOTP({ email });
      setResendSuccess(res.data.message || "OTP resent successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div
        className="relative flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950"
      >
        <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/75 border border-slate-700/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white text-center">
          <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Missing Session</h2>
          <p className="text-slate-400 mb-6 text-sm">No email verification context was found. Please return to login.</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Glassmorphic Verify Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/75 border border-slate-700/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Verify Account</h2>
          <p className="text-xs text-slate-400 mt-1">Enter code to complete email verification</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {resendSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{resendSuccess}</span>
          </div>
        )}

        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 mb-6">
          <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">Verification Email</span>
          <span className="text-sm font-mono text-slate-200">{email}</span>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">Enter 6-digit OTP code</label>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
              required
              className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-3 text-center text-3xl tracking-[0.4em] font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out"
            />
          </div>

          <button
            type="submit"
            disabled={loading || resending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleResendOTP}
            disabled={resending || loading}
            className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </div>

        <p className="mt-6 text-center text-slate-400 text-sm">
          <button onClick={() => navigate("/login")} className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition">
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}
