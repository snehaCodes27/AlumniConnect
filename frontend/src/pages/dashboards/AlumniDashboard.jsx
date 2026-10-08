import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { connectionService } from "../../services/connectionService";
import { mentorshipService } from "../../services/mentorshipService";
import { eventService } from "../../services/eventService";
import { useSocket } from "../../context/SocketContext";
import { jobService } from "../../services/jobService";
import { alumniProfileService } from "../../services/alumniProfileService";
import { gamificationService } from "../../services/gamificationService";
import CreateJobModal from "../../components/CreateJobModal";
import CreateEventModal from "../../components/CreateEventModal";
import AlumniOverview, { AlumniProfileEditor } from "./AlumniOverview";
import "./alumni-dashboard.css";
import AlumniShell from "../../layouts/AlumniShell";
import MentorshipInbox from "./MentorshipInbox";
import MyMentees from "./MyMentees";
import ConnectionInbox from "./ConnectionInbox";
import { saveMentorshipCompletion } from "./menteeCompletion";
import { MessageSquare } from "lucide-react";

async function allPages(fetchPage, key) {
  const first = await fetchPage(1);
  if (!first.success) throw new Error("Unable to load " + key);
  const values = [...(first.data?.[key] || [])];
  for (
    let page = 2;
    page <= (first.data?.pagination?.totalPages || 1);
    page++
  ) {
    const next = await fetchPage(page);
    if (!next.success) throw new Error("Unable to load " + key);
    values.push(...(next.data?.[key] || []));
  }
  return values;
}

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
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [jobs, setJobs] = useState([]),
    [profile, setProfile] = useState(null),
    [profileUser, setProfileUser] = useState(null),
    [game, setGame] = useState(null);
  const [errors, setErrors] = useState([]),
    [search, setSearch] = useState("");
  const [showJob, setShowJob] = useState(false),
    [showEvent, setShowEvent] = useState(false),
    [showProfile, setShowProfile] = useState(false);
  const loadSequence = useRef(0);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    setSearch(params.get("q") || "");
  }, [params.get("q")]);
  const activeTab = [
    "dashboard",
    "mentorship_requests",
    "mentees",
    "connections",
  ].includes(params.get("tab"))
    ? params.get("tab")
    : "dashboard";
  const setActiveTab = (tab) => {
    setSearch("");
    setParams(tab === "dashboard" ? {} : { tab });
  }; // 'dashboard' | 'mentorship_requests' | 'mentees' | 'connections'
  const handleSearch = (value) => {
    setSearch(value);
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    if (
      !["dashboard", "mentorship_requests", "mentees", "connections"].includes(
        activeTab,
      )
    )
      next.delete("tab");
    setParams(next, { replace: true });
  };
  const [mentorshipRequests, setMentorshipRequests] = useState([]);
  const [activeMentees, setActiveMentees] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [sentConnections, setSentConnections] = useState([]);
  const [connections, setConnections] = useState([]);
  const [myEvents, setMyEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState({});

  const [statusMessage, setStatusMessage] = useState("");

  // Response Note Modal State
  const [respondingRequest, setRespondingRequest] = useState(null); // { request, targetStatus: 'ACCEPTED' | 'REJECTED' }
  const [responseNote, setResponseNote] = useState("");
  const [responseError, setResponseError] = useState("");
  const responseDialog = useRef(null);
  useEffect(() => {
    if (!respondingRequest) return;
    setResponseError("");
    const previous = document.activeElement;
    responseDialog.current?.querySelector("textarea")?.focus();
    const key = (e) => {
      if (
        e.key === "Escape" &&
        !responseDialog.current?.querySelector('button[type="submit"]')
          ?.disabled
      ) {
        setRespondingRequest(null);
        setResponseNote("");
      }
      if (e.key === "Tab") {
        const nodes = [
            ...responseDialog.current.querySelectorAll(
              "button:not(:disabled),textarea",
            ),
          ],
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
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [respondingRequest]);

  const openProfileEditor = () => {
    if (!profile || errors.includes("profile")) {
      setStatusMessage(
        "Profile unavailable. Retry loading your profile before editing.",
      );
      return;
    }
    setShowProfile(true);
  };

  // ── Fetch All Real Data from PostgreSQL ─────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    const sources = [
      [
        "mentorship",
        () =>
          allPages(
            (page) =>
              mentorshipService.getReceivedRequests({ page, limit: 50 }),
            "requests",
          ),
        setMentorshipRequests,
      ],
      [
        "mentees",
        async () => {
          const r = await mentorshipService.getActiveMentorships();
          if (!r.success) throw new Error();
          return r.data || [];
        },
        setActiveMentees,
      ],
      [
        "connectionRequests",
        () =>
          allPages(
            (page) =>
              connectionService.getReceivedRequests({
                status: "",
                page,
                limit: 50,
              }),
            "requests",
          ),
        setConnectionRequests,
      ],
      [
        "sentConnections",
        () =>
          allPages(
            (page) => connectionService.getSentRequests({ page, limit: 50 }),
            "requests",
          ),
        setSentConnections,
      ],
      [
        "connections",
        () =>
          allPages(
            (page) => connectionService.getMyConnections({ page, limit: 50 }),
            "connections",
          ),
        setConnections,
      ],
      [
        "events",
        () =>
          allPages(
            (page) =>
              eventService.getEvents({ filterScope: "my", page, limit: 50 }),
            "events",
          ),
        setMyEvents,
      ],
      [
        "jobs",
        () =>
          allPages(
            (page) => jobService.getAlumniJobs({ page, limit: 50 }),
            "jobs",
          ),
        setJobs,
      ],
      [
        "profile",
        async () => {
          const r = await alumniProfileService.getProfile();
          if (!r.success) throw new Error();
          return r.data;
        },
        (value) => {
          setProfile(value.profile);
          setProfileUser(value.user);
        },
      ],
      [
        "game",
        async () => {
          const r = await gamificationService.getUserProfile(user.id);
          if (!r.success) throw new Error();
          return r.data;
        },
        setGame,
      ],
    ];
    const results = await Promise.allSettled(
      sources.map(([, fetch]) => fetch()),
    );
    if (sequence !== loadSequence.current) return;
    const failed = [];
    results.forEach((r, index) => {
      if (r.status === "fulfilled") sources[index][2](r.value);
      else failed.push(sources[index][0]);
    });
    setErrors(failed);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Real-time Socket.IO Listeners ───────────────────────────────────────────
  useEffect(() => {
    const handleMentorshipReceived = (e) => {
      const newReq = e.detail;
      if (!newReq) return;
      setMentorshipRequests((prev) => [
        newReq,
        ...prev.filter((r) => r.id !== newReq.id),
      ]);
      setStatusMessage(
        `New mentorship request from ${newReq.student?.firstName || "a student"} (${newReq.topic || "Guidance"})!`,
      );
      setTimeout(() => setStatusMessage(""), 5000);
      fetchDashboardData();
    };

    const handleMentorshipUpdated = (e) => {
      fetchDashboardData();
    };

    const handleConnReceived = (e) => {
      const newConn = e.detail;
      if (!newConn) return;
      setConnectionRequests((prev) => [
        newConn,
        ...prev.filter((r) => r.id !== newConn.id),
      ]);
      fetchDashboardData();
      setStatusMessage(
        `New connection request from ${newConn.sender?.firstName || "a student"}!`,
      );
      setTimeout(() => setStatusMessage(""), 4000);
    };

    const handleConnUpdated = () => {
      fetchDashboardData();
    };

    window.addEventListener(
      "mentorship:request:received",
      handleMentorshipReceived,
    );
    window.addEventListener("mentorship:updated", handleMentorshipUpdated);
    window.addEventListener("mentorship:cancelled", handleMentorshipUpdated);
    window.addEventListener("connection:received", handleConnReceived);
    window.addEventListener("connection:updated", handleConnUpdated);
    socket?.on("connection:request:sent", handleConnUpdated);
    socket?.on("connection:withdrawn", handleConnUpdated);

    return () => {
      window.removeEventListener(
        "mentorship:request:received",
        handleMentorshipReceived,
      );
      window.removeEventListener("mentorship:updated", handleMentorshipUpdated);
      window.removeEventListener(
        "mentorship:cancelled",
        handleMentorshipUpdated,
      );
      window.removeEventListener("connection:received", handleConnReceived);
      window.removeEventListener("connection:updated", handleConnUpdated);
      socket?.off("connection:request:sent", handleConnUpdated);
      socket?.off("connection:withdrawn", handleConnUpdated);
    };
  }, [fetchDashboardData, socket]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchDashboardData();
    const events = [
      "job:application:received",
      "job:application:status:updated",
      "event:registration:new",
      "event:cancelled",
      "gamification:points_awarded",
      "gamification:badge_earned",
      "notification:new",
    ];
    events.forEach((name) => socket.on(name, refresh));
    return () => events.forEach((name) => socket.off(name, refresh));
  }, [socket, fetchDashboardData]);

  // ── Handle Mentorship Response with Note ───────────────────────────────────
  const submitMentorshipResponse = async (e) => {
    e.preventDefault();
    if (!respondingRequest) return;
    const { request, targetStatus } = respondingRequest;

    setResponseError("");
    setActionInProgress((prev) => ({ ...prev, [request.id]: true }));
    try {
      const res = await mentorshipService.respondRequest(
        request.id,
        targetStatus,
        responseNote,
      );
      if (!res.success)
        throw new Error(res.message || "Failed to update mentorship request.");
      if (res.success) {
        setStatusMessage(
          `Mentorship request ${targetStatus === "ACCEPTED" ? "accepted" : "declined"}.`,
        );
        setTimeout(() => setStatusMessage(""), 4000);
        setRespondingRequest(null);
        setResponseNote("");
        fetchDashboardData();
      }
    } catch (err) {
      setResponseError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update mentorship request.",
      );
    } finally {
      setActionInProgress((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  // ── Handle Quick Accept/Reject Connection ─────────────────────────────────
  const connectionActions = useRef(new Set());
  const handleRespondConnection = async (id, status) => {
    if (connectionActions.current.has(id)) return;
    connectionActions.current.add(id);
    setActionInProgress((p) => ({ ...p, [id]: true }));
    try {
      const r = await connectionService.respondRequest(id, status);
      if (!r.success)
        throw new Error(
          r.message || "Unable to respond to connection request.",
        );
      await fetchDashboardData();
      setStatusMessage(
        status === "ACCEPTED"
          ? "Connection accepted."
          : "Connection request rejected.",
      );
    } finally {
      connectionActions.current.delete(id);
      setActionInProgress((p) => ({ ...p, [id]: false }));
    }
  };
  const handleWithdrawConnection = async (id) => {
    if (connectionActions.current.has(id)) return;
    connectionActions.current.add(id);
    setActionInProgress((p) => ({ ...p, [id]: true }));
    try {
      const r = await connectionService.withdrawRequest(id);
      if (!r.success)
        throw new Error(r.message || "Unable to withdraw request.");
      await fetchDashboardData();
      setStatusMessage("Sent connection request withdrawn.");
    } finally {
      connectionActions.current.delete(id);
      setActionInProgress((p) => ({ ...p, [id]: false }));
    }
  };

  const completingIds = useRef(new Set());
  const completeActiveMentorship = async (id) => {
    if (completingIds.current.has(id))
      throw new Error("Completion is already being saved.");
    completingIds.current.add(id);
    setActionInProgress((p) => ({ ...p, [id]: true }));
    try {
      await saveMentorshipCompletion(
        id,
        mentorshipService.completeMentorship,
        fetchDashboardData,
      );
      setStatusMessage(
        "Mentorship completed. Your contribution has been recorded.",
      );
    } finally {
      completingIds.current.delete(id);
      setActionInProgress((p) => ({ ...p, [id]: false }));
    }
  };

  const pendingMentorshipCount = mentorshipRequests.filter(
    (r) => r.status === "PENDING",
  ).length;

  return (
    <AlumniShell
      activeTab={activeTab}
      onNavigate={setActiveTab}
      pendingMentorshipCount={pendingMentorshipCount}
      menteeCount={activeMentees.length}
      connectionCount={
        connectionRequests.filter((r) => r.status === "PENDING").length
      }
      profile={profile}
      openProfileEditor={openProfileEditor}
      search={search}
      onSearch={handleSearch}
      onRefresh={fetchDashboardData}
      loading={loading}
      searchLabel={
        activeTab === "connections"
          ? "Search connection requests"
          : activeTab === "mentees"
            ? "Search active mentees"
            : activeTab === "mentorship_requests"
              ? "Search mentorship requests"
              : "Search dashboard records"
      }
      searchPlaceholder={
        activeTab === "connections"
          ? "Search by name, domain, or branch…"
          : activeTab === "mentees"
            ? "Search by student name or mentorship topic…"
            : activeTab === "mentorship_requests"
              ? "Search by student name, topic, or skills…"
              : "Search mentees, requests, sessions, opportunities…"
      }
    >
      {/* Live Notification Banner */}
      {statusMessage && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-md">
          <span>✨ {statusMessage}</span>
          <button
            onClick={() => setStatusMessage("")}
            className="font-bold text-sm text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Content Body */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB: DASHBOARD OVERVIEW                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {errors.length > 0 && (
          <div className="ad-error" role="alert">
            <span>
              Some dashboard data could not be loaded: {errors.join(", ")}.
              Counts marked — are unavailable.
            </span>
            <button onClick={fetchDashboardData}>Retry</button>
          </div>
        )}
        {activeTab !== "dashboard" &&
          activeTab !== "mentorship_requests" &&
          activeTab !== "mentees" &&
          activeTab !== "connections" &&
          loading && (
            <div
              className="ad-skeleton-grid"
              role="status"
              aria-label="Loading dashboard tab"
            >
              <div />
            </div>
          )}
        {activeTab === "dashboard" && (
          <AlumniOverview
            user={profileUser || user}
            profile={profile}
            mentorshipRequests={mentorshipRequests}
            activeMentees={activeMentees}
            connections={connections}
            myEvents={myEvents}
            jobs={jobs}
            game={game}
            errors={errors}
            loading={loading}
            setActiveTab={setActiveTab}
            setRespondingRequest={setRespondingRequest}
            actionInProgress={actionInProgress}
            openJob={() => setShowJob(true)}
            openEvent={() => setShowEvent(true)}
            openProfile={openProfileEditor}
            search={search}
          />
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB: MENTORSHIP REQUESTS (FULL INBOX)                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "mentorship_requests" && (
          <MentorshipInbox
            requests={mentorshipRequests}
            loading={loading}
            error={errors.includes("mentorship")}
            retry={fetchDashboardData}
            search={search}
            onSearch={handleSearch}
            onRespond={(request) => {
              setResponseNote("");
              setRespondingRequest(request);
            }}
            busy={actionInProgress}
            onComplete={async (id) => {
              setActionInProgress((p) => ({ ...p, [id]: true }));
              try {
                const r = await mentorshipService.completeMentorship(id);
                if (!r.success)
                  throw new Error(r.message || "Unable to complete mentorship");
                setStatusMessage("Mentorship completed.");
                fetchDashboardData();
                return true;
              } catch (e) {
                setStatusMessage(e.response?.data?.message || e.message);
                return false;
              } finally {
                setActionInProgress((p) => ({ ...p, [id]: false }));
              }
            }}
          />
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB: MY MENTEES                                               */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "mentees" && (
          <MyMentees
            mentees={activeMentees}
            loading={loading}
            error={errors.includes("mentees")}
            retry={fetchDashboardData}
            search={search}
            onSearch={handleSearch}
            onOpenRequests={() => setActiveTab("mentorship_requests")}
            onComplete={completeActiveMentorship}
            busy={actionInProgress}
          />
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB: CONNECTION REQUESTS                                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "connections" && (
          <ConnectionInbox
            incoming={connectionRequests}
            sent={sentConnections}
            loading={loading}
            incomingError={errors.includes("connectionRequests")}
            sentError={errors.includes("sentConnections")}
            retry={fetchDashboardData}
            search={search}
            onSearch={handleSearch}
            onRespond={handleRespondConnection}
            onWithdraw={handleWithdrawConnection}
            busy={actionInProgress}
            connected={isConnected}
          />
        )}
      </main>

      {showJob && (
        <CreateJobModal
          onClose={() => setShowJob(false)}
          onSuccess={() => {
            setShowJob(false);
            fetchDashboardData();
          }}
        />
      )}
      {showEvent && (
        <CreateEventModal
          onClose={() => setShowEvent(false)}
          onSuccess={() => {
            setShowEvent(false);
            fetchDashboardData();
          }}
        />
      )}
      {showProfile && (
        <AlumniProfileEditor
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={() => {
            setShowProfile(false);
            fetchDashboardData();
          }}
        />
      )}
      {/* Response Note Modal for Alumni */}
      {respondingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div
            ref={responseDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ad-response-title"
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative"
          >
            <button
              onClick={() => {
                setRespondingRequest(null);
                setResponseNote("");
              }}
              aria-label="Close response dialog"
              disabled={actionInProgress[respondingRequest.request.id]}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
            >
              ×
            </button>

            <h3
              id="ad-response-title"
              className="font-extrabold text-slate-900 text-base mb-1"
            >
              {respondingRequest.targetStatus === "ACCEPTED"
                ? "Accept Mentorship Request 🎉"
                : "Decline Mentorship Request"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Responding to {respondingRequest.request.student?.firstName}{" "}
              {respondingRequest.request.student?.lastName} for "
              {respondingRequest.request.topic}".
            </p>

            {responseError && (
              <p className="ad-error" role="alert">
                {responseError}
              </p>
            )}
            <form
              onSubmit={submitMentorshipResponse}
              className="space-y-4 text-xs"
            >
              <div>
                <label
                  htmlFor="ad-response-note"
                  className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  {respondingRequest.targetStatus === "ACCEPTED"
                    ? "Welcome Note / Meeting Instructions (Optional)"
                    : "Reason / Encouraging Feedback (Optional)"}
                </label>
                <textarea
                  id="ad-response-note"
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
                  {actionInProgress[respondingRequest.request.id]
                    ? "Processing..."
                    : `Confirm ${respondingRequest.targetStatus === "ACCEPTED" ? "Acceptance" : "Decline"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AlumniShell>
  );
}
