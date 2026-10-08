import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  SlidersHorizontal,
  RefreshCw,
  MessageSquare,
  Clock,
  FileText,
  X,
  Send,
} from "lucide-react";
import { Avatar } from "./MentorshipInbox";
import {
  connectionUser,
  connectionName,
  connectionProfile,
  selectConnections,
} from "./connectionInboxUtils";
import "./connection-inbox.css";
const labels = {
  ALL: "All Requests",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
function ConnectionDetails({ record, direction, onClose }) {
  const ref = useRef(null),
    user = connectionUser(record, direction),
    p = connectionProfile(user);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [...ref.current.querySelectorAll("button,a")],
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
  }, [onClose]);
  return (
    <div className="ad-modal-overlay">
      <section
        className="mi-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ci-details-title"
        ref={ref}
      >
        <div className="mi-row">
          <h2 id="ci-details-title">
            {connectionName(user)} · Connection details
          </h2>
          <button onClick={onClose} aria-label="Close connection details">
            <X size={20} />
          </button>
        </div>
        <span className={`mi-status mi-${record.status.toLowerCase()}`}>
          {labels[record.status] || record.status}
        </span>
        <dl>
          {[
            ["Role", user?.role],
            ["Email", user?.email],
            ["Branch", p.branch],
            ["College", p.college],
            ["Graduation year", p.graduationYear],
            ["Domain", p.domain || p.preferredDomain],
            ["Company", p.currentCompany],
            ["Job role", p.jobRole],
            ["Skills", p.skills?.join(", ")],
            ["Introduction", record.message],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </section>
    </div>
  );
}
export default function ConnectionInbox({
  incoming,
  sent,
  loading,
  incomingError,
  sentError,
  retry,
  search,
  onSearch,
  onRespond,
  onWithdraw,
  busy,
  connected,
}) {
  const [direction, setDirection] = useState("incoming"),
    [filter, setFilter] = useState("ALL"),
    [sort, setSort] = useState("newest"),
    [details, setDetails] = useState(null),
    [actionError, setActionError] = useState("");
  const closeDetails = useCallback(() => setDetails(null), []);
  const records = direction === "incoming" ? incoming : sent,
    error = direction === "incoming" ? incomingError : sentError;
  const counts = Object.fromEntries(
    Object.keys(labels).map((s) => [
      s,
      s === "ALL"
        ? records.length
        : records.filter((r) => r.status === s).length,
    ]),
  );
  const visible = selectConnections(records, {
      direction,
      status: filter,
      search,
      sort,
    }),
    count = (s) => (loading || error ? "—" : counts[s]);
  const clear = () => {
    onSearch("");
    setFilter("ALL");
    setSort("newest");
  };
  const respond = async (id, status) => {
    setActionError("");
    try {
      await onRespond(id, status);
    } catch (e) {
      setActionError(
        e.response?.data?.message ||
          e.message ||
          "Unable to respond. Please retry.",
      );
    }
  };
  const withdraw = async (id) => {
    if (!window.confirm("Withdraw this pending connection request?")) return;
    setActionError("");
    try {
      await onWithdraw(id);
    } catch (e) {
      setActionError(
        e.response?.data?.message ||
          e.message ||
          "Unable to withdraw request. Please retry.",
      );
    }
  };
  const empty = search
    ? "No matching connection requests"
    : filter === "PENDING"
      ? "No pending connection requests"
      : filter === "ACCEPTED"
        ? "No accepted connections yet"
        : filter === "REJECTED"
          ? "No rejected requests"
          : filter === "WITHDRAWN"
            ? "No withdrawn requests"
            : "No connection requests yet";
  return (
    <div className="ci-page">
      <section className="mi-hero ci-hero">
        <div>
          <span className="mi-label">
            <UserPlus size={16} />
            Network Connections
          </span>
          <h1>Connection Requests</h1>
          <p>
            Manage and review connection requests from students, alumni and
            professionals.
          </p>
        </div>
        <div className="ci-art" aria-hidden="true">
          <span>
            <Users size={45} />
          </span>
          <span>
            <UserPlus size={48} />
          </span>
        </div>
        <div className="mi-stats">
          {[
            ["PENDING", UserPlus],
            ["ACCEPTED", UserCheck],
            ["REJECTED", UserX],
          ].map(([s, Icon]) => (
            <div key={s}>
              <Icon size={21} />
              <strong>{count(s)}</strong>
              <span>{labels[s]}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="ci-direction" aria-label="Request direction">
        <button
          aria-pressed={direction === "incoming"}
          onClick={() => {
            setDirection("incoming");
            setFilter("ALL");
            setActionError("");
          }}
        >
          <UserPlus size={16} />
          Incoming Requests
        </button>
        <button
          aria-pressed={direction === "sent"}
          onClick={() => {
            setDirection("sent");
            setFilter("ALL");
            setActionError("");
          }}
        >
          <Send size={16} />
          Sent Requests
        </button>
        <span>
          {direction === "incoming"
            ? "Requests received by you"
            : "Requests you sent"}{" "}
          · counts apply to this inbox
        </span>
      </div>
      <div className="mi-controls">
        <div className="mi-filters" aria-label="Connection status filters">
          {[
            "ALL",
            "PENDING",
            "ACCEPTED",
            "REJECTED",
            ...(counts.WITHDRAWN ? ["WITHDRAWN"] : []),
          ].map((s) => (
            <button
              className={`mi-filter mi-${s.toLowerCase()} ${filter === s ? "is-active" : ""}`}
              key={s}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {labels[s]} ({count(s)})
            </button>
          ))}
        </div>
        <div className="mi-tools">
          <label className="mi-sort" htmlFor="ci-sort">
            <SlidersHorizontal size={17} />
            <span className="sr-only">Sort connection requests</span>
            <select
              id="ci-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <label className="mi-search" htmlFor="ci-search">
            <Search size={18} />
            <span className="sr-only">
              Search connections by name, domain, or branch
            </span>
            <input
              id="ci-search"
              type="search"
              placeholder="Search by name, domain, branch…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
          {(search || filter !== "ALL" || sort !== "newest") && (
            <button className="mi-clear" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      {!connected && (
        <p className="ci-reconnect" role="status">
          Live updates are reconnecting. Refresh to check for new requests.
        </p>
      )}
      {actionError && (
        <p className="ad-error" role="alert">
          {actionError}
        </p>
      )}
      {loading ? (
        <div
          className="mi-loading"
          role="status"
          aria-label="Loading connection requests"
        >
          <div />
          <div />
        </div>
      ) : error ? (
        <div className="ci-empty" role="alert">
          <UserX size={38} />
          <h2>Connection requests could not be loaded</h2>
          <p>Please retry to reconnect to your inbox.</p>
          <button className="ad-secondary-button" onClick={retry}>
            <RefreshCw size={16} />
            Retry requests
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="ci-empty">
          <span className="ci-empty-icon">
            <UserPlus size={43} />
          </span>
          <h2>{empty}</h2>
          <p>
            {search
              ? "Try another name, domain, or branch."
              : filter === "PENDING"
                ? direction === "incoming"
                  ? "All incoming connection requests have been reviewed."
                  : "You have no pending sent requests."
                : direction === "incoming"
                  ? "Incoming requests will appear here when someone reaches out."
                  : "Your outgoing connection requests will appear here."}
          </p>
          <button
            className="ad-secondary-button"
            onClick={search ? clear : retry}
          >
            <RefreshCw size={16} />
            {search ? "Clear search" : "Refresh"}
          </button>
        </div>
      ) : (
        <div className="mi-list">
          {visible.map((r) => {
            const user = connectionUser(r, direction),
              p = connectionProfile(user);
            return (
              <article className="mi-card" key={r.id}>
                <div className="mi-card-head">
                  <div className="mi-person">
                    <Avatar student={user} />
                    <div>
                      <div className="mi-name-row">
                        <h2>{connectionName(user)}</h2>
                        <span
                          className={`mi-status mi-${r.status.toLowerCase()}`}
                        >
                          {r.status === "ACCEPTED"
                            ? "Connected"
                            : labels[r.status] || r.status}
                        </span>
                      </div>
                      <p>
                        {user?.role === "ALUMNI"
                          ? "Alumni"
                          : user?.role === "STUDENT"
                            ? "Student"
                            : user?.role === "ADMIN"
                              ? "Admin"
                              : "Platform member"}
                        {p.branch ? ` · ${p.branch}` : ""}
                        {p.graduationYear
                          ? ` · Class of ${p.graduationYear}`
                          : ""}
                      </p>
                      {user?.email && <p className="mi-email">{user.email}</p>}
                    </div>
                  </div>
                  {r.createdAt && (
                    <time dateTime={r.createdAt}>
                      <Clock size={15} />
                      {new Date(r.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </div>
                {r.message && (
                  <div className="mi-note">
                    <FileText size={22} />
                    <div>
                      <h3>Introduction</h3>
                      <p>{r.message}</p>
                    </div>
                  </div>
                )}
                <div className="mi-card-footer">
                  <div className="mi-tags">
                    {[
                      ...new Set(
                        [
                          ...(p.skills || []),
                          p.domain,
                          p.preferredDomain,
                          p.currentCompany,
                        ].filter(Boolean),
                      ),
                    ].map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="mi-actions">
                    {direction === "incoming" && r.status === "PENDING" && (
                      <>
                        <button
                          className="ad-primary-button"
                          disabled={busy[r.id]}
                          onClick={() => respond(r.id, "ACCEPTED")}
                        >
                          <UserCheck size={16} />
                          Accept
                        </button>
                        <button
                          className="mi-decline"
                          disabled={busy[r.id]}
                          onClick={() => respond(r.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {direction === "sent" && r.status === "PENDING" && (
                      <button
                        className="mi-decline"
                        disabled={busy[r.id]}
                        onClick={() => withdraw(r.id)}
                      >
                        Withdraw Request
                      </button>
                    )}
                    {r.status === "ACCEPTED" && user?.id && (
                      <Link
                        className="ad-secondary-button"
                        to={`/messages?userId=${user.id}`}
                      >
                        <MessageSquare size={16} />
                        Open Chat
                      </Link>
                    )}
                    <button
                      className="mi-detail-button"
                      onClick={() => setDetails(r)}
                    >
                      {r.status === "REJECTED"
                        ? "View Details"
                        : "View Profile"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {details && (
        <ConnectionDetails
          record={details}
          direction={direction}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}
