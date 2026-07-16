import React, { useState } from "react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await loginUser({ email, password });

 
      console.log("API Response Data:", res.data);

      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

  
      const userData = res.data.user || res.data;

      if (userData && userData.role) {
        const userRole = userData.role;
        localStorage.setItem("role", userRole);

        console.log("Logged in User Role:", userRole); 

        const normRole = userRole.toUpperCase();
        if (normRole === "SUPER_ADMIN" || normRole === "SUPER-ADMIN") {
          navigate("/super-admin-dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-slate-900">
      <div className="p-6 bg-white shadow-md rounded w-96">
        <h2 className="text-xl font-bold mb-4 text-center text-slate-800">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border border-slate-300 p-2 mb-3 w-full rounded text-slate-800 focus:outline-none focus:border-purple-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border border-slate-300 p-2 mb-3 w-full rounded text-slate-800 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleLogin}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded w-full font-semibold transition"
        >
          Login
        </button>
      </div>
    </div>
  );
}