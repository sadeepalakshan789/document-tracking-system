import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userDocuments] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    // TODO: Fetch user documents from API
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Document Tracking System</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Quick Actions */}
          <div
            onClick={() => navigate("/create-document")}
            className="bg-white p-6 rounded shadow-md cursor-pointer hover:shadow-lg transition transform hover:scale-105"
          >
            <h3 className="text-xl font-bold text-blue-600 mb-2">Create Document</h3>
            <p className="text-gray-600">Upload and create a new document</p>
          </div>

          <div
            onClick={() => navigate("/track-document")}
            className="bg-white p-6 rounded shadow-md cursor-pointer hover:shadow-lg transition transform hover:scale-105"
          >
            <h3 className="text-xl font-bold text-green-600 mb-2">Track Document</h3>
            <p className="text-gray-600">Track the status of your documents</p>
          </div>

          <div className="bg-white p-6 rounded shadow-md">
            <h3 className="text-xl font-bold text-purple-600 mb-2">My Documents</h3>
            <p className="text-gray-600">{userDocuments.length} documents</p>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Documents</h2>
          {userDocuments.length === 0 ? (
            <p className="text-gray-500">No documents yet. Create one to get started!</p>
          ) : (
            <ul>
              {userDocuments.map((doc, index) => (
                <li key={index} className="py-2 border-b">
                  {doc.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
