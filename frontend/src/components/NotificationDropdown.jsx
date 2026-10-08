import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationDropdown({ align = 'right' }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loadNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayedNotifications = filter === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.type === 'EVENT_ANNOUNCEMENT' || notification.type === 'EVENT_REMINDER' || notification.type === 'EVENT_REGISTERED') {
      setIsOpen(false);
      if (notification.data?.eventId) {
        navigate(`/events/${notification.data.eventId}/community`);
      } else {
        navigate('/events');
      }
      return;
    }

    if (notification.type === 'CONNECTION_REQUEST') {
      // Navigate to dashboard or connection requests
      setIsOpen(false);
      return;
    }

    if (notification.type === 'CHAT_MESSAGE' || notification.type === 'NEW_MESSAGE') {
      setIsOpen(false);
      if (notification.actorId) {
        navigate(`/messages?userId=${notification.actorId}`);
      } else {
        navigate('/messages');
      }
      return;
    }
  };

  return (
    <div className="notification-dropdown relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-hidden"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 ring-1 ring-black/5 z-50 overflow-hidden animate-fadeIn`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-white px-3 pt-2 gap-2 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`pb-2 font-semibold transition-colors relative ${
                filter === 'ALL'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`pb-2 font-semibold transition-colors relative ${
                filter === 'UNREAD'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {displayedNotifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <div className="text-3xl mb-2">🔕</div>
                <p className="font-semibold text-slate-600">No notifications found</p>
                <p className="text-[11px] mt-0.5">
                  {filter === 'UNREAD' ? 'You have read all your notifications.' : "You're all caught up!"}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-3 ${
                    !n.isRead ? 'bg-indigo-50/30' : 'bg-white'
                  }`}
                >
                  {/* Avatar / Icon */}
                  {n.actor?.profilePhoto ? (
                    <img
                      src={n.actor.profilePhoto}
                      alt={n.actor.firstName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {n.actor?.firstName ? n.actor.firstName[0].toUpperCase() : '📢'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {/* Read indicator */}
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
