import React, { useEffect, useState } from "react";
import { getCampusPositions, registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    password: "",
    confirmPassword: "",
  });
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoadingPositions(true);
        const res = await getCampusPositions();
        setPositions(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load campus positions");
      } finally {
        setLoadingPositions(false);
      }
    };

    loadPositions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.position) {
      setError("Please select your position");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await registerUser({
        name: formData.name,
        email: formData.email,
        position: formData.position,
        password: formData.password,
      });

      setRegisteredEmail(res.data.email || formData.email);
      setSuccessMessage(res.data.message || "User registered. OTP sent to your email.");
      setRegistrationSuccess(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setRegistrationSuccess(false);
    }
  };

  const handleProceedToOTP = () => {
    navigate("/verify-otp", { state: { email: registeredEmail } });
  };

  const handleRegistrationSuccessSubmit = (e) => {
    e.preventDefault();
    handleProceedToOTP();
  };

  if (registrationSuccess) {
    return (
      <div
        className="relative flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950"
      >
        {/* Glassmorphic Success Card */}
        <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/75 border border-slate-700/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white text-center">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent mb-4">Registration Successful</h2>
          
          <p className="text-slate-300 mb-6 text-sm leading-relaxed">
            {successMessage || "Your account has been created. Check your inbox for the OTP."}
          </p>

          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 mb-6 text-left">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">Registered Email</span>
            <span className="text-sm font-mono text-slate-200">{registeredEmail}</span>
          </div>

          <form onSubmit={handleRegistrationSuccessSubmit} className="space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-500/15"
            >
              Verify OTP and Login
            </button>

            <button
              type="button"
              onClick={() => {
                setRegistrationSuccess(false);
                setSuccessMessage("");
                setFormData({ name: "", email: "", position: "", password: "", confirmPassword: "" });
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl font-semibold transition"
            >
              Back to Registration
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Glassmorphic Register Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/75 border border-slate-700/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Create Account</h2>
          <p className="text-xs text-slate-400 mt-1">Get started with Document Tracking System</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Campus Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              disabled={loadingPositions}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out disabled:opacity-50"
            >
              <option value="" className="text-slate-500 bg-slate-950">
                {loadingPositions ? "Loading positions..." : "Select Position"}
              </option>
              {positions && positions.length > 0 && positions.map((position) => (
                <option key={position} value={position} className="text-white bg-slate-950">
                  {position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full bg-slate-950/65 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 ease-in-out"
            />
          </div>

          <button
            type="submit"
            disabled={loadingPositions || positions.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}