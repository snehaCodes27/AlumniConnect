import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen, Briefcase, CalendarDays, MessageSquare, Building2, BarChart3, Settings, HeartHandshake, Menu, LogOut, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import './admin-shell.css';
const items = [['Dashboard', '/admin/dashboard', LayoutDashboard], ['Users', '/admin/users', Users], ['Alumni', '/admin/alumni', UserCheck], ['Students', '/admin/students', GraduationCap], ['Mentorship', '/admin/mentorship', BookOpen], ['Jobs & Placements', '/admin/jobs', Briefcase], ['Events', '/admin/events', CalendarDays], ['Community', '/admin/community', MessageSquare], ['Companies', '/admin/companies', Building2], ['Company Connect', '/admin/company-connect', Building2], ['Donation Prediction', '/admin/donations', HeartHandshake], ['Reports & Analytics', '/admin/reports', BarChart3], ['Settings', '/admin/settings', Settings]];
export default function AdminShell({
  children
}) {
  const {
      user,
      logout
    } = useAuth(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const nav = useRef(null);
  useEffect(() => {
    setOpen(false);
    setSearch('');
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    nav.current?.querySelector('button')?.focus();
    const key = e => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const nodes = [...nav.current.querySelectorAll('a,button')];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.isConnected && previous.focus();
    };
  }, [open]);
  const active = items.find(i => i[1] === location.pathname)?.[0] || {
    '/jobs': 'Jobs & Placements',
    '/events': 'Events',
    '/messages': 'Messages',
    '/communities': 'Community',
    '/leaderboard': 'Leaderboard',
    '/alumni/directory': 'Alumni'
  }[location.pathname] || 'Admin Portal';
  return <div className="admin-frame">{open && <button className="admin-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside ref={nav} className={`admin-sidebar ${open ? 'open' : ''}`} aria-label="Admin navigation"><Link className="admin-brand" to="/admin/dashboard"><span>AC</span><div><strong>AlumniConnect</strong><small>Administration Portal</small></div></Link><button className="admin-mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
      <nav>{items.map(([label, path, Icon]) => <Link key={path} to={path} aria-current={active === label ? 'page' : undefined}><Icon size={17} />{label}</Link>)}</nav><div className="admin-sidebar-footer"><Link to="/messages"><MessageSquare size={17} />Messages</Link><button onClick={logout}><LogOut size={17} />Sign Out</button></div>
    </aside><div className="admin-workspace"><header className="admin-topbar"><button className="admin-menu" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button><div><strong>{active}</strong><small>Admin workspace</small></div><form action="/admin/users" className="admin-global-search"><Search size={17} /><input name="q" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search users" placeholder="Search users…" /></form><NotificationDropdown /><span className="admin-user-avatar">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><div className="admin-user"><strong>{user?.firstName} {user?.lastName}</strong><small>Administrator</small></div></header>
      <div className="admin-content">{children || <Outlet />}</div></div></div>;
}
