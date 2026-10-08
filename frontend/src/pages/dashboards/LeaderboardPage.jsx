import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Star, Crown, Target, Users, Shield, Lock, RefreshCw, Award, Clock, Briefcase, CalendarDays, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { gamificationService } from '../../services/gamificationService';
import { mentorshipService } from '../../services/mentorshipService';
import { PortalDialog } from '../../components/PortalUI';
import { collectPortalPages } from './portalUtils';
import { levelProgress, mentorshipImpact, badgeRequirement } from './gamificationUtils';
import './leaderboard.css';

const name = u => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Member';
const initials = u => [u?.firstName?.trim()[0], u?.lastName?.trim()[0]].filter(Boolean).join('').toUpperCase() || '?';
const date = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
function Empty({ children }) { return <div className="impact-empty"><Award size={32}/><p>{children}</p></div>; }
function Loading() { return <div role="status" aria-label="Loading gamification data" className="impact-loading">{[1,2,3].map(i => <div key={i}/>)}</div>; }
function ErrorBox({ message, retry }) { return <div className="impact-error" role="alert">{message}<button onClick={retry}>Retry</button></div>; }
function Badge({ badge, onClick }) {
  return <button className={`impact-badge ${badge.isEarned ? `earned ${badge.tier?.toLowerCase()}` : 'locked'}`} onClick={() => onClick(badge)}>
    <span className="impact-badge-icon">{badge.isEarned ? badge.icon || <Award size={28}/> : <Lock size={26}/>}</span>
    <strong>{badge.name}</strong><small>{badge.tier}</small><span>{badge.isEarned ? 'Earned' : 'Locked'}</span>
  </button>;
}
function Achievement({ log }) {
  const Icon = log.activityType?.startsWith('MENTORSHIP') ? Users : log.activityType === 'JOB_POSTED' ? Briefcase : log.activityType === 'WEBINAR_HOSTED' ? CalendarDays : MessageSquare;
  return <div className="impact-achievement"><span><Icon size={20}/></span><div><strong>{log.title}</strong>{log.description && <p>{log.description}</p>}<small>{date(log.createdAt)}</small></div><b>{log.points > 0 ? '+' : ''}{log.points} pts</b></div>;
}
export default function LeaderboardPage() {
  const { user } = useAuth(), { socket } = useSocket();
  const [board, setBoard] = useState([]), [pagination, setPagination] = useState({ page:1, totalPages:1, total:0 });
  const [data, setData] = useState(null), [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true), [profileLoading, setProfileLoading] = useState(true);
  const [boardError, setBoardError] = useState(''), [profileError, setProfileError] = useState(''), [metricsError, setMetricsError] = useState('');
  const [dialog, setDialog] = useState(null), [toast, setToast] = useState('');
  const boardSeq = useRef(0), profileSeq = useRef(0), metricSeq = useRef(0), currentPage = useRef(1), toastTimer = useRef(null);
  const loadBoard = useCallback(async (page = currentPage.current) => {
    const seq = ++boardSeq.current; currentPage.current = page; setLoading(true); setBoardError('');
    try { const res = await gamificationService.getLeaderboard({ page, limit:25 });
      if (!res.success) throw new Error(res.message || 'Unable to load rankings.');
      if (seq === boardSeq.current) { setBoard(res.leaderboard || []); setPagination(res.pagination); }
    } catch (e) { if (seq === boardSeq.current) setBoardError(e.response?.data?.message || e.message); }
    finally { if (seq === boardSeq.current) setLoading(false); }
  }, []);
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const seq = ++profileSeq.current; setProfileLoading(true); setProfileError('');
    try { const res = await gamificationService.getUserProfile(user.id);
      if (!res.success) throw new Error(res.message || 'Unable to load your progress.');
      if (seq === profileSeq.current) setData(res.data);
    } catch (e) { if (seq === profileSeq.current) setProfileError(e.response?.data?.message || e.message); }
    finally { if (seq === profileSeq.current) setProfileLoading(false); }
  }, [user?.id]);
  const loadMetrics = useCallback(async () => {
    if (user?.role !== 'ALUMNI') return;
    const seq = ++metricSeq.current; setMetricsError('');
    try { const records = await collectPortalPages(p => mentorshipService.getReceivedRequests(p), 'requests');
      if (seq === metricSeq.current) setImpact(mentorshipImpact(records));
    } catch { if (seq === metricSeq.current) { setImpact(null); setMetricsError('Mentorship statistics could not be loaded.'); } }
  }, [user?.id, user?.role]);
  const refresh = useCallback(async () => { await Promise.allSettled([loadProfile(), loadMetrics()]); await loadBoard(); }, [loadProfile, loadMetrics, loadBoard]);
  useEffect(() => { refresh(); return () => { boardSeq.current++; profileSeq.current++; metricSeq.current++; }; }, [refresh]);
  useEffect(() => {
    if (!socket) return;
    const awarded = payload => { setToast(payload.badge ? `Badge unlocked: ${payload.badge.name}` : `+${payload.pointsAwarded} points: ${payload.title}`); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 5000); refresh(); };
    socket.on('gamification:points_awarded', awarded); socket.on('gamification:badge_earned', awarded); socket.on('connect', refresh); socket.on('mentorship:updated', loadMetrics);
    return () => { socket.off('gamification:points_awarded', awarded); socket.off('gamification:badge_earned', awarded); socket.off('connect', refresh); socket.off('mentorship:updated', loadMetrics); clearTimeout(toastTimer.current); };
  }, [socket, refresh, loadMetrics]);
  const profile = data?.profile, badges = data?.badges || [], history = data?.pointHistory || [];
  const progress = profile ? levelProgress(profile.totalPoints, profile.level) : null;
  const stats = [ [Star, 'Total Points', profile?.totalPoints, 'Recorded contributions'], [Crown, 'Your Rank', profile?.currentRank ? `#${profile.currentRank}` : undefined, 'All-time standing'], ...(user?.role === 'ALUMNI' ? [[Target, 'Mentorship Sessions', impact?.completed, 'Completed mentorships'], [Users, 'Students Helped', impact?.students, 'Accepted or completed mentoring']] : []), [Shield, 'Badges Earned', data?.earnedBadgesCount, 'Keep making an impact'] ];
  const maximum = board[0]?.totalPoints || 1;
  return <main className="network-page impact-page">
    {toast && <div className="impact-toast" role="status"><Sparkles size={18}/>{toast}</div>}
    <section className="network-hero impact-hero">
      <div className="network-hero-copy"><span className="network-hero-label"><Award size={16}/>Leaderboard & Badges</span><h1>Make an Impact, Earn Recognition</h1><p>Guide, mentor, and connect to earn points, badges and climb the leaderboard.</p></div>
      <div className="impact-trophy" aria-hidden="true"><Sparkles/><Trophy size={104} strokeWidth={1.5}/><Award size={38}/></div>
      <div className="impact-progress"><h2>Your Progress <Shield size={26}/></h2>{profileLoading ? <Loading/> : profileError ? <ErrorBox message={profileError} retry={loadProfile}/> : progress ? <><strong>Level {profile.level}</strong><span>Contribution level</span><div className="impact-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><i style={{width:`${progress.percent}%`}}/></div><div className="impact-progress-detail"><b>{profile.totalPoints} / {progress.next} points</b><span>{progress.percent}%</span></div><small>{progress.next - profile.totalPoints} points to Level {profile.level + 1}</small></> : <p>Your progress is not available yet.</p>}</div>
    </section>
    <div className="impact-stats">{stats.map(([Icon,label,value,note],i) => <article key={label}><span className={`impact-stat-icon tone-${i}`}><Icon size={25}/></span><div><strong>{(profileError && !label.includes('Mentorship') && !label.includes('Students')) ? '—' : value ?? '—'}</strong><h2>{label}</h2><small>{value === undefined ? 'Unavailable' : note}</small></div></article>)}</div>
    {metricsError && <ErrorBox message={metricsError} retry={loadMetrics}/>}
    <div className="impact-columns"><section className="impact-card impact-ranking"><div className="impact-card-heading"><div><h2><Crown size={22}/>Leaderboard</h2><p>Contributors making an impact through mentorship, opportunities and community.</p></div><button className="impact-refresh" onClick={refresh} disabled={loading || profileLoading} aria-label="Refresh leaderboard"><RefreshCw size={17}/></button></div><div className="impact-period"><span>All Time</span><small>{pagination.total} participants · Monthly and yearly rankings are not available.</small></div>
      {loading ? <Loading/> : boardError ? <ErrorBox message={boardError} retry={() => loadBoard()}/> : !board.length ? <Empty>No contributors yet. Meaningful contributions will appear here.</Empty> : <div className="impact-rows">{board.map(row => <div key={row.userId} className={`impact-row ${row.userId === user?.id ? 'is-you' : ''}`}><span className={`impact-rank rank-${row.rank}`}>{row.rank <= 3 ? <MedalIcon rank={row.rank}/> : row.rank}</span><span className="impact-avatar">{row.user?.profilePhoto ? <img src={row.user.profilePhoto} alt=""/> : initials(row.user)}</span><div className="impact-person"><strong>{name(row.user)}{row.userId === user?.id && <small> You</small>}</strong><p>{[row.user?.alumniProfile?.jobRole, row.user?.alumniProfile?.currentCompany].filter(Boolean).join(' at ') || row.user?.role || 'Member'}</p></div><div className="impact-bar" aria-hidden="true"><i style={{width:`${Math.min(100,row.totalPoints/maximum*100)}%`}}/></div><b className="impact-points">{row.totalPoints.toLocaleString()} <small>pts</small></b></div>)}</div>}
      {pagination.totalPages > 1 && <nav className="impact-pagination" aria-label="Leaderboard pages"><button disabled={loading || pagination.page<=1} onClick={() => loadBoard(pagination.page-1)}>Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={loading || pagination.page>=pagination.totalPages} onClick={() => loadBoard(pagination.page+1)}>Next</button></nav>}
    </section><aside className="impact-side"><section className="impact-card"><div className="impact-card-heading"><h2><Trophy size={20}/>Your Badges</h2><button onClick={() => setDialog('badges')} disabled={!data || !!profileError}>View All Badges →</button></div>{profileLoading ? <Loading/> : profileError ? <ErrorBox message={profileError} retry={loadProfile}/> : !badges.length ? <Empty>No badges are available yet.</Empty> : <><div className="impact-badges">{badges.slice(0,5).map(b => <Badge key={b.id} badge={b} onClick={setDialog}/>)}</div>{!badges.some(b => b.isEarned) && <p className="impact-hint">Your first badge is ahead. Select a badge to see its requirement.</p>}</>}</section>
    <section className="impact-card"><div className="impact-card-heading"><h2><Clock size={20}/>Recent Achievements</h2><button disabled={!data || !!profileError} onClick={() => setDialog('history')}>View All →</button></div>{profileLoading ? <Loading/> : profileError ? <ErrorBox message={profileError} retry={loadProfile}/> : !history.length ? <Empty>No achievements yet. Your contributions will be recorded here.</Empty> : history.slice(0,4).map(log => <Achievement key={log.id} log={log}/>)}</section></aside></div>
    {dialog && <PortalDialog title={dialog === 'badges' ? 'All Badges' : dialog === 'history' ? 'Contribution History' : dialog.name} onClose={() => setDialog(null)}>{dialog === 'badges' ? <div className="impact-badges impact-all-badges">{badges.length ? badges.map(b => <Badge key={b.id} badge={b} onClick={setDialog}/>) : <Empty>No badges available.</Empty>}</div> : dialog === 'history' ? <><div className="impact-breakdown">{[['mentorshipPoints','Mentorship'],['helpingPoints','Connections'],['jobPoints','Careers'],['webinarPoints','Webinars'],['communityPoints','Community']].map(([key,label]) => <div key={key}><strong>{profile?.[key] ?? '—'}</strong><span>{label} points</span></div>)}</div><p className="impact-hint">Latest {history.length} recorded contributions. The API returns up to 30 entries.</p>{history.length ? history.map(log => <Achievement key={log.id} log={log}/>) : <Empty>No contributions recorded yet.</Empty>}</> : <div className="impact-badge-detail"><span>{dialog.icon || '🏅'}</span><h3>{dialog.name}</h3><p>{dialog.description}</p><p><b>{dialog.isEarned ? `Earned ${date(dialog.earnedAt)}` : `Unlock requirement: ${badgeRequirement(dialog)}`}</b></p><small>{dialog.tier} · {dialog.category}</small></div>}</PortalDialog>}
  </main>;
}
function MedalIcon({rank}) { return <span aria-label={`Rank ${rank}`}>{['🥇','🥈','🥉'][rank-1]}</span>; }
