import React, { useState } from "react";
import { createDocument } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function CreateDocument() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("category", formData.category);
      if (file) {
        data.append("file", file);
      }

      await createDocument(data);
      setMessage("Document created successfully!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create document");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6">Create New Document</h2>

        {message && (
          <p className={`mb-4 p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Category</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Upload File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full border border-gray-300 p-3 rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded font-bold hover:bg-blue-600 transition"
          >
            Create Document
          </button>
        </form>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 w-full bg-gray-300 text-gray-700 py-3 rounded font-bold hover:bg-gray-400 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
