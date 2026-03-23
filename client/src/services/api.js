import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const verifyOTP = (data) => API.post("/auth/verify-otp", data);
export const resendOTP = (data) => API.post("/auth/resend-otp", data);
export const createDocument = (data) => API.post("/documents/create", data);
export const getDocument = (id) => API.get(`/documents/${id}`);