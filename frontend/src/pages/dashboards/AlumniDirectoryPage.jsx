import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import NotificationDropdown from '../../components/NotificationDropdown';
import ConnectModal from '../../components/ConnectModal';
import MentorshipRequestModal from '../../components/MentorshipRequestModal';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
];

const DOMAINS = [
  'Software Development',
  'Data Science',
  'AI/ML',
  'Cloud Computing',
  'DevOps',
  'Cybersecurity',
  'Product Management',
  'UI/UX Design',
  'Finance',
  'Consulting',
  'Marketing',
  'Research',
];

const GRAD_YEARS = Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i);

const SKILL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
];

function getSkillColor(skill) {
  if (!skill) return SKILL_COLORS[0];
  const idx = skill.charCodeAt(0) % SKILL_COLORS.length;
  return SKILL_COLORS[idx];
}

function initials(first = '', last = '') {
  const f = first ? first.trim()[0] : '';
  const l = last ? last.trim()[0] : '';
  const str = `${f}${l}`.trim() || '?';
  return str.toUpperCase();
}

const GRADIENT_PAIRS = [
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

function avatarGradient(userId = '') {
  const code = userId ? userId.charCodeAt(0) : 0;
  const idx = code % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[idx];
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <div className="h-5 bg-slate-100 rounded-md w-16" />
          <div className="h-5 bg-slate-100 rounded-md w-20" />
          <div className="h-5 bg-slate-100 rounded-md w-14" />
        </div>
      </div>
      <div className="mt-6 pt-3 border-t border-slate-100 flex gap-2">
        <div className="h-9 bg-slate-100 rounded-xl flex-1" />
        <div className="h-9 bg-slate-100 rounded-xl flex-1" />
      </div>
    </div>
  );
}

// ─── Alumni Card ──────────────────────────────────────────────────────────────
function AlumniCard({ alumni, onSelectProfile, onConnectClick, onMentorshipClick, onMessageClick }) {
  const {
    user,
    currentCompany,
    jobRole,
    branch,
    graduationYear,
    domain,
    skills = [],
    location,
    mentorshipAvailable,
    yearsOfExperience,
    previousCompanies = [],
    linkedinUrl,
    githubUrl,
    connection,
  } = alumni;

  const connStatus = connection?.status || 'NONE';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex gap-3.5 mb-4">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.firstName}
              className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-sm"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(
                user?.id
              )} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}
            >
              {initials(user?.firstName, user?.lastName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1.5">
              <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                {user?.firstName} {user?.lastName}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {alumni.relevanceScore !== undefined && alumni.relevanceScore !== null && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border shadow-2xs ${
                      alumni.relevanceScore >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : alumni.relevanceScore >= 65
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={alumni.semanticScore ? `Semantic: ${Math.round(alumni.semanticScore)}%` : 'Relevance Score'}
                  >
                    🎯 {Math.round(alumni.relevanceScore)}% Match
                  </span>
                )}
                {mentorshipAvailable && (
                  <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-200 uppercase tracking-wider">
                    Mentor
                  </span>
                )}
              </div>
            </div>
            {jobRole && (
              <div className="text-xs font-semibold text-indigo-600 mt-0.5 truncate">{jobRole}</div>
            )}
            {currentCompany && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <span>🏢</span>
                <span className="truncate">{currentCompany}</span>
                {yearsOfExperience !== undefined && yearsOfExperience !== null && (
                  <span className="text-slate-400 shrink-0">• {yearsOfExperience}y exp</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-xs text-slate-500">
          {branch && (
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <span>🎓</span>
              <span className="truncate max-w-[150px]">{branch}</span>
            </span>
          )}
          {graduationYear && (
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <span>📅</span>
              <span>{graduationYear}</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <span>📍</span>
              <span className="truncate max-w-[120px]">{location}</span>
            </span>
          )}
          {domain && (
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <span>💡</span>
              <span className="truncate max-w-[120px]">{domain}</span>
            </span>
          )}
        </div>

        {/* Previous Companies */}
        {previousCompanies && previousCompanies.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">
              Previously at
            </div>
            <div className="flex flex-wrap gap-1">
              {previousCompanies.slice(0, 3).map((pc) => (
                <span
                  key={pc.id || pc.companyName}
                  className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[11px] rounded-md border border-slate-200"
                >
                  {pc.companyName}
                </span>
              ))}
              {previousCompanies.length > 3 && (
                <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[11px] rounded-md border border-slate-200">
                  +{previousCompanies.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {skills.slice(0, 4).map((s) => (
              <span
                key={s}
                className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getSkillColor(s)}`}
              >
                {s}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-100 font-medium">
                +{skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* AI Semantic Match Reasons */}
        {alumni.matchReasons && alumni.matchReasons.length > 0 && (
          <div className="mt-3 p-2.5 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 rounded-xl border border-indigo-100/80">
            <div className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1 mb-1.5">
              <span>✨</span> AI Match Reason
            </div>
            <div className="flex flex-col gap-1">
              {alumni.matchReasons.slice(0, 2).map((reason, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="line-clamp-1">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectProfile(alumni)}
          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          Profile
        </button>

        {mentorshipAvailable && onMentorshipClick && (
          <button
            onClick={() => onMentorshipClick(alumni)}
            className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
          >
            <span>🎯</span> Mentor
          </button>
        )}

        {/* Dynamic Connection Button */}
        {connStatus === 'ACCEPTED' ? (
          <button
            onClick={() => onMessageClick ? onMessageClick(alumni) : null}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all"
            title="Open Chat"
          >
            <span>💬</span> Message
          </button>
        ) : connStatus === 'PENDING' ? (
          <button
            disabled
            className="flex-1 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-default"
          >
            <span>⏳</span> Sent
          </button>
        ) : (
          <button
            onClick={() => onConnectClick(alumni)}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
          >
            <span>🤝</span> Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200 shadow-2xs">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-indigo-200/60 rounded-full w-4 h-4 inline-flex items-center justify-center text-indigo-800 font-bold transition-colors"
      >
        ×
      </button>
    </span>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ alumni, onClose, onConnectClick, onMentorshipClick, onMessageClick }) {
  if (!alumni) return null;
  const { user, currentCompany, jobRole, branch, graduationYear, domain, skills = [], location, mentorshipAvailable, yearsOfExperience, previousCompanies = [], linkedinUrl, githubUrl, resumeUrl, connection } = alumni;
  const connStatus = connection?.status || 'NONE';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition-colors"
        >
          ×
        </button>

        <div className="flex items-center gap-4 mb-6">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.firstName}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-md"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient(
                user?.id
              )} flex items-center justify-center text-white font-bold text-xl shadow-md`}
            >
              {initials(user?.firstName, user?.lastName)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {user?.firstName} {user?.lastName}
              </h2>
              {mentorshipAvailable && (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-200">
                  Open for Mentorship
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-indigo-600">
              {jobRole || 'Alumni'} {currentCompany ? `at ${currentCompany}` : ''}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <div className="text-slate-400 font-medium">Branch</div>
            <div className="font-semibold text-slate-800 mt-0.5">{branch || '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Graduation</div>
            <div className="font-semibold text-slate-800 mt-0.5">{graduationYear || '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Domain</div>
            <div className="font-semibold text-slate-800 mt-0.5">{domain || '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Experience</div>
            <div className="font-semibold text-slate-800 mt-0.5">
              {yearsOfExperience !== undefined && yearsOfExperience !== null
                ? `${yearsOfExperience} years`
                : '—'}
            </div>
          </div>
        </div>

        {/* AI Match Insights */}
        {alumni.matchReasons && alumni.matchReasons.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>✨</span> AI Match Analysis & Reasoning
              </h4>
              {alumni.relevanceScore !== undefined && alumni.relevanceScore !== null && (
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-2xs">
                  {Math.round(alumni.relevanceScore)}% Relevance
                </span>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-indigo-950">
              {alumni.matchReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Skills & Expertise
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${getSkillColor(s)}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Previous Experience */}
        {previousCompanies && previousCompanies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Career History
            </h4>
            <div className="space-y-2">
              {previousCompanies.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{c.companyName}</span>
                    {c.jobRole && <span className="text-slate-500"> — {c.jobRole}</span>}
                  </div>
                  {(c.startYear || c.endYear) && (
                    <span className="text-slate-400 text-[11px]">
                      {c.startYear || ''} - {c.endYear || 'Present'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons & External Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {mentorshipAvailable && onMentorshipClick && (
              <button
                onClick={() => {
                  onClose();
                  onMentorshipClick(alumni);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>🎯</span> Request Mentorship
              </button>
            )}

            {connStatus === 'ACCEPTED' ? (
              <button
                onClick={() => {
                  onClose();
                  onMessageClick?.(alumni);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>💬</span> Message Alumni
              </button>
            ) : connStatus === 'PENDING' ? (
              <span className="px-4 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 flex items-center gap-1.5">
                <span>⏳</span> Connection Sent
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onConnectClick(alumni);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>🤝</span> Connect
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {linkedinUrl && (
              <a
                href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200"
              >
                <span>🔗</span> LinkedIn
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
              >
                <span>💻</span> GitHub
              </a>
            )}
            {resumeUrl && (
              <a
                href={resumeUrl.startsWith('http') ? resumeUrl : `https://${resumeUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-amber-200"
              >
                <span>📄</span> Resume
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AlumniDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    q: '',
    currentCompany: '',
    previousCompany: '',
    jobRole: '',
    branch: '',
    graduationYear: '',
    domain: '',
    skills: '',
    location: '',
    mentorshipAvailable: '',
  });

  const [draftQ, setDraftQ] = useState('');
  const [alumni, setAlumni] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [connectTargetAlumni, setConnectTargetAlumni] = useState(null);
  const [mentorshipTargetAlumni, setMentorshipTargetAlumni] = useState(null);

  const searchTimer = useRef(null);

  // ── Fetch Alumni from Backend ──────────────────────────────────────────────
  const fetchAlumni = useCallback(async (activeFilters, overridePage = 1) => {
    const current = activeFilters || filters;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(current).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, v);
        }
      });
      params.set('page', String(overridePage));
      params.set('limit', '18');

      const res = await api.get(`/alumni/directory?${params.toString()}`);
      if (res.data?.success) {
        setAlumni(res.data.data.alumni || []);
        setPagination(res.data.data.pagination || { total: 0, page: 1, totalPages: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load alumni directory.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAlumni(filters, 1);
  }, []);

  // ── Real-time Socket Event Listeners ────────────────────────────────────────
  useEffect(() => {
    const handleConnectionUpdate = (e) => {
      const updatedConn = e.detail;
      if (!updatedConn) return;

      setAlumni((prevList) =>
        prevList.map((item) => {
          if (item.userId === updatedConn.receiverId || item.userId === updatedConn.senderId) {
            return {
              ...item,
              connection: {
                connectionId: updatedConn.id,
                status: updatedConn.status,
                isSender: updatedConn.senderId === user?.id,
              },
            };
          }
          return item;
        })
      );
    };

    window.addEventListener('connection:updated', handleConnectionUpdate);
    window.addEventListener('connection:received', handleConnectionUpdate);
    return () => {
      window.removeEventListener('connection:updated', handleConnectionUpdate);
      window.removeEventListener('connection:received', handleConnectionUpdate);
    };
  }, [user]);

  // ── Debounced Search Handler ──────────────────────────────────────────────
  const handleSearchInput = (val) => {
    setDraftQ(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = { ...filters, q: val };
      setFilters(next);
      fetchAlumni(next, 1);
    }, 350);
  };

  const applyFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    fetchAlumni(next, 1);
  };

  const clearFilter = (key) => {
    const next = { ...filters, [key]: '' };
    setFilters(next);
    fetchAlumni(next, 1);
  };

  const clearAll = () => {
    const reset = {
      q: '',
      currentCompany: '',
      previousCompany: '',
      jobRole: '',
      branch: '',
      graduationYear: '',
      domain: '',
      skills: '',
      location: '',
      mentorshipAvailable: '',
    };
    setFilters(reset);
    setDraftQ('');
    fetchAlumni(reset, 1);
  };

  const handleConnectionSentSuccess = (newConn) => {
    // Update local state immediately
    setAlumni((prevList) =>
      prevList.map((item) => {
        if (item.userId === newConn.receiverId) {
          return {
            ...item,
            connection: {
              connectionId: newConn.id,
              status: 'PENDING',
              isSender: true,
            },
          };
        }
        return item;
      })
    );
  };

  const activeFilterList = Object.entries(filters).filter(([k, v]) => Boolean(v) && k !== 'q');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/student/dashboard')}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 font-bold"
                title="Back to Dashboard"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Alumni Directory</h1>
                <p className="text-xs text-slate-400">
                  {loading ? 'Searching...' : `${pagination.total} verified alumni found`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/student/mentorship')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                <span>🎯</span> Mentorship Hub
              </button>

              <NotificationDropdown align="right" />

              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filtersOpen || activeFilterList.length > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>⚙</span> Filters
                {activeFilterList.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {activeFilterList.length}
                  </span>
                )}
              </button>
              {activeFilterList.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* AI Semantic Search bar */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                <span className="text-indigo-600 text-sm">✨</span>
              </div>
              <input
                className="w-full pl-9 pr-28 py-3 bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs font-medium"
                placeholder="Ask in natural language: e.g. 'Looking for a MERN developer at Accenture who can guide me'..."
                value={draftQ}
                onChange={(e) => handleSearchInput(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {draftQ && (
                  <button
                    onClick={() => handleSearchInput('')}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-400 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100/70 text-indigo-700 text-[10px] font-extrabold rounded-xl border border-indigo-200 uppercase tracking-wider">
                  <span>🧠</span> AI Semantic
                </span>
              </div>
            </div>

            {/* Quick Natural Query Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <span>💡</span> Try:
              </span>
              {[
                'MERN Stack at Accenture',
                'Google Software Engineer',
                'Cloud Architect Mentors',
                'IT Graduate with 5+ Years',
              ].map((queryText) => (
                <button
                  key={queryText}
                  onClick={() => handleSearchInput(queryText)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    draftQ === queryText
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                  }`}
                >
                  {queryText}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Drawer / Panel */}
      {filtersOpen && (
        <div className="bg-white border-b border-slate-200/80 shadow-xs animate-fadeIn">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Branch
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  value={filters.branch}
                  onChange={(e) => applyFilter('branch', e.target.value)}
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Grad Year
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  value={filters.graduationYear}
                  onChange={(e) => applyFilter('graduationYear', e.target.value)}
                >
                  <option value="">All Years</option>
                  {GRAD_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Domain
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  value={filters.domain}
                  onChange={(e) => applyFilter('domain', e.target.value)}
                >
                  <option value="">All Domains</option>
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Current Company
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Google, Amazon"
                  value={filters.currentCompany}
                  onChange={(e) => applyFilter('currentCompany', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Previous Company
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. TCS, Infosys"
                  value={filters.previousCompany}
                  onChange={(e) => applyFilter('previousCompany', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Job Role
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. SDE, Data Analyst"
                  value={filters.jobRole}
                  onChange={(e) => applyFilter('jobRole', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Skills
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. React, Python"
                  value={filters.skills}
                  onChange={(e) => applyFilter('skills', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Location
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Bangalore, London"
                  value={filters.location}
                  onChange={(e) => applyFilter('location', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Mentorship
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  value={filters.mentorshipAvailable}
                  onChange={(e) => applyFilter('mentorshipAvailable', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Available Mentors Only</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearAll}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Pills */}
      {activeFilterList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 flex flex-wrap gap-2">
          {activeFilterList.map(([k, v]) => (
            <FilterPill key={k} label={`${k}: ${v}`} onRemove={() => clearFilter(k)} />
          ))}
        </div>
      )}

      {/* Main Results Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : alumni.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xs max-w-lg mx-auto p-8">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No alumni found</h3>
            <p className="text-slate-400 text-xs mb-5">
              No matching profiles found. Try broadening your keywords or clearing some filters.
            </p>
            <button
              onClick={clearAll}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {alumni.map((a) => (
                <AlumniCard
                  key={a.id}
                  alumni={a}
                  onSelectProfile={setSelectedAlumni}
                  onConnectClick={setConnectTargetAlumni}
                  onMentorshipClick={setMentorshipTargetAlumni}
                  onMessageClick={(alum) => navigate(`/messages?userId=${alum.user?.id || alum.userId}`)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAlumni(filters, pagination.page - 1)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  ← Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                    if (
                      p === 1 ||
                      p === pagination.totalPages ||
                      (p >= pagination.page - 1 && p <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={p}
                          onClick={() => fetchAlumni(filters, p)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                            pagination.page === p
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === pagination.page - 2 || p === pagination.page + 2) {
                      return (
                        <span key={p} className="px-1 text-slate-400 text-xs self-center">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchAlumni(filters, pagination.page + 1)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detailed Profile Modal */}
      {selectedAlumni && (
        <ProfileModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onConnectClick={setConnectTargetAlumni}
          onMentorshipClick={setMentorshipTargetAlumni}
          onMessageClick={(alum) => navigate(`/messages?userId=${alum.user?.id || alum.userId}`)}
        />
      )}

      {/* Send Connection Request Modal */}
      {connectTargetAlumni && (
        <ConnectModal
          alumni={connectTargetAlumni}
          onClose={() => setConnectTargetAlumni(null)}
          onSuccess={handleConnectionSentSuccess}
        />
      )}

      {/* Send Mentorship Request Modal */}
      {mentorshipTargetAlumni && (
        <MentorshipRequestModal
          alumni={mentorshipTargetAlumni}
          onClose={() => setMentorshipTargetAlumni(null)}
          onSuccess={() => {
            fetchAlumni(filters, pagination.page);
          }}
        />
      )}
    </div>
  );
}
