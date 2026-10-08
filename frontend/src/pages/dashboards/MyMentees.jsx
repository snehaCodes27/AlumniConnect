import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  MessageSquare,
  Calendar,
  FileText,
  MoreVertical,
  CheckSquare,
  Trophy,
  X,
  Search,
} from "lucide-react";
import { Avatar, RequestDetails } from "./MentorshipInbox";
import { requestName, requestSkills } from "./mentorshipInboxUtils";
import "./my-mentees.css";

export function selectActiveMentees(records, search = "") {
  const q = search.trim().toLowerCase();
  return records.filter(
    (m) =>
      m.status === "ACCEPTED" &&
      (!q || [requestName(m), m.topic].join(" ").toLowerCase().includes(q)),
  );
}
function CompletionDialog({ mentorship, onClose, onComplete, busy }) {
  const ref = useRef(null),
    [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false),
    inFlight = useRef(false);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e) => {
      if (e.key === "Escape" && !inFlight.current) onClose();
      if (e.key === "Tab") {
        const nodes = [
            ...ref.current.querySelectorAll("button:not(:disabled)"),
          ],
          first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
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
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
      else document.getElementById("mm-title")?.focus();
    };
  }, [onClose]);
  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      await onComplete(mentorship.id);
      onClose();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to complete mentorship. Please retry.",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
  const saving = busy || submitting;
  return (
    <div className="ad-modal-overlay">
      <section
        className="mm-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-confirm-title"
        aria-describedby="mm-confirm-description"
        ref={ref}
      >
        <button
          aria-label="Close completion dialog"
          className="mm-close"
          disabled={saving}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="mm-confirm-icon">
          <Trophy size={28} />
        </span>
        <h2 id="mm-confirm-title">Complete this mentorship?</h2>
        <p id="mm-confirm-description">
          Mark your mentorship with <strong>{requestName(mentorship)}</strong>{" "}
          on <strong>{mentorship.topic || "General Mentorship"}</strong> as
          completed.
        </p>
        <p>
          The relationship will leave your active list and remain in your
          mentorship history. Contributions are recorded through the existing
          completion workflow.
        </p>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="mm-confirm-actions">
          <button
            className="ad-secondary-button"
            disabled={saving}
            onClick={onClose}
          >
            Keep Active
          </button>
          <button
            className="ad-primary-button"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Saving completion…" : "Confirm Completion"}
          </button>
        </div>
      </section>
    </div>
  );
}
export default function MyMentees({
  mentees,
  loading,
  error,
  retry,
  search,
  onSearch,
  onOpenRequests,
  onComplete,
  busy,
}) {
  const [details, setDetails] = useState(null),
    [complete, setComplete] = useState(null);
  const closeDetails = useCallback(() => setDetails(null), []),
    closeComplete = useCallback(() => setComplete(null), []);
  const active = selectActiveMentees(mentees),
    visible = selectActiveMentees(mentees, search);
  return (
    <div className="mm-page">
      <section className="mi-hero mm-hero">
        <div>
          <span className="mi-label">
            <Users size={16} />
            My Mentees
          </span>
          <h1 id="mm-title" tabIndex={-1}>
            Your Active Mentees
          </h1>
          <p>
            Students currently receiving your mentorship and career coaching.
          </p>
        </div>
        <div className="mm-art" aria-hidden="true">
          <span>
            <GraduationCap size={45} />
          </span>
          <MessageSquare size={26} />
          <span>
            <Users size={48} />
          </span>
        </div>
        <div className="mm-stat">
          <span>
            <Users size={29} />
          </span>
          <div>
            <strong>{loading || error ? "—" : active.length}</strong>
            <p>Active Mentees</p>
          </div>
        </div>
      </section>
      {(active.length > 1 || search) && (
        <label className="mi-search mm-search" htmlFor="mm-search">
          <Search size={18} />
          <span className="sr-only">
            Search active mentees by name or topic
          </span>
          <input
            id="mm-search"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by student name or mentorship topic…"
          />
        </label>
      )}
      {loading ? (
        <div
          className="mi-loading"
          role="status"
          aria-label="Loading active mentees"
        >
          <div />
          <div />
        </div>
      ) : error ? (
        <div className="mi-empty" role="alert">
          <Users size={35} />
          <h2>Active mentees could not be loaded</h2>
          <p>Your mentorship data is unavailable. Please try again.</p>
          <button className="ad-primary-button" onClick={retry}>
            Retry mentees
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="mi-empty">
          <Users size={38} />
          <h2>{search ? "No matching mentees" : "No Active Mentees Yet"}</h2>
          <p>
            {search
              ? "Try another student name or mentorship topic."
              : "Once you accept a mentorship request, your mentees will appear here."}
          </p>
          <button
            className="ad-primary-button"
            onClick={search ? () => onSearch("") : onOpenRequests}
          >
            {search ? "Clear search" : "Open Mentorship Requests"}
          </button>
        </div>
      ) : (
        <div className="mm-list">
          {visible.map((m) => {
            const p = m.student?.studentProfile || {},
              date = m.updatedAt || m.createdAt;
            return (
              <article className="mi-card mm-card" key={m.id}>
                <div className="mi-card-head">
                  <div className="mi-person">
                    <Avatar student={m.student} />
                    <div>
                      <div className="mi-name-row">
                        <h2>{requestName(m)}</h2>
                        <span
                          className="mi-status mi-accepted"
                          title="Accepted mentorship"
                        >
                          Mentee
                        </span>
                      </div>
                      <p>
                        Student{p.branch ? ` · ${p.branch}` : ""}
                        {p.graduationYear
                          ? ` · Class of ${p.graduationYear}`
                          : p.batch
                            ? ` · ${p.batch}`
                            : ""}
                      </p>
                      {m.student?.email && (
                        <p className="mi-email">{m.student.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="mm-card-tools">
                    {date && (
                      <div className="mm-date">
                        <Calendar size={20} />
                        <div>
                          <span>
                            {m.updatedAt ? "Started On" : "Requested On"}
                          </span>
                          <time dateTime={date}>
                            {new Date(date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                        </div>
                      </div>
                    )}
                    <details className="mm-menu">
                      <summary aria-label={`Actions for ${requestName(m)}`}>
                        <MoreVertical size={21} />
                      </summary>
                      <div>
                        <button
                          onClick={(e) => {
                            e.currentTarget
                              .closest("details")
                              .removeAttribute("open");
                            setDetails(m);
                          }}
                        >
                          View Student Profile
                        </button>
                        <button
                          onClick={(e) => {
                            e.currentTarget
                              .closest("details")
                              .removeAttribute("open");
                            setDetails(m);
                          }}
                        >
                          View Mentorship Details
                        </button>
                        {m.student?.id && (
                          <Link to={`/messages?userId=${m.student.id}`}>
                            Open Chat
                          </Link>
                        )}
                        <button
                          disabled={busy[m.id]}
                          onClick={(e) => {
                            e.currentTarget
                              .closest("details")
                              .removeAttribute("open");
                            setComplete(m);
                          }}
                        >
                          Mark as Completed
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
                <div className="mi-note">
                  <FileText size={23} />
                  <div>
                    <h3>
                      Topic: <span>{m.topic || "General Mentorship"}</span>
                    </h3>
                    {m.goals && (
                      <p>
                        <strong>Mentorship Goals:</strong> {m.goals}
                      </p>
                    )}
                    {m.responseNote && (
                      <p>
                        <strong>Your Guidance:</strong> {m.responseNote}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mi-tags">
                  {[
                    ...new Set(
                      [
                        ...requestSkills(m),
                        p.preferredDomain,
                        p.preferredCompany,
                        p.preferredRole,
                      ].filter(Boolean),
                    ),
                  ].map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="mm-actions">
                  {m.student?.id && (
                    <Link
                      className="ad-primary-button"
                      to={`/messages?userId=${m.student.id}`}
                    >
                      <MessageSquare size={17} />
                      Chat with Mentee
                    </Link>
                  )}
                  <button
                    className="ad-secondary-button"
                    disabled={busy[m.id]}
                    onClick={() => setComplete(m)}
                  >
                    <CheckSquare size={18} />
                    Mark as Completed
                    <Trophy size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {details && <RequestDetails request={details} onClose={closeDetails} />}
      {complete && (
        <CompletionDialog
          mentorship={complete}
          onClose={closeComplete}
          onComplete={onComplete}
          busy={busy[complete.id]}
        />
      )}
    </div>
  );
}
