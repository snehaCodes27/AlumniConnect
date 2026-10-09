import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Briefcase, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../services/api';
import { AdminError, AdminLoading, AdminEmpty } from '../../components/AdminUI';
export default function AdminDashboard() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/dashboard/summary');
      if (id === seq.current) setData(res.data.data);
    } catch (e) {
      if (id === seq.current) setError(e.response?.data?.message || 'Dashboard data could not be loaded.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      seq.current++;
    };
  }, [load]);
  const kpi = data?.kpi || {};
  return <main className="admin-page"><div className="admin-page-heading"><div><h1>Platform Overview</h1><p>Real activity across your AlumniConnect community.</p></div><button className="admin-secondary" onClick={load} disabled={loading}><RefreshCw size={16} />Refresh</button></div><AdminError error={error} retry={load} />
    <div className="admin-stats">{[[Users, 'Alumni', kpi.totalAlumni], [GraduationCap, 'Students', kpi.totalStudents], [BookOpen, 'Accepted / completed mentoring', kpi.mentorshipSessions], [Briefcase, 'Job applications', kpi.jobApplications]].map(([Icon, label, item]) => <article className="admin-stat" key={label}><span><Icon size={21} /></span><div><strong>{loading ? '…' : item?.value ?? '—'}</strong><small>{label}</small></div></article>)}</div>
    {loading ? <AdminLoading /> : <div className="admin-overview-grid"><div className="admin-overview-left"><section className="admin-panel"><h2>Community growth</h2><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.userGrowthChart || []} margin={{
                top: 20,
                left: -25,
                right: 10,
                bottom: 0
              }}><CartesianGrid stroke="#edf0f8" vertical={false} /><XAxis dataKey="month" tick={{
                  fontSize: 10
                }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{
                  fontSize: 10
                }} axisLine={false} tickLine={false} /><Tooltip /><Area dataKey="students" name="New students" stroke="#8750ee" fill="#ede5ff" /><Area dataKey="alumni" name="New alumni" stroke="#149dc7" fill="#dff5fb" /></AreaChart></ResponsiveContainer></div></section><section className="admin-panel"><h2>Career contribution</h2>{data?.topCompanies?.length ? <div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topCompanies} margin={{
                top: 15,
                left: -25,
                right: 10
              }}><XAxis dataKey="company" tick={{
                  fontSize: 10
                }} axisLine={false} /><YAxis allowDecimals={false} tick={{
                  fontSize: 10
                }} axisLine={false} /><Tooltip /><Bar dataKey="applications" name="Applications" fill="#8460ef" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p>No job applications have been recorded yet.</p>}</section></div>
    <div className="admin-overview-right"><section className="admin-panel"><h2>Recent activity</h2>{data?.recentActivity?.length ? data.recentActivity.slice(0, 4).map(a => <div className="admin-activity" key={a.id}><span><Activity size={15} /></span><div><strong title={a.message}>{a.message}</strong><small>{new Date(a.timestamp).toLocaleDateString()}</small></div></div>) : <AdminEmpty>No recent activity.</AdminEmpty>}</section><section className="admin-panel"><h2>Manage your platform</h2><p>Students and Alumni sign in directly. Review platform records and plan placement support here.</p><div className="admin-links"><Link to="/admin/company-connect">Company Connect <ArrowUpRight size={12} /></Link><Link to="/admin/users">Manage users</Link><Link to="/admin/reports">Reports</Link><Link to="/admin/donations">Donation insights</Link></div></section></div></div>}
  </main>;
}
