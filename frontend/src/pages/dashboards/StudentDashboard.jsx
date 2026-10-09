import StudentShell from '../../layouts/StudentShell';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { connectionService } from '../../services/connectionService';
import { mentorshipService } from '../../services/mentorshipService';
import { recommendationService } from '../../services/recommendationService';
import NotificationDropdown from '../../components/NotificationDropdown';
import MentorshipRequestModal from '../../components/MentorshipRequestModal';
import { eventService } from '../../services/eventService';
import api from '../../services/api';
import {
  LayoutDashboard, Users, BookOpen, Briefcase, FileText,
  UserCheck, MessageSquare, Calendar, Globe, BookMarked,
  Bell, User, Settings, LogOut, Search, ChevronDown,
  ChevronRight, Clock, Send, Bot, Menu, X, Sparkles, CheckCircle2,
  RefreshCw, MapPin, Building, ArrowRight, Trophy,
} from 'lucide-react';

const aiSuggestions = ['How should I prepare for Accenture interviews?', 'Find alumni working in MERN stack', 'Tips for technical interviews', 'How to request mentorship?'];

function SkillTag({ label }) {
  return (
    <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
      {label}
    </span>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [connections, setConnections] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeMentorships, setActiveMentorships] = useState([]);
  const [myEventRegistrations, setMyEventRegistrations] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [refreshingRecs, setRefreshingRecs] = useState(false);
  const [activeDrive, setActiveDrive] = useState(null);

  // Real Dynamic AI Recommendations
  const [aiRecs, setAiRecs] = useState({
    alumni: [],
    mentors: [],
    jobs: [],
    events: [],
  });

  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);


  const firstName = user?.firstName || 'Student';
  const lastName = user?.lastName || '';

  // ── Fetch Real Data from PostgreSQL ─────────────────────────────────────────
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoadingRecommendations(true);
      const [connRes, sentRes, activeRes, eventsRes, recRes, driveRes] = await Promise.all([
        connectionService.getMyConnections({ limit: 10 }),
        mentorshipService.getSentRequests({ status: 'PENDING', limit: 10 }),
        mentorshipService.getActiveMentorships(),
        eventService.getUserRegistrations().catch(() => ({ data: [] })),
        recommendationService.getRecommendations({ forceRefresh, limit: 6 }).catch((err) => {
          console.warn('Failed to load AI recommendations:', err);
          return { success: false, data: {} };
        }),
        api.get('/company-connect/drives').catch(() => ({ data: { drives: [] } })),
      ]);

      if (connRes?.success) setConnections(connRes.data.connections || []);
      if (sentRes?.success) setSentRequests(sentRes.data.requests || []);
      if (activeRes?.success) setActiveMentorships(activeRes.data || []);
      if (eventsRes?.data) setMyEventRegistrations(eventsRes.data || []);
      if (recRes?.success && recRes.data) {
        setAiRecs(recRes.data);
      }
      if (driveRes?.data?.drives?.length > 0) {
        setActiveDrive(driveRes.data.drives[0]);
      }
    } catch (err) {
      console.error('Failed to load student dashboard data:', err);
    } finally {
      setLoadingRecommendations(false);
      setRefreshingRecs(false);
    }
  }, []);

  const handleRefreshRecommendations = async () => {
    setRefreshingRecs(true);
    await fetchDashboardData(true);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Real-time Socket.IO Listeners ───────────────────────────────────────────
  useEffect(() => {
    const handleUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('connection:updated', handleUpdate);
    window.addEventListener('connection:received', handleUpdate);
    window.addEventListener('mentorship:updated', handleUpdate);
    window.addEventListener('mentorship:request:sent', handleUpdate);
    window.addEventListener('mentorship:cancelled', handleUpdate);

    return () => {
      window.removeEventListener('connection:updated', handleUpdate);
      window.removeEventListener('connection:received', handleUpdate);
      window.removeEventListener('mentorship:updated', handleUpdate);
      window.removeEventListener('mentorship:request:sent', handleUpdate);
      window.removeEventListener('mentorship:cancelled', handleUpdate);
    };
  }, [fetchDashboardData]);

  const handleAiSubmit = (text) => {
    const query = text || aiInput.trim();
    if (!query) return;
    setAiMessages(prev => [...prev, { role: 'user', text: query }]);
    setAiInput('');
    setTimeout(() => {
      setAiMessages(prev => [...prev, { role: 'bot', text: `Here is guidance on "${query}": Head over to our Mentorship Hub to view your ranked alumni matches, check their experience at top companies, and send a personalized mentorship request! 🚀` }]);
    }, 800);
  };

  return (
    <StudentShell>
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {/* Hero */}
          <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%)', borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', right: 220, top: -30, width: 220, height: 220, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            <div style={{ zIndex: 1 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Welcome back, {firstName}! 👋</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: '0 0 6px' }}>Intelligent mentorship matching powered by PostgreSQL relevance ranking.</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontStyle: 'italic', margin: 0 }}>"Your network today, your opportunities tomorrow."</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '18px 22px', minWidth: 260, zIndex: 1, border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginBottom: 8 }}>Intelligent Mentorship Hub</div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '0 0 12px' }}>View ranked mentor recommendations with matching scores and breakdown.</p>
              <button onClick={() => navigate('/student/mentorship')} style={{ background: '#fff', color: '#4f46e5', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Open Mentorship Hub →
              </button>
            </div>
          </div>

          {/* Placement Drive Announcement Banner */}
          {activeDrive && (
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 24,
              color: '#fff',
              boxShadow: '0 8px 24px rgba(67, 56, 202, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              border: '1px solid rgba(165, 180, 252, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}>
                  🏢
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                      Placement Drive
                    </span>
                    <span style={{ fontSize: 12, color: '#c7d2fe', fontWeight: 600 }}>
                      📅 {activeDrive.driveDate}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {activeDrive.companyName} Placement Drive Announced!
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#e0e7ff' }}>
                    Alumni mentors ({activeDrive.acceptedAlumni?.map(a => a.name).join(', ') || 'Senior Alumni'}) are ready to guide you. Check eligibility and register now!
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/student/placement')}
                style={{
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>Register & Join Mentorship</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { icon: '👥', value: connections.length, label: 'Active Connections', sub: 'In your network', bg: '#ede9fe' },
              { icon: '🎯', value: activeMentorships.length, label: 'Active Mentors', sub: 'Dedicated guidance', bg: '#d1fae5' },
              { icon: '⏳', value: sentRequests.length, label: 'Pending Mentorships', sub: 'Awaiting response', bg: '#fef3c7' },
              { icon: '💼', value: 5, label: 'Open Opportunities', sub: '2 in progress', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations Hub Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(124, 58, 237, 0.06))', padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(79,70,229,0.3)' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>AI Smart Recommendations</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#4f46e5', color: '#fff', padding: '2px 7px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PostgreSQL Vector AI
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                  Dynamically ranked based on your skills, career goals, preferred companies & interaction history
                </div>
              </div>
            </div>

            <button
              onClick={handleRefreshRecommendations}
              disabled={refreshingRecs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid #c7d2fe',
                background: '#fff',
                color: '#4f46e5',
                fontSize: 12,
                fontWeight: 700,
                cursor: refreshingRecs ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={13} className={refreshingRecs ? 'animate-spin' : ''} />
              <span>{refreshingRecs ? 'Recalculating...' : 'Refresh Matches'}</span>
            </button>
          </div>

          {/* 3-col Section: Real Mentors, Real Jobs, Real Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Real Intelligent Mentor Recommendations */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#4f46e5" />
                  <span>Ranked Mentors</span>
                </h2>
                <Link to="/student/mentorship" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>Mentorship Hub →</Link>
              </div>

              {loadingRecommendations ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  <div style={{ marginBottom: 6 }}>✨ Running semantic mentor matching...</div>
                  <div style={{ fontSize: 11, color: '#d1d5db' }}>Analyzing skills & company experience</div>
                </div>
              ) : (aiRecs.mentors || []).length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                  No mentors found yet. Check back soon!
                </div>
              ) : (
                (aiRecs.mentors || []).slice(0, 3).map((m) => {
                  return (
                    <div key={m.id || m.userId} style={{ border: '1px solid #e0e7ff', borderRadius: 12, padding: '12px 14px', marginBottom: 12, background: 'linear-gradient(180deg, #faf5ff 0%, #fff 100%)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {m.user?.profilePhoto ? (
                            <img src={m.user.profilePhoto} alt={m.user.firstName} style={{ width: 40, height: 40, borderRadius: '50%', objectCover: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {m.user?.firstName?.[0]}{m.user?.lastName?.[0]}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.user?.firstName} {m.user?.lastName}</div>
                            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>{m.jobRole || 'Mentor'} {m.currentCompany ? `• ${m.currentCompany}` : ''}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.domain || ''} {m.yearsOfExperience ? `• ${m.yearsOfExperience}y exp` : ''}</div>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div style={{ background: m.score >= 75 ? '#10b981' : '#6366f1', color: '#fff', padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
                          🎯 {Math.round(m.score)}%
                        </div>
                      </div>

                      {/* AI Matching Reasons */}
                      {m.reasons && m.reasons.length > 0 && (
                        <div style={{ fontSize: 10, color: '#4338ca', background: 'rgba(99,102,241,0.08)', padding: '4px 8px', borderRadius: 6, marginBottom: 8, fontWeight: 500 }}>
                          {m.reasons[0]}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {(m.skills || []).slice(0, 3).map(s => <SkillTag key={s} label={s} />)}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/student/mentorship')} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          View Details
                        </button>
                        <button onClick={() => setSelectedMentor(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Request Mentorship
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Real AI Recommended Jobs from PostgreSQL */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={16} color="#4f46e5" />
                  <span>AI Recommended Jobs</span>
                </h2>
                <Link to="/jobs" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>All Jobs →</Link>
              </div>

              {loadingRecommendations ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  Analyzing career preferences & active jobs...
                </div>
              ) : (aiRecs.jobs || []).length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                  No active job postings yet. Check back soon!
                </div>
              ) : (
                (aiRecs.jobs || []).slice(0, 3).map((j) => (
                  <div key={j.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 12, background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                          {(j.company?.[0] || 'J').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{j.title}</div>
                          <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 500 }}>{j.company} • {j.location}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                            {j.employmentType || 'FULL_TIME'} {j.workplaceType ? `(${j.workplaceType})` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{ background: '#4f46e5', color: '#fff', padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
                        🎯 {Math.round(j.score)}%
                      </div>
                    </div>

                    {/* Reasons */}
                    {j.reasons && j.reasons.length > 0 && (
                      <div style={{ fontSize: 10, color: '#1e40af', background: 'rgba(59,130,246,0.08)', padding: '4px 8px', borderRadius: 6, marginBottom: 8, fontWeight: 500 }}>
                        {j.reasons[0]}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {(j.skills || []).slice(0, 3).map(s => <SkillTag key={s} label={s} />)}
                    </div>

                    <button
                      onClick={() => navigate('/jobs')}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {j.isApplied ? '✓ Applied' : 'View Job & Apply'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Column 3: Event Communities & Recommended Events from PostgreSQL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* My Registered Event Communities */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} color="#4f46e5" />
                    <span>My Event Communities</span>
                  </h2>
                  <Link to="/events" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>All Events →</Link>
                </div>
                {myEventRegistrations.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                    <p style={{ margin: '0 0 10px' }}>You haven't joined any webinar communities yet.</p>
                    <button onClick={() => navigate('/events')} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Browse Webinars
                    </button>
                  </div>
                ) : (
                  myEventRegistrations.slice(0, 2).map((reg) => {
                    const evt = reg.event;
                    if (!evt) return null;
                    return (
                      <div key={reg.id} style={{ border: '1px solid #e0e7ff', borderRadius: 12, padding: '12px 14px', marginBottom: 10, background: '#faf5ff' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{evt.title}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                          Speaker: {evt.speakerName} • {new Date(evt.startDate).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/events/${evt.id}/community`)}
                          style={{ width: '100%', padding: '7px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                        >
                          <Users size={12} /> Enter Event Community
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Real AI Recommended Webinars from PostgreSQL */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={15} color="#4f46e5" />
                    <span>Recommended Webinars</span>
                  </h2>
                  <Link to="/events" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>Explore →</Link>
                </div>

                {loadingRecommendations ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    Matching webinars to your interests...
                  </div>
                ) : (aiRecs.events || []).length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                    No upcoming webinars available right now.
                  </div>
                ) : (
                  (aiRecs.events || []).slice(0, 2).map((e) => (
                    <div key={e.id} style={{ border: '1px solid #f3f4f6', borderRadius: 12, padding: '12px 14px', marginBottom: 10, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{e.title}</div>
                        <span style={{ background: '#818cf8', color: '#fff', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>
                          🎯 {Math.round(e.score)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                        🎙️ {e.speakerName} {e.speakerCompany ? `(${e.speakerCompany})` : ''} • {new Date(e.startDate).toLocaleDateString()}
                      </div>
                      {e.reasons && e.reasons.length > 0 && (
                        <div style={{ fontSize: 10, color: '#4338ca', background: 'rgba(99,102,241,0.08)', padding: '3px 6px', borderRadius: 6, marginBottom: 8, fontWeight: 500 }}>
                          {e.reasons[0]}
                        </div>
                      )}
                      <button
                        onClick={() => navigate('/events')}
                        style={{ width: '100%', padding: '6px 0', borderRadius: 8, border: '1px solid #c7d2fe', background: '#fff', color: '#4f46e5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {e.isRegistered ? '✓ Registered' : 'View Webinar & Register'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* AI Guidance Box */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Ask AlumniConnect AI</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Ask me anything about alumni mentorship, skills, companies or placement guidance.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {aiSuggestions.map(s => (
                <button key={s} onClick={() => handleAiSubmit(s)}
                  style={{ padding: '5px 10px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 11, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.color = '#4f46e5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
                >{s}</button>
              ))}
            </div>
            {aiMessages.length > 0 && (
              <div style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {aiMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.role === 'user' ? 'linear-gradient(90deg,#4f46e5,#7c3aed)' : '#f3f4f6', color: m.role === 'user' ? '#fff' : '#374151', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 12 }}>{m.text}</div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiSubmit()} placeholder="Type your question..." style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', fontSize: 12, color: '#374151', background: '#f9fafb' }} />
              <button onClick={() => handleAiSubmit()} style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                <Send size={14} /> Ask AI
              </button>
            </div>
          </div>
        </main>

      {/* Quick Mentorship Request Modal */}
      {selectedMentor && (
        <MentorshipRequestModal
          alumni={selectedMentor}
          matchScore={selectedMentor.matchScore}
          matchReasons={selectedMentor.matchReasons}
          onClose={() => setSelectedMentor(null)}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}
    </StudentShell>
  );
}
