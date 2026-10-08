import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { gamificationService } from '../../services/gamificationService';
import NotificationDropdown from '../../components/NotificationDropdown';
import {
  Trophy, Award, Medal, Sparkles, TrendingUp, Users,
  Briefcase, Calendar, MessageSquare, ArrowLeft, CheckCircle2,
  Lock, Clock, Shield, Star, Flame, Compass, ChevronRight,
  ExternalLink
} from 'lucide-react';

function initials(first = '', last = '') {
  const f = first ? first.trim()[0] : '';
  const l = last ? last.trim()[0] : '';
  return `${f}${l}`.toUpperCase() || '?';
}

const TIER_COLORS = {
  BRONZE: 'from-amber-700 to-amber-900 border-amber-600/40 text-amber-200',
  SILVER: 'from-slate-400 to-slate-600 border-slate-300/40 text-slate-100',
  GOLD: 'from-amber-400 to-yellow-600 border-yellow-300/40 text-yellow-100',
  PLATINUM: 'from-cyan-400 to-indigo-600 border-cyan-300/40 text-cyan-100',
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Current user's gamification profile
  const [myProfile, setMyProfile] = useState(null);
  const [myBadges, setMyBadges] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Active view tab: 'leaderboard' | 'badges' | 'history'
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // ── Load Leaderboard ──────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async (page = 1) => {
    try {
      setLoadingLeaderboard(true);
      const res = await gamificationService.getLeaderboard({ page, limit: 25 });
      if (res.success) {
        setLeaderboard(res.leaderboard || []);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  // ── Load My Gamification Profile ──────────────────────────────────────────
  const fetchMyProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const res = await gamificationService.getMyProfile();
      if (res.success) {
        setMyProfile(res.data.profile);
        setMyBadges(res.data.badges || []);
        setMyHistory(res.data.pointHistory || []);
      }
    } catch (err) {
      console.error('Failed to load user gamification profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(1);
    if (user) {
      fetchMyProfile();
    }
  }, [fetchLeaderboard, fetchMyProfile, user]);

  // ── Real-time Socket.IO Listeners for Points & Badges ─────────────────────
  useEffect(() => {
    if (!socket) return;

    const handlePointsAwarded = (payload) => {
      showToast(`+${payload.pointsAwarded} Impact Points: ${payload.title}!`);
      fetchLeaderboard(1);
      fetchMyProfile();
    };

    const handleBadgeEarned = (payload) => {
      showToast(`🏆 Badge Unlocked: ${payload.badge.name}!`);
      fetchLeaderboard(1);
      fetchMyProfile();
    };

    socket.on('gamification:points_awarded', handlePointsAwarded);
    socket.on('gamification:badge_earned', handleBadgeEarned);

    return () => {
      socket.off('gamification:points_awarded', handlePointsAwarded);
      socket.off('gamification:badge_earned', handleBadgeEarned);
    };
  }, [socket, fetchLeaderboard, fetchMyProfile]);

  // Top 3 Podium
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={user?.role === 'ALUMNI' ? '/alumni/dashboard' : '/student/dashboard'}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                🏆
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                  Alumni Champions & Impact Leaderboard
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Verified platform contributions, badges & mentorship recognition
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/communities"
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Users size={13} />
              <span className="hidden sm:inline">Communities</span>
            </Link>
            <NotificationDropdown align="right" />
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toast && (
        <div className="bg-amber-600 text-white px-6 py-2.5 text-xs font-bold text-center animate-fadeIn shadow-md sticky top-16 z-20">
          ✨ {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* Hero Section */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold backdrop-blur-xs">
              <Sparkles size={12} className="text-amber-300" />
              <span>Real PostgreSQL Verified Activity</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Honoring Our Top Alumni Contributors
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Points are automatically awarded for meaningful actions: mentoring students (+100),
              accepting mentorship requests (+25), hosting webinars (+75), posting job opportunities (+50),
              and sharing domain guidance in communities. Zero manual scores.
            </p>
          </div>
        </div>

        {/* User's Personal Impact Card (if logged in) */}
        {myProfile && user?.role === 'ALUMNI' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {initials(user?.firstName, user?.lastName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black">
                      Level {myProfile.level || 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Your Current Standing: #{myProfile.currentRank || 1} on the Platform
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600 leading-tight">
                    {myProfile.totalPoints || 0}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Impact Points
                  </div>
                </div>
              </div>
            </div>

            {/* Point Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-center">
                <div className="font-black text-indigo-700 text-base">{myProfile.mentorshipPoints || 0}</div>
                <div className="text-[10px] font-bold text-indigo-600">🎯 Mentorship</div>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-center">
                <div className="font-black text-purple-700 text-base">{myProfile.webinarPoints || 0}</div>
                <div className="text-[10px] font-bold text-purple-600">🎙️ Webinars</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                <div className="font-black text-emerald-700 text-base">{myProfile.jobPoints || 0}</div>
                <div className="text-[10px] font-bold text-emerald-600">💼 Jobs Posted</div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
                <div className="font-black text-blue-700 text-base">{myProfile.helpingPoints || 0}</div>
                <div className="text-[10px] font-bold text-blue-600">🤝 Connections</div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100 text-center">
                <div className="font-black text-amber-700 text-base">{myProfile.communityPoints || 0}</div>
                <div className="text-[10px] font-bold text-amber-600">💬 Community</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation: Leaderboard / Badges Showcase / Audit History */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs w-fit">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Trophy size={14} />
            <span>Ranked Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'badges'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award size={14} />
            <span>Badges & Achievements</span>
          </button>
          {myHistory.length > 0 && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock size={14} />
              <span>Audit History ({myHistory.length})</span>
            </button>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: RANKED LEADERBOARD                                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {/* Top 3 Podium (if >= 2 items) */}
            {leaderboard.length >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {/* 2nd Place */}
                {top2 && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-between order-2 sm:order-1 sm:mt-6">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center mb-2">
                      🥈 #2
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 text-white font-black text-lg flex items-center justify-center shadow-md mb-2">
                      {initials(top2.user?.firstName, top2.user?.lastName)}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {top2.user?.firstName} {top2.user?.lastName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold mb-3">
                      {top2.user?.alumniProfile?.jobRole || 'Alumni'} at {top2.user?.alumniProfile?.currentCompany || 'Company'}
                    </p>
                    <div className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-black">
                      {top2.totalPoints} PTS
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top1 && (
                  <div className="bg-gradient-to-b from-amber-500/15 via-white to-white rounded-3xl p-6 border-2 border-amber-300 shadow-md text-center flex flex-col items-center justify-between order-1 sm:order-2">
                    <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 font-black text-base flex items-center justify-center mb-2 shadow-sm">
                      👑 #1
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white font-black text-2xl flex items-center justify-center shadow-lg mb-2 border-2 border-white">
                      {initials(top1.user?.firstName, top1.user?.lastName)}
                    </div>
                    <h3 className="font-black text-slate-900 text-base">
                      {top1.user?.firstName} {top1.user?.lastName}
                    </h3>
                    <p className="text-xs text-amber-800 font-bold mb-3">
                      {top1.user?.alumniProfile?.jobRole || 'Alumni Mentor'} at {top1.user?.alumniProfile?.currentCompany || 'Company'}
                    </p>
                    <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black shadow-xs">
                      🏆 {top1.totalPoints} IMPACT PTS
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3 && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-between order-3 sm:mt-10">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center mb-2">
                      🥉 #3
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 text-white font-black text-base flex items-center justify-center shadow-md mb-2">
                      {initials(top3.user?.firstName, top3.user?.lastName)}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {top3.user?.firstName} {top3.user?.lastName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold mb-3">
                      {top3.user?.alumniProfile?.jobRole || 'Alumni'} at {top3.user?.alumniProfile?.currentCompany || 'Company'}
                    </p>
                    <div className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 text-xs font-black">
                      {top3.totalPoints} PTS
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">
                  All Alumni Contributors
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Sorted by validated PostgreSQL activity
                </span>
              </div>

              {loadingLeaderboard ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">No alumni points recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leaderboard.map((item) => {
                    const u = item.user;
                    const ap = u?.alumniProfile;

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-wrap items-center justify-between gap-4"
                      >
                        {/* Rank & User Info */}
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              item.rank === 1
                                ? 'bg-amber-400 text-amber-950'
                                : item.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : item.rank === 3
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            #{item.rank}
                          </span>

                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials(u?.firstName, u?.lastName)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                                {u?.firstName} {u?.lastName}
                              </h4>
                              <span className="px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                                Lvl {item.level}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                              {ap?.jobRole || 'Alumni'} {ap?.currentCompany ? `at ${ap.currentCompany}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Badges Display */}
                        {item.badges && item.badges.length > 0 && (
                          <div className="hidden md:flex items-center gap-1.5">
                            {item.badges.slice(0, 4).map((b) => (
                              <span
                                key={b.id}
                                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shadow-2xs"
                                title={`${b.name}: ${b.description}`}
                              >
                                {b.icon}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Points & Action */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-black text-indigo-600 text-sm">
                              {item.totalPoints} pts
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              Verified
                            </div>
                          </div>

                          {u?.id !== user?.id && (
                            <Link
                              to={`/messages?userId=${u?.id}`}
                              className="p-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                              title="Message Alumni"
                            >
                              <MessageSquare size={13} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: BADGES & ACHIEVEMENTS SHOWCASE                               */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === 'badges' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Platform Badges & Criteria
              </h3>
              <p className="text-xs text-slate-500">
                Badges are earned automatically when you reach milestones in mentorship, job referrals, webinars, and community leadership.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBadges.map((badge) => {
                const isEarned = badge.isEarned;
                const tierGradient = TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE;

                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      isEarned
                        ? 'bg-white border-indigo-200 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-2xs">
                          {badge.icon}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isEarned
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isEarned ? '✓ UNLOCKED' : '🔒 LOCKED'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                        {badge.name}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {badge.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Tier: {badge.tier}</span>
                      <span>Requires {badge.pointsRequired} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: AUDIT HISTORY LEDGER                                         */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Auditable Point Award History
              </h3>
              <p className="text-xs text-slate-500">
                Every point award is stored with an idempotent event reference to guarantee 100% transparency.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {myHistory.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.title}</div>
                    {item.description && (
                      <div className="text-slate-500 text-[11px] mt-0.5">{item.description}</div>
                    )}
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      {new Date(item.createdAt).toLocaleString()} • Ref: {item.referenceId?.slice(0, 8)}...
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs shrink-0">
                    +{item.points} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
