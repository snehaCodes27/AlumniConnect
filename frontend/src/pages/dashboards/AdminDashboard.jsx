import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen,
  Briefcase, Calendar, MessageSquare, Building2, BarChart2,
  Settings, Menu, X, Bell, Search, ChevronUp, ChevronDown,
  TrendingUp, Award, Zap, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Eye, Activity
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import NotificationDropdown from '../../components/NotificationDropdown';

// ── Sidebar navigation items (AI Insights & Email Campaigns removed, Reports merged) ──
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { key: 'users', label: 'Users', icon: Users, href: '/admin/users' },
  { key: 'alumni', label: 'Alumni', icon: UserCheck, href: '/admin/alumni' },
  { key: 'students', label: 'Students', icon: GraduationCap, href: '/admin/students' },
  { key: 'mentorship', label: 'Mentorship', icon: BookOpen, href: '/admin/mentorship' },
  { key: 'jobs', label: 'Jobs & Placements', icon: Briefcase, href: '/admin/jobs' },
  { key: 'events', label: 'Events', icon: Calendar, href: '/admin/events' },
  { key: 'community', label: 'Community', icon: MessageSquare, href: '/admin/community' },
  { key: 'companies', label: 'Companies', icon: Building2, href: '/admin/companies' },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart2, href: '/admin/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
];

// ── Color palette (matching design reference) ──────────────────────────
const COLORS = {
  primary: '#6366f1',     // indigo
  secondary: '#8b5cf6',   // violet
  success: '#10b981',     // emerald
  warning: '#f59e0b',     // amber
  danger: '#ef4444',      // red
  info: '#3b82f6',        // blue
  cyan: '#06b6d4',
  pink: '#ec4899',
  chart: ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'],
};

// ── Utility helpers ───────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getMonth = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('default', { month: 'short' }).toUpperCase();
};

const getDay = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).getDate();
};

// ── Activity icon mapping ─────────────────────────────────────────────
const ACTIVITY_ICONS = {
  student_registered: { icon: GraduationCap, bg: 'bg-indigo-500/15', color: 'text-indigo-400' },
  alumni_registered: { icon: UserCheck, bg: 'bg-cyan-500/15', color: 'text-cyan-400' },
  mentorship_accepted: { icon: BookOpen, bg: 'bg-emerald-500/15', color: 'text-emerald-400' },
  job_application: { icon: Briefcase, bg: 'bg-amber-500/15', color: 'text-amber-400' },
  event_created: { icon: Calendar, bg: 'bg-purple-500/15', color: 'text-purple-400' },
};

// ── Stat Card Component ───────────────────────────────────────────────
function KpiCard({ title, value, change, icon: Icon, iconBg, iconColor }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value?.toLocaleString() ?? '—'}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ChevronUp size={13} className="text-emerald-500" />
          ) : (
            <ChevronDown size={13} className="text-rose-500" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {Math.abs(change ?? 0)}% from last month
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip for Charts ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-700">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pending approvals state (preserved from original)
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // ── Fetch dashboard analytics ──────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/dashboard/summary');
      if (res.data?.success) setDashData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch pending users (existing functionality preserved) ─────────
  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/admin/users/pending');
      if (res.data?.success) setPendingUsers(res.data.data || []);
    } catch {
      // Non-blocking
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchPendingUsers();
  }, [fetchDashboard, fetchPendingUsers]);

  const handleApprove = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/approve`);
      if (res.data?.success) {
        setActionMessage('User account approved successfully.');
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to approve user.');
    }
  };

  const handleReject = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/reject`);
      if (res.data?.success) {
        setActionMessage('User account rejected.');
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to reject user.');
    }
  };

  const kpi = dashData?.kpi;
  const activity = dashData?.activityChart || [];
  const userGrowth = dashData?.userGrowthChart || [];
  const recentActivity = dashData?.recentActivity || [];
  const upcomingEvents = dashData?.upcomingEvents || [];
  const topCompanies = dashData?.topCompanies || [];
  const funnel = dashData?.funnel;
  const mentorship = dashData?.mentorship;
  const impact = dashData?.impact;

  // ── KPI card definitions ──────────────────────────────────────────
  const kpiCards = [
    { title: 'Total Students', value: kpi?.totalStudents?.value, change: kpi?.totalStudents?.change, icon: GraduationCap, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
    { title: 'Total Alumni', value: kpi?.totalAlumni?.value, change: kpi?.totalAlumni?.change, icon: UserCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { title: 'Active Alumni', value: kpi?.activeAlumni?.value, change: kpi?.activeAlumni?.change, icon: Users, iconBg: 'bg-violet-50', iconColor: 'text-violet-500' },
    { title: 'Mentorship Sessions', value: kpi?.mentorshipSessions?.value, change: kpi?.mentorshipSessions?.change, icon: BookOpen, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
    { title: 'Job Applications', value: kpi?.jobApplications?.value, change: kpi?.jobApplications?.change, icon: Briefcase, iconBg: 'bg-rose-50', iconColor: 'text-rose-500' },
    { title: 'Students Shortlisted', value: kpi?.studentsShortlisted?.value, change: kpi?.studentsShortlisted?.change, icon: CheckCircle2, iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
    { title: 'Events & Webinars', value: kpi?.eventsWebinars?.value, change: kpi?.eventsWebinars?.change, icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { title: 'Community Posts', value: kpi?.communityPosts?.value, change: kpi?.communityPosts?.change, icon: MessageSquare, iconBg: 'bg-pink-50', iconColor: 'text-pink-500' },
  ];

  // ── Funnel steps ──────────────────────────────────────────────────
  const funnelSteps = [
    { label: 'Applied', value: funnel?.applied, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Under Review', value: funnel?.reviewing, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Shortlisted', value: funnel?.shortlisted, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Interviewed', value: funnel?.interview, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Selected', value: funnel?.selected, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  // ── Mentorship pie data ───────────────────────────────────────────
  const pieData = [
    { name: 'Accepted', value: mentorship?.accepted || 0, color: '#10b981' },
    { name: 'Pending', value: mentorship?.pending || 0, color: '#f59e0b' },
    { name: 'Rejected', value: mentorship?.rejected || 0, color: '#ef4444' },
  ];

  // ── Current active page ───────────────────────────────────────────
  const currentKey = NAV_ITEMS.find((n) => n.href === location.pathname)?.key || 'dashboard';

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 z-30 h-full w-60 bg-[#1a1f36] flex flex-col transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">AlumniConnect</p>
              <p className="text-slate-400 text-[10px] leading-tight">Admin Panel</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentKey === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 mx-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
                    ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <Icon size={17} className={active ? 'text-white' : 'text-slate-500'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">

        {/* ── Top Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-5 py-3 flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students, alumni, companies, events..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Notifications */}
            <NotificationDropdown />

            {/* Admin avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.firstName || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 leading-tight">System Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Body ──────────────────────────────────────────────── */}
        <main className="flex-1 px-5 py-6 overflow-auto">

          {/* Page title + date */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Overview of AlumniConnect platform activity and impact</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* ── Toast ─────────────────────────────────────────────────── */}
          {actionMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="ml-4 font-bold text-emerald-500">✕</button>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 font-bold text-rose-400">✕</button>
            </div>
          )}

          {/* ── KPI Cards Row 1 ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {loading
              ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
              : kpiCards.slice(0, 4).map((card, i) => <KpiCard key={i} {...card} />)
            }
          </div>

          {/* ── KPI Cards Row 2 ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {loading
              ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
              : kpiCards.slice(4).map((card, i) => <KpiCard key={i} {...card} />)
            }
          </div>

          {/* ── Charts Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

            {/* Platform Activity (3/5 width) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Platform Activity Overview</h2>
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={activity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAlumni" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMentorship" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                    <Area type="monotone" dataKey="newStudents" name="New Students" stroke="#6366f1" strokeWidth={2} fill="url(#colorStudents)" dot={false} />
                    <Area type="monotone" dataKey="newAlumni" name="New Alumni" stroke="#10b981" strokeWidth={2} fill="url(#colorAlumni)" dot={false} />
                    <Area type="monotone" dataKey="jobApplications" name="Job Applications" stroke="#f59e0b" strokeWidth={2} fill="url(#colorJobs)" dot={false} />
                    <Area type="monotone" dataKey="mentorshipSessions" name="Mentorship Sessions" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorMentorship)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* User Growth (2/5 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 mb-4">User Growth</h2>
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={userGrowth} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                    <Bar dataKey="students" name="Students" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="alumni" name="Alumni" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Activity / Events / Companies Row ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
              </div>
              {loading ? (
                <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : recentActivity.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => {
                    const meta = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.student_registered;
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-tight truncate">{item.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Upcoming Events</h2>
                <Link to="/events" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">No upcoming events.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((ev) => (
                    <div key={ev.id} className="flex gap-3 items-start">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase leading-none">{getMonth(ev.startDate)}</span>
                        <span className="text-base font-bold text-indigo-700 leading-tight">{getDay(ev.startDate)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-tight truncate">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {ev.location} · {formatTime(ev.startDate)} – {formatTime(ev.endDate)}
                        </p>
                        <p className="text-[10px] text-slate-400">{ev.registeredCount} registered</p>
                      </div>
                      <button className="text-[10px] font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Companies */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Top Companies (Applications)</h2>
                <Link to="/admin/companies" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
              ) : topCompanies.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">No company data available.</p>
              ) : (
                <div className="space-y-3">
                  {topCompanies.map((co, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-700 truncate">{co.company}</p>
                          <p className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{co.applications} apps</p>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${co.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Funnel / Mentorship / Platform Impact Row ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Job Application Funnel */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Job Application Funnel</h2>
              {loading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {funnelSteps.map((step, i) => (
                    <React.Fragment key={i}>
                      <div className={`flex flex-col items-center px-3 py-2 rounded-xl ${step.bg} flex-1 min-w-0`}>
                        <span className={`text-base font-bold ${step.color}`}>{(step.value ?? 0).toLocaleString()}</span>
                        <span className="text-[9px] text-slate-500 text-center leading-tight mt-0.5">{step.label}</span>
                      </div>
                      {i < funnelSteps.length - 1 && (
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Mentorship Requests */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Mentorship Requests</h2>
                <Link to="/admin/mentorship" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="flex gap-4"><Skeleton className="w-24 h-24 rounded-full" /><Skeleton className="flex-1 h-24" /></div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Donut */}
                  <div className="relative flex-shrink-0">
                    <PieChart width={90} height={90}>
                      <Pie
                        data={pieData}
                        cx={42}
                        cy={42}
                        innerRadius={28}
                        outerRadius={42}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-bold text-slate-800">{mentorship?.acceptanceRate ?? 0}%</span>
                      <span className="text-[8px] text-slate-400 leading-tight">Accepted</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex-1 space-y-1.5">
                    {pieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-[11px] text-slate-500">{item.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Platform Impact */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Platform Impact</h2>
                <Link to="/admin/reports" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-indigo-50 rounded-xl">
                    <Users size={18} className="text-indigo-500 mb-1" />
                    <span className="text-base font-bold text-indigo-700">{impact?.studentSatisfaction ?? 0}%</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Student Satisfaction</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-amber-50 rounded-xl">
                    <Award size={18} className="text-amber-500 mb-1" />
                    <span className="text-base font-bold text-amber-700">{impact?.eventRating ?? '0.0'}/5</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Event Rating</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl">
                    <TrendingUp size={18} className="text-emerald-500 mb-1" />
                    <span className="text-base font-bold text-emerald-700">{impact?.placementSupport ?? 0}%</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Placement Support</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Pending User Approvals (preserved from original) ─────── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Pending Account Approvals</h2>
                <p className="text-xs text-slate-400 mt-0.5">Review new Student and Alumni registration requests</p>
              </div>
              <button
                onClick={fetchPendingUsers}
                className="text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors font-medium"
              >
                Refresh
              </button>
            </div>

            {pendingLoading ? (
              <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : pendingUsers.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No pending approvals. All registrations are processed!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">User</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Email</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Role</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Registered</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-700">{u.firstName} {u.lastName}</td>
                        <td className="py-3 px-3 text-slate-500">{u.email}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border
                            ${u.role === 'ALUMNI'
                              ? 'bg-cyan-50 border-cyan-200 text-cyan-600'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(u.id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[10px] rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-[10px] rounded-lg transition-colors"
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
          </div>

        </main>
      </div>

      {/* ── Google Fonts ─────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>
    </div>
  );
}
