import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { communityService } from '../../services/communityService';
import NotificationDropdown from '../../components/NotificationDropdown';
import {
  Users, MessageSquare, Sparkles, Pin, Lock, Heart,
  Share2, ExternalLink, Search, Filter, Plus, ArrowLeft,
  CheckCircle2, Shield, Award, Clock, Send, CornerDownRight,
  TrendingUp, Globe, BookOpen, AlertCircle, Bookmark, Compass
} from 'lucide-react';

const DOMAIN_CATEGORIES = [
  'All',
  'AI/ML',
  'Software Development',
  'Cloud Computing',
  'Cybersecurity',
  'Product Management',
  'Career Development',
];

const POST_TYPES = [
  { value: 'DISCUSSION', label: 'Discussion', icon: '💬', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'ANNOUNCEMENT', label: 'Announcement', icon: '📢', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'RESOURCE', label: 'Resource / Guide', icon: '📚', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'QUESTION', label: 'Question / AMA', icon: '❓', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

function initials(first = '', last = '') {
  const f = first ? first.trim()[0] : '';
  const l = last ? last.trim()[0] : '';
  return `${f}${l}`.toUpperCase() || '?';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function CommunitiesHubPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  // Hub level states
  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Community View
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [loadingActiveCommunity, setLoadingActiveCommunity] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'members' | 'about'
  const [joiningCommunity, setJoiningCommunity] = useState(false);

  // Posts & Feed states
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postTypeFilter, setPostTypeFilter] = useState('ALL');
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [expandedPostDetails, setExpandedPostDetails] = useState(null);
  const [loadingPostDetails, setLoadingPostDetails] = useState(false);

  // New Post Modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostType, setNewPostType] = useState('DISCUSSION');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostLink, setNewPostLink] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comment input
  const [commentText, setCommentText] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);

  // Members list
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Toast / notification banner
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // ── Load All Communities ──────────────────────────────────────────────────
  const fetchCommunities = useCallback(async () => {
    try {
      setLoadingCommunities(true);
      const res = await communityService.getCommunities({
        domain: selectedDomain === 'All' ? undefined : selectedDomain,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setCommunities(res.communities || []);
      }
    } catch (err) {
      console.error('Failed to load communities:', err);
    } finally {
      setLoadingCommunities(false);
    }
  }, [selectedDomain, searchQuery]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // ── Load Active Community by Slug ─────────────────────────────────────────
  const fetchActiveCommunity = useCallback(async (communitySlug) => {
    try {
      setLoadingActiveCommunity(true);
      const res = await communityService.getCommunityBySlug(communitySlug);
      if (res.success) {
        setActiveCommunity(res.data);
      }
    } catch (err) {
      console.error('Failed to load community details:', err);
      showToast('Community not found');
      navigate('/communities');
    } finally {
      setLoadingActiveCommunity(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (slug) {
      fetchActiveCommunity(slug);
    } else {
      setActiveCommunity(null);
    }
  }, [slug, fetchActiveCommunity]);

  // ── Load Posts for Active Community ───────────────────────────────────────
  const fetchPosts = useCallback(async (communityId) => {
    if (!communityId) return;
    try {
      setLoadingPosts(true);
      const res = await communityService.getPosts(communityId, {
        type: postTypeFilter === 'ALL' ? undefined : postTypeFilter,
      });
      if (res.success) {
        setPosts(res.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [postTypeFilter]);

  useEffect(() => {
    if (activeCommunity?.id) {
      fetchPosts(activeCommunity.id);
    }
  }, [activeCommunity?.id, fetchPosts]);

  // ── Load Members for Active Community ─────────────────────────────────────
  const fetchMembers = useCallback(async (communityId) => {
    if (!communityId) return;
    try {
      setLoadingMembers(true);
      const res = await communityService.getMembers(communityId);
      if (res.success) {
        setMembers(res.members || []);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (activeCommunity?.id && activeTab === 'members') {
      fetchMembers(activeCommunity.id);
    }
  }, [activeCommunity?.id, activeTab, fetchMembers]);

  // ── Real-time Socket.IO Listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!socket || !activeCommunity?.id) return;

    const communityId = activeCommunity.id;
    socket.emit('domain_community:join', { communityId });

    const handleNewPost = ({ post }) => {
      setPosts((prev) => [post, ...prev]);
      showToast(`New discussion posted by ${post.author?.firstName || 'a member'}`);
    };

    const handleNewComment = ({ postId, comment }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
        )
      );

      setExpandedPostDetails((prev) => {
        if (!prev || prev.id !== postId) return prev;
        return {
          ...prev,
          commentCount: (prev.commentCount || 0) + 1,
          comments: [...(prev.comments || []), comment],
        };
      });
    };

    const handleLikesUpdated = ({ postId, likesCount }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount } : p))
      );
      setExpandedPostDetails((prev) =>
        prev && prev.id === postId ? { ...prev, likesCount } : prev
      );
    };

    const handleMemberJoined = ({ memberCount }) => {
      setActiveCommunity((prev) => prev ? { ...prev, memberCount } : prev);
    };

    socket.on('community:new_post', handleNewPost);
    socket.on('community:new_comment', handleNewComment);
    socket.on('community:post_likes_updated', handleLikesUpdated);
    socket.on('community:member_joined', handleMemberJoined);

    return () => {
      socket.emit('domain_community:leave', { communityId });
      socket.off('community:new_post', handleNewPost);
      socket.off('community:new_comment', handleNewComment);
      socket.off('community:post_likes_updated', handleLikesUpdated);
      socket.off('community:member_joined', handleMemberJoined);
    };
  }, [socket, activeCommunity?.id]);

  // ── Handle Join Community ─────────────────────────────────────────────────
  const handleJoinCommunity = async (communityId) => {
    try {
      setJoiningCommunity(true);
      const res = await communityService.joinCommunity(communityId);
      if (res.success) {
        showToast('🎉 You have joined this community!');
        if (activeCommunity?.id === communityId) {
          setActiveCommunity((prev) => ({
            ...prev,
            isMember: true,
            userRole: 'MEMBER',
            memberCount: res.memberCount,
          }));
        }
        fetchCommunities();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join community');
    } finally {
      setJoiningCommunity(false);
    }
  };

  // ── Handle Leave Community ────────────────────────────────────────────────
  const handleLeaveCommunity = async (communityId) => {
    if (!window.confirm('Are you sure you want to leave this community?')) return;
    try {
      setJoiningCommunity(true);
      const res = await communityService.leaveCommunity(communityId);
      if (res.success) {
        showToast('You left the community.');
        if (activeCommunity?.id === communityId) {
          setActiveCommunity((prev) => ({
            ...prev,
            isMember: false,
            userRole: null,
            memberCount: res.memberCount,
          }));
        }
        fetchCommunities();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave community');
    } finally {
      setJoiningCommunity(false);
    }
  };

  // ── Create Post Submission ────────────────────────────────────────────────
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      setSubmittingPost(true);
      const tagsArray = newPostTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await communityService.createPost(activeCommunity.id, {
        type: newPostType,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        linkUrl: newPostLink.trim() || undefined,
        tags: tagsArray,
      });

      if (res.success) {
        showToast('✨ Discussion published to community feed!');
        setShowNewPostModal(false);
        setNewPostTitle('');
        setNewPostContent('');
        setNewPostLink('');
        setNewPostTags('');
        fetchPosts(activeCommunity.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmittingPost(false);
    }
  };

  // ── Toggle Like on Post ───────────────────────────────────────────────────
  const handleToggleLike = async (postId) => {
    try {
      const res = await communityService.toggleLikePost(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, hasLiked: res.hasLiked, likesCount: res.likesCount }
              : p
          )
        );
        if (expandedPostDetails?.id === postId) {
          setExpandedPostDetails((prev) => ({
            ...prev,
            hasLiked: res.hasLiked,
            likesCount: res.likesCount,
          }));
        }
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // ── Open Post Details & Threaded Comments ─────────────────────────────────
  const handleOpenPostDetails = async (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      setExpandedPostDetails(null);
      return;
    }

    setExpandedPostId(postId);
    setLoadingPostDetails(true);
    try {
      const res = await communityService.getPostDetails(postId);
      if (res.success) {
        setExpandedPostDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load post details:', err);
    } finally {
      setLoadingPostDetails(false);
    }
  };

  // ── Submit Comment ────────────────────────────────────────────────────────
  const handleSubmitComment = async (postId, parentId = null) => {
    const text = commentText[postId || 'active'];
    if (!text || !text.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await communityService.createComment(postId, {
        content: text.trim(),
        parentId,
      });

      if (res.success) {
        setCommentText((prev) => ({ ...prev, [postId || 'active']: '' }));
        // Refresh details
        handleOpenPostDetails(postId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmittingComment(false);
    }
  };

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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                👥
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                  Domain & Career Communities
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Peer discussions, domain guidance & alumni networking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/leaderboard"
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>🏆</span>
              <span className="hidden sm:inline">Alumni Champions</span>
            </Link>
            <Link
              to="/messages"
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <MessageSquare size={13} />
              <span className="hidden sm:inline">Messages</span>
            </Link>
            <NotificationDropdown align="right" />
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toast && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 text-xs font-bold text-center animate-fadeIn shadow-md sticky top-16 z-20">
          ✨ {toast}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. COMMUNITY DETAIL VIEW (When slug is present)                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {slug && activeCommunity ? (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              onClick={() => navigate('/communities')}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <Compass size={14} />
              <span>All Communities</span>
            </button>
            <span>/</span>
            <span className="text-slate-900 font-bold">{activeCommunity.name}</span>
          </div>

          {/* Community Hero Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="h-44 sm:h-52 w-full relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 overflow-hidden">
              {activeCommunity.bannerUrl ? (
                <img
                  src={activeCommunity.bannerUrl}
                  alt={activeCommunity.name}
                  className="w-full h-full object-cover opacity-60"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shadow-xl shrink-0 overflow-hidden border-2 border-white">
                    <img
                      src={activeCommunity.avatarUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80'}
                      alt={activeCommunity.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="text-white">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-indigo-100 text-[11px] font-bold mb-1 backdrop-blur-xs">
                      <span>{activeCommunity.domain || 'Domain'}</span>
                      <span>•</span>
                      <span>{activeCommunity.careerFocus}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {activeCommunity.name}
                    </h2>
                  </div>
                </div>

                {/* Membership Action */}
                <div className="flex items-center gap-2.5">
                  {activeCommunity.isMember ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 backdrop-blur-md text-emerald-200 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Member ({activeCommunity.userRole || 'Active'})</span>
                      </span>
                      <button
                        disabled={joiningCommunity}
                        onClick={() => handleLeaveCommunity(activeCommunity.id)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors"
                      >
                        Leave
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={joiningCommunity}
                      onClick={() => handleJoinCommunity(activeCommunity.id)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Join Community</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-bar with metrics & tabs */}
            <div className="p-4 sm:px-6 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-600" />
                  <span>{activeCommunity.memberCount || 0} Members</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-violet-600" />
                  <span>{activeCommunity.postCount || 0} Discussions</span>
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'feed'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  💬 Discussions
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'members'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  👥 Members ({activeCommunity.memberCount || 0})
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'about'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  ℹ️ About & Guidelines
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: FEED & DISCUSSIONS */}
          {activeTab === 'feed' && (
            <div className="space-y-5">
              {/* Controls: Type Filter & Create Button */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setPostTypeFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      postTypeFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Posts
                  </button>
                  {POST_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setPostTypeFilter(pt.value)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 ${
                        postTypeFilter === pt.value
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{pt.icon}</span>
                      <span>{pt.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (!activeCommunity.isMember) {
                      alert('Please join this community to create posts.');
                      return;
                    }
                    setShowNewPostModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Start Discussion</span>
                </button>
              </div>

              {/* Feed Stream */}
              {loadingPosts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-3">
                      <div className="h-4 bg-slate-100 rounded w-1/4" />
                      <div className="h-6 bg-slate-100 rounded w-3/4" />
                      <div className="h-12 bg-slate-100 rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto p-8">
                  <div className="text-5xl mb-3">💬</div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No discussions yet</h3>
                  <p className="text-slate-400 text-xs mb-5">
                    Be the first member to start a discussion, ask a career question, or share an insightful resource!
                  </p>
                  <button
                    onClick={() => {
                      if (!activeCommunity.isMember) {
                        handleJoinCommunity(activeCommunity.id);
                      } else {
                        setShowNewPostModal(true);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    {activeCommunity.isMember ? 'Start First Discussion 🚀' : 'Join Community to Post'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => {
                    const postTypeObj = POST_TYPES.find((pt) => pt.value === post.type) || POST_TYPES[0];
                    const isExpanded = expandedPostId === post.id;

                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all p-5 sm:p-6"
                      >
                        {/* Post Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {initials(post.author?.firstName, post.author?.lastName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-900">
                                  {post.author?.firstName} {post.author?.lastName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    post.author?.role === 'ALUMNI'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {post.author?.role === 'ALUMNI' ? '🎓 Alumni Mentor' : '🎒 Student'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>{timeAgo(post.createdAt)}</span>
                                {post.author?.alumniProfile?.currentCompany && (
                                  <>
                                    <span>•</span>
                                    <span>{post.author.alumniProfile.jobRole} at {post.author.alumniProfile.currentCompany}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.isPinned && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <Pin size={10} />
                                <span>Pinned</span>
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${postTypeObj.color}`}>
                              {postTypeObj.icon} {postTypeObj.label}
                            </span>
                          </div>
                        </div>

                        {/* Post Title & Content */}
                        <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed mb-3">
                          {post.content}
                        </p>

                        {/* External Link Attachment */}
                        {post.linkUrl && (
                          <a
                            href={post.linkUrl.startsWith('http') ? post.linkUrl : `https://${post.linkUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-semibold text-indigo-600 transition-colors mb-3"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate max-w-sm">{post.linkUrl}</span>
                          </a>
                        )}

                        {/* Post Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {post.tags.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-500"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                                post.hasLiked
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                            >
                              <Heart size={14} className={post.hasLiked ? 'fill-rose-600 text-rose-600' : ''} />
                              <span>{post.likesCount || 0}</span>
                            </button>

                            <button
                              onClick={() => handleOpenPostDetails(post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-bold transition-all"
                            >
                              <MessageSquare size={14} />
                              <span>{post.commentCount || 0} Replies</span>
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              showToast('Community post link copied to clipboard!');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Share"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>

                        {/* Threaded Discussion Drawer / Comments */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
                            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span>Threaded Discussion</span>
                              <span className="text-[11px] text-slate-400">{expandedPostDetails?.commentCount || 0} comments</span>
                            </div>

                            {/* Existing Comments */}
                            {loadingPostDetails ? (
                              <div className="py-4 text-center text-xs text-slate-400">Loading replies...</div>
                            ) : (
                              <div className="space-y-2.5">
                                {(expandedPostDetails?.comments || []).length === 0 ? (
                                  <div className="p-3 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                                    No replies yet. Join the conversation below!
                                  </div>
                                ) : (
                                  expandedPostDetails.comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                                            {initials(comment.author?.firstName, comment.author?.lastName)}
                                          </div>
                                          <span className="font-extrabold text-slate-900 text-xs">
                                            {comment.author?.firstName} {comment.author?.lastName}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {timeAgo(comment.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-slate-700 pl-8 leading-relaxed">
                                        {comment.content}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* New Reply Input */}
                            {activeCommunity.isMember ? (
                              <div className="flex items-center gap-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Write a reply or answer..."
                                  value={commentText[post.id] || ''}
                                  onChange={(e) =>
                                    setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSubmitComment(post.id);
                                    }
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  disabled={submittingComment || !commentText[post.id]?.trim()}
                                  onClick={() => handleSubmitComment(post.id)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                                >
                                  <Send size={12} />
                                  <span>Reply</span>
                                </button>
                              </div>
                            ) : (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium text-center">
                                Join this community to participate in threaded discussions.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Community Members ({members.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Verified alumni & students
                </span>
              </div>

              {loadingMembers ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No members found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {members.map((m) => {
                    const u = m.user;
                    const isAlumni = u.role === 'ALUMNI';
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials(u.firstName, u.lastName)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs truncate">
                              {u.firstName} {u.lastName}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {isAlumni
                                ? u.alumniProfile?.currentCompany
                                  ? `${u.alumniProfile.jobRole || 'Alumni'} at ${u.alumniProfile.currentCompany}`
                                  : 'Alumni Mentor'
                                : u.studentProfile?.branch || 'Student Member'}
                            </p>
                            <span
                              className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                m.role === 'ADMIN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : m.role === 'MODERATOR'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {m.role}
                            </span>
                          </div>
                        </div>

                        {u.id !== user?.id && (
                          <Link
                            to={`/messages?userId=${u.id}`}
                            className="p-2 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-2xs"
                            title="Message Member"
                          >
                            <MessageSquare size={13} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT & GUIDELINES */}
          {activeTab === 'about' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">About {activeCommunity.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{activeCommunity.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="font-bold text-slate-800">Domain Category</div>
                  <div className="text-indigo-600 font-semibold">{activeCommunity.domain || 'Technology'}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="font-bold text-slate-800">Career Focus</div>
                  <div className="text-slate-600">{activeCommunity.careerFocus}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Community Guidelines</h4>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <li>Respect all students and alumni contributors. Zero tolerance for harassment or spam.</li>
                  <li>Share constructive technical advice, interview guidance, and verified learning materials.</li>
                  <li>Alumni mentors earn impact points on our Leaderboard for sharing helpful knowledge and discussions!</li>
                  <li>Flag inappropriate or promotional content to community moderators.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────────────────── */
        /* 2. COMMUNITIES DIRECTORY VIEW (Discover all)                             */
        /* ──────────────────────────────────────────────────────────────────────── */
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold backdrop-blur-xs">
                <Sparkles size={12} className="text-amber-300" />
                <span>Collaborative Knowledge Networks</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Connect in Domain & Career Communities
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                Join student and alumni peers specializing in your career domain. Exchange technical resources,
                ask interview questions, attend discussions, and grow your professional presence.
              </p>
            </div>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Domain Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {DOMAIN_CATEGORIES.map((domain) => (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedDomain === domain
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search communities or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Communities Grid */}
          {loadingCommunities ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-3xl h-72 border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto p-8">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No communities found</h3>
              <p className="text-slate-400 text-xs mb-5">
                Try clearing your search query or selecting another domain filter.
              </p>
              <button
                onClick={() => {
                  setSelectedDomain('All');
                  setSearchQuery('');
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Card Banner */}
                    <div className="h-32 w-full relative bg-gradient-to-r from-indigo-900 to-violet-900 overflow-hidden">
                      {c.bannerUrl && (
                        <img
                          src={c.bannerUrl}
                          alt={c.name}
                          className="w-full h-full object-cover opacity-60"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-xs">
                          {c.domain || 'Domain'}
                        </span>
                        {c.isMember && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-black flex items-center gap-1 shadow-xs">
                            <CheckCircle2 size={11} />
                            <span>Joined</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-2.5">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">
                        {c.name}
                      </h3>
                      <p className="text-xs text-indigo-600 font-semibold line-clamp-1">
                        🎯 {c.careerFocus}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>

                      {/* Tags */}
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {c.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium rounded-lg"
                            >
                              #{t}
                            </span>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{c.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-[11px]">
                      <span>👥 {c.memberCount || 0} members</span>
                      <span>💬 {c.postCount || 0} posts</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!c.isMember && (
                        <button
                          onClick={() => handleJoinCommunity(c.id)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Join
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/communities/${c.slug}`)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
                      >
                        Enter →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* NEW POST MODAL                                                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                Start Discussion in {activeCommunity?.name}
              </h3>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Post Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POST_TYPES.map((pt) => (
                    <button
                      type="button"
                      key={pt.value}
                      onClick={() => setNewPostType(pt.value)}
                      className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-xs flex flex-col items-center gap-1 ${
                        newPostType === pt.value
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{pt.icon}</span>
                      <span>{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to prepare for System Design interviews as a fresher?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Content / Guidance / Questions
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Share details, context, questions, or helpful takeaways for students and alumni..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  External Resource or Article Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://medium.com/..."
                  value={newPostLink}
                  onChange={(e) => setNewPostLink(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SystemDesign, React, CareerAdvice"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {submittingPost ? 'Publishing...' : 'Publish Post 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
