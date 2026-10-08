import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs rounded-full uppercase">
              Admin Control Center
            </span>
            <h1 className="text-2xl font-bold mt-2">Welcome, System Administrator</h1>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium border border-slate-700 transition-all"
          >
            Sign Out
          </button>
        </header>

        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-emerald-400 font-bold ml-4">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 font-bold ml-4">✕</button>
          </div>
        )}

        <main className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Pending Account Approvals</h2>
              <p className="text-xs text-slate-400 mt-1">Review new Student and Alumni registration requests.</p>
            </div>
            <button
              onClick={fetchPendingUsers}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-all"
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-slate-400 text-sm gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Fetching pending user applications...</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No pending account approvals found. All registrations have been processed!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">Email</th>
                    <th className="py-3.5 px-4 font-semibold">Requested Role</th>
                    <th className="py-3.5 px-4 font-semibold">Registered At</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pendingUsers.map((pending) => (
                    <tr key={pending.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">
                        {pending.firstName} {pending.lastName}
                      </td>
                      <td className="py-4 px-4 text-slate-400">{pending.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            pending.role === 'ALUMNI'
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          }`}
                        >
                          {pending.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {new Date(pending.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(pending.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow-md transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(pending.id)}
                          className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white font-medium text-xs rounded-lg border border-rose-500/40 transition-all"
                        >
                          Reject
                        </button>
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
