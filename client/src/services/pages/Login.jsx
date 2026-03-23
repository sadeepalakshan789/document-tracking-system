import React, { useState } from "react";
import { loginUser } from "../services/api";

export default function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");

  const handleLogin = async () => {
    const res = await loginUser({email,password});
    console.log(res.data);
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="p-6 bg-white shadow-md rounded">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="border p-2 mb-3 w-full"/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="border p-2 mb-3 w-full"/>
        <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
      </div>
    </div>
  );
}