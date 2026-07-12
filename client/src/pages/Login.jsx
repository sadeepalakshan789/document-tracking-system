import React, { useState } from "react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to server. Please start the backend on port 5000.");
        return;
      }

      const errorData = err.response?.data;
      if (errorData?.needsOTP) {
        navigate("/verify-otp", { state: { email } });
      } else {
        setError(errorData?.message || "Login failed");
      }
    }
  };

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45"></div>
      <div className="relative z-10 p-8 bg-white shadow-lg rounded-lg w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-3 mb-4 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-blue-600 transition"
        >
          Login
        </button>
        <p className="mt-4 text-center text-gray-600 text-sm">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-500 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
