import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import Dashboard from './pages/Dashboard';
import CreateDocument from './pages/CreateDocument';
import TrackDocument from './pages/TrackDocument';
import WorkflowDocuments from './pages/WorkflowDocuments';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import UserControl from './pages/UserControl';
import UserProfile from './pages/UserProfile';

// Optional: simple auth simulation using localStorage token
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const normalizedRole = String(currentUser?.role || '').trim().toLowerCase();
    return normalizedRole === 'admin' ? children : <Navigate to="/dashboard" />;
  } catch {
    return <Navigate to="/dashboard" />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-document"
          element={
            <PrivateRoute>
              <CreateDocument />
            </PrivateRoute>
          }
        />
        <Route
          path="/track-document"
          element={
            <PrivateRoute>
              <TrackDocument />
            </PrivateRoute>
          }
        />
        <Route
          path="/track-document/:trackingId"
          element={
            <PrivateRoute>
              <TrackDocument />
            </PrivateRoute>
          }
        />
        <Route
          path="/workflow-documents"
          element={
            <PrivateRoute>
              <WorkflowDocuments />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/user-control"
          element={
            <AdminRoute>
              <UserControl />
            </AdminRoute>
          }
        />
        <Route
          path="/user-control/:userId"
          element={
            <AdminRoute>
              <UserProfile />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
