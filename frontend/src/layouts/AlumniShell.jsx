import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "../components/NotificationDropdown";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  UserCheck,
  MessageSquare,
  Award,
  Compass,
  Briefcase,
  Calendar,
  GraduationCap,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";
import "../pages/dashboards/alumni-dashboard.css";
const GRADIENT_PAIRS = [
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function avatarGradient(str = "") {
  const code = str ? str.charCodeAt(0) : 0;
  return GRADIENT_PAIRS[code % GRADIENT_PAIRS.length];
}

function initials(first = "", last = "") {
  const f = first ? first.trim()[0] : "";
  const l = last ? last.trim()[0] : "";
  const str = `${f}${l}`.trim() || "?";
  return str.toUpperCase();
}

export default function AlumniShell({
  children,
  activeTab = "dashboard",
  onNavigate,
  pendingMentorshipCount = 0,
  menteeCount = 0,
  connectionCount = 0,
  profile,
  openProfileEditor,
  search = "",
  onSearch = () => {},
  onSearchSubmit,
  searchLabel = "Search dashboard records",
  searchPlaceholder = "Search mentees, requests, sessions, opportunities…",
  onRefresh,
  loading = false,
}) {
  const { user, logout } = useAuth();
  const firstName = user?.firstName || "Alumni",
    lastName = user?.lastName || "";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width:1024px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width:1024px)");
    const update = () => setDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!sidebarOpen || desktop) return;
    const previous = document.activeElement,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector("button")?.focus();
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const nodes = [...sidebarRef.current.querySelectorAll("button,a")];
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [sidebarOpen, desktop]);

  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const NAV_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      id: "mentorship_requests",
      icon: Sparkles,
      label: "Mentorship Requests",
      badge: pendingMentorshipCount,
    },
    {
      id: "mentees",
      icon: Users,
      label: "My Mentees",
      count: menteeCount,
    },
    {
      id: "connections",
      icon: UserCheck,
      label: "Connection Requests",
      badge: connectionCount,
    },
  ];

  return (
    <div
      className="ad-dashboard flex min-h-screen bg-slate-50 text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        aria-label="Alumni navigation"
        aria-hidden={!desktop && !sidebarOpen}
        inert={!desktop && !sidebarOpen ? "" : undefined}
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex ${sidebarCollapsed ? "lg:w-20 ad-sidebar-collapsed" : ""}`}
      >
        <div className="p-4 border-b border-slate-100">
          <button
            className="lg:hidden ad-close-nav"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-base">AC</span>
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm">
                AlumniConnect
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Alumni Mentor Portal
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md shadow-indigo-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {item.count > 0 && !item.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 space-y-1">
            <Link
              to="/messages"
              aria-current={activeTab === "messages" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <MessageSquare size={16} />
              <span>Messages & Direct Chat</span>
            </Link>
            <Link
              to="/communities"
              aria-current={activeTab === "communities" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Users size={16} />
              <span>Communities & Forums</span>
            </Link>
            <Link
              to="/leaderboard"
              aria-current={activeTab === "leaderboard" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-amber-800 bg-amber-50/60 hover:bg-amber-100 transition-colors"
            >
              <Award size={16} className="text-amber-600" />
              <span>Leaderboard & Badges 🏆</span>
            </Link>
            <Link
              to="/alumni/directory"
              aria-current={activeTab === "directory" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Compass size={16} />
              <span>Browse Alumni Directory</span>
            </Link>
            <Link
              to="/jobs"
              aria-current={activeTab === "jobs" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Briefcase size={16} />
              <span>Jobs & Hiring Portal</span>
            </Link>
            <Link
              to="/events"
              aria-current={activeTab === "events" ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Calendar size={16} />
              <span>Events & Webinars Hub</span>
            </Link>
          </div>
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link
            className="ad-sidebar-profile"
            to="/messages"
            title="Need Help? Open Messages"
          >
            <MessageSquare size={16} />
            <span>Need Help? Open Messages</span>
          </Link>
          <button
            className="ad-sidebar-profile"
            onClick={() => {
              openProfileEditor();
              setSidebarOpen(false);
            }}
            title="My Profile"
          >
            <GraduationCap size={16} />
            <span>My Profile</span>
          </button>
          <button
            onClick={logout}
            aria-label="Logout"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation"
              aria-expanded={desktop ? !sidebarCollapsed : sidebarOpen}
              onClick={() => {
                if (desktop) setSidebarCollapsed(!sidebarCollapsed);
                else setSidebarOpen(!sidebarOpen);
              }}
            >
              <Menu size={20} />
            </button>
            <label className="ad-search" htmlFor="alumni-shell-search">
              <span className="sr-only">{searchLabel}</span>
              <Compass size={18} aria-hidden="true" />
              <input
                id="alumni-shell-search"
                type="search"
                value={search}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearchSubmit?.(search);
                }}
                onChange={(e) => {
                  onSearch(e.target.value);
                }}
                placeholder={searchPlaceholder}
              />
            </label>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              onClick={onRefresh}
              aria-label="Refresh dashboard"
              disabled={loading}
            >
              <RefreshCw size={18} />
            </button>
            <NotificationDropdown align="right" />

            <details className="ad-user-menu">
              <summary aria-label={`${firstName} ${lastName}, Alumni Mentor`}>
                <div className="flex items-center gap-2.5">
                  {user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={firstName}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(
                        user?.id,
                      )} text-white font-bold text-xs flex items-center justify-center`}
                    >
                      {initials(firstName, lastName)}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {firstName} {lastName}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {profile?.mentorshipAvailable
                        ? "Available for Mentorship"
                        : "Alumni Mentor"}
                    </div>
                  </div>
                </div>
              </summary>
              <div className="ad-user-menu-options">
                <button onClick={openProfileEditor}>My Profile</button>
                <button onClick={logout}>Logout</button>
              </div>
            </details>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
