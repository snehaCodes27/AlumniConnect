import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-md">
        <div className="rounded-[30px] border border-white/70 bg-white/80 p-8 shadow-[0_20px_45px_rgba(59,130,246,0.12)] backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm">
            <Clock3 size={28} />
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Account status</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Pending approval</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Your account has been created successfully, and it is waiting for administrator review.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Review in progress</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  An administrator will verify your information shortly. Once approved, you will be able to sign in and access your dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <ArrowLeft size={16} />
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
