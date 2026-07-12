import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOTP, resendOTP } from "../services/api";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

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
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          position: res.data.position,
          role: res.data.role,
        })
      );
      navigate("/dashboard");
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
        className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
        style={{ backgroundImage: `url(${authWallpaper})` }}
      >
        <div className="absolute inset-0 bg-slate-900/45"></div>
        <div className="relative z-10 p-8 bg-white shadow-lg rounded-lg w-80 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Error</h2>
          <p className="text-red-500 mb-4">No email found. Please register again.</p>
          <button
            onClick={() => navigate("/register")}
            className="bg-blue-500 text-white px-4 py-2 rounded font-semibold hover:bg-blue-600"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45"></div>
      <div className="relative z-10 p-8 bg-white shadow-lg rounded-lg w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Verify OTP</h2>
        <p className="text-gray-600 text-sm mb-4 text-center">
          Enter your OTP code to verify your email and complete registration.
        </p>
        {error && <p className="text-red-500 mb-4 text-sm font-medium">{error}</p>}
        {resendSuccess && <p className="text-green-600 mb-4 text-sm font-medium">{resendSuccess}</p>}

        <p className="text-gray-700 text-sm mb-4 font-semibold">Email: {email}</p>

        <form onSubmit={handleVerifyOTP}>
          <input
            type="text"
            placeholder="Enter OTP (6 digits)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength="6"
            required
            className="border border-gray-300 p-3 mb-4 w-full rounded focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
          />

          <button
            type="submit"
            disabled={loading || resending}
            className="bg-blue-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-blue-600 transition disabled:opacity-50 mb-3"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          disabled={resending || loading}
          className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded w-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
        >
          {resending ? "Resending..." : "Resend OTP"}
        </button>

        <p className="mt-4 text-center text-gray-600 text-sm">
          <button onClick={() => navigate("/register")} className="text-blue-500 hover:underline">
            Back to Registration
          </button>
        </p>
      </div>
    </div>
  );
}
