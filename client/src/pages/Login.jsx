import React, { useState } from "react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    // Clear any previous error before a new attempt
    setError("");

    // Basic client-side validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email: email.trim(), password });
      const userData = res.data;

      // ── Persist auth data to localStorage ──────────────────────────────
      // 1. JWT token  (read by the Axios interceptor in api.js for every request)
      localStorage.setItem("token", userData.token);

      // 2. Full user object  (read by Dashboard and other pages for role checks
      //    without an extra API round-trip)
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: userData._id,
          name: userData.name,
          email: userData.email,
          position: userData.position || "",
          role: userData.role,
          status: userData.status || "active",
        })
      );

      // ── Role-based redirect ─────────────────────────────────────────────
      const userRole = userData.role ? userData.role.toUpperCase() : "";
      if (userRole === "SUPER_ADMIN" || userRole === "SUPER-ADMIN") {
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
        navigate("/verify-otp", { state: { email: email.trim() } });
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
      className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-900/45" />

      {/* Login card */}
      <div className="relative z-10 p-8 bg-white shadow-lg rounded-lg w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          id="login-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500 disabled:opacity-60"
        />

        <input
          id="login-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="border border-gray-300 p-3 mb-4 w-full rounded focus:outline-none focus:border-blue-500 disabled:opacity-60"
        />

        <button
          id="login-submit"
          onClick={handleLogin}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
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
              Signing in…
            </>
          ) : (
            "Login"
          )}
        </button>


      </div>
    </div>
  );
}
