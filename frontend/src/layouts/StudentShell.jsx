import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "../components/NotificationDropdown";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Globe,
  Trophy,
  Briefcase,
  FileText,
  UserCheck,
  MessageSquare,
  Calendar,
  ChevronRight,
  User,
  LogOut,
  Menu,
  Search,
  Zap,
} from "lucide-react";
import "./student-shell.css";
const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/student/dashboard",
    active: false,
  },
  { icon: Zap, label: "Placement Drive", path: "/student/placement" },
  { icon: Sparkles, label: "Mentorship Hub", path: "/student/mentorship" },
  { icon: Users, label: "Find Alumni", path: "/alumni/directory" },
  { icon: Globe, label: "Communities", path: "/communities" },
  { icon: Trophy, label: "Alumni Champions", path: "/leaderboard" },
  { icon: Briefcase, label: "Jobs & Referrals", path: "/jobs" },
  { icon: FileText, label: "My Applications", path: "/jobs" },
  { icon: UserCheck, label: "My Connections", path: "/alumni/directory" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: Calendar, label: "Events & Webinars", path: "/events" },
];

export default function StudentShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate(),
    location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 801,
  );
  const navRef = useRef(null);
  useEffect(() => {
    if (!sidebarOpen || window.innerWidth >= 801) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
      if (e.key === "Tab") {
        const nodes = [...navRef.current.querySelectorAll("a,button")],
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [sidebarOpen]);
  const firstName = user?.firstName || "Student",
    lastName = user?.lastName || "";
  return (
    <div
      className="student-shell"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f0f4ff",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        ref={navRef}
        data-open={sidebarOpen}
        className="student-shell-sidebar"
        aria-label="Student navigation"
        style={{
          width: sidebarOpen ? 220 : 0,
          minWidth: sidebarOpen ? 220 : 0,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.25s",
          overflow: "hidden",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 40,
        }}
      >
        <button
          className="student-shell-close"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        >
          ×
        </button>
        <div
          style={{
            padding: "20px 18px 14px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                A
              </span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#1e1b4b",
                  lineHeight: 1.1,
                }}
              >
                AlumniConnect
              </div>
              <div
                style={{ fontSize: 9, color: "#6b7280", letterSpacing: 0.5 }}
              >
                Connect - Learn - Grow
              </div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 801) setSidebarOpen(false);
              }}
              aria-current={
                location.pathname === item.path ? "page" : undefined
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 9,
                marginBottom: 2,
                background:
                  location.pathname === item.path
                    ? "linear-gradient(90deg,#4f46e5,#7c3aed)"
                    : "transparent",
                color: item.active ? "#fff" : "#374151",
                fontWeight: item.active ? 600 : 400,
                fontSize: 13,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!item.active) e.currentTarget.style.background = "#f5f3ff";
              }}
              onMouseLeave={(e) => {
                if (!item.active)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <item.icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.hasArrow && <ChevronRight size={12} />}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 10px" }}>
          <Link
            to="/student/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 9,
              marginBottom: 2,
              color: "#374151",
              fontSize: 13,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <User size={16} />
            <span style={{ flex: 1 }}>My Profile</span>
          </Link>
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 9,
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#ef4444",
              fontSize: 13,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="student-shell-overlay"
          aria-label="Close navigation backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              padding: 4,
            }}
          >
            <Menu size={20} />
          </button>
          <div
            style={{
              flex: 1,
              maxWidth: 420,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "7px 14px",
            }}
          >
            <Search size={15} color="#9ca3af" />
            <input
              onKeyDown={(e) =>
                e.key === "Enter" && navigate("/alumni/directory")
              }
              aria-label="Search alumni directory"
              placeholder="Search alumni by name, skill, company... (Press Enter)"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: "#374151",
                flex: 1,
              }}
            />
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            {/* Real-time Socket.IO Notification Dropdown */}
            <NotificationDropdown align="right" />

            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {firstName[0]}
                {lastName[0] || ""}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                >
                  {firstName} {lastName}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Student Member
                </div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
