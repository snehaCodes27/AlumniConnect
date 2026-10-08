import React from 'react';
import { Outlet, Link } from 'react-router-dom';

/**
 * Base layout wrapper for AlumniConnect
 */
export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              AC
            </div>
            <span className="text-xl font-bold tracking-tight text-white">AlumniConnect</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/student/register"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-500/20"
            >
              Student Join
            </Link>
            <Link
              to="/alumni/register"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-500/20"
            >
              Alumni Join
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} AlumniConnect. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
