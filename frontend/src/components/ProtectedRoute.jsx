import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Verifying authentication status...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized role dashboard
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      case 'ALUMNI':
        return <Navigate to="/alumni/dashboard" replace />;
      case 'STUDENT':
      default:
        return <Navigate to="/student/dashboard" replace />;
    }
  }

  // Redirect alumni to onboarding if profile is incomplete
  if (user.role === 'ALUMNI' && user.needsOnboarding && location.pathname !== '/alumni/onboarding') {
    return <Navigate to="/alumni/onboarding" replace />;
  }

  return <Outlet />;
}
