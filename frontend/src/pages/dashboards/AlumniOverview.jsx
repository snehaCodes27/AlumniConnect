import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  Link2,
  MessageSquare,
  Settings,
  Users,
  X,
} from "lucide-react";
import { alumniProfileService } from "../../services/alumniProfileService";
import api from "../../services/api";

export function completionItems(user, profile) {
  return [
    {
      label: "Basic Information",
      done: !!(
        user?.firstName &&
        user?.lastName &&
        user?.phone &&
        profile?.location
      ),
    },
    {
      label: "Academic Details",
      done: !!(profile?.graduationYear && profile?.branch),
    },
    {
      label: "Professional Experience",
      done: !!(
        profile?.currentCompany &&
        profile?.jobRole &&
        profile?.yearsOfExperience != null
      ),
    },
    {
      label: "Skills & Expertise",
      done: !!(profile?.skills?.length && profile?.areasOfExpertise?.length),
    },
    { label: "Profile Photo", done: !!user?.profilePhoto, optional: true },
    {
      label: "Career History",
      done: !!profile?.previousCompanies?.length,
      optional: true,
    },
    {
      label: "Mentorship Availability",
      done: typeof profile?.mentorshipAvailable === "boolean",
      optional: true,
    },
  ];
}
export function AlumniAvatar({ user, large = false }) {
  return user?.profilePhoto ? (
    <img
      className={`ad-avatar ${large ? "large" : ""}`}
      src={user.profilePhoto}
      alt={`${user.firstName || "Alumni"} profile`}
    />
  ) : (
    <span className={`ad-avatar ${large ? "large" : ""}`}>
      {`${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
        "AC"}
    </span>
  );
}
const dateLabel = (date) =>
  new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
function Panel({
  title,
  icon: Icon,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`ad-panel ${className}`}>
      <div className="ad-panel-heading">
        <div>
          <h2>
            <Icon size={19} aria-hidden="true" />
            {title}
          </h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ title, text, icon: Icon = Users }) {
  return (
    <div className="ad-empty">
      <span>
        <Icon size={30} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default function AlumniOverview({
  user,
  profile,
  mentorshipRequests,
  activeMentees,
  connections,
  myEvents,
  jobs,
  game,
  errors,
  loading,
  setActiveTab,
  setRespondingRequest,
  actionInProgress,
  openJob,
  openEvent,
  openProfile,
  search,
}) {
  const pending = mentorshipRequests.filter((r) => r.status === "PENDING");
  const [driveInvite, setDriveInvite] = useState(null);
  const [driveAccepting, setDriveAccepting] = useState(false);
  const [driveAcceptedStatus, setDriveAcceptedStatus] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    api.get('/company-connect/drives')
      .then((res) => {
        const drives = res.data?.drives || [];
        for (const d of drives) {
          const inv = d.invitedAlumni?.find(a => a.alumniId === user.id);
          if (inv) {
            setDriveInvite({ drive: d, invite: inv });
            if (inv.status === 'ACCEPTED' || d.acceptedAlumni?.some(a => a.alumniId === user.id)) {
              setDriveAcceptedStatus(true);
            }
            break;
          }
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const handleDriveResponse = async (action) => {
    if (!driveInvite) return;
    setDriveAccepting(true);
    try {
      await api.post('/company-connect/respond', {
        driveId: driveInvite.drive.id,
        action,
      });
      if (action === 'ACCEPT') {
        setDriveAcceptedStatus(true);
      } else {
        setDriveInvite(null);
      }
    } catch (err) {
      console.error('Failed to respond to drive:', err);
    } finally {
      setDriveAccepting(false);
    }
  };
  const upcoming = myEvents
    .filter(
      (e) =>
        e.status === "PUBLISHED" &&
        new Date(e.startDate).getTime() > Date.now(),
    )
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const items = completionItems(user, profile);
  const required = items.filter((i) => !i.optional);
  const percent = Math.round(
    (required.filter((i) => i.done).length / required.length) * 100,
  );
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const match = (value) =>
    !search ||
    String(value || "")
      .toLowerCase()
      .includes(search.toLowerCase());
  const requestMatches = pending.filter((r) =>
    match(`${r.student?.firstName} ${r.student?.lastName} ${r.topic}`),
  );
  const menteeMatches = activeMentees.filter((r) =>
    match(`${r.student?.firstName} ${r.student?.lastName} ${r.topic}`),
  );
  const jobMatches = jobs.filter((j) => match(`${j.title} ${j.company}`));
  const eventMatches = myEvents.filter((e) => match(`${e.title} ${e.type}`));
  const stats = [
    {
      label: "Pending Mentorships",
      count: pending.length,
      icon: Award,
      tone: "amber",
      source: "mentorship",
      onClick: () => setActiveTab("mentorship_requests"),
    },
    {
      label: "Active Mentees",
      count: activeMentees.length,
      icon: Users,
      tone: "purple",
      source: "mentees",
      onClick: () => setActiveTab("mentees"),
    },
    {
      label: "Total Connections",
      count: connections.length,
      icon: Link2,
      tone: "blue",
      source: "connections",
      onClick: () => setActiveTab("connections"),
    },
    {
      label: "Active Opportunities",
      count: jobs.filter((j) => j.status === "ACTIVE").length,
      icon: Briefcase,
      tone: "pink",
      source: "jobs",
      href: "/jobs",
    },
    {
      label: "Event Commitments",
      count: upcoming.length,
      icon: Calendar,
      tone: "teal",
      source: "events",
      href: "/events",
    },
  ];
  const actionLink = (text, onClick) => (
    <button className="ad-text-button" onClick={onClick}>
      {text}
      <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
  const count = (value, source) =>
    loading || errors.includes(source) ? "—" : value;
  return (
    <div className="ad-overview">
      <div className="ad-body-grid">
        <div className="ad-primary">
          {driveInvite && (
            <div style={{
              background: driveAcceptedStatus
                ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '20px',
              color: '#fff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: driveAcceptedStatus ? '1px solid #059669' : '1px solid #6366f1',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}>
                    🏢
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: driveAcceptedStatus ? '#6ee7b7' : '#a5b4fc', fontWeight: 700 }}>
                      {driveAcceptedStatus ? '🌟 Official Placement Mentor' : '📢 College Placement Drive Request'}
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                      {driveInvite.drive.companyName} Placement Drive — Guidance Invitation
                    </h3>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.12)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#e0e7ff',
                }}>
                  📅 Drive Date: {driveInvite.drive.driveDate}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '14px', color: '#e0e7ff', lineHeight: 1.5 }}>
                {driveAcceptedStatus ? (
                  <>
                    Thank you for stepping up to guide juniors! You are recognized as an alumni mentor for <strong>{driveInvite.drive.companyName}</strong>. Students who meet eligibility will be joined in your preparation session.
                  </>
                ) : (
                  <>
                    Placement cell has announced a placement drive for <strong>{driveInvite.drive.companyName}</strong> on <strong>{driveInvite.drive.driveDate}</strong>. Since you have experience at {driveInvite.drive.companyName}, the admin has requested your mentorship to guide junior students preparing for interviews!
                  </>
                )}
              </p>

              {!driveAcceptedStatus ? (
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleDriveResponse('ACCEPT')}
                    disabled={driveAccepting}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: driveAccepting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {driveAccepting ? '⏳ Confirming...' : '✅ Accept & Guide Juniors'}
                  </button>
                  <button
                    onClick={() => handleDriveResponse('DECLINE')}
                    disabled={driveAccepting}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: '#e0e7ff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: driveAccepting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6ee7b7', fontSize: '13px', fontWeight: 600 }}>
                  <span>✅ Mentorship Accepted</span>
                  <span>•</span>
                  <span>Preparation Webinar: <a href={driveInvite.drive.webinarLink} target="_blank" rel="noreferrer" style={{ color: '#a7f3d0', textDecoration: 'underline' }}>{driveInvite.drive.webinarLink}</a></span>
                </div>
              )}
            </div>
          )}

          <section className="ad-hero">
            <div className="ad-hero-copy">
              <p className="ad-greeting">{greeting},</p>
              <h1>
                {user?.firstName} {user?.lastName}{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <p>
                Students are matched to you based on your domain expertise,
                company background and technical skills. Make a difference by
                sharing your knowledge and experience.
              </p>
              <div className="ad-hero-actions">
                <button
                  className="ad-primary-button"
                  onClick={() => setActiveTab("mentorship_requests")}
                >
                  <Users size={17} />
                  Review Mentorship Requests (
                  {count(pending.length, "mentorship")})<ArrowRight size={16} />
                </button>
                <button
                  className="ad-secondary-button"
                  onClick={() => setActiveTab("mentees")}
                >
                  View Active Mentees ({count(activeMentees.length, "mentees")})
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="ad-hero-visual" aria-hidden="true">
              <img
                src="/images/landing-alumni.jpg"
                alt=""
                width="1086"
                height="1448"
              />
              <span>
                Guide.
                <br />
                Support.
                <br />
                Empower.
              </span>
            </div>
          </section>
          <div className="ad-stats">
            {stats.map((s) => {
              const Icon = s.icon;
              const contents = (
                <>
                  <span className={`ad-icon ${s.tone}`}>
                    <Icon size={23} />
                  </span>
                  <span>
                    <strong>{count(s.count, s.source)}</strong>
                    <span>{s.label}</span>
                  </span>
                  <ArrowRight className="ad-stat-arrow" size={13} />
                </>
              );
              return s.href ? (
                <Link key={s.label} to={s.href} className="ad-stat">
                  {contents}
                </Link>
              ) : (
                <button key={s.label} onClick={s.onClick} className="ad-stat">
                  {contents}
                </button>
              );
            })}
          </div>
          {loading ? (
            <div
              className="ad-skeleton-grid"
              role="status"
              aria-label="Loading dashboard"
            >
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              <div className="ad-mentorship-grid">
                <Panel
                  title="Incoming Mentorship Requests"
                  icon={Clock}
                  subtitle="Pending requests from students seeking your guidance."
                  action={actionLink("View All", () =>
                    setActiveTab("mentorship_requests"),
                  )}
                >
                  {errors.includes("mentorship") ? (
                    <Empty
                      title="Requests unavailable"
                      text="Use Retry above to reconnect."
                      icon={Clock}
                    />
                  ) : !requestMatches.length ? (
                    <Empty
                      title={
                        search
                          ? "No matching requests"
                          : "You're all caught up!"
                      }
                      text={
                        search
                          ? "Try another name or topic."
                          : "No pending mentorship requests at the moment."
                      }
                      icon={CheckCircle2}
                    />
                  ) : (
                    requestMatches.slice(0, 3).map((req) => (
                      <article className="ad-request" key={req.id}>
                        <div className="ad-person">
                          <AlumniAvatar user={req.student} />
                          <div>
                            <strong>
                              {req.student?.firstName} {req.student?.lastName}
                            </strong>
                            <p>{req.topic || "Career guidance"}</p>
                          </div>
                          {req.matchScore != null && (
                            <span className="ad-tag">
                              {req.matchScore}% match
                            </span>
                          )}
                        </div>
                        {req.student?.studentProfile?.careerGoal && (
                          <p>{req.student.studentProfile.careerGoal}</p>
                        )}
                        <p className="ad-muted">
                          {req.createdAt && dateLabel(req.createdAt)}
                        </p>
                        <div className="ad-row-actions">
                          <button
                            className="ad-primary-button"
                            disabled={actionInProgress[req.id]}
                            onClick={() =>
                              setRespondingRequest({
                                request: req,
                                targetStatus: "ACCEPTED",
                              })
                            }
                          >
                            Accept Request
                          </button>
                          <button
                            className="ad-decline"
                            disabled={actionInProgress[req.id]}
                            onClick={() =>
                              setRespondingRequest({
                                request: req,
                                targetStatus: "REJECTED",
                              })
                            }
                          >
                            Decline
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </Panel>
                <Panel
                  title="Active Mentees"
                  icon={Users}
                  subtitle="Students you are currently mentoring."
                  action={
                    <span className="ad-tag">
                      {count(activeMentees.length, "mentees")}
                    </span>
                  }
                >
                  {errors.includes("mentees") ? (
                    <Empty
                      title="Mentees unavailable"
                      text="Use Retry above to reconnect."
                    />
                  ) : !menteeMatches.length ? (
                    <Empty
                      title={
                        search
                          ? "No matching mentees"
                          : "Make your first connection"
                      }
                      text="Accepted mentorships will appear here."
                    />
                  ) : (
                    menteeMatches.slice(0, 3).map((m) => (
                      <div className="ad-person ad-mentee" key={m.id}>
                        <AlumniAvatar user={m.student} />
                        <div>
                          <strong>
                            {m.student?.firstName} {m.student?.lastName}
                          </strong>
                          <p>{m.topic || "Career guidance"}</p>
                        </div>
                        <Link
                          className="ad-chat"
                          to={`/messages?userId=${m.student?.id}`}
                          aria-label={`Chat with ${m.student?.firstName}`}
                        >
                          <MessageSquare size={17} />
                        </Link>
                      </div>
                    ))
                  )}
                  <button
                    className="ad-wide-link"
                    onClick={() => setActiveTab("mentees")}
                  >
                    View All Mentees
                    <ArrowRight size={14} />
                  </button>
                </Panel>
              </div>
              <Panel
                title="My Event Communities & Sessions"
                icon={Calendar}
                action={actionLink("Host New Session", openEvent)}
              >
                <p className="ad-section-note">
                  {count(myEvents.length, "events")} hosted sessions · Share
                  announcements, resources and external meeting links.
                </p>
                {errors.includes("events") ? (
                  <Empty
                    title="Sessions unavailable"
                    text="Use Retry above to reconnect."
                    icon={Calendar}
                  />
                ) : !eventMatches.length ? (
                  <Empty
                    title={
                      search
                        ? "No matching sessions"
                        : "Your next session starts with you"
                    }
                    text="Host a webinar, workshop or mentoring panel for students."
                    icon={Calendar}
                  />
                ) : (
                  <div className="ad-events-grid">
                    {eventMatches.map((e) => (
                      <article className="ad-event" key={e.id}>
                        <div className="ad-event-meta">
                          <span className="ad-tag">
                            {e.type.replaceAll("_", " ")}
                          </span>
                          <span>
                            {e.registeredCount ?? e._count?.registrations ?? 0}{" "}
                            participants
                          </span>
                        </div>
                        <h3>{e.title}</h3>
                        <p>
                          <Calendar size={13} />
                          {dateLabel(e.startDate)}
                        </p>
                        <span className="ad-event-status">{e.status}</span>
                        <Link
                          className="ad-primary-button"
                          to={`/events/${e.id}/community`}
                        >
                          <Users size={15} />
                          Manage Community
                          <ArrowRight size={14} />
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel
                title="Your Posted Opportunities"
                icon={Briefcase}
                action={actionLink("Post Opportunity", openJob)}
              >
                {errors.includes("jobs") ? (
                  <Empty
                    title="Opportunities unavailable"
                    text="Use Retry above to reconnect."
                    icon={Briefcase}
                  />
                ) : !jobMatches.length ? (
                  <Empty
                    title={
                      search
                        ? "No matching opportunities"
                        : "Open a door for someone"
                    }
                    text={
                      search
                        ? "Try another title or company."
                        : "Share a job, internship or referral with your community."
                    }
                    icon={Briefcase}
                  />
                ) : (
                  jobMatches.slice(0, 3).map((j) => (
                    <Link to="/jobs" key={j.id} className="ad-job">
                      <span>
                        <strong>{j.title}</strong>
                        <p>
                          {j.company} · {j.location}
                        </p>
                      </span>
                      <span className="ad-tag">{j.status}</span>
                      <ArrowRight size={15} />
                    </Link>
                  ))
                )}
              </Panel>
            </>
          )}
        </div>
        <aside className="ad-secondary">
          <Panel
            title="My Profile"
            icon={GraduationCap}
            action={actionLink("Edit Profile", openProfile)}
          >
            <div className="ad-person ad-profile-person">
              <AlumniAvatar user={user} large />
              <div>
                <strong>
                  {user?.firstName} {user?.lastName}
                </strong>
                <p>Alumni Mentor</p>
                {profile && (
                  <p>
                    {[profile.jobRole, profile.currentCompany]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                )}
                <p>
                  {[
                    profile?.branch,
                    profile?.graduationYear
                      ? `Class of ${profile.graduationYear}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {errors.includes("profile") ? (
              <p className="ad-muted">
                Profile unavailable. Use Retry to reload.
              </p>
            ) : (
              <div className="ad-completion">
                <div>
                  <strong>Profile Completion</strong>
                  <strong>{loading ? "—" : `${percent}%`}</strong>
                </div>
                <progress
                  max="100"
                  value={percent}
                  aria-label="Alumni profile completion"
                />
                <ul>
                  {items.map((i) => (
                    <li key={i.label}>
                      {i.done ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Circle size={15} />
                      )}
                      <span>
                        {i.label}
                        {i.optional && <small> · optional</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
          <Panel title="Quick Actions" icon={Settings}>
            <div className="ad-quick-grid">
              <button onClick={() => setActiveTab("mentorship_requests")}>
                <span className="ad-icon purple">
                  <Users size={21} />
                </span>
                Review Mentorship Requests
              </button>
              <button onClick={openJob}>
                <span className="ad-icon teal">
                  <Briefcase size={21} />
                </span>
                Post Opportunity
              </button>
              <button onClick={openEvent}>
                <span className="ad-icon pink">
                  <Calendar size={21} />
                </span>
                Host Event
              </button>
              <Link to="/communities">
                <span className="ad-icon blue">
                  <Users size={21} />
                </span>
                Open Communities
              </Link>
            </div>
          </Panel>
          <Panel
            title="Upcoming Events"
            icon={Calendar}
            action={
              <Link className="ad-text-button" to="/events">
                View All
                <ArrowRight size={14} />
              </Link>
            }
          >
            {loading ? (
              <p className="ad-muted">Loading upcoming events…</p>
            ) : errors.includes("events") ? (
              <p className="ad-muted">Events unavailable.</p>
            ) : !upcoming.length ? (
              <Empty
                title="No upcoming commitments"
                text="Your published upcoming sessions appear here."
                icon={Calendar}
              />
            ) : (
              upcoming.slice(0, 3).map((e) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}/community`}
                  className="ad-upcoming"
                >
                  <span className="ad-tag">{e.type.replaceAll("_", " ")}</span>
                  <strong>{e.title}</strong>
                  <p>
                    <Calendar size={12} />
                    {dateLabel(e.startDate)}
                  </p>
                  <ArrowRight size={15} />
                </Link>
              ))
            )}
          </Panel>
          <Panel
            title="Your Impact & Badges"
            icon={Award}
            action={
              <Link className="ad-text-button" to="/leaderboard">
                View All
                <ArrowRight size={14} />
              </Link>
            }
          >
            {errors.includes("game") || !game ? (
              <p className="ad-muted">
                {loading
                  ? "Loading your contributions…"
                  : "Impact data unavailable. Use Retry to reload."}
              </p>
            ) : (
              <>
                <div className="ad-impact">
                  <strong>
                    {game.profile?.totalPoints ?? 0}
                    <small>Impact points</small>
                  </strong>
                  <strong>
                    {game.profile?.level ?? 1}
                    <small>Level</small>
                  </strong>
                  <strong>
                    {game.profile?.currentRank ?? "—"}
                    <small>Rank</small>
                  </strong>
                </div>
                <p className="ad-muted">
                  {game.earnedBadgesCount ??
                    game.badges?.filter((b) => b.isEarned).length ??
                    0}{" "}
                  badges earned through your contributions.
                </p>
                <div className="ad-badges">
                  {game.badges
                    ?.filter((b) => b.isEarned)
                    .slice(0, 3)
                    .map((b) => (
                      <span className="ad-tag" key={b.id || b.badge?.id}>
                        {b.badge?.name || b.name}
                      </span>
                    ))}
                </div>
                <Link to="/leaderboard" className="ad-wide-link">
                  Leaderboard & Badges
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function AlumniProfileEditor({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...profile,
    skills: profile?.skills?.join(", ") || "",
    areasOfExpertise: profile?.areasOfExpertise?.join(", ") || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("input")?.focus();
    const handle = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input,select,textarea",
          ),
        ];
        const first = nodes[0],
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
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [onClose]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await alumniProfileService.updateProfile({
        ...form,
        graduationYear:
          form.graduationYear != null ? String(form.graduationYear) : "",
        yearsOfExperience:
          form.yearsOfExperience != null ? String(form.yearsOfExperience) : "",
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        areasOfExpertise: form.areasOfExpertise
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (!result.success) throw new Error(result.message);
      onSaved();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Unable to save profile.",
      );
    } finally {
      setBusy(false);
    }
  };
  const fields = [
    ["graduationYear", "Graduation year", "number"],
    ["branch", "Academic branch"],
    ["currentCompany", "Current company"],
    ["jobRole", "Job role"],
    ["yearsOfExperience", "Years of experience", "number"],
    ["domain", "Domain"],
    ["location", "Location"],
    ["skills", "Skills (comma separated)"],
    ["areasOfExpertise", "Areas of expertise (comma separated)"],
    ["linkedinUrl", "LinkedIn URL", "url"],
    ["githubUrl", "GitHub URL", "url"],
  ];
  return (
    <div className="ad-modal-overlay">
      <section
        ref={ref}
        className="ad-profile-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-edit-title"
      >
        <div className="ad-panel-heading">
          <div>
            <h2 id="ad-edit-title">Edit Alumni Profile</h2>
            <p>Keep your mentoring and professional details up to date.</p>
          </div>
          <button onClick={onClose} aria-label="Close profile editor">
            <X size={20} />
          </button>
        </div>
        {error && (
          <p role="alert" className="ad-error">
            {error}
          </p>
        )}
        <form onSubmit={save}>
          <div className="ad-editor-fields">
            {fields.map(([key, label, type]) => (
              <label key={key} htmlFor={`ad-edit-${key}`}>
                {label}
                <input
                  id={`ad-edit-${key}`}
                  type={type || "text"}
                  min={type === "number" ? 0 : undefined}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="ad-availability">
            <input
              type="checkbox"
              checked={!!form.mentorshipAvailable}
              onChange={(e) =>
                setForm({ ...form, mentorshipAvailable: e.target.checked })
              }
            />
            Available for mentorship
          </label>
          <p className="ad-muted">
            Career history and resume are retained when you save these details.
          </p>
          <div className="ad-row-actions">
            <button
              type="button"
              className="ad-secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="ad-primary-button">
              {busy ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
