import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import MainLayout from '../layouts/MainLayout';
import AlumniRouteLayout from '../layouts/AlumniRouteLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import StudentRegisterPage from '../pages/auth/StudentRegisterPage';
import AlumniRegisterPage from '../pages/auth/AlumniRegisterPage';
import AlumniOnboardingPage from '../pages/auth/AlumniOnboardingPage';

import ProtectedRoute from '../components/ProtectedRoute';
import StudentDashboard from '../pages/dashboards/StudentDashboard';
import StudentProfilePage from '../pages/dashboards/StudentProfilePage';
import MentorshipHubPage from '../pages/dashboards/MentorshipHubPage';
import AlumniDashboard from '../pages/dashboards/AlumniDashboard';
import AlumniDirectoryPage from '../pages/dashboards/AlumniDirectoryPage';
import AdminDashboard from '../pages/dashboards/AdminDashboard';
import JobsPortalPage from '../pages/dashboards/JobsPortalPage';
import EventsHubPage from '../pages/dashboards/EventsHubPage';
import EventCommunityPage from '../pages/dashboards/EventCommunityPage';
import ChatPage from '../pages/dashboards/ChatPage';
import CommunitiesHubPage from '../pages/dashboards/CommunitiesHubPage';
import LeaderboardPage from '../pages/dashboards/LeaderboardPage';
import CompanyConnectAdmin from '../pages/CompanyConnect/CompanyConnectAdmin';
import CompanyConnectStudent from '../pages/CompanyConnect/CompanyConnectStudent';

export default function AppRoutes() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Main Public Routes with Header/Footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student/register" element={<StudentRegisterPage />} />
          <Route path="/alumni/register" element={<AlumniRegisterPage />} />

          {/* Shared Authenticated Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ALUMNI', 'ADMIN']} />}>
            <Route element={<AlumniRouteLayout />}>
            <Route path="/alumni/directory" element={<AlumniDirectoryPage />} />
            <Route path="/jobs" element={<JobsPortalPage />} />
            <Route path="/events" element={<EventsHubPage />} />
            <Route path="/events/:id/community" element={<EventCommunityPage />} />
            <Route path="/messages" element={<ChatPage />} />
            <Route path="/communities" element={<CommunitiesHubPage />} />
            <Route path="/communities/:slug" element={<CommunitiesHubPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            </Route>
          </Route>

          {/* Protected Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfilePage />} />
            <Route path="/student/mentorship" element={<MentorshipHubPage />} />
            <Route path="/student/placement" element={<CompanyConnectStudent />} />
          </Route>

          {/* Protected Alumni Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ALUMNI']} />}>
            <Route path="/alumni/dashboard" element={<AlumniDashboard />} />
            <Route path="/alumni/onboarding" element={<AlumniOnboardingPage />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/company-connect" element={<CompanyConnectAdmin />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
