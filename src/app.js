import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateDocument from './pages/CreateDocument';
import TrackDocument from './pages/TrackDocument';

// Optional: simple auth simulation using localStorage token
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <CreateDocument />
            </PrivateRoute>
          }
        />
        <Route
          path="/track"
          element={
            <PrivateRoute>
              <TrackDocument />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;