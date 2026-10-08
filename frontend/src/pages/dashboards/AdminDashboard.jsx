import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import NotificationDropdown from '../../components/NotificationDropdown';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Briefcase,
  Calendar,
  MessageSquare,
  Building2,
  BarChart2,
  Settings,
  Menu,
  Search,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  LogOut,
  RefreshCw,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

const ACTIVITY_ICONS = {
  student_registered: { icon: GraduationCap, bg: 'bg-indigo-500/15', color: 'text-indigo-400' },
  alumni_registered: { icon: UserCheck, bg: 'bg-cyan-500/15', color: 'text-cyan-400' },
  mentorship_accepted: { icon: BookOpen, bg: 'bg-emerald-500/15', color: 'text-emerald-400' },
  job_application: { icon: Briefcase, bg: 'bg-amber-500/15', color: 'text-amber-400' },
  event_created: { icon: Calendar, bg: 'bg-violet-500/15', color: 'text-violet-400' },
};

const timeAgo = (value) => {
  if (!value) return '';
  const diff = Math.floor((Date.now() - new Date(value)) / 1000);
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const getMonth = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', { month: 'short' }).toUpperCase();
};

const getDay = (value) => {
  if (!value) return '';
  return new Date(value).getDate();
};

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

function KpiCard({ title, value, change, icon: Icon, iconBg, iconColor }) {
  const isPositive = Number(change ?? 0) >= 0;
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value ?? '—'}</p>
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? <ChevronUp size={13} className="text-emerald-500" /> : <ChevronDown size={13} className="text-rose-500" />}
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {Math.abs(change ?? 0)}% from last month
          </span>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-slate-500">{item.name}:</span>
          <span className="font-semibold text-slate-700">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/dashboard/summary');
      if (res.data?.success) {
        setDashData(res.data.data || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/admin/users/pending');
      if (res.data?.success) {
        setPendingUsers(res.data.data || []);
      }
    } catch {
      // kept non-blocking to preserve existing admin flow
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
        setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to approve user.');
    }
  };

  const handleReject = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/reject`);
      if (res.data?.success) {
        setActionMessage('User account approval rejected.');
        setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to reject user.');
    }
  };

  const kpi = dashData?.kpi || {};
  const activity = dashData?.activityChart || [];
  const userGrowth = dashData?.userGrowthChart || [];
  const recentActivity = dashData?.recentActivity || [];
  const upcomingEvents = dashData?.upcomingEvents || [];
  const topCompanies = dashData?.topCompanies || [];
  const funnel = dashData?.funnel || {};
  const mentorship = dashData?.mentorship || {};
  const impact = dashData?.impact || {};

  const kpiCards = [
    { title: 'Total Students', value: kpi.totalStudents?.value, change: kpi.totalStudents?.change, icon: GraduationCap, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
    { title: 'Total Alumni', value: kpi.totalAlumni?.value, change: kpi.totalAlumni?.change, icon: UserCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { title: 'Active Alumni', value: kpi.activeAlumni?.value, change: kpi.activeAlumni?.change, icon: Users, iconBg: 'bg-violet-50', iconColor: 'text-violet-500' },
    { title: 'Mentorship Sessions', value: kpi.mentorshipSessions?.value, change: kpi.mentorshipSessions?.change, icon: BookOpen, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
    { title: 'Job Applications', value: kpi.jobApplications?.value, change: kpi.jobApplications?.change, icon: Briefcase, iconBg: 'bg-rose-50', iconColor: 'text-rose-500' },
    { title: 'Students Shortlisted', value: kpi.studentsShortlisted?.value, change: kpi.studentsShortlisted?.change, icon: CheckCircle2, iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
    { title: 'Events & Webinars', value: kpi.eventsWebinars?.value, change: kpi.eventsWebinars?.change, icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { title: 'Community Posts', value: kpi.communityPosts?.value, change: kpi.communityPosts?.change, icon: MessageSquare, iconBg: 'bg-pink-50', iconColor: 'text-pink-500' },
  ];

  const funnelSteps = [
    { label: 'Applied', value: funnel.applied ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Under Review', value: funnel.reviewing ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Shortlisted', value: funnel.shortlisted ?? 0, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Interviewed', value: funnel.interview ?? 0, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Selected', value: funnel.selected ?? 0, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const pieData = [
    { name: 'Accepted', value: mentorship.accepted || 0, color: '#10b981' },
    { name: 'Pending', value: mentorship.pending || 0, color: '#f59e0b' },
    { name: 'Rejected', value: mentorship.rejected || 0, color: '#ef4444' },
  ];

  const currentKey = NAV_ITEMS.find((item) => item.href === location.pathname)?.key || 'dashboard';

  return (
    <div className="flex min-h-screen bg-[#f4f6fb] text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-60 flex-col bg-[#1a1f36] transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AlumniConnect</p>
            <p className="text-[10px] text-slate-400">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentKey === item.key;
            return (
              <Link
                key={item.key}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`mx-3 mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon size={17} className={active ? 'text-white' : 'text-slate-500'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur-md">
          <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students, alumni, companies, events..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-600 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationDropdown />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user?.firstName || 'Admin'}</p>
                <p className="text-[10px] text-slate-400">System Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Overview of AlumniConnect platform activity and impact</p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm sm:flex">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {actionMessage && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage('')} className="ml-4 font-black text-emerald-700">×</button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-4 font-black text-rose-700">×</button>
            </div>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
              : kpiCards.slice(0, 4).map((card, index) => <KpiCard key={index} {...card} />)}
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
              : kpiCards.slice(4).map((card, index) => <KpiCard key={index} {...card} />)}
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <h2 className="mb-4 text-sm font-bold text-slate-700">Platform Activity Overview</h2>
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={activity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="stud" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="alum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="jobs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                    <Area type="monotone" dataKey="newStudents" name="New Students" stroke="#6366f1" strokeWidth={2} fill="url(#stud)" dot={false} />
                    <Area type="monotone" dataKey="newAlumni" name="New Alumni" stroke="#10b981" strokeWidth={2} fill="url(#alum)" dot={false} />
                    <Area type="monotone" dataKey="jobApplications" name="Job Applications" stroke="#f59e0b" strokeWidth={2} fill="url(#jobs)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-sm font-bold text-slate-700">User Growth</h2>
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

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-700">Recent Activity</h2>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div>
              ) : recentActivity.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => {
                    const meta = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.student_registered;
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg}`}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs text-slate-700">{item.message}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Upcoming Events</h2>
                <Link to="/events" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div>
              ) : upcomingEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No upcoming events.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50">
                        <span className="text-[9px] font-bold uppercase leading-none text-indigo-400">{getMonth(event.startDate)}</span>
                        <span className="text-base font-bold leading-tight text-indigo-700">{getDay(event.startDate)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700">{event.title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {event.location} · {formatTime(event.startDate)} – {formatTime(event.endDate)}
                        </p>
                        <p className="text-[10px] text-slate-400">{event.registeredCount} registered</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Top Companies</h2>
                <Link to="/admin/companies" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-9" />)}</div>
              ) : topCompanies.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No company data available.</p>
              ) : (
                <div className="space-y-3">
                  {topCompanies.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                        <Building2 size={14} className="text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-700">{item.company}</p>
                          <span className="text-[10px] text-slate-400">{item.applications} apps</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-700">Job Application Funnel</h2>
              {loading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  {funnelSteps.map((step, index) => (
                    <React.Fragment key={index}>
                      <div className={`flex min-w-[70px] flex-1 flex-col items-center rounded-xl px-3 py-2 ${step.bg}`}>
                        <span className={`text-base font-bold ${step.color}`}>{step.value}</span>
                        <span className="mt-0.5 text-[9px] leading-tight text-slate-500">{step.label}</span>
                      </div>
                      {index < funnelSteps.length - 1 && <ChevronRight size={14} className="text-slate-300" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Mentorship Requests</h2>
                <Link to="/admin/mentorship" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View All</Link>
              </div>
              {loading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-20 flex-1" />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <PieChart width={90} height={90}>
                      <Pie data={pieData} cx={42} cy={42} innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-bold text-slate-800">{mentorship.acceptanceRate ?? 0}%</span>
                      <span className="text-[8px] text-slate-400">Accepted</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-[11px] text-slate-500">{item.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Platform Impact</h2>
                <Link to="/admin/reports" className="text-xs font-medium text-indigo-500 hover:text-indigo-700">View All</Link>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-indigo-50 p-3 text-center">
                    <Users size={18} className="mx-auto mb-1 text-indigo-500" />
                    <span className="text-base font-bold text-indigo-700">{impact.studentSatisfaction ?? 0}%</span>
                    <span className="mt-0.5 block text-[9px] leading-tight text-slate-500">Student Satisfaction</span>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <Award size={18} className="mx-auto mb-1 text-amber-500" />
                    <span className="text-base font-bold text-amber-700">{impact.eventRating ?? '0.0'}/5</span>
                    <span className="mt-0.5 block text-[9px] leading-tight text-slate-500">Event Rating</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <TrendingUp size={18} className="mx-auto mb-1 text-emerald-500" />
                    <span className="text-base font-bold text-emerald-700">{impact.placementSupport ?? 0}%</span>
                    <span className="mt-0.5 block text-[9px] leading-tight text-slate-500">Placement Support</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Pending Account Approvals</h2>
                <p className="mt-0.5 text-xs text-slate-400">Review new Student and Alumni registration requests</p>
              </div>
              <button
                onClick={fetchPendingUsers}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>

            {pendingLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>
            ) : pendingUsers.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-slate-400">No pending approvals. All registrations are processed!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">User</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Email</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Role</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Registered</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                        <td className="px-3 py-3 font-semibold text-slate-700">{userItem.firstName} {userItem.lastName}</td>
                        <td className="px-3 py-3 text-slate-500">{userItem.email}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${userItem.role === 'ALUMNI' ? 'border-cyan-200 bg-cyan-50 text-cyan-600' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-400">{new Date(userItem.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprove(userItem.id)}
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(userItem.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
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
          </div>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>
    </div>
  );
}
