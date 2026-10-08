import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import NotificationDropdown from '../../components/NotificationDropdown';
import CreateEventModal from '../../components/CreateEventModal';
import EventCommunityModal from '../../components/EventCommunityModal';
import WebinarLiveRoom from '../../components/WebinarLiveRoom';
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
  ArrowLeft,
  Sparkles,
  Tv,
  Edit3,
  Trash2,
  Ban,
  Radio,
  Share2,
  Megaphone,
  Send,
  X
} from 'lucide-react';

const EVENT_TYPES = ['WEBINAR', 'WORKSHOP', 'NETWORKING', 'SEMINAR', 'PANEL_DISCUSSION'];

export default function EventsHubPage() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  const isAlumni = user?.role === 'ALUMNI' || user?.role === 'ADMIN';

  // Tabs: 'browse' | 'registered' | 'my-events'
  const [activeTab, setActiveTab] = useState('browse');

  // State
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myCreatedEvents, setMyCreatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeLiveWebinar, setActiveLiveWebinar] = useState(null);

  // Live Webinar Sockets State
  const [liveEventsMap, setLiveEventsMap] = useState({}); // eventId -> { hostName, isLive }
  const [liveAlertBanner, setLiveAlertBanner] = useState(null);

  // Broadcast notification modal
  const [notifyEvent, setNotifyEvent] = useState(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState('');

  // Fetch Events Data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch Browse Events
      const eventsRes = await eventService.getEvents({
        search,
        type: typeFilter,
      });
      setEvents(eventsRes.data?.events || []);

      // Fetch User Registrations
      const regRes = await eventService.getUserRegistrations();
      setMyRegistrations(regRes.data || []);

      // Fetch Created Events if Alumni/Admin
      if (isAlumni) {
        const myRes = await eventService.getEvents({ filterScope: 'my' });
        setMyCreatedEvents(myRes.data?.events || []);
      }
    } catch (err) {
      console.error('Error fetching events data:', err);
      setError(err.response?.data?.message || 'Failed to load events data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, typeFilter, isAlumni]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchData();
    };

    // Query active webinars on connect
    socket.emit('webinar:get-active');

    const handleActiveList = (list) => {
      if (Array.isArray(list)) {
        const map = {};
        list.forEach((item) => {
          map[item.eventId] = item;
        });
        setLiveEventsMap(map);
      }
    };

    const handleStatusChanged = ({ eventId, isLive, hostName }) => {
      setLiveEventsMap((prev) => {
        const updated = { ...prev };
        if (isLive) {
          updated[eventId] = { hostName, isLive: true };
          // If non-host user is on page, show immediate live alert banner
          setLiveAlertBanner({
            eventId,
            hostName: hostName || 'Alumni Host',
          });
        } else {
          delete updated[eventId];
        }
        return updated;
      });
      fetchData();
    };

    const handleMeetingEndedGlobally = ({ eventId }) => {
      setLiveEventsMap((prev) => {
        const updated = { ...prev };
        delete updated[eventId];
        return updated;
      });
    };

    socket.on('event:registration:new', handleUpdate);
    socket.on('event:cancelled', handleUpdate);
    socket.on('webinar:active-list', handleActiveList);
    socket.on('webinar:status-changed', handleStatusChanged);
    socket.on('webinar:ended', handleMeetingEndedGlobally);

    return () => {
      socket.off('event:registration:new', handleUpdate);
      socket.off('event:cancelled', handleUpdate);
      socket.off('webinar:active-list', handleActiveList);
      socket.off('webinar:status-changed', handleStatusChanged);
      socket.off('webinar:ended', handleMeetingEndedGlobally);
    };
  }, [socket, fetchData]);

  // Seamless Join Handler (Auto-registers student if not registered yet)
  const handleJoinWebinar = async (evt) => {
    if (!evt.isRegistered && user?.role === 'STUDENT') {
      try {
        await eventService.registerForEvent(evt.id);
        fetchData();
      } catch (e) {
        console.warn('Auto-registration on join note:', e);
      }
    }
    setActiveLiveWebinar(evt);
  };

  // Send broadcast notification to all registrants of an event (Alumni / Admin)
  const openNotifyModal = (evt) => {
    setNotifyEvent(evt);
    setNotifyTitle(`Reminder: ${evt.title}`);
    setNotifyMessage('');
    setNotifyFeedback('');
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifyEvent || !notifyMessage.trim()) return;
    setNotifySending(true);
    setNotifyFeedback('');
    try {
      const res = await eventService.sendEventNotification(notifyEvent.id, {
        title: notifyTitle.trim() || `Update: ${notifyEvent.title}`,
        message: notifyMessage.trim(),
      });
      const delivered = res.data?.delivered ?? 0;
      setNotifyFeedback(
        delivered > 0
          ? `Notification sent to ${delivered} registrant(s).`
          : 'No registered participants to notify yet.'
      );
      setTimeout(() => setNotifyEvent(null), 1500);
    } catch (err) {
      setNotifyFeedback(err.response?.data?.message || 'Failed to send notification.');
    } finally {
      setNotifySending(false);
    }
  };

  // Handle Event Actions
  const handleRegister = async (eventId) => {
    try {
      await eventService.registerForEvent(eventId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register for event.');
    }
  };

  const handleCancelRegistration = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel your event registration?')) return;
    try {
      await eventService.cancelRegistration(eventId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration.');
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event? All registered attendees will be notified.')) return;
    try {
      await eventService.cancelEvent(eventId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event posting permanently?')) return;
    try {
      await eventService.deleteEvent(eventId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  const dashboardPath = user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ALUMNI' ? '/alumni/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={dashboardPath}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-600/30">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Events & Live Webinars
                </h1>
                <p className="text-xs text-slate-400">Join live interactive webinars & workshops with alumni</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {isAlumni && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Host Webinar / Event
              </button>
            )}

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Real-Time Live Webinar Alert Banner */}
        {liveAlertBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950 via-rose-950 to-slate-900 border border-red-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-600/40 animate-pulse">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500 text-white">
                    LIVE BROADCAST NOW
                  </span>
                  <span className="text-xs text-red-200">Host: {liveAlertBanner.hostName}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                  An alumni webinar has started live! Join the broadcast room now.
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  const target = events.find((e) => e.id === liveAlertBanner.eventId) || {
                    id: liveAlertBanner.eventId,
                    title: 'Live Webinar',
                    speakerName: liveAlertBanner.hostName,
                  };
                  handleJoinWebinar(target);
                  setLiveAlertBanner(null);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" /> Enter Live Webinar
              </button>
              <button
                onClick={() => setLiveAlertBanner(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-slate-900 border border-slate-800 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> WebRTC Live Video & Camera Integration
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Connect in Real-Time Through Interactive Webinars
            </h2>
            <p className="text-sm text-slate-300">
              Participate in live video masterclasses, technical seminars, and Q&A panels. Experience camera preview, mic controls, and encrypted WebRTC video streaming.
            </p>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none pr-8 hidden md:block">
            <Radio className="w-64 h-64 text-purple-400" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === 'browse'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Upcoming Events ({events.length})
            </button>

            <button
              onClick={() => setActiveTab('registered')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === 'registered'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              My Registered Sessions ({myRegistrations.length})
            </button>

            {isAlumni && (
              <button
                onClick={() => setActiveTab('my-events')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                  activeTab === 'my-events'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                My Created Sessions ({myCreatedEvents.length})
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        {activeTab === 'browse' && (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search event title or speaker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Formats (Webinar, Workshop...)</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading events & live sessions...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-900/20 border border-red-800/50 rounded-2xl text-center text-red-300">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 1. BROWSE EVENTS TAB */}
            {activeTab === 'browse' && (
              <div>
                {events.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">No Events Found</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Check back soon or filter by format to discover upcoming alumni live sessions.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((evt) => (
                      <div
                        key={evt.id}
                        className="bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-slate-800 hover:border-purple-500/50 p-6 flex flex-col justify-between transition group relative shadow-lg"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                              {evt.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {evt.registeredCount} Registered
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition mb-2">
                            {evt.title}
                          </h3>

                          <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                            {evt.description}
                          </p>

                          {/* Speaker Card */}
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                              {evt.speakerName?.charAt(0) || 'S'}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-bold text-slate-200 truncate">{evt.speakerName}</h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {evt.speakerRole} {evt.speakerCompany ? `@ ${evt.speakerCompany}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Details List */}
                          <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              <span>{new Date(evt.startDate).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-400" />
                              <span>{evt.location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                          <button
                            onClick={() => handleJoinWebinar(evt)}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition text-center flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20"
                          >
                            <Users className="w-4 h-4" />
                            {evt.meetingUrl ? 'Community & Meet Link' : 'Enter Event Community'}
                          </button>

                          {evt.isRegistered ? (
                            <div className="px-3 py-2 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                            </div>
                          ) : (
                            <button
                              disabled={evt.isSpotsFull || evt.isDeadlinePassed}
                              onClick={() => handleRegister(evt.id)}
                              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
                            >
                              {evt.isSpotsFull ? 'Full' : evt.isDeadlinePassed ? 'Closed' : 'Register'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. MY REGISTERED SESSIONS TAB */}
            {activeTab === 'registered' && (
              <div>
                {myRegistrations.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <CheckCircle2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">No Registrations Found</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Explore upcoming webinars in the Browse tab and register to attend.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRegistrations.map((reg) => {
                      const evt = reg.event;
                      if (!evt) return null;

                      return (
                        <div
                          key={reg.id}
                          className="bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                                Registered Participant
                              </span>
                              <span className="text-xs text-slate-400">
                                Registered on {new Date(reg.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{evt.title}</h3>
                            <p className="text-sm text-slate-300 mb-3">Speaker: {evt.speakerName}</p>

                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                {new Date(evt.startDate).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {evt.location}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleJoinWebinar(evt)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
                            >
                              <Users className="w-4 h-4" /> Enter Event Community
                            </button>

                            <button
                              onClick={() => handleCancelRegistration(evt.id)}
                              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-xl text-xs font-medium transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. ALUMNI MY CREATED SESSIONS TAB */}
            {activeTab === 'my-events' && isAlumni && (
              <div>
                {myCreatedEvents.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Video className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">You Haven't Created Any Events Yet</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
                      Host live webinars, technical workshops, or mentoring panels for your community.
                    </p>
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setShowCreateModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 hover:opacity-90 transition text-sm"
                    >
                      <Plus className="w-4 h-4" /> Host Your First Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myCreatedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/60 text-purple-300 border border-purple-800">
                              {evt.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-slate-400">
                              Start: {new Date(evt.startDate).toLocaleString()}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-1">{evt.title}</h3>
                          <div className="flex items-center gap-4 text-xs text-slate-300 mb-3">
                            <span>Speaker: {evt.speakerName}</span>
                            <span className="flex items-center gap-1 font-semibold text-indigo-400">
                              <Users className="w-4 h-4" /> {evt.registeredCount} Registrants
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setActiveLiveWebinar(evt)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                          >
                            <Users className="w-4 h-4" /> Open Event Community
                          </button>

                          <button
                            onClick={() => openNotifyModal(evt)}
                            className="px-4 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                            title="Send a notification to all registered students"
                          >
                            <Megaphone className="w-4 h-4" /> Send Update
                          </button>

                          <button
                            onClick={() => {
                              setEditingEvent(evt);
                              setShowCreateModal(true);
                            }}
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition"
                            title="Edit Event"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCancelEvent(evt.id)}
                            className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 rounded-xl text-xs font-medium transition"
                          >
                            Cancel Session
                          </button>

                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-xl border border-red-800 transition"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Create / Edit Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          eventToEdit={editingEvent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* 2. Automatic Private Event Community Modal */}
      {activeLiveWebinar && (
        <EventCommunityModal
          event={activeLiveWebinar}
          isHost={activeLiveWebinar.creatorId === user?.id || user?.role === 'ADMIN'}
          onClose={() => {
            setActiveLiveWebinar(null);
            fetchData();
          }}
        />
      )}

      {/* 3. Broadcast Notification Modal */}
      {notifyEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 relative text-slate-100">
            <button
              onClick={() => setNotifyEvent(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 inline-flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" /> Notify Registrants
              </span>
              <h2 className="text-xl font-bold text-white mt-2">
                Send Notification: {notifyEvent.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                This will appear on the dashboard of every registered student in real time.
              </p>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Reminder: Starting soon"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="e.g. We're starting within 10 minutes — join fast!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-right">
                  {notifyMessage.length}/500
                </p>
              </div>

              {notifyFeedback && (
                <div className={`p-3 rounded-xl text-xs ${
                  notifyFeedback.startsWith('Failed')
                    ? 'bg-red-950/40 border border-red-800/60 text-red-300'
                    : 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                }`}>
                  {notifyFeedback}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNotifyEvent(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={notifySending || !notifyMessage.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {notifySending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
