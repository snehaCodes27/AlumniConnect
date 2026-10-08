import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveToast, setLiveToast] = useState(null);
  const toastTimeout = useRef(null);

  // Fetch initial notifications from database
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getNotifications({ limit: 15 });
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[SocketContext] Failed to load notifications:', err);
    }
  }, [isAuthenticated]);

  // Mark single as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[SocketContext] Failed to mark as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[SocketContext] Failed to mark all as read:', err);
    }
  }, []);

  // Show a popup toast for real-time notification
  const showToast = useCallback((toastData) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setLiveToast(toastData);
    toastTimeout.current = setTimeout(() => {
      setLiveToast(null);
    }, 5000);
  }, []);

  // Initialize socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to backend socket gateway.');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    // Real-time notification received
    socketInstance.on('notification:new', (notification) => {
      console.log('[Socket.IO] New notification received in real-time:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      showToast({
        title: notification.title,
        message: notification.message,
        type: notification.type,
      });
    });

    // Real-time unread count update
    socketInstance.on('notification:count', ({ count }) => {
      setUnreadCount(count);
    });

    // Real-time connection request received
    socketInstance.on('connection:request:received', (connection) => {
      console.log('[Socket.IO] Connection request received:', connection);
      // Dispatch custom window event so any listening dashboard component can update immediately
      window.dispatchEvent(new CustomEvent('connection:received', { detail: connection }));
    });

    // Real-time connection status updated (Accepted/Rejected)
    socketInstance.on('connection:updated', (connection) => {
      console.log('[Socket.IO] Connection updated:', connection);
      window.dispatchEvent(new CustomEvent('connection:updated', { detail: connection }));
    });

    // Real-time mentorship request received (Alumni inbox)
    socketInstance.on('mentorship:request:received', (request) => {
      console.log('[Socket.IO] Mentorship request received:', request);
      window.dispatchEvent(new CustomEvent('mentorship:request:received', { detail: request }));
    });

    // Real-time mentorship request sent confirmation (Student)
    socketInstance.on('mentorship:request:sent', (request) => {
      console.log('[Socket.IO] Mentorship request sent:', request);
      window.dispatchEvent(new CustomEvent('mentorship:request:sent', { detail: request }));
    });

    // Real-time mentorship status updated (Accepted/Rejected) - both parties
    socketInstance.on('mentorship:updated', (request) => {
      console.log('[Socket.IO] Mentorship updated:', request);
      window.dispatchEvent(new CustomEvent('mentorship:updated', { detail: request }));
    });

    // Real-time mentorship cancelled
    socketInstance.on('mentorship:cancelled', (data) => {
      console.log('[Socket.IO] Mentorship cancelled:', data);
      window.dispatchEvent(new CustomEvent('mentorship:cancelled', { detail: data }));
    });

    setSocket(socketInstance);
    loadNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token, loadNotifications, showToast]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        showToast,
      }}
    >
      {children}

      {/* Real-time Floating Notification Toast */}
      {liveToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 animate-slideUp flex items-start gap-3 backdrop-blur-lg">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white leading-tight">{liveToast.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-snug break-words">{liveToast.message}</p>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-slate-400 hover:text-white text-base font-bold transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
