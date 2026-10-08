import StudentShell from '../../layouts/StudentShell';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mentorshipService } from '../../services/mentorshipService';
import NotificationDropdown from '../../components/NotificationDropdown';
import MentorshipRequestModal from '../../components/MentorshipRequestModal';
import {
  Sparkles,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  Building2,
  GraduationCap,
  Award,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Compass,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const DOMAINS = [
  'Software Development',
  'Data Science',
  'AI/ML',
  'Cloud Computing',
  'DevOps',
  'Cybersecurity',
  'Product Management',
  'UI/UX Design',
];

const GRADIENT_PAIRS = [
  'from-indigo-600 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-violet-600 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

function avatarGradient(userId = '') {
  const code = userId ? userId.charCodeAt(0) : 0;
  return GRADIENT_PAIRS[code % GRADIENT_PAIRS.length];
}

function initials(first = '', last = '') {
  const f = first ? first.trim()[0] : '';
  const l = last ? last.trim()[0] : '';
  const str = `${f}${l}`.trim() || '?';
  return str.toUpperCase();
}

function MatchBadge({ score, level }) {
  let bg = 'from-amber-500 to-orange-500';
  let text = 'text-amber-700 bg-amber-50 border-amber-200';
  if (score >= 85) {
    bg = 'from-emerald-500 to-teal-600';
    text = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (score >= 70) {
    bg = 'from-indigo-600 to-violet-600';
    text = 'text-indigo-700 bg-indigo-50 border-indigo-200';
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${bg} text-white text-xs font-black shadow-xs flex items-center gap-1`}>
        <Sparkles size={12} />
        <span>{score}% MATCH</span>
      </div>
      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${text}`}>
        {level}
      </span>
    </div>
  );
}

export default function MentorshipHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'sent' | 'active'
  const [mentors, setMentors] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeMentorships, setActiveMentorships] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const [selectedMentorForRequest, setSelectedMentorForRequest] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // ── Fetch Recommendations from Real PostgreSQL Engine ─────────────────────
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mentorshipService.getRecommendations({
        domain: filterDomain || undefined,
        availableOnly: availableOnly || undefined,
        limit: 30,
      });

      if (res.success) {
        setMentors(res.data.mentors || []);
        setProfileSummary(res.data.studentProfileSummary || null);
      }
    } catch (err) {
      console.error('Failed to fetch mentor recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDomain, availableOnly]);

  // ── Fetch Sent Requests ───────────────────────────────────────────────────
  const fetchSentRequests = useCallback(async () => {
    try {
      const res = await mentorshipService.getSentRequests({ limit: 30 });
      if (res.success) {
        setSentRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch sent requests:', err);
    }
  }, []);

  // ── Fetch Active Mentorships ──────────────────────────────────────────────
  const fetchActiveMentorships = useCallback(async () => {
    try {
      const res = await mentorshipService.getActiveMentorships();
      if (res.success) {
        setActiveMentorships(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch active mentorships:', err);
    }
  }, []);

  const loadAllData = useCallback(() => {
    fetchRecommendations();
    fetchSentRequests();
    fetchActiveMentorships();
  }, [fetchRecommendations, fetchSentRequests, fetchActiveMentorships]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Real-time Socket.IO Listeners ─────────────────────────────────────────
  useEffect(() => {
    const handleMentorshipChange = (e) => {
      console.log('[MentorshipHub] Real-time mentorship event received:', e.detail);
      loadAllData();
      if (e.detail?.status) {
        setToastMessage(`Mentorship request updated: ${e.detail.status}`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    };

    window.addEventListener('mentorship:request:sent', handleMentorshipChange);
    window.addEventListener('mentorship:updated', handleMentorshipChange);
    window.addEventListener('mentorship:cancelled', handleMentorshipChange);

    return () => {
      window.removeEventListener('mentorship:request:sent', handleMentorshipChange);
      window.removeEventListener('mentorship:updated', handleMentorshipChange);
      window.removeEventListener('mentorship:cancelled', handleMentorshipChange);
    };
  }, [loadAllData]);

  // ── Handle Cancel Sent Request ────────────────────────────────────────────
  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending mentorship request?')) return;
    try {
      const res = await mentorshipService.cancelRequest(requestId);
      if (res.success) {
        setToastMessage('Mentorship request cancelled.');
        setTimeout(() => setToastMessage(''), 4000);
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request.');
    }
  };

  // Filter recommendations by query in UI
  const filteredMentors = mentors.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    const company = (m.currentCompany || '').toLowerCase();
    const role = (m.jobRole || '').toLowerCase();
    const skills = (m.skills || []).join(' ').toLowerCase();
    return name.includes(q) || company.includes(q) || role.includes(q) || skills.includes(q);
  });

  const pendingSentCount = sentRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <StudentShell><div className="student-shell-content min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center justify-between animate-fadeIn">
            <span>✨ {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white font-bold text-base">
              ×
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-10 shadow-xl overflow-hidden mb-8">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-xs font-bold mb-3 backdrop-blur-xs">
              <Sparkles size={13} className="text-amber-300" />
              <span>Multi-Factor PostgreSQL Mentorship Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Intelligent Mentor Recommendations
            </h1>
            <p className="text-indigo-100/90 text-sm mt-2 leading-relaxed">
              We dynamically analyze your preferred domain, target company, target role, and technical skills against our verified alumni database to find your highest-relevance mentors.
            </p>

            {/* Student Profile Quick Summary */}
            {profileSummary && (
              <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="text-indigo-200 font-medium">Your Profile Signals:</span>
                {profileSummary.role && (
                  <span className="px-2.5 py-1 bg-white/15 rounded-lg text-white font-semibold flex items-center gap-1">
                    <Briefcase size={12} /> Target Role: {profileSummary.role}
                  </span>
                )}
                {profileSummary.company && (
                  <span className="px-2.5 py-1 bg-white/15 rounded-lg text-white font-semibold flex items-center gap-1">
                    <Building2 size={12} /> Target Company: {profileSummary.company}
                  </span>
                )}
                {profileSummary.domain && (
                  <span className="px-2.5 py-1 bg-white/15 rounded-lg text-white font-semibold flex items-center gap-1">
                    <Compass size={12} /> Domain: {profileSummary.domain}
                  </span>
                )}
                {profileSummary.branch && (
                  <span className="px-2.5 py-1 bg-white/15 rounded-lg text-white font-semibold flex items-center gap-1">
                    <GraduationCap size={12} /> {profileSummary.branch}
                  </span>
                )}
                <Link
                  to="/student/profile"
                  className="ml-auto text-amber-300 hover:text-amber-200 font-bold text-xs underline flex items-center gap-1"
                >
                  Edit Career Preferences →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'recommendations'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} />
              <span>Ranked Mentors ({filteredMentors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sent'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock size={14} />
              <span>Sent Requests</span>
              {pendingSentCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                  {pendingSentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>My Active Mentors ({activeMentorships.length})</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadAllData}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Recommendations"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh Matches</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: RANKED RECOMMENDATIONS                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'recommendations' && (
          <div>
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <Search size={15} className="text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mentors by name, role, company, or skill..."
                  className="bg-transparent border-none outline-hidden text-xs text-slate-800 placeholder-slate-400 w-full"
                />
              </div>

              {/* Domain Filter */}
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Domains</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Mentorship Available Only Toggle */}
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Actively Open for Mentoring</span>
              </label>
            </div>

            {/* Mentor Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-slate-200 rounded-2xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-2xl mb-4 font-bold">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-slate-800">No matching mentors found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Try broadening your domain filter or search query. You can also explore all alumni in our directory.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setFilterDomain('');
                      setSearchQuery('');
                      setAvailableOnly(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Reset Filters
                  </button>
                  <Link
                    to="/alumni/directory"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Browse Full Directory
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMentors.map((mentor) => {
                  const reqStatus = mentor.mentorshipRequest?.status || 'NONE';

                  return (
                    <div
                      key={mentor.id || mentor.userId}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
                    >
                      <div className="p-6">
                        {/* Top: Avatar, Info & Match Gauge */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3.5">
                            {mentor.user?.profilePhoto ? (
                              <img
                                src={mentor.user.profilePhoto}
                                alt={mentor.user.firstName}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div
                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(
                                  mentor.user?.id
                                )} text-white font-black text-lg flex items-center justify-center shadow-sm`}
                              >
                                {initials(mentor.user?.firstName, mentor.user?.lastName)}
                              </div>
                            )}

                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                                {mentor.user?.firstName} {mentor.user?.lastName}
                              </h3>
                              <p className="text-xs font-bold text-indigo-600 mt-0.5">
                                {mentor.jobRole || 'Alumni Professional'}
                              </p>
                              {mentor.currentCompany && (
                                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Building2 size={11} className="text-slate-400" />
                                  <span>{mentor.currentCompany}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Match Gauge */}
                        <div className="mb-4">
                          <MatchBadge score={mentor.matchScore} level={mentor.matchLevel} />
                        </div>

                        {/* Highlight Match Reasons */}
                        {mentor.matchReasons && mentor.matchReasons.length > 0 && (
                          <div className="mb-4 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Why You Match:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {mentor.matchReasons.slice(0, 3).map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-indigo-50/80 text-indigo-900 text-[11px] font-medium rounded-md border border-indigo-100"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Career details */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 mb-4 border border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-medium">Domain</span>
                            <span className="font-semibold text-slate-800">{mentor.domain || 'General'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block font-medium">Experience</span>
                            <span className="font-semibold text-slate-800">
                              {mentor.yearsOfExperience ? `${mentor.yearsOfExperience} yrs` : 'Verified'}
                            </span>
                          </div>
                        </div>

                        {/* Skills */}
                        {mentor.skills && mentor.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {mentor.skills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200"
                              >
                                {s}
                              </span>
                            ))}
                            {mentor.skills.length > 4 && (
                              <span className="px-2 py-0.5 text-[10px] text-slate-400 font-medium">
                                +{mentor.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                        {reqStatus === 'ACCEPTED' ? (
                          <div className="w-full py-2.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={14} />
                            <span>Active Mentorship Session</span>
                          </div>
                        ) : reqStatus === 'PENDING' ? (
                          <div className="w-full py-2.5 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                            <Clock size={14} />
                            <span>Request Pending Approval</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedMentorForRequest(mentor)}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span>🤝</span>
                            <span>Request Mentorship</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: SENT REQUESTS TRACKER                                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Mentorship Requests Sent</h3>
                <p className="text-xs text-slate-500">Track alumni approvals and feedback in real-time.</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100">
                {sentRequests.length} Total Requests
              </span>
            </div>

            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-3">
                  📤
                </div>
                <h4 className="text-base font-bold text-slate-800">No mentorship requests sent yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Explore ranked mentor matches above and send your first mentorship request!
                </p>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  View Mentor Matches
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((req) => {
                  const alumni = req.alumni;
                  const profile = alumni?.alumniProfile;

                  let statusBadge = (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1">
                      <Clock size={12} /> Pending Response
                    </span>
                  );

                  if (req.status === 'ACCEPTED') {
                    statusBadge = (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Accepted 🎉
                      </span>
                    );
                  } else if (req.status === 'REJECTED') {
                    statusBadge = (
                      <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full flex items-center gap-1">
                        <XCircle size={12} /> Declined
                      </span>
                    );
                  } else if (req.status === 'COMPLETED') {
                    statusBadge = (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full flex items-center gap-1">
                        <Award size={12} /> Completed 🏆
                      </span>
                    );
                  } else if (req.status === 'CANCELLED') {
                    statusBadge = (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-full">
                        Cancelled
                      </span>
                    );
                  }

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        {alumni?.profilePhoto ? (
                          <img
                            src={alumni.profilePhoto}
                            alt={alumni.firstName}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(
                              alumni?.id
                            )} text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs`}
                          >
                            {initials(alumni?.firstName, alumni?.lastName)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-sm">
                              {alumni?.firstName} {alumni?.lastName}
                            </h4>
                            {req.matchScore && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                {req.matchScore}% Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {profile?.jobRole || 'Alumni'} {profile?.currentCompany ? `at ${profile?.currentCompany}` : ''}
                          </p>

                          <div className="mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                            <div>
                              <span className="font-bold text-slate-700">Topic:</span>{' '}
                              <span className="text-slate-900 font-medium">{req.topic || 'General Guidance'}</span>
                            </div>
                            {req.goals && (
                              <div>
                                <span className="font-bold text-slate-700">Goals:</span>{' '}
                                <span className="text-slate-600">{req.goals}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-700">Note:</span>{' '}
                              <span className="text-slate-600 italic">"{req.message}"</span>
                            </div>
                          </div>

                          {/* Response Note from Mentor if present */}
                          {req.responseNote && (
                            <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                              <span className="font-bold">Mentor Note:</span> {req.responseNote}
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 mt-2">
                            Sent on {new Date(req.createdAt).toLocaleDateString()} at{' '}
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                        <div>{statusBadge}</div>

                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline mt-1 self-start sm:self-end"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: ACTIVE MENTORS                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm">Your Active Mentorship Partnerships</h3>
              <p className="text-xs text-slate-500">
                You have approved mentorship connections with these experienced alumni.
              </p>
            </div>

            {activeMentorships.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-2xl mb-3">
                  👥
                </div>
                <h4 className="text-base font-bold text-slate-800">No active mentorships yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When an alumni mentor accepts your request, they will appear here as your dedicated mentor.
                </p>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Find Recommended Mentors
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeMentorships.map((m) => {
                  const alumni = m.alumni;
                  const profile = alumni?.alumniProfile;

                  return (
                    <div
                      key={m.id}
                      className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        {alumni?.profilePhoto ? (
                          <img
                            src={alumni.profilePhoto}
                            alt={alumni.firstName}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(
                              alumni?.id
                            )} text-white font-black text-lg flex items-center justify-center shadow-xs`}
                          >
                            {initials(alumni?.firstName, alumni?.lastName)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-base">
                              {alumni?.firstName} {alumni?.lastName}
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              Active Mentor
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                            {profile?.jobRole || 'Alumni Mentor'} {profile?.currentCompany ? `at ${profile?.currentCompany}` : ''}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{alumni?.email}</p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5 mb-4">
                        <div className="font-bold text-slate-800">Topic: {m.topic || 'General Mentorship'}</div>
                        {m.goals && <div className="text-slate-600">Goals: {m.goals}</div>}
                        {m.responseNote && (
                          <div className="text-emerald-800 italic bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                            "Note: {m.responseNote}"
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          to={`/messages?userId=${alumni?.id}`}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl text-center shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare size={13} />
                          <span>Chat with Mentor</span>
                        </Link>
                        <a
                          href={`mailto:${alumni?.email}`}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center"
                          title="Send Email"
                        >
                          ✉️
                        </a>
                        <button
                          onClick={async () => {
                            if (window.confirm('Mark this mentorship session as completed?')) {
                              await mentorshipService.completeMentorship(m.id);
                              loadAllData();
                            }
                          }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
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
      </main>

      {/* Request Mentorship Modal */}
      {selectedMentorForRequest && (
        <MentorshipRequestModal
          alumni={selectedMentorForRequest}
          matchScore={selectedMentorForRequest.matchScore}
          matchReasons={selectedMentorForRequest.matchReasons}
          onClose={() => setSelectedMentorForRequest(null)}
          onSuccess={(newReq) => {
            setToastMessage(`Mentorship request sent to ${selectedMentorForRequest.user?.firstName}!`);
            setTimeout(() => setToastMessage(''), 4000);
            loadAllData();
          }}
        />
      )}
    </div></StudentShell>
  );
}
