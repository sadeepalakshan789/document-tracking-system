import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

// Pages
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
    <ThemeProvider>
      <Router>
        <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />

        {/* Shown when a logged-in user tries a forbidden route */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ── Protected routes (any authenticated user) ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-document"
          element={
            <ProtectedRoute>
              <CreateDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-document"
          element={
            <ProtectedRoute>
              <TrackDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-document/:trackingId"
          element={
            <ProtectedRoute>
              <TrackDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflow-documents"
          element={
            <ProtectedRoute>
              <WorkflowDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* ── Super Admin and Admin Dashboard Route ── */}
        <Route
          path="/super-admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super-admin', 'SUPER_ADMIN']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
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
    </ThemeProvider>
  );
}

export default App;