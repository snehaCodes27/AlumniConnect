import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CheckCircle2, Clock3, ShieldCheck, Users, LogOut, RefreshCw, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get('/admin/users/pending');
      if (response.data?.success) {
        setPendingUsers(response.data.data || []);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to fetch pending user approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const response = await api.patch(`/admin/users/${userId}/approve`);
      if (response.data?.success) {
        setActionMessage('User account approved successfully.');
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to approve user.');
    }
  };

  const handleReject = async (userId) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const response = await api.patch(`/admin/users/${userId}/reject`);
      if (response.data?.success) {
        setActionMessage('User account approval rejected.');
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to reject user.');
    }
  };

  const stats = [
    { label: 'Pending approvals', value: pendingUsers.length, icon: Clock3, tone: 'indigo' },
    { label: 'Ready to review', value: Math.max(pendingUsers.length, 0), icon: Users, tone: 'cyan' },
    { label: 'System health', value: 'Live', icon: ShieldCheck, tone: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),transparent_30%),radial-gradient(circle_at_top_right,_rgba(147,197,253,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(79,70,229,0.08)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                Admin Control Center
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Welcome back, {user?.firstName || 'Administrator'}</h1>
                <p className="mt-2 text-sm text-slate-600">{user?.email || 'System administrator access'} · Review new Student and Alumni registrations and maintain platform access.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-auto">
              <button
                onClick={fetchPendingUsers}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh list
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </header>

        {actionMessage && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="font-black text-emerald-700">×</button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-black text-rose-700">×</button>
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  tone === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                  tone === 'cyan' ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </section>

        <main className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Pending account approvals</h2>
              <p className="mt-1 text-sm text-slate-500">Review new Student and Alumni registrations before granting platform access.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm font-medium text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              Fetching pending registrations...
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">All caught up</h3>
              <p className="max-w-md text-sm text-slate-500">There are no pending account approvals right now. Every registration has already been reviewed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Requested role</th>
                    <th className="px-6 py-4">Registered</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingUsers.map((pending) => (
                    <tr key={pending.id} className="bg-white transition hover:bg-slate-50/80">
                      <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                        {pending.firstName || 'New'} {pending.lastName || ''}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">{pending.email}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${pending.role === 'ALUMNI' ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
                          {pending.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {pending.createdAt ? new Date(pending.createdAt).toLocaleDateString() : 'Recently'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(pending.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            <CheckCircle2 size={13} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(pending.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
