import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';
import { AdminError, AdminLoading } from '../../components/AdminUI';
export default function AdminReportsPage({
  settings = false
}) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  const seq = useRef(0);
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    api.get(settings ? '/admin/settings' : '/admin/dashboard/summary').then(res => {
      if (id === seq.current) setData(res.data.data);
    }).catch(e => {
      if (id === seq.current) {
        setData(null);
        setError(e.response?.data?.message || 'Could not load data.');
      }
    }).finally(() => {
      if (id === seq.current) setLoading(false);
    });
    return () => {
      seq.current++;
    };
  }, [settings, refresh]);
  const labels = {
    registration: 'Registration policy',
    emailConfigured: 'Email provider configured',
    smsConfigured: 'SMS provider configured',
    companyConnectPersistence: 'Placement storage',
    donationMode: 'Donation prediction',
    platformUrl: 'Application URL'
  };
  return <main className="admin-page"><div className="admin-page-heading"><div><h1>{settings ? 'Settings & Service Status' : 'Reports & Analytics'}</h1><p>{settings ? 'Read-only configuration overview. Credentials are never displayed.' : 'Recorded platform trends and current application stages.'}</p></div><button className="admin-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={15} />Refresh</button></div><AdminError error={error} retry={() => setRefresh(n => n + 1)} />{loading ? <AdminLoading /> : settings ? <section className="admin-settings">{data && Object.entries(data).map(([key, val]) => <div key={key}><span>{labels[key] || key}</span><b>{typeof val === 'boolean' ? val ? 'Configured' : 'Not configured' : String(val)}</b></div>)}</section> : <><div className="admin-stats">{[['Completed / accepted mentoring', data?.kpi?.mentorshipSessions?.value], ['Published / completed events', data?.kpi?.eventsWebinars?.value], ['Active community posts', data?.kpi?.communityPosts?.value], ['Average event rating', data?.impact?.eventRating ? `${data.impact.eventRating} / 5` : 'No ratings']].map(([label, value]) => <article className="admin-stat" key={label}><div><strong>{value ?? '—'}</strong><small>{label}</small></div></article>)}</div><div className="admin-report-grid"><section className="admin-panel"><h2>Platform activity by month</h2><div className="admin-report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.activityChart || []} margin={{
                top: 20,
                left: -25,
                right: 10
              }}><CartesianGrid stroke="#edf0f8" vertical={false} /><XAxis dataKey="month" tick={{
                  fontSize: 10
                }} /><YAxis allowDecimals={false} tick={{
                  fontSize: 10
                }} /><Tooltip /><Legend wrapperStyle={{
                  fontSize: 10
                }} /><Bar dataKey="newStudents" name="Students" fill="#8d51ed" /><Bar dataKey="newAlumni" name="Alumni" fill="#10a5ce" /><Bar dataKey="jobApplications" name="Applications" fill="#eba63d" /></BarChart></ResponsiveContainer></div></section><section className="admin-panel"><h2>Current application stages</h2><p>Applied counts all applications; other bars show current statuses.</p><div className="admin-report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data?.funnel || {}).map(([stage, count]) => ({
                stage,
                count
              }))} margin={{
                top: 20,
                left: -25,
                right: 10
              }}><XAxis dataKey="stage" tick={{
                  fontSize: 10
                }} /><YAxis allowDecimals={false} tick={{
                  fontSize: 10
                }} /><Tooltip /><Bar dataKey="count" name="Applications" fill="#7e63e6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section></div></>}</main>;
}
