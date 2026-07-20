import React, { useEffect, useState } from "react";
import { getCampusPositions, registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import authWallpaper from "../assets/login-register-wallpaper-4k.jpg";

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
        className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
        style={{ backgroundImage: `url(${authWallpaper})` }}
      >
        <div className="absolute inset-0 bg-slate-900/45"></div>
        <div className="relative z-10 p-8 bg-white shadow-lg rounded-lg w-80">
          <h2 className="text-2xl font-bold mb-6 text-center text-green-600">Registration Successful</h2>
          <p className="text-gray-700 mb-4 text-sm">
            {successMessage || "Your account has been created. Check your inbox for the OTP."}
          </p>

          <p className="text-gray-600 text-xs mb-5">
            <strong>Email:</strong> {registeredEmail}
          </p>

          <form onSubmit={handleRegistrationSuccessSubmit}>
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-green-600 transition mb-3"
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
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded w-full font-semibold hover:bg-gray-400 transition"
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
      className="relative flex justify-center items-center min-h-screen bg-gray-900 bg-cover bg-center bg-no-repeat auth-wallpaper-animate"
      style={{ backgroundImage: `url(${authWallpaper})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45"></div>
      <div className="relative z-10 p-8 bg-white/20 backdrop-blur-sm border border-white/40 shadow-lg rounded-lg w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Register</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleRegister}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
          />
          
          <select
            name="position"
            value={formData.position}
            onChange={handleChange}
            disabled={loadingPositions}
            required
            className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-100 text-gray-800"
          >
            <option value="" className="text-gray-500">
              {loadingPositions ? "Loading positions..." : "Select Position"}
            </option>
            {/* 💡 Dynamically loop through positions retrieved from the database */}
            {positions && positions.length > 0 && positions.map((position) => (
              <option key={position} value={position} className="text-gray-800">
                {position}
              </option>
            ))}
          </select>

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="border border-gray-300 p-3 mb-4 w-full rounded focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loadingPositions || positions.length === 0}
            className="bg-blue-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-blue-600 transition disabled:bg-gray-400"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}