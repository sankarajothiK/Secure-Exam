import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    if (allowedRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    // If logged in as employee but trying to access admin
    if (user?.role === 'employee' && allowedRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // If logged in as admin but trying to access employee dashboard
    if (user?.role === 'admin' && allowedRole === 'employee') {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
