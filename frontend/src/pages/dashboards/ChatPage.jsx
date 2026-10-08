import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatService } from '../../services/chatService';
import NetworkPageHero from '../../components/NetworkPageHero';
import {
  MessageSquare, Send, Search, Check, CheckCheck, Users,
  ArrowLeft, UserCheck, Plus, AlertCircle,
} from 'lucide-react';

function initials(first = '', last = '') {
  const f = first ? first.trim()[0] : '';
  const l = last ? last.trim()[0] : '';
  return `${f}${l}`.toUpperCase() || '?';
}

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConversationTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState(searchParams.get('q') || '');
  useEffect(() => setSearchFilter(searchParams.get('q') || ''), [searchParams]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [contactError, setContactError] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const sendLock = useRef(false), startLocks = useRef(new Set());
  const activeId = useRef(null), streamRef = useRef(null), nearBottom = useRef(true);
  activeId.current = activeConv?.id;
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [eligibleContacts, setEligibleContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Real-time typing status
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimer = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of message list
  const scrollToBottom = (smooth = true) => {
    const stream = streamRef.current;
    if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // ── Load All User Conversations ───────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConv(true);
      setError('');
      const res = await chatService.getConversations();
      if (res.success) {
        setConversations(res.data || []);

        // If targetUserId specified in URL, auto-select or initiate
        if (targetUserId) {
          const existing = (res.data || []).find((c) => c.otherUser?.id === targetUserId);
          if (existing) {
            setActiveConv(existing);
          } else {
            handleStartChatWithUser(targetUserId);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load conversations. Please retry.');
    } finally {
      setLoadingConv(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Load Messages for Active Conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (convId, page) => {
    if (!convId) return;
    try {
      setLoadingMessages(true);
      setHistoryError('');
      let res = await chatService.getMessages(convId, { limit: 100, page: page || 1 });
      const initial = page === undefined;
      if (initial) {
        page = res.data?.pagination?.totalPages || 1;
        if (page > 1) res = await chatService.getMessages(convId, { limit: 100, page });
      }
      if (activeId.current !== convId) return;
      if (res.success) {
        setMessages(prev => [...prev, ...(res.data.messages || []).filter(m => !prev.some(p => p.id === m.id))]);
        setHistoryPage(page);
        if (initial) setTimeout(() => { if (activeId.current === convId) scrollToBottom(false); }, 80);

        // Clear local unread badge for this conversation
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      if (activeId.current === convId) setHistoryError(err.response?.data?.message || 'Could not load message history.');
    } finally {
      if (activeId.current === convId) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConv?.id) {
      setMessages([]);
      setInputText('');
      nearBottom.current = true;
      fetchMessages(activeConv.id);
      setIsOtherTyping(false);

      // Join socket room for this conversation
      const rejoin = () => socket?.emit('chat:join', { conversationId: activeConv.id });
      if (socket) {
        rejoin();
        socket.on('connect', rejoin);
      }

      return () => {
        socket?.off('connect', rejoin);
        clearTimeout(typingTimer.current);
        if (socket && activeConv?.id) {
          socket.emit('chat:leave', { conversationId: activeConv.id });
        }
      };
    }
  }, [activeConv?.id, fetchMessages, socket]);

  const seenMessages = useRef(new Set());
  // ── Real-Time Socket.IO Listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // 1. New Message Received
    const handleNewMessage = (payload) => {
      const { conversationId, message } = payload;
      if (!message?.id || seenMessages.current.has(message.id)) return;
      seenMessages.current.add(message.id);
      if (seenMessages.current.size > 1000) seenMessages.current.delete(seenMessages.current.values().next().value);

      // If active conversation, append message and mark read
      if (activeConv?.id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (nearBottom.current) setTimeout(() => scrollToBottom(true), 50);

        // If message is from other user, send read ack
        if (message.senderId !== user?.id) {
          chatService.markAsRead(conversationId).catch(() => {});
        }
      }

      // Update conversations list with latest snippet & unread count
      setConversations((prev) => {
        const found = prev.some((c) => c.id === conversationId);
        if (!found) {
          // If conversation is new, refresh entire list
          fetchConversations();
          return prev;
        }

        return prev.map((c) => {
          if (c.id === conversationId) {
            const isCurrentActive = activeConv?.id === conversationId;
            return {
              ...c,
              lastMessageText: message.content,
              lastMessageAt: message.createdAt,
              unreadCount: isCurrentActive || message.senderId === user?.id
                ? 0
                : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };

    // 2. Read Receipt Updated
    const handleReadReceipt = (payload) => {
      const { conversationId, readBy, readAt } = payload;
      if (activeConv?.id === conversationId && readBy !== user?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id ? { ...m, isRead: true, readAt } : m
          )
        );
      }
    };

    // 3. User Typing indicator
    const handleUserTyping = (payload) => {
      const { conversationId, userId, isTyping } = payload;
      if (activeConv?.id === conversationId && userId !== user?.id) {
        setIsOtherTyping(isTyping);
      }
    };

    // 4. Online/Offline status updates
    const handleUserOnline = (payload) => {
      const { userId } = payload;
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser?.id === userId
            ? { ...c, otherUser: { ...c.otherUser, isOnline: true } }
            : c
        )
      );
      if (activeConv?.otherUser?.id === userId) {
        setActiveConv((prev) => ({
          ...prev,
          otherUser: { ...prev.otherUser, isOnline: true },
        }));
      }
    };

    const handleUserOffline = (payload) => {
      const { userId } = payload;
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser?.id === userId
            ? { ...c, otherUser: { ...c.otherUser, isOnline: false } }
            : c
        )
      );
      if (activeConv?.otherUser?.id === userId) {
        setActiveConv((prev) => ({
          ...prev,
          otherUser: { ...prev.otherUser, isOnline: false },
        }));
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:message_received', handleNewMessage);
    socket.on('chat:read_receipt', handleReadReceipt);
    socket.on('chat:user_typing', handleUserTyping);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:message_received', handleNewMessage);
      socket.off('chat:read_receipt', handleReadReceipt);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, activeConv, user, fetchConversations]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const content = inputText.trim();
    if (!content || !activeConv?.id || sendLock.current) return;
    sendLock.current = true;
    const conversationId = activeConv.id;

    try {
      setSendingMessage(true);
      setHistoryError('');
      setInputText('');

      // Emit stopped typing
      if (socket) {
        socket.emit('chat:typing', {
          conversationId: activeConv.id,
          isTyping: false,
        });
      }

      const res = await chatService.sendMessage(conversationId, content);
      if (res.success && activeId.current === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => { if (activeId.current === conversationId) scrollToBottom(true); }, 50);

        // Update conversation in list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, lastMessageText: content, lastMessageAt: res.data.createdAt }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      if (activeId.current === conversationId) {
        setHistoryError(err.response?.data?.message || 'Message could not be sent. Your draft has been restored.');
        setInputText(content);
      }
    } finally {
      sendLock.current = false;
      setSendingMessage(false);
    }
  };

  // ── Typing Handler ────────────────────────────────────────────────────────
  const handleInputChange = (val) => {
    setInputText(val);

    if (socket && activeConv?.id) {
      socket.emit('chat:typing', {
        conversationId: activeConv.id,
        isTyping: true,
      });

      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('chat:typing', {
          conversationId: activeConv.id,
          isTyping: false,
        });
      }, 1500);
    }
  };

  // ── Start Chat with an Eligible User ──────────────────────────────────────
  const handleStartChatWithUser = async (otherUserId) => {
    if (startLocks.current.has(otherUserId)) return;
    startLocks.current.add(otherUserId);
    setError('');
    try {
      const res = await chatService.startConversation(otherUserId);
      if (res.success) {
        const conv = res.data;
        setActiveConv(conv);
        setShowNewChatModal(false);
        setConversations(prev => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'You can only message connected users or active mentorship partners.';
      setError(message);
      setContactError(message);
    } finally { startLocks.current.delete(otherUserId); }
  };

  // ── Open New Chat Modal & Load Eligible Contacts ──────────────────────────
  const handleOpenNewChatModal = async () => {
    setShowNewChatModal(true);
    try {
      setLoadingContacts(true);
      setContactError('');
      const res = await chatService.getContacts();
      if (res.success) {
        setEligibleContacts(res.data || []);
      }
    } catch (err) {
      setContactError(err.response?.data?.message || 'Could not load eligible contacts. Please retry.');
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    chatService.getContacts().then(res => { if (res.success) setEligibleContacts(res.data || []); }).catch(() => {});
    return () => clearTimeout(typingTimer.current);
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (roleFilter === 'MENTORS' && !eligibleContacts.some(contact => contact.id === c.otherUser?.id && contact.connectionType === 'MENTORSHIP' && contact.role === 'ALUMNI')) return false;
    if (roleFilter === 'STUDENT' || roleFilter === 'ALUMNI') { if (c.otherUser?.role !== roleFilter) return false; }
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const name = `${c.otherUser?.firstName || ''} ${c.otherUser?.lastName || ''}`.toLowerCase();
    const comp = (c.otherUser?.alumniProfile?.currentCompany || '').toLowerCase();
    const role = (c.otherUser?.alumniProfile?.jobRole || '').toLowerCase();
    return name.includes(q) || comp.includes(q) || role.includes(q);
  });

  return (
    <div className={`network-page chat-page ${activeConv ? 'chat-selected' : ''}`}>
      <NetworkPageHero />
      <div className="chat-status"><span role="status">{isConnected ? 'Live messaging connected' : 'Live updates reconnecting. You can still send and refresh messages.'}</span><button onClick={handleOpenNewChatModal}><Plus size={16} /> New Chat</button></div>
      {error && <div className="chat-error" role="alert">{error}<button onClick={fetchConversations}>Retry</button></div>}
      <div className="chat-workspace">
        {/* Left Sidebar: Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0 ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          {/* Search bar & New Chat Action */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search conversations" placeholder="Search conversations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="chat-role-tabs px-3.5 pb-3" aria-label="Filter conversations">
            {[['ALL','All'],['STUDENT','Students'],['ALUMNI','Alumni'],['MENTORS','Mentors']].map(([key,label]) => <button key={key} aria-pressed={roleFilter === key} onClick={() => setRoleFilter(key)}>{label}</button>)}
          </div>
          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">{searchFilter || roleFilter !== 'ALL' ? 'No matching conversations' : 'No conversations yet'}</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                  {searchFilter || roleFilter !== 'ALL' ? 'Try a different name or select All to see your conversations.' : 'Start a conversation with an accepted connection or active mentorship partner.'}
                </p>
                <button
                  onClick={handleOpenNewChatModal}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const partner = conv.otherUser;
                const roleSnippet = partner?.role === 'ALUMNI'
                  ? `${partner.alumniProfile?.jobRole || 'Alumnus'}${partner.alumniProfile?.currentCompany ? ` at ${partner.alumniProfile.currentCompany}` : ''}`
                  : `${partner?.studentProfile?.branch || 'Student'}`;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-indigo-50/80 border-r-2 border-indigo-600' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Avatar with live online dot */}
                    <div className="relative shrink-0">
                      {partner?.profilePhoto ? (
                        <img
                          src={partner.profilePhoto}
                          alt={partner.firstName}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                          {initials(partner?.firstName, partner?.lastName)}
                        </div>
                      )}
                      {partner?.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs" title="Online" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {partner?.firstName} {partner?.lastName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatConversationTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-indigo-600 font-medium truncate mb-1">
                        {roleSnippet}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                          {conv.lastMessageText || 'Conversation started'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Active Conversation Window */}
        <div className={`flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConv(null)}
                    aria-label="Back to conversations"
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {activeConv.otherUser?.profilePhoto ? (
                      <img
                        src={activeConv.otherUser.profilePhoto}
                        alt={activeConv.otherUser.firstName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {initials(activeConv.otherUser?.firstName, activeConv.otherUser?.lastName)}
                      </div>
                    )}
                    {activeConv.otherUser?.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{activeConv.otherUser?.firstName} {activeConv.otherUser?.lastName}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-md border border-indigo-100">
                        {activeConv.otherUser?.role === 'ALUMNI' ? 'Alumnus' : 'Student'}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {activeConv.otherUser?.isOnline ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                        </span>
                      ) : (
                        <span>{typeof activeConv.otherUser?.isOnline === 'boolean' ? 'Offline' : 'Presence unavailable'}</span>
                      )}
                      <span>•</span>
                      <span className="truncate">
                        {activeConv.otherUser?.role === 'ALUMNI'
                          ? `${activeConv.otherUser.alumniProfile?.jobRole || ''} ${activeConv.otherUser.alumniProfile?.currentCompany ? `at ${activeConv.otherUser.alumniProfile.currentCompany}` : ''}`
                          : activeConv.otherUser?.studentProfile?.branch || 'Connected Peer'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Authorized chat
                  </span>
                </div>
              </div>

              {historyError && <div className="chat-error" role="alert">{historyError}<button onClick={() => fetchMessages(activeConv.id)}>Reload history</button></div>}
              {/* Messages Stream */}
              <div ref={streamRef} onScroll={() => { const el = streamRef.current; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; }} className="chat-stream flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
                {loadingMessages && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Say Hello!</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Start your conversation with {activeConv.otherUser?.firstName}. Messages are delivered in real-time.
                    </p>
                  </div>
                ) : (
                  [...messages].sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)).map((msg, idx, sorted) => {
                    const isMe = msg.senderId === user?.id;
                    const prevMsg = sorted[idx - 1];
                    const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-3'}`}
                      >
                        <div
                          className={`max-w-[78%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                            isMe
                              ? 'chat-outgoing bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs'
                              : 'chat-incoming bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isMe ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" title="Read" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-indigo-200" title="Sent" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {historyPage > 1 && <button className="chat-more" disabled={loadingMessages} onClick={() => fetchMessages(activeConv.id, historyPage - 1)}>Load earlier messages</button>}
                {/* Real-time Typing Bubble */}
                {isOtherTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic mt-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                    <span>{activeConv.otherUser?.firstName} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <textarea
                  rows={2}
                  aria-label="Message text"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={`Message ${activeConv.otherUser?.firstName || ''}...`}
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  aria-label={sendingMessage ? "Sending message" : "Send message"}
                  disabled={!inputText.trim() || sendingMessage}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow-xs flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Pick a chat from the sidebar, or start a new conversation with a verified alumni connection or mentorship partner.
              </p>
              <button
                onClick={handleOpenNewChatModal}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal: Shows ONLY Authorized/Connected Contacts */}
      {showNewChatModal && (
        <div role="dialog" aria-modal="true" aria-label="Start a conversation" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-5 relative animate-fadeIn flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Start a Conversation</h3>
                <p className="text-xs text-slate-400">Select a connected alumni or student partner</p>
              </div>
              <button
                aria-label="Close new chat"
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {contactError && <div className="chat-error" role="alert">{contactError}<button onClick={handleOpenNewChatModal}>Retry</button></div>}
              {loadingContacts ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading eligible contacts...</div>
              ) : eligibleContacts.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-500">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">No Connected Contacts Yet</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    To maintain privacy, messages are restricted to users with an accepted connection or mentorship request.
                  </p>
                  <button
                    onClick={() => {
                      setShowNewChatModal(false);
                      navigate('/alumni/directory');
                    }}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                  >
                    Browse Alumni Directory
                  </button>
                </div>
              ) : (
                eligibleContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartChatWithUser(contact.id)}
                    className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 flex items-center gap-3 transition"
                  >
                    {contact.profilePhoto ? (
                      <img src={contact.profilePhoto} alt={contact.firstName} className="w-10 h-10 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-xs">
                        {initials(contact.firstName, contact.lastName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {contact.role === 'ALUMNI'
                          ? `${contact.alumniProfile?.jobRole || 'Alumnus'}${contact.alumniProfile?.currentCompany ? ` at ${contact.alumniProfile.currentCompany}` : ''}`
                          : contact.studentProfile?.branch || 'Student'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 shrink-0">
                      {contact.connectionType === 'MENTORSHIP' ? 'Mentor' : 'Connected'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
