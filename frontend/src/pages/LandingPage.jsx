import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkBackendHealth } from '../services/healthService';

export default function LandingPage() {
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    message: '',
  });

  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setBackendStatus({
          loading: false,
          connected: true,
          message: data.message || 'Connected',
        });
      })
      .catch(() => {
        setBackendStatus({
          loading: false,
          connected: false,
          message: 'Backend offline or unreachable',
        });
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full text-center space-y-8 z-10">
        {/* Platform Identity */}
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Authentication System Active</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
            AlumniConnect
          </h1>

          <p className="text-xl sm:text-2xl font-medium text-slate-400">
            &ldquo;Connect. Guide. Grow Together.&rdquo;
          </p>
        </div>

        {/* Action CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-center"
          >
            Sign In to Platform
          </Link>
          <Link
            to="/student/register"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 font-semibold rounded-xl border border-indigo-500/30 transition-all text-center"
          >
            Register as Student
          </Link>
          <Link
            to="/alumni/register"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-semibold rounded-xl border border-cyan-500/30 transition-all text-center"
          >
            Register as Alumni
          </Link>
        </div>

        {/* Roles Preview Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 sm:p-8 text-left space-y-4 shadow-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Built for 3 Unified Roles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Role 1</span>
              <h3 className="font-semibold text-white mt-1">Students</h3>
              <p className="text-xs text-slate-400 mt-1">Access mentorship, career guidance & admin approval.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Role 2</span>
              <h3 className="font-semibold text-white mt-1">Alumni</h3>
              <p className="text-xs text-slate-400 mt-1">Guide students, network & manage mentor availability.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Role 3</span>
              <h3 className="font-semibold text-white mt-1">Admins</h3>
              <p className="text-xs text-slate-400 mt-1">Verify user registrations & review pending accounts.</p>
            </div>
          </div>
        </div>

        {/* Backend Connectivity Status Indicator */}
        <div className="inline-flex items-center space-x-2 text-sm text-slate-400 bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2.5 shadow-sm">
          <span className="font-semibold text-slate-300">Backend Status:</span>
          {backendStatus.loading ? (
            <span className="text-amber-400 font-medium inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Checking connection...
            </span>
          ) : backendStatus.connected ? (
            <span className="text-emerald-400 font-semibold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Connected ({backendStatus.message})
            </span>
          ) : (
            <span className="text-rose-400 font-medium inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Disconnected ({backendStatus.message})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
