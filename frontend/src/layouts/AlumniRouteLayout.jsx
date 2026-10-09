import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { mentorshipService } from "../services/mentorshipService";
import { connectionService } from "../services/connectionService";
import { alumniProfileService } from "../services/alumniProfileService";
import { AlumniProfileEditor } from "../pages/dashboards/AlumniOverview";
import AlumniShell from "./AlumniShell";
import AdminShell from './AdminShell';
import StudentShell from "./StudentShell";

// Shared service pages retain their own content/actions; Alumni get the same navigation shell.
export default function AlumniRouteLayout() {
  const { user } = useAuth(),
    { socket } = useSocket(),
    location = useLocation(),
    navigate = useNavigate();
  const [routeSearch, setRouteSearch] = useState("");
  const networkSearch = ["/messages", "/alumni/directory", "/jobs", "/events"].includes(location.pathname);
  useEffect(() => setRouteSearch(new URLSearchParams(location.search).get("q") || ""), [location.pathname, location.search]);
  const [profile, setProfile] = useState(null),
    [counts, setCounts] = useState({}),
    [edit, setEdit] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (user?.role !== "ALUMNI") return;
    setLoading(true);
    const results = await Promise.allSettled([
      mentorshipService.getReceivedRequests({ status: "PENDING", limit: 1 }),
      mentorshipService.getActiveMentorships(),
      connectionService.getReceivedRequests({ status: "PENDING", limit: 1 }),
      alumniProfileService.getProfile(),
    ]);
    const [requests, mentees, connections, prof] = results;
    setCounts({
      pending:
        requests.status === "fulfilled"
          ? requests.value.data?.pagination?.total
          : undefined,
      mentees:
        mentees.status === "fulfilled" ? mentees.value.data?.length : undefined,
      connections:
        connections.status === "fulfilled"
          ? connections.value.data?.pagination?.total
          : undefined,
    });
    if (prof.status === "fulfilled" && prof.value.success)
      setProfile(prof.value.data.profile);
    setError(
      results.some((r) => r.status === "rejected")
        ? "Some navigation data could not be loaded. Refresh to retry."
        : "",
    );
    setLoading(false);
  }, [user?.id, user?.role]);
  useEffect(() => {
    load();
  }, [load, location.pathname]);
  useEffect(() => {
    if (user?.role !== "ALUMNI") return;
    const events = [
      "mentorship:received",
      "mentorship:updated",
      "connection:received",
      "connection:updated",
    ];
    events.forEach((e) => window.addEventListener(e, load));
    socket?.on("notification:new", load);
    return () => {
      events.forEach((e) => window.removeEventListener(e, load));
      socket?.off("notification:new", load);
    };
  }, [load, socket, user?.role]);
  if (user?.role === "STUDENT")
    return (
      <StudentShell>
        <div className="student-shell-routed">
          <Outlet />
        </div>
      </StudentShell>
    );
  if (user?.role === "ADMIN") return <AdminShell><Outlet /></AdminShell>;
  if (user?.role !== "ALUMNI") return <Outlet />;
  const active = location.pathname.startsWith("/messages")
    ? "messages"
    : location.pathname.startsWith("/communities")
      ? "communities"
      : location.pathname.startsWith("/events")
        ? "events"
        : location.pathname === "/jobs"
          ? "jobs"
          : location.pathname === "/leaderboard"
            ? "leaderboard"
            : "directory";
  return (
    <AlumniShell
      activeTab={active}
      onNavigate={(tab) =>
        navigate(`/alumni/dashboard${tab === "dashboard" ? "" : `?tab=${tab}`}`)
      }
      profile={profile}
      pendingMentorshipCount={counts.pending}
      menteeCount={counts.mentees}
      connectionCount={counts.connections}
      openProfileEditor={() => {
        if (profile) setEdit(true);
        else setError("Profile unavailable. Refresh to retry.");
      }}
      onRefresh={load}
      loading={loading}
      searchLabel={networkSearch ? ({messages:"Search conversations",directory:"Search alumni directory",jobs:"Search jobs",events:"Search events"}[active]) : "Search mentorship requests"}
      searchPlaceholder={networkSearch ? ({messages:"Search conversations… (Enter)",directory:"Search alumni, companies, skills… (Enter)",jobs:"Search job titles or companies… (Enter)",events:"Search events or speakers… (Enter)"}[active]) : "Search mentorship requests… (Enter)"}
      search={routeSearch}
      onSearch={setRouteSearch}
      onSearchSubmit={(value) =>
        navigate(
          networkSearch ? `${location.pathname}?q=${encodeURIComponent(value)}` : `/alumni/dashboard?tab=mentorship_requests&q=${encodeURIComponent(value)}`,
        )
      }
    >
      {error && (
        <div className="ad-error" role="alert">
          {error}
        </div>
      )}
      <div className="ad-routed-page">
        <Outlet />
      </div>
      {edit && (
        <AlumniProfileEditor
          profile={profile}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            load();
          }}
        />
      )}
    </AlumniShell>
  );
}
