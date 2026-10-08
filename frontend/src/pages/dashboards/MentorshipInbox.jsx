import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  FileText,
  MessageSquare,
  Users,
  X,
  Target,
} from "lucide-react";
import "./mentorship-inbox.css";
import {
  requestSkills as skillsFor,
  requestName as nameFor,
  selectRequests,
} from "./mentorshipInboxUtils";

const statusNames = {
  ALL: "All Requests",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
const dateFor = (r) => new Date(r.createdAt);
function Status({ status }) {
  return (
    <span className={`mi-status mi-${status?.toLowerCase()}`}>
      {statusNames[status] || status}
    </span>
  );
}
export function Avatar({ student }) {
  return student?.profilePhoto ? (
    <img className="mi-avatar" src={student.profilePhoto} alt="" />
  ) : (
    <span className="mi-avatar">
      {`${student?.firstName?.trim()?.[0] || ""}${student?.lastName?.trim()?.[0] || ""}`.toUpperCase() ||
        "S"}
    </span>
  );
}
export function RequestDetails({ request, onClose, onComplete, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [...ref.current.querySelectorAll("button,a")];
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
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const p = request.student?.studentProfile || {};
  return (
    <div className="ad-modal-overlay">
      <section
        className="mi-details"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mi-details-title"
      >
        <div className="mi-row">
          <h2 id="mi-details-title">{nameFor(request)} · Mentorship details</h2>
          <button onClick={onClose} aria-label="Close request details">
            <X size={20} />
          </button>
        </div>
        <Status status={request.status} />
        <dl>
          {[
            ["Topic", request.topic],
            ["Student note", request.message],
            ["Career goals", request.goals],
            ["Branch", p.branch],
            ["Batch", p.batch],
            ["Preferred domain", p.preferredDomain],
            ["Preferred role", p.preferredRole],
            ["Preferred company", p.preferredCompany],
            ["Skills", skillsFor(request).join(", ")],
            ["Mentor response", request.responseNote],
          ]
            .filter(([, v]) => v)
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {request.matchReasons?.length > 0 && (
          <div>
            <h3>Match relevance</h3>
            <ul>
              {request.matchReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {request.status === "ACCEPTED" && onComplete && (
          <button
            className="ad-primary-button"
            disabled={busy}
            onClick={async () => {
              if (window.confirm("Mark this mentorship as completed?")) {
                if (await onComplete(request.id)) onClose();
              }
            }}
          >
            {busy ? "Completing…" : "Complete Mentorship"}
          </button>
        )}
      </section>
    </div>
  );
}
export default function MentorshipInbox({
  requests,
  loading,
  error,
  retry,
  search,
  onSearch,
  onRespond,
  busy,
  onComplete,
}) {
  const [filter, setFilter] = useState("ALL"),
    [sort, setSort] = useState("newest"),
    [selected, setSelected] = useState(null);
  const closeDetails = useCallback(() => setSelected(null), []);
  const counts = Object.fromEntries(
    Object.keys(statusNames).map((s) => [
      s,
      s === "ALL"
        ? requests.length
        : requests.filter((r) => r.status === s).length,
    ]),
  );
  const q = search.trim().toLowerCase();
  const visible = selectRequests(requests, { status: filter, search, sort });
  const clear = () => {
    setFilter("ALL");
    setSort("newest");
    onSearch("");
  };
  const tabs = [
    "ALL",
    "PENDING",
    "ACCEPTED",
    "REJECTED",
    ...["COMPLETED", "CANCELLED"].filter((s) => counts[s] > 0),
  ];
  const count = (s) => (loading || error ? "—" : counts[s]);
  return (
    <div className="mi-inbox">
      <section className="mi-hero">
        <div>
          <span className="mi-label">
            <Sparkles size={15} />
            Mentorship Requests
          </span>
          <h1>Mentorship Requests Inbox</h1>
          <p>
            Review students seeking guidance based on your industry experience
            and match relevance.
          </p>
        </div>
        <div className="mi-envelope" aria-hidden="true">
          <Mail size={68} />
          <Users size={31} />
        </div>
        <div className="mi-stats">
          {[
            ["ALL", "Total Requests", Mail],
            ["PENDING", "Pending", Clock],
            ["ACCEPTED", "Accepted", CheckCircle2],
          ].map(([s, label, Icon]) => (
            <div key={s}>
              <Icon size={21} />
              <strong>{count(s)}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="mi-controls">
        <div className="mi-filters" aria-label="Request status filters">
          {tabs.map((s) => (
            <button
              key={s}
              className={`mi-filter mi-${s.toLowerCase()} ${filter === s ? "is-active" : ""}`}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {statusNames[s]} ({count(s)})
            </button>
          ))}
        </div>
        <div className="mi-tools">
          <label className="mi-sort" htmlFor="mi-sort">
            <SlidersHorizontal size={17} />
            <span className="sr-only">Sort requests</span>
            <select
              id="mi-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="match">Highest Match</option>
            </select>
          </label>
          <label className="mi-search" htmlFor="mi-search">
            <Search size={18} />
            <span className="sr-only">
              Search by student name, topic, or skills
            </span>
            <input
              id="mi-search"
              type="search"
              placeholder="Search by name, topic, or skills…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
          {(q || filter !== "ALL" || sort !== "newest") && (
            <button className="mi-clear" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div
          className="mi-loading"
          role="status"
          aria-label="Loading mentorship requests"
        >
          <div />
          <div />
        </div>
      ) : error ? (
        <div className="mi-empty" role="alert">
          <XCircle size={34} />
          <h2>Requests could not be loaded</h2>
          <p>Reconnect and try again.</p>
          <button className="ad-primary-button" onClick={retry}>
            Retry requests
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="mi-empty">
          <Mail size={38} />
          <h2>
            {q
              ? "No matching requests"
              : filter === "ALL"
                ? "No incoming requests"
                : `No ${statusNames[filter].toLowerCase()} requests`}
          </h2>
          <p>
            {q
              ? "Try another student name, topic, or skill."
              : filter === "ALL"
                ? "Students can discover your expertise and request guidance."
                : "Requests with this status will appear here."}
          </p>
          {(q || filter !== "ALL") && (
            <button className="ad-secondary-button" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mi-list" aria-live="polite">
          {visible.map((r) => {
            const p = r.student?.studentProfile || {},
              skills = skillsFor(r);
            return (
              <article className="mi-card" key={r.id}>
                <div className="mi-card-head">
                  <div className="mi-person">
                    <Avatar student={r.student} />
                    <div>
                      <div className="mi-name-row">
                        <h2>{nameFor(r)}</h2>
                        {typeof r.matchScore === "number" && (
                          <span
                            className={`mi-match ${r.matchScore >= 70 ? "mi-match-high" : ""}`}
                          >
                            <Target size={15} />
                            {r.matchScore}% Match
                          </span>
                        )}
                        <Status status={r.status} />
                      </div>
                      <p>
                        Student{p.branch ? ` · ${p.branch}` : ""}
                        {p.batch ? ` · ${p.batch}` : ""}
                      </p>
                      {r.student?.email && (
                        <p className="mi-email">{r.student.email}</p>
                      )}
                    </div>
                  </div>
                  {r.createdAt && (
                    <time dateTime={r.createdAt}>
                      <Clock size={15} />
                      {dateFor(r).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </div>
                <div className="mi-note">
                  <FileText size={23} />
                  <div>
                    <h3>
                      Topic: <span>{r.topic || "General Guidance"}</span>
                    </h3>
                    {r.message && (
                      <p>
                        <strong>Student Note:</strong> <span>{r.message}</span>
                      </p>
                    )}
                    {r.goals && (
                      <p>
                        <strong>Career Goals:</strong> {r.goals}
                      </p>
                    )}
                    {r.responseNote && (
                      <p>
                        <strong>Your Response:</strong> {r.responseNote}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mi-card-footer">
                  <div className="mi-tags">
                    {[
                      ...skills,
                      ...[
                        p.preferredDomain,
                        p.preferredCompany,
                        p.preferredRole,
                      ].filter(Boolean),
                    ].map((tag, i) => (
                      <span key={`${tag}-${i}`}>{tag}</span>
                    ))}
                  </div>
                  <div className="mi-actions">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          className="ad-primary-button"
                          disabled={busy[r.id]}
                          onClick={() =>
                            onRespond({ request: r, targetStatus: "ACCEPTED" })
                          }
                        >
                          <CheckCircle2 size={16} />
                          Accept Request
                        </button>
                        <button
                          className="mi-decline"
                          disabled={busy[r.id]}
                          onClick={() =>
                            onRespond({ request: r, targetStatus: "REJECTED" })
                          }
                        >
                          Decline Request
                        </button>
                      </>
                    )}
                    {r.status === "ACCEPTED" && r.student?.id && (
                      <Link
                        className="ad-secondary-button"
                        to={`/messages?userId=${r.student.id}`}
                      >
                        <MessageSquare size={16} />
                        Chat Mentee
                      </Link>
                    )}
                    <button
                      className="mi-detail-button"
                      onClick={() => setSelected(r)}
                    >
                      {r.status === "PENDING"
                        ? "View Student Profile"
                        : r.status === "ACCEPTED"
                          ? "View Mentorship Details"
                          : "View Request Details"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && (
        <RequestDetails
          request={requests.find((r) => r.id === selected.id) || selected}
          onClose={closeDetails}
          onComplete={onComplete}
          busy={busy[selected.id]}
        />
      )}
    </div>
  );
}
