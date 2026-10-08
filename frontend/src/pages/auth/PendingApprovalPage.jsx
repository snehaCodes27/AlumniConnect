import React from 'react';
import { Link } from 'react-router-dom';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/10">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Account Pending Approval
        </h2>

        <div className="mt-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl rounded-2xl">
          <p className="text-slate-300 text-base leading-relaxed">
            Your account has been created and is waiting for admin approval.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            An administrator will verify your information shortly. Once approved, you will be able to log into your account.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-sm rounded-xl border border-slate-700 transition-all shadow-md"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
