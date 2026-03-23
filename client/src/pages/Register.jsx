import React, { useState } from "react";
import { registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await registerUser({
        name: formData.name,
        email: formData.email,
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

  if (registrationSuccess) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="p-8 bg-white shadow-lg rounded-lg w-80">
          <h2 className="text-2xl font-bold mb-6 text-center text-green-600">Registration Successful</h2>
          <p className="text-gray-700 mb-4 text-sm">
            {successMessage || "Your account has been created. Check your inbox for the OTP."}
          </p>

          <p className="text-gray-600 text-xs mb-5">
            <strong>Email:</strong> {registeredEmail}
          </p>

          <button
            onClick={handleProceedToOTP}
            className="bg-green-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-green-600 transition mb-3"
          >
            Verify OTP and Login
          </button>

          <button
            onClick={() => {
              setRegistrationSuccess(false);
              setSuccessMessage("");
              setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            }}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded w-full font-semibold hover:bg-gray-400 transition"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-500 to-blue-600">
      <div className="p-8 bg-white shadow-lg rounded-lg w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Register</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="border border-gray-300 p-3 mb-3 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="border border-gray-300 p-3 mb-4 w-full rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleRegister}
          className="bg-blue-500 text-white px-4 py-3 rounded w-full font-semibold hover:bg-blue-600 transition"
        >
          Register
        </button>
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
