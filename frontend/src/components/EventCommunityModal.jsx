import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { eventService } from '../services/eventService';
import {
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Megaphone,
  Bell,
  BookOpen,
  MessageSquare,
  Sparkles,
  FileText,
  Users,
  Calendar,
  Clock,
  Pin,
  Send,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Trash2,
  Edit2,
  Share2,
  Lock,
  ArrowRight,
  Bot
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function EventCommunityModal({
  embedded = false,
  event: propEvent = null,
  eventId: propEventId = null,
  onClose,
  isHost: propIsHost = false,
}) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const params = useParams();
  const navigate = useNavigate();
  const eventId = propEvent?.id || propEventId || params?.id;
  const [event, setEvent] = useState(propEvent);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/events');
    }
  };

  // Active tab: 'announcements' | 'resources' | 'discussion' | 'recording' | 'attendees'
  const [activeTab, setActiveTab] = useState('announcements');

  // Community state
  const [communityData, setCommunityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // External meeting link management (Alumni Host)
  const [editingMeetingUrl, setEditingMeetingUrl] = useState(false);
  const [meetingUrlInput, setMeetingUrlInput] = useState(event?.meetingUrl || '');
  const [savingLink, setSavingLink] = useState(false);

  // New Post Form (Announcements / Reminders / Resources)
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('ANNOUNCEMENT');
  const [postLinkUrl, setPostLinkUrl] = useState('');
  const [postTags, setPostTags] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  // Discussion Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineMembersCount, setOnlineMembersCount] = useState(1);
  const chatBottomRef = useRef(null);

  // Recording & AI Extraction Form (Alumni Host)
  const [recordingUrlInput, setRecordingUrlInput] = useState('');
  const [transcriptInput, setTranscriptInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [savingRecording, setSavingRecording] = useState(false);
  const [showRecordingForm, setShowRecordingForm] = useState(false);

  // AI RAG Query
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Transcript search filter
  const [transcriptFilter, setTranscriptFilter] = useState('');

  // 1-Click Reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('');

  // Auto-Registration prompt
  const [registering, setRegistering] = useState(false);

  // Fetch Community Data
  const loadCommunityData = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await eventService.getEventCommunity(eventId);
      if (res.data) {
        setCommunityData(res.data);
        if (res.data.event) {
          setEvent(res.data.event);
        }
        if (res.data.event?.meetingUrl) {
          setMeetingUrlInput(res.data.event.meetingUrl);
        }
        if (res.data.recording) {
          setRecordingUrlInput(res.data.recording.recordingUrl || '');
          setTranscriptInput(res.data.recording.transcript || '');
          setDurationInput(res.data.recording.durationMinutes || '');
        }
      }
    } catch (err) {
      console.error('Error loading event community:', err);
      setError(err.response?.data?.message || 'Failed to load event community.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Socket.IO real-time community integration
  useEffect(() => {
    if (!socket || !eventId) return;

    // Join Event Community room
    socket.emit('community:join', {
      eventId,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Guest',
    });

    const handleNewMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleMembersUpdated = ({ count }) => {
      if (typeof count === 'number') {
        setOnlineMembersCount(count);
      }
    };

    const handlePostCreated = (newPost) => {
      setCommunityData((prev) => {
        if (!prev) return prev;
        const exists = prev.posts?.some((p) => p.id === newPost.id);
        if (exists) return prev;
        return {
          ...prev,
          posts: [newPost, ...(prev.posts || [])],
        };
      });
    };

    const handleMeetingLinkUpdated = ({ meetingUrl }) => {
      setCommunityData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          event: {
            ...prev.event,
            meetingUrl,
          },
        };
      });
      setMeetingUrlInput(meetingUrl);
    };

    const handleRecordingUpdated = (recording) => {
      setCommunityData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recording,
        };
      });
    };

    socket.on('community:new-message', handleNewMessage);
    socket.on('community:members-updated', handleMembersUpdated);
    socket.on('community:post-created', handlePostCreated);
    socket.on('community:meeting-link-updated', handleMeetingLinkUpdated);
    socket.on('community:recording-updated', handleRecordingUpdated);

    return () => {
      socket.emit('community:leave', { eventId });
      socket.off('community:new-message', handleNewMessage);
      socket.off('community:members-updated', handleMembersUpdated);
      socket.off('community:post-created', handlePostCreated);
      socket.off('community:meeting-link-updated', handleMeetingLinkUpdated);
      socket.off('community:recording-updated', handleRecordingUpdated);
    };
  }, [socket, eventId, user]);

  // Copy Meeting Link to Clipboard
  const handleCopyLink = () => {
    const link = communityData?.event?.meetingUrl || event?.meetingUrl;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Open External Meeting Link
  const handleJoinExternalMeeting = () => {
    const link = communityData?.event?.meetingUrl || event?.meetingUrl;
    if (link) {
      try {
        const url = new URL(link);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid meeting URL');
        window.open(url.href, '_blank', 'noopener,noreferrer');
      } catch {
        setError('The meeting link must be a valid HTTP or HTTPS URL. Ask the host to update it.');
      }
    }
  };

  // Update External Meeting Link (Alumni Host)
  const handleSaveMeetingUrl = async (e) => {
    e.preventDefault();
    if (!meetingUrlInput.trim()) return;
    setSavingLink(true);
    try {
      await eventService.updateMeetingLink(eventId, meetingUrlInput.trim());
      setEditingMeetingUrl(false);
      loadCommunityData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update meeting link.');
    } finally {
      setSavingLink(false);
    }
  };

  // Create Community Post (Announcement / Reminder / Resource / Discussion)
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setSubmittingPost(true);
    try {
      const tags = postTags.split(',').map((t) => t.trim()).filter(Boolean);
      await eventService.createCommunityPost(eventId, {
        type: postType,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        linkUrl: postLinkUrl.trim() || undefined,
        tags,
      });
      setPostTitle('');
      setPostContent('');
      setPostLinkUrl('');
      setPostTags('');
      setShowNewPostForm(false);
      loadCommunityData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Delete Community Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post from the event community?')) return;
    try {
      await eventService.deleteCommunityPost(eventId, postId);
      setCommunityData((prev) => ({
        ...prev,
        posts: prev.posts?.filter((p) => p.id !== postId) || [],
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post.');
    }
  };

  // 1-Click Send Urgent Reminder to All Participants (Host only)
  const handleSendUrgentReminder = async () => {
    const meetingUrl = communityData?.event?.meetingUrl || event?.meetingUrl;
    const msg = meetingUrl
      ? `Webinar is starting now! Join via Google Meet / Zoom link: ${meetingUrl}`
      : `Reminder: The webinar "${event?.title}" is starting soon! Please check the event community.`;

    setSendingReminder(true);
    setReminderStatus('');
    try {
      await eventService.createCommunityPost(eventId, {
        type: 'REMINDER',
        title: 'Starting Now: Webinar Meeting Reminder',
        content: msg,
        linkUrl: meetingUrl || undefined,
        isPinned: true,
      });
      setReminderStatus('Reminder notification dispatched to all registered attendees!');
      setTimeout(() => setReminderStatus(''), 4000);
      loadCommunityData();
    } catch (err) {
      setReminderStatus(err.response?.data?.message || 'Failed to send reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  // Send Discussion Message
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('community:send-message', {
      eventId,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  // Save / Upload Webinar Recording & AI Extraction (Host only)
  const handleSaveRecording = async (e) => {
    e.preventDefault();
    if (!recordingUrlInput.trim() && !transcriptInput.trim()) {
      alert('Please provide either a recording link (Google Drive, YouTube, Zoom) or session transcript.');
      return;
    }
    setSavingRecording(true);
    try {
      await eventService.saveEventRecording(eventId, {
        recordingUrl: recordingUrlInput.trim() || undefined,
        transcript: transcriptInput.trim() || undefined,
        durationMinutes: durationInput ? parseInt(durationInput, 10) : undefined,
      });
      setShowRecordingForm(false);
      loadCommunityData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process webinar recording.');
    } finally {
      setSavingRecording(false);
    }
  };

  // Ask AI (RAG Query)
  const handleAskRag = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const query = customPrompt || ragQuestion;
    if (!query || !query.trim()) return;

    setRagLoading(true);
    setRagAnswer(null);
    try {
      const res = await eventService.queryEventRecordingRag(eventId, query.trim());
      setRagAnswer(res.data);
    } catch (err) {
      setRagAnswer({
        answer: 'Failed to retrieve AI answer. Please try again.',
        source: 'Error',
      });
    } finally {
      setRagLoading(false);
    }
  };

  // Student Register to Unlock Private Community
  const handleRegisterToUnlock = async () => {
    setRegistering(true);
    try {
      await eventService.registerForEvent(eventId);
      await loadCommunityData();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const currentEvent = communityData?.event || event;
  const meetingUrl = communityData?.event?.meetingUrl || currentEvent?.meetingUrl;
  const isHostUser =
    propIsHost ||
    communityData?.isHost ||
    currentEvent?.creatorId === user?.id ||
    user?.role === 'ADMIN';
  const posts = communityData?.posts || [];
  const recording = communityData?.recording;

  const announcementPosts = posts.filter((p) => p.type === 'ANNOUNCEMENT' || p.type === 'REMINDER' || p.type === 'MEETING_LINK');
  const resourcePosts = posts.filter((p) => p.type === 'RESOURCE');
  const attendeesList = communityData?.attendees || [];

  return (
    <div className={embedded ? "ad-community-embedded flex flex-col p-2 sm:p-4 text-slate-100" : "fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in text-slate-100"}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <header className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentEvent?.type || 'WEBINAR'} COMMUNITY
                </span>
                {isHostUser && (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    HOST PRIVILEGES
                  </span>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {onlineMembersCount} active in community
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate mt-0.5">
                {currentEvent?.title || 'Event Community'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadCommunityData}
              title="Refresh Community Data"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* LOADING STATE */}
        {loading && !communityData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
            <div className="w-12 h-12 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Loading Community</h3>
            <p className="text-xs text-slate-400">Fetching announcements, external meeting link, and discussion...</p>
          </div>
        ) : error && !communityData ? (
          /* ERROR STATE */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Unable to Load Community</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">{error}</p>
            <button
              onClick={loadCommunityData}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
          </div>
        ) : !communityData?.hasAccess ? (
          /* LOCKED COMMUNITY SCREEN (If not registered and not host) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
            <div className="w-16 h-16 rounded-3xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Private Event Community</h2>
            <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
              This private community is exclusively reserved for registered participants of{' '}
              <span className="font-semibold text-white">"{currentEvent?.title}"</span>. Register now to gain access to the external webinar link, speaker resources, announcements, and AI notes.
            </p>
            <button
              onClick={handleRegisterToUnlock}
              disabled={registering}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 text-sm"
            >
              {registering ? 'Registering...' : 'Register to Unlock Community'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* EXTERNAL WEBINAR LINK CARD BANNER */}
            <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/50 to-slate-900 border-b border-slate-800/80 p-3.5 sm:p-4.5 px-4 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 mt-0.5">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Live Webinar Link</h3>
                      {meetingUrl ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Link Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Awaiting Host Link
                        </span>
                      )}
                    </div>
                    {meetingUrl ? (
                      <p className="text-xs text-slate-300 truncate max-w-xl font-mono mt-0.5">
                        {meetingUrl}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isHostUser
                          ? 'Post your Google Meet or Zoom link below so attendees can join.'
                          : 'The alumni host will post the Google Meet or Zoom link here before the webinar starts.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {meetingUrl && (
                    <>
                      <button
                        onClick={handleJoinExternalMeeting}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Join Webinar (Meet/Zoom)
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        title="Copy Link"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </>
                  )}

                  {isHostUser && (
                    <button
                      onClick={() => setEditingMeetingUrl(!editingMeetingUrl)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {meetingUrl ? 'Update Link' : 'Set Meeting Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Meeting URL Editor for Alumni Host */}
              {editingMeetingUrl && isHostUser && (
                <form onSubmit={handleSaveMeetingUrl} className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <input
                    type="url"
                    required
                    placeholder="Paste Google Meet, Zoom, or Teams link (e.g. https://meet.google.com/abc-defg-hij)"
                    value={meetingUrlInput}
                    onChange={(e) => setMeetingUrlInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={savingLink}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {savingLink ? 'Saving...' : 'Save & Broadcast'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMeetingUrl(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* TAB NAVIGATION (Host Only) */}
            {isHostUser && (
              <div
                className="flex border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6 overflow-x-auto gap-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button
                  onClick={() => setActiveTab('announcements')}
                  className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'announcements'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  Announcements & Updates ({announcementPosts.length})
                </button>

                <button
                  onClick={() => setActiveTab('resources')}
                  className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'resources'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  Resources & Links ({resourcePosts.length})
                </button>

                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'discussion'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-4 h-4 text-emerald-400" />
                  Live Chat Room
                </button>

                <button
                  onClick={() => setActiveTab('recording')}
                  className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'recording'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Webinar Recording & AI Hub {recording ? '✓' : ''}
                </button>

                <button
                  onClick={() => setActiveTab('attendees')}
                  className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'attendees'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  Attendees ({attendeesList.length})
                </button>
              </div>
            )}

            {/* CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/30">
              {/* STUDENT VIEW: Clean Read-Only Messages & Updates Stream */}
              {!isHostUser ? (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {/* Optional Webinar Recording & AI Summary */}
                  {recording && recording.recordingUrl && (
                    <div className="bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0 mt-0.5">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SESSION REPLAY AVAILABLE
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">Webinar Recording & Summary</h4>
                          {recording.summary && (
                            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                              {recording.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={recording.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-md flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" /> Watch Replay
                      </a>
                    </div>
                  )}

                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-indigo-400" />
                        Announcements & Session Updates
                      </h3>
                      <p className="text-xs text-slate-400">
                        Official messages, session links, and reminders posted by the speaker.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                      {posts.length} {posts.length === 1 ? 'Message' : 'Messages'}
                    </span>
                  </div>

                  {/* Feed Messages */}
                  {posts.length === 0 ? (
                    <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <Megaphone className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-slate-300">No Messages Yet</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        The speaker will post updates, session instructions, and reminders here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className={`rounded-2xl border p-4 sm:p-5 transition shadow-sm ${
                            post.isPinned
                              ? 'bg-indigo-950/30 border-indigo-800/80'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {post.type === 'REMINDER' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Bell className="w-3 h-3" /> REMINDER
                                </span>
                              ) : post.type === 'MEETING_LINK' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Video className="w-3 h-3" /> WEBINAR LINK
                                </span>
                              ) : post.type === 'RESOURCE' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> RESOURCE
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                  <Megaphone className="w-3 h-3" /> ANNOUNCEMENT
                                </span>
                              )}
                              {post.isPinned && (
                                <span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                                  <Pin className="w-3 h-3" /> Pinned
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400">
                              {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {post.title && (
                            <h3 className="text-sm font-bold text-white mb-1.5">{post.title}</h3>
                          )}
                          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>

                          {post.linkUrl && (
                            <div className="mt-3">
                              <a
                                href={post.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Link: {post.linkUrl.slice(0, 45)}...
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* TAB 1: ANNOUNCEMENTS & REMINDERS */}
                  {activeTab === 'announcements' && (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {/* Host Quick Actions */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Alumni Host Controls</h4>
                        <p className="text-[11px] text-slate-400">
                          Post reminders, links, or schedule notes to all registered participants.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleSendUrgentReminder}
                          disabled={sendingReminder}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {sendingReminder ? 'Sending...' : '1-Click Urgent Reminder'}
                        </button>
                        <button
                          onClick={() => {
                            setPostType('ANNOUNCEMENT');
                            setShowNewPostForm(!showNewPostForm);
                          }}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Post Announcement
                        </button>
                      </div>
                    </div>

                  {reminderStatus && (
                    <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {reminderStatus}
                    </div>
                  )}

                  {/* New Post Form */}
                  {showNewPostForm && (
                    <form onSubmit={handleCreatePost} className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 space-y-3 shadow-xl animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          New {postType}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPostType('ANNOUNCEMENT')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${postType === 'ANNOUNCEMENT' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                          >
                            Announcement
                          </button>
                          <button
                            type="button"
                            onClick={() => setPostType('REMINDER')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${postType === 'REMINDER' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                          >
                            Reminder
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Title (e.g. Starting in 15 Minutes / Speaker Slides)"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />

                      <textarea
                        required
                        rows={3}
                        placeholder="Write message for attendees..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                      />

                      <input
                        type="url"
                        placeholder="Optional Link URL (e.g. Google Meet link or slides)"
                        value={postLinkUrl}
                        onChange={(e) => setPostLinkUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowNewPostForm(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingPost}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                        >
                          {submittingPost ? 'Publishing...' : 'Publish'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Announcement List */}
                  {announcementPosts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <Megaphone className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-slate-300">No Announcements Yet</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        The alumni host will post announcements, meeting updates, and session reminders here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {announcementPosts.map((post) => (
                        <div
                          key={post.id}
                          className={`rounded-2xl border p-4 sm:p-5 transition shadow-sm ${
                            post.isPinned
                              ? 'bg-indigo-950/30 border-indigo-800/80'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {post.type === 'REMINDER' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Bell className="w-3 h-3" /> REMINDER
                                </span>
                              ) : post.type === 'MEETING_LINK' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Video className="w-3 h-3" /> WEBINAR LINK
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                  <Megaphone className="w-3 h-3" /> ANNOUNCEMENT
                                </span>
                              )}
                              {post.isPinned && (
                                <span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                                  <Pin className="w-3 h-3" /> Pinned
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isHostUser && (
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-slate-500 hover:text-red-400 p-1"
                                  title="Delete post"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {post.title && (
                            <h3 className="text-sm font-bold text-white mb-1.5">{post.title}</h3>
                          )}
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>

                          {post.linkUrl && (
                            <div className="mt-3">
                              <a
                                href={post.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Link: {post.linkUrl.slice(0, 40)}...
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RESOURCES & LINKS */}
              {activeTab === 'resources' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Event Resources & Shared Materials</h3>
                      <p className="text-xs text-slate-400">Slides, code repositories, cheatsheets, and recommended links.</p>
                    </div>
                    {isHostUser && (
                      <button
                        onClick={() => {
                          setPostType('RESOURCE');
                          setShowNewPostForm(!showNewPostForm);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Resource
                      </button>
                    )}
                  </div>

                  {/* Resource Upload / Add Form */}
                  {showNewPostForm && postType === 'RESOURCE' && (
                    <form onSubmit={handleCreatePost} className="bg-slate-950 border border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-xl animate-fade-in">
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                        Share New Resource
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Resource Title (e.g. GitHub Repository / Presentation Slides)"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="url"
                        required
                        placeholder="Resource Link URL (e.g. https://github.com/... or Google Drive)"
                        value={postLinkUrl}
                        onChange={(e) => setPostLinkUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <textarea
                        rows={2}
                        placeholder="Brief description or instructions..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewPostForm(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingPost}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                        >
                          {submittingPost ? 'Sharing...' : 'Share Resource'}
                        </button>
                      </div>
                    </form>
                  )}

                  {resourcePosts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-slate-300">No Resources Added Yet</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Alumni and participants can share reference materials, code repos, and guides here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {resourcePosts.map((post) => (
                        <div key={post.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                RESOURCE
                              </span>
                              {isHostUser && (
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-slate-500 hover:text-red-400 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">{post.title || 'Untitled Resource'}</h4>
                            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{post.content}</p>
                          </div>

                          {post.linkUrl && (
                            <a
                              href={post.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-semibold transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Resource Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LIVE DISCUSSION & Q&A CHAT */}
              {activeTab === 'discussion' && (
                <div className="h-full flex flex-col max-w-3xl mx-auto bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden min-h-[460px]">
                  {/* Chat Header */}
                  <div className="p-3.5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Live Community Discussion</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Real-time interactive room
                    </span>
                  </div>

                  {/* Chat Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 text-center">
                      Welcome to the <span className="font-semibold text-white">{currentEvent?.title}</span> community chat! Ask questions, network, and exchange insights with the speaker and fellow attendees.
                    </div>

                    {chatMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-200">{msg.senderName}</span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`p-3 rounded-2xl text-xs max-w-md ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/80 text-slate-100 rounded-tl-none border border-slate-700/60'}`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ask a question or post a message to the group..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition shadow-md"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: WEBINAR RECORDING, TRANSCRIPT & AI KNOWLEDGE HUB */}
              {activeTab === 'recording' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Host Action Banner */}
                  {isHostUser && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Webinar Recording & AI Knowledge Hub
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {recording
                            ? 'Recording and AI extraction are live. You can update or re-process below.'
                            : 'Upload or link the webinar recording & transcript to generate AI knowledge and enable RAG answers.'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowRecordingForm(!showRecordingForm)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {recording ? 'Update Recording / AI' : 'Add Recording & AI Notes'}
                      </button>
                    </div>
                  )}

                  {/* Recording Upload / Input Form (Host Only) */}
                  {showRecordingForm && isHostUser && (
                    <form onSubmit={handleSaveRecording} className="bg-slate-950 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                        Upload Recording & Extract AI Knowledge
                      </span>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Recording Link URL (YouTube / Google Drive / Zoom Cloud / Loom)
                        </label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/... or https://youtube.com/watch?v=..."
                          value={recordingUrlInput}
                          onChange={(e) => setRecordingUrlInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Webinar Transcript / Session Notes (For AI Extraction & RAG Processing)
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Paste full transcript, speech-to-text output, or detailed session notes here..."
                          value={transcriptInput}
                          onChange={(e) => setTranscriptInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none font-mono"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <span className="text-[11px] text-slate-400">
                          AI will extract Executive Summary, Key Takeaways, Q&A, and create semantic RAG chunks.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRecordingForm(false)}
                            className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingRecording}
                            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-md"
                          >
                            {savingRecording ? 'Processing with AI...' : 'Save & Extract AI Knowledge'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* If No Recording Added Yet */}
                  {!recording ? (
                    <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-slate-200">No Recording Uploaded Yet</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        Once the live session finishes, the alumni speaker will upload the webinar recording, transcript, and AI knowledge summary here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Recording Video / Link Banner */}
                      {recording.recordingUrl && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Video className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">Watch Webinar Replay</h4>
                              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                                {recording.recordingUrl}
                              </p>
                            </div>
                          </div>
                          <a
                            href={recording.recordingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-md"
                          >
                            <ExternalLink className="w-4 h-4" /> Watch Replay
                          </a>
                        </div>
                      )}

                      {/* AI Executive Summary Card */}
                      {recording.summary && (
                        <div className="bg-slate-950/70 border border-indigo-900/50 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                              AI Executive Summary
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {recording.summary}
                          </p>
                        </div>
                      )}

                      {/* Key Takeaways & Highlights */}
                      {Array.isArray(recording.keyTakeaways) && recording.keyTakeaways.length > 0 && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-md">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Key Takeaways & Highlights
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {recording.keyTakeaways.map((takeaway, idx) => (
                              <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed">{takeaway}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extracted Q&A Pairs */}
                      {Array.isArray(recording.qaPairs) && recording.qaPairs.length > 0 && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-md">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                            Extracted Q&A from Session
                          </h4>
                          <div className="space-y-3">
                            {recording.qaPairs.map((qa, idx) => (
                              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                                <p className="text-xs font-bold text-purple-300 flex items-start gap-2">
                                  <span className="font-mono text-purple-400">Q:</span>
                                  {qa.question}
                                </p>
                                <p className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                                  <span className="font-mono text-slate-500">A:</span>
                                  {qa.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Items */}
                      {Array.isArray(recording.actionItems) && recording.actionItems.length > 0 && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-md">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-blue-400" />
                            Recommended Next Steps & Action Items
                          </h4>
                          <ul className="space-y-2">
                            {recording.actionItems.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-blue-400 font-bold mt-0.5">✓</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Interactive AI Assistant (RAG Query) */}
                      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-5 h-5 text-indigo-400" />
                          <h4 className="text-sm font-bold text-white">
                            Ask AI About This Webinar (RAG Knowledge Engine)
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                          Ask any technical question or query topics discussed. AI queries semantic knowledge chunks directly from this session.
                        </p>

                        <form onSubmit={(e) => handleAskRag(e)} className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="e.g. What advice did the speaker give for system design interviews?"
                            value={ragQuestion}
                            onChange={(e) => setRagQuestion(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={ragLoading || !ragQuestion.trim()}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md"
                          >
                            {ragLoading ? 'Searching...' : 'Ask AI'}
                          </button>
                        </form>

                        {/* Quick Prompts */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <button
                            type="button"
                            onClick={() => handleAskRag(null, 'What was the main advice for preparation?')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                          >
                            Preparation Advice
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAskRag(null, 'What tools and frameworks were discussed?')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                          >
                            Recommended Tools
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAskRag(null, 'How to stand out in portfolio projects?')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                          >
                            Portfolio Tips
                          </button>
                        </div>

                        {/* RAG Answer Display */}
                        {ragAnswer && (
                          <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-4 text-xs text-slate-200 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between text-[11px] text-indigo-300 border-b border-slate-800 pb-1.5">
                              <span className="font-semibold flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> AI Knowledge Retrieval
                              </span>
                              <span>Source: {ragAnswer.source || 'Session Knowledge'}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {ragAnswer.answer}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Full Transcript Viewer */}
                      {recording.transcript && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-md">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Full Webinar Transcript
                              </h4>
                              <p className="text-[11px] text-slate-400">Complete searchable text record of this session.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Search transcript..."
                                value={transcriptFilter}
                                onChange={(e) => setTranscriptFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(recording.transcript);
                                  alert('Transcript copied to clipboard!');
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs"
                                title="Copy Transcript"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 max-h-72 overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                            {transcriptFilter
                              ? recording.transcript
                                  .split('\n')
                                  .filter((line) => line.toLowerCase().includes(transcriptFilter.toLowerCase()))
                                  .join('\n') || 'No matching lines in transcript.'
                              : recording.transcript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ATTENDEES LIST */}
              {activeTab === 'attendees' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Registered Participants</h3>
                      <p className="text-xs text-slate-400">
                        {attendeesList.length} participant(s) registered for this event.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Host Card */}
                    {currentEvent?.creator && (
                      <div className="bg-indigo-950/30 border border-indigo-800/80 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow">
                          {currentEvent.creator.firstName?.charAt(0) || 'H'}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {currentEvent.creator.firstName} {currentEvent.creator.lastName}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                              HOST
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Speaker: {currentEvent.speakerName}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Attendees Cards */}
                    {attendeesList.map((attendee) => (
                      <div key={attendee.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                          {attendee.firstName?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-200 truncate block">
                            {attendee.firstName} {attendee.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {attendee.role === 'STUDENT' ? 'Student Participant' : 'Community Member'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </>
    )}
      </div>
    </div>
  );
}
