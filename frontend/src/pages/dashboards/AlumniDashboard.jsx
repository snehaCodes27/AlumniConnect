import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { connectionService } from "../../services/connectionService";
import { mentorshipService } from "../../services/mentorshipService";
import { eventService } from "../../services/eventService";
import NotificationDropdown from "../../components/NotificationDropdown";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  Compass,
  MessageSquare,
  Award,
  Calendar,
  Send,
  Bot,
  Menu,
  X,
  UserCheck,
  Building2,
  GraduationCap,
} from "lucide-react";

const POSTED_JOBS = [
  { id: 1, title: "Frontend Developer Intern", company: "TCS", applications: 28, status: "Active", logo: "TCS", logoColor: "bg-red-500" },
  { id: 2, title: "Software Engineer Intern", company: "Infosys", applications: 35, status: "Active", logo: "INF", logoColor: "bg-blue-600" },
  { id: 3, title: "Full Stack Developer", company: "Capgemini", applications: 12, status: "Active", logo: "CAP", logoColor: "bg-indigo-600" },
];

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

export default function AlumniDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'mentorship_requests' | 'mentees' | 'connections'
  const [mentorshipRequests, setMentorshipRequests] = useState([]);
  const [activeMentees, setActiveMentees] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [myEvents, setMyEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Response Note Modal State
  const [respondingRequest, setRespondingRequest] = useState(null); // { request, targetStatus: 'ACCEPTED' | 'REJECTED' }
  const [responseNote, setResponseNote] = useState("");

  const firstName = user?.firstName || "Alumni";
  const lastName = user?.lastName || "";

  // ── Fetch All Real Data from PostgreSQL ─────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [mReqRes, mMenteesRes, cReqRes, connRes, eventsRes] = await Promise.all([
        mentorshipService.getReceivedRequests({ limit: 50 }),
        mentorshipService.getActiveMentorships(),
        connectionService.getReceivedRequests({ status: "PENDING", limit: 20 }),
        connectionService.getMyConnections({ limit: 30 }),
        eventService.getEvents({ filterScope: "my" }).catch(() => ({ data: { events: [] } })),
      ]);

      if (mReqRes.success) setMentorshipRequests(mReqRes.data.requests || []);
      if (mMenteesRes.success) setActiveMentees(mMenteesRes.data || []);
      if (cReqRes.success) setConnectionRequests(cReqRes.data.requests || []);
      if (connRes.success) setConnections(connRes.data.connections || []);
      if (eventsRes?.data?.events) setMyEvents(eventsRes.data.events || []);
    } catch (err) {
      console.error("Failed to load alumni dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Real-time Socket.IO Listeners ───────────────────────────────────────────
  useEffect(() => {
    const handleMentorshipReceived = (e) => {
      const newReq = e.detail;
      if (!newReq) return;
      setMentorshipRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      setStatusMessage(`New mentorship request from ${newReq.student?.firstName || "a student"} (${newReq.topic || "Guidance"})!`);
      setTimeout(() => setStatusMessage(""), 5000);
      fetchDashboardData();
    };

    const handleMentorshipUpdated = (e) => {
      fetchDashboardData();
    };

    const handleConnReceived = (e) => {
      const newConn = e.detail;
      if (!newConn) return;
      setConnectionRequests((prev) => [newConn, ...prev.filter((r) => r.id !== newConn.id)]);
      setStatusMessage(`New connection request from ${newConn.sender?.firstName || "a student"}!`);
      setTimeout(() => setStatusMessage(""), 4000);
    };

    const handleConnUpdated = () => {
      fetchDashboardData();
    };

    window.addEventListener("mentorship:request:received", handleMentorshipReceived);
    window.addEventListener("mentorship:updated", handleMentorshipUpdated);
    window.addEventListener("mentorship:cancelled", handleMentorshipUpdated);
    window.addEventListener("connection:received", handleConnReceived);
    window.addEventListener("connection:updated", handleConnUpdated);

    return () => {
      window.removeEventListener("mentorship:request:received", handleMentorshipReceived);
      window.removeEventListener("mentorship:updated", handleMentorshipUpdated);
      window.removeEventListener("mentorship:cancelled", handleMentorshipUpdated);
      window.removeEventListener("connection:received", handleConnReceived);
      window.removeEventListener("connection:updated", handleConnUpdated);
    };
  }, [fetchDashboardData]);

  // ── Handle Mentorship Response with Note ───────────────────────────────────
  const submitMentorshipResponse = async (e) => {
    e.preventDefault();
    if (!respondingRequest) return;
    const { request, targetStatus } = respondingRequest;

    setActionInProgress((prev) => ({ ...prev, [request.id]: true }));
    try {
      const res = await mentorshipService.respondRequest(request.id, targetStatus, responseNote);
      if (res.success) {
        setStatusMessage(`Mentorship request ${targetStatus === "ACCEPTED" ? "accepted" : "declined"}.`);
        setTimeout(() => setStatusMessage(""), 4000);
        setRespondingRequest(null);
        setResponseNote("");
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update mentorship request.");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  // ── Handle Quick Accept/Reject Connection ─────────────────────────────────
  const handleRespondConnection = async (connectionId, status) => {
    setActionInProgress((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const res = await connectionService.respondRequest(connectionId, status);
      if (res.success) {
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to respond to connection request.");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const pendingMentorshipCount = mentorshipRequests.filter((r) => r.status === "PENDING").length;

  const NAV_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "mentorship_requests", icon: Sparkles, label: "Mentorship Requests", badge: pendingMentorshipCount },
    { id: "mentees", icon: Users, label: "My Mentees", count: activeMentees.length },
    { id: "connections", icon: UserCheck, label: "Connection Requests", badge: connectionRequests.length },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-base">AC</span>
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm">AlumniConnect</div>
              <div className="text-[10px] text-slate-400 font-medium">Alumni Mentor Portal</div>
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
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
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
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 space-y-1">
            <Link
              to="/messages"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <MessageSquare size={16} />
              <span>Messages & Direct Chat</span>
            </Link>
            <Link
              to="/communities"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Users size={16} />
              <span>Communities & Forums</span>
            </Link>
            <Link
              to="/leaderboard"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-amber-800 bg-amber-50/60 hover:bg-amber-100 transition-colors"
            >
              <Award size={16} className="text-amber-600" />
              <span>Leaderboard & Badges 🏆</span>
            </Link>
            <Link
              to="/alumni/directory"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Compass size={16} />
              <span>Browse Alumni Directory</span>
            </Link>
            <Link
              to="/jobs"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Briefcase size={16} />
              <span>Jobs & Hiring Portal</span>
            </Link>
            <Link
              to="/events"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Calendar size={16} />
              <span>Events & Webinars Hub</span>
            </Link>
          </div>
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
              {activeTab.replace("_", " ")}
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <NotificationDropdown align="right" />

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
                    user?.id
                  )} text-white font-bold text-xs flex items-center justify-center`}
                >
                  {initials(firstName, lastName)}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {firstName} {lastName}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">Active Alumni Mentor</div>
              </div>
            </div>
          </div>
        </header>

        {/* Live Notification Banner */}
        {statusMessage && (
          <div className="bg-indigo-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-md">
            <span>✨ {statusMessage}</span>
            <button onClick={() => setStatusMessage("")} className="font-bold text-sm text-white/80 hover:text-white">
              ×
            </button>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: DASHBOARD OVERVIEW                                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-7 text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold mb-3">
                    <Sparkles size={12} className="text-amber-300" />
                    <span>Intelligent Matching Hub</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white mb-1">
                    Welcome back, {firstName}! 👋
                  </h1>
                  <p className="text-xs text-indigo-100/90 leading-relaxed mb-4">
                    Students are matched to you based on your domain expertise, company background, and technical skills.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("mentorship_requests")}
                      className="px-4 py-2 bg-white text-indigo-900 text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-colors"
                    >
                      Review Mentorship Requests ({pendingMentorshipCount})
                    </button>
                    <button
                      onClick={() => setActiveTab("mentees")}
                      className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      View Active Mentees ({activeMentees.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div
                  onClick={() => setActiveTab("mentorship_requests")}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs cursor-pointer hover:border-indigo-300 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
                    ⏳
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{pendingMentorshipCount}</div>
                    <div className="text-xs font-bold text-slate-500">Pending Mentorships</div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("mentees")}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs cursor-pointer hover:border-indigo-300 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                    👥
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{activeMentees.length}</div>
                    <div className="text-xs font-bold text-slate-500">Active Mentees</div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("connections")}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs cursor-pointer hover:border-indigo-300 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                    🔗
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{connections.length}</div>
                    <div className="text-xs font-bold text-slate-500">Total Connections</div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
                    💼
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">3</div>
                    <div className="text-xs font-bold text-slate-500">Active Opportunities</div>
                  </div>
                </div>

                <Link
                  to="/events"
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs cursor-pointer hover:border-purple-300 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
                    🎙️
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{myEvents.length}</div>
                    <div className="text-xs font-bold text-slate-500">Event Communities</div>
                  </div>
                </Link>
              </div>

              {/* 2-Column Split: Mentorship Requests Preview + Active Mentees Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Incoming Requests */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">Incoming Mentorship Requests</h2>
                      {pendingMentorshipCount > 0 && (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs font-bold">
                          {pendingMentorshipCount} New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveTab("mentorship_requests")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      View All →
                    </button>
                  </div>

                  {mentorshipRequests.filter((r) => r.status === "PENDING").length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <div className="text-3xl mb-2">🎉</div>
                      <p className="font-bold text-slate-700">You're all caught up!</p>
                      <p className="text-slate-400 mt-0.5">No pending mentorship requests at the moment.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mentorshipRequests
                        .filter((r) => r.status === "PENDING")
                        .slice(0, 3)
                        .map((req) => {
                          const student = req.student;
                          const profile = student?.studentProfile;

                          return (
                            <div
                              key={req.id}
                              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {student?.profilePhoto ? (
                                    <img
                                      src={student.profilePhoto}
                                      alt={student.firstName}
                                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div
                                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGradient(
                                        student?.id
                                      )} text-white font-black text-sm flex items-center justify-center`}
                                    >
                                      {initials(student?.firstName, student?.lastName)}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-extrabold text-slate-900 text-sm">
                                      {student?.firstName} {student?.lastName}
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                      {profile?.branch || "Student"}
                                      {profile?.graduationYear ? ` • Class of ${profile.graduationYear}` : ""}
                                    </p>
                                  </div>
                                </div>

                                {req.matchScore && (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                                    🎯 {req.matchScore}% Match
                                  </span>
                                )}
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs space-y-1">
                                <div>
                                  <span className="font-bold text-slate-700">Topic:</span>{" "}
                                  <span className="font-semibold text-indigo-600">{req.topic}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-700">Message:</span>{" "}
                                  <span className="text-slate-600 italic">"{req.message}"</span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setRespondingRequest({ request: req, targetStatus: "ACCEPTED" })}
                                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                                >
                                  <span>✓</span>
                                  <span>Accept Mentorship</span>
                                </button>
                                <button
                                  onClick={() => setRespondingRequest({ request: req, targetStatus: "REJECTED" })}
                                  className="px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-xl text-xs font-semibold transition-all"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Active Mentees Preview */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-slate-900">Active Mentees</h2>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                        {activeMentees.length}
                      </span>
                    </div>

                    {activeMentees.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <p>No active mentorship sessions yet.</p>
                        <p className="text-[11px] mt-1">Accept requests on the left to start guiding students!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeMentees.slice(0, 4).map((m) => {
                          const student = m.student;
                          const profile = student?.studentProfile;
                          return (
                            <div key={m.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient(
                                  student?.id
                                )} text-white font-black text-xs flex items-center justify-center shrink-0`}
                              >
                                {initials(student?.firstName, student?.lastName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs truncate">
                                  {student?.firstName} {student?.lastName}
                                </h4>
                                <p className="text-[10px] text-slate-500 truncate">{m.topic || "Mentorship"}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Link
                                  to={`/messages?userId=${student?.id}`}
                                  className="p-2 bg-indigo-50 rounded-xl border border-indigo-200 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-colors"
                                  title="Chat with Mentee"
                                >
                                  💬
                                </Link>
                                <a
                                  href={`mailto:${student?.email}`}
                                  className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                                  title="Email Mentee"
                                >
                                  ✉
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {activeMentees.length > 4 && (
                    <button
                      onClick={() => setActiveTab("mentees")}
                      className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      View All {activeMentees.length} Mentees →
                    </button>
                  )}
                </div>
              </div>

              {/* Event Communities & Sessions Section */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Calendar size={18} className="text-purple-600" />
                      <span>My Event Communities & Sessions</span>
                    </h2>
                    <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold">
                      {myEvents.length} Hosted
                    </span>
                  </div>
                  <Link to="/events" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    Host New Session →
                  </Link>
                </div>

                {myEvents.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <div className="text-3xl mb-2">🎙️</div>
                    <p className="font-bold text-slate-700">No events created yet.</p>
                    <p className="text-slate-400 mt-0.5">Host live webinars, tech workshops, or mentoring panels for students.</p>
                    <Link
                      to="/events"
                      className="mt-3 inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-90"
                    >
                      Create an Event
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myEvents.map((evt) => (
                      <div key={evt.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between hover:border-purple-300 transition-all">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase">
                              {evt.type}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {evt.registeredCount ?? evt._count?.registrations ?? 0} Students
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-sm mb-1 truncate">{evt.title}</h3>
                          <p className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
                            <Clock size={12} /> {new Date(evt.startDate).toLocaleDateString()} at {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                          <Link
                            to={`/events/${evt.id}/community`}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition text-center shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Users size={12} /> Manage Community
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: MENTORSHIP REQUESTS (FULL INBOX)                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "mentorship_requests" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Mentorship Requests Inbox</h2>
                  <p className="text-xs text-slate-500">
                    Review students seeking guidance based on your industry experience and match relevance.
                  </p>
                </div>
                <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-100">
                  {mentorshipRequests.length} Total Requests
                </span>
              </div>

              {mentorshipRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                  <div className="text-4xl mb-3">🤝</div>
                  <h3 className="font-bold text-slate-800 text-base">No mentorship requests received</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Students will discover your profile through our intelligent recommendation engine and reach out.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mentorshipRequests.map((req) => {
                    const student = req.student;
                    const profile = student?.studentProfile;
                    const isPending = req.status === "PENDING";
                    const isAccepted = req.status === "ACCEPTED";
                    const isBusy = actionInProgress[req.id];

                    return (
                      <div
                        key={req.id}
                        className={`bg-white rounded-3xl p-6 border transition-all shadow-xs ${
                          isPending ? "border-indigo-200/90 bg-white" : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                          {/* Student Info */}
                          <div className="flex items-start gap-4 flex-1">
                            {student?.profilePhoto ? (
                              <img
                                src={student.profilePhoto}
                                alt={student.firstName}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div
                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(
                                  student?.id
                                )} text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm`}
                              >
                                {initials(student?.firstName, student?.lastName)}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-extrabold text-slate-900 text-base">
                                  {student?.firstName} {student?.lastName}
                                </h3>
                                {req.matchScore && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-2xs">
                                    🎯 {req.matchScore}% Match
                                  </span>
                                )}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    isPending
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : isAccepted
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                {profile?.branch || "Student"}
                                {profile?.graduationYear ? ` • Class of ${profile.graduationYear}` : ""}
                                {profile?.college ? ` • ${profile.college}` : ""}
                              </p>

                              {/* Student Preferences & Skills */}
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                                {profile?.preferredRole && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md border border-slate-200">
                                    🎯 Target: {profile.preferredRole}
                                  </span>
                                )}
                                {profile?.preferredCompany && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md border border-slate-200">
                                    🏢 Dream: {profile.preferredCompany}
                                  </span>
                                )}
                                {profile?.skills && profile.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {profile.skills.slice(0, 4).map((sk) => (
                                      <span
                                        key={sk}
                                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100"
                                      >
                                        {sk}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Request Message Box */}
                              <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                                <div>
                                  <span className="font-extrabold text-slate-800">Topic:</span>{" "}
                                  <span className="font-bold text-indigo-700">{req.topic}</span>
                                </div>
                                {req.goals && (
                                  <div>
                                    <span className="font-extrabold text-slate-800">Specific Goals:</span>{" "}
                                    <span className="text-slate-700">{req.goals}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-extrabold text-slate-800">Student Note:</span>{" "}
                                  <span className="text-slate-700 italic">"{req.message}"</span>
                                </div>

                                {req.responseNote && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 text-emerald-800 font-semibold">
                                    <span>Your Feedback Note:</span> "{req.responseNote}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Controls */}
                          {isPending && (
                            <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-44 shrink-0">
                              <button
                                disabled={isBusy}
                                onClick={() => setRespondingRequest({ request: req, targetStatus: "ACCEPTED" })}
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
                              >
                                <span>✓</span>
                                <span>Accept Request</span>
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => setRespondingRequest({ request: req, targetStatus: "REJECTED" })}
                                className="px-4 py-2.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-2xl text-xs font-bold transition-all"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {isAccepted && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                to={`/messages?userId=${student?.id}`}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                              >
                                <MessageSquare size={13} />
                                <span>Chat Mentee</span>
                              </Link>
                              <a
                                href={`mailto:${student?.email}`}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                                title="Email Mentee"
                              >
                                ✉️
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: MY MENTEES                                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "mentees" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Your Active Mentees</h2>
                  <p className="text-xs text-slate-500">
                    Students currently receiving your mentorship and career coaching.
                  </p>
                </div>
                <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200">
                  {activeMentees.length} Active Mentees
                </span>
              </div>

              {activeMentees.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="font-bold text-slate-800 text-base">No active mentees yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    When you accept student mentorship requests, they will appear here as your mentees.
                  </p>
                  <button
                    onClick={() => setActiveTab("mentorship_requests")}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm"
                  >
                    Check Mentorship Inbox
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeMentees.map((m) => {
                    const student = m.student;
                    const profile = student?.studentProfile;

                    return (
                      <div
                        key={m.id}
                        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start gap-4 mb-4">
                            {student?.profilePhoto ? (
                              <img
                                src={student.profilePhoto}
                                alt={student.firstName}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(
                                  student?.id
                                )} text-white font-black text-lg flex items-center justify-center shrink-0`}
                              >
                                {initials(student?.firstName, student?.lastName)}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 text-base">
                                  {student?.firstName} {student?.lastName}
                                </h4>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                  Mentee
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                {profile?.branch || "Student"}
                                {profile?.graduationYear ? ` • Class of ${profile.graduationYear}` : ""}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">{student?.email}</p>
                            </div>
                          </div>

                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5 mb-4">
                            <div>
                              <span className="font-bold text-slate-700">Topic:</span>{" "}
                              <span className="font-semibold text-slate-900">{m.topic}</span>
                            </div>
                            {m.goals && (
                              <div>
                                <span className="font-bold text-slate-700">Goals:</span>{" "}
                                <span className="text-slate-600">{m.goals}</span>
                              </div>
                            )}
                            {m.responseNote && (
                              <div className="text-emerald-800 italic bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                                "Your Note: {m.responseNote}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            to={`/messages?userId=${student?.id}`}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl text-center shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare size={13} />
                            <span>Chat with Mentee</span>
                          </Link>
                          <a
                            href={`mailto:${student?.email}`}
                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center"
                            title="Email Mentee"
                          >
                            ✉️
                          </a>
                          <button
                            onClick={async () => {
                              if (window.confirm("Mark this mentorship session as completed?")) {
                                await mentorshipService.completeMentorship(m.id);
                                fetchDashboardData();
                              }
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            Mark Completed 🏆
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: CONNECTION REQUESTS                                      */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "connections" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Student Connection Requests</h2>
                  <p className="text-xs text-slate-500">General network connection requests from students.</p>
                </div>
                <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-100">
                  {connectionRequests.length} Pending
                </span>
              </div>

              {connectionRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                  <div className="text-4xl mb-3">🔗</div>
                  <h3 className="font-bold text-slate-800 text-base">No pending connection requests</h3>
                  <p className="text-xs text-slate-500 mt-1">All incoming connection requests have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectionRequests.map((c) => {
                    const student = c.sender;
                    const isBusy = actionInProgress[c.id];

                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          {student?.profilePhoto ? (
                            <img
                              src={student.profilePhoto}
                              alt={student.firstName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(
                                student?.id
                              )} text-white font-black text-sm flex items-center justify-center`}
                            >
                              {initials(student?.firstName, student?.lastName)}
                            </div>
                          )}

                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">
                              {student?.firstName} {student?.lastName}
                            </h4>
                            <p className="text-xs text-slate-500">{student?.studentProfile?.branch || "Student"}</p>
                            {c.message && (
                              <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                "{c.message}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            disabled={isBusy}
                            onClick={() => handleRespondConnection(c.id, "ACCEPTED")}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            ✓ Accept
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => handleRespondConnection(c.id, "REJECTED")}
                            className="px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-xl text-xs font-semibold"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Response Note Modal for Alumni */}
      {respondingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative">
            <button
              onClick={() => {
                setRespondingRequest(null);
                setResponseNote("");
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
            >
              ×
            </button>

            <h3 className="font-extrabold text-slate-900 text-base mb-1">
              {respondingRequest.targetStatus === "ACCEPTED" ? "Accept Mentorship Request 🎉" : "Decline Mentorship Request"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Responding to {respondingRequest.request.student?.firstName} {respondingRequest.request.student?.lastName} for "
              {respondingRequest.request.topic}".
            </p>

            <form onSubmit={submitMentorshipResponse} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {respondingRequest.targetStatus === "ACCEPTED"
                    ? "Welcome Note / Meeting Instructions (Optional)"
                    : "Reason / Encouraging Feedback (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder={
                    respondingRequest.targetStatus === "ACCEPTED"
                      ? "e.g., Happy to mentor you! Feel free to email me your resume and project links so we can schedule our first session."
                      : "e.g., Thank you for reaching out! Currently at capacity for backend mentorship, but keep up the great work on your projects."
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-2xs"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRespondingRequest(null);
                    setResponseNote("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress[respondingRequest.request.id]}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-all shadow-sm ${
                    respondingRequest.targetStatus === "ACCEPTED"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionInProgress[respondingRequest.request.id] ? (
                    "Processing..."
                  ) : (
                    `Confirm ${respondingRequest.targetStatus === "ACCEPTED" ? "Acceptance" : "Decline"}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
