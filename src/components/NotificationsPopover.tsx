import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { AppNotification, NotificationType, ActiveTab } from '../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendNotification
} from '../services/notificationService';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  PhoneCall,
  Video,
  Heart,
  MessageCircle,
  Coins,
  UserPlus,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';

interface NotificationsPopoverProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onStartChat?: (userId: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  onNavigateTab,
  onStartChat
}) => {
  const { currentUser, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time listener for user's notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AppNotification));
        setNotifications(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Notifications snapshot error (non-fatal):', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter list
  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'messages') return n.type === 'message';
    if (filterType === 'calls') return n.type === 'call';
    if (filterType === 'posts') return ['post_like', 'post_comment', 'post_tip', 'post_boost'].includes(n.type);
    if (filterType === 'follows') return n.type === 'follow';
    return true;
  });

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.type === 'message' || notif.type === 'call') {
      if (onStartChat && notif.actorId) {
        onStartChat(notif.actorId);
      } else if (onNavigateTab) {
        onNavigateTab('chat');
      }
    } else if (['post_like', 'post_comment', 'post_tip', 'post_boost'].includes(notif.type)) {
      if (onNavigateTab) {
        onNavigateTab('feed');
      }
    } else if (notif.type === 'follow') {
      if (onNavigateTab) {
        onNavigateTab('directory');
      }
    }
  };

  const handleSendSampleAlert = async () => {
    if (!currentUser) return;
    const sampleTypes: { type: NotificationType; title: string; body: string }[] = [
      {
        type: 'message',
        title: 'New Wave Message 💬',
        body: 'A community creator sent you a private message: "Love your latest audio reel!"'
      },
      {
        type: 'call',
        title: 'Incoming WebRTC Call 📞',
        body: 'Missed audio call from verified creator.'
      },
      {
        type: 'post_like',
        title: 'Wave Liked! ❤️',
        body: 'A creator liked your wave reel.'
      },
      {
        type: 'post_comment',
        title: 'New Comment 💬',
        body: 'Someone commented: "Incredible video vibe! 🌊🔥"'
      },
      {
        type: 'follow',
        title: 'New Follower! 🌟',
        body: 'A creator started following your waves.'
      }
    ];

    const pick = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
    await sendNotification({
      recipientId: currentUser.uid,
      actorId: 'sample_bot_1',
      actorName: 'Amani Creative',
      actorUsername: '@amani_tz',
      actorPhotoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      type: pick.type,
      title: pick.title,
      body: pick.body
    });
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={14} className="text-blue-400" />;
      case 'call':
        return <PhoneCall size={14} className="text-emerald-400" />;
      case 'post_like':
        return <Heart size={14} className="text-rose-400 fill-rose-400" />;
      case 'post_comment':
        return <MessageCircle size={14} className="text-indigo-400" />;
      case 'post_tip':
        return <Coins size={14} className="text-amber-400" />;
      case 'follow':
        return <UserPlus size={14} className="text-purple-400" />;
      default:
        return <Bell size={14} className="text-gray-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95 shadow-2xs"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0B0F19] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-[#0f1422] border border-gray-200 dark:border-purple-500/30 text-gray-900 dark:text-white shadow-2xl overflow-hidden z-50 animate-in fade-in">
          {/* Header */}
          <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-600 dark:text-purple-400">
                <Bell size={16} />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => currentUser && markAllNotificationsAsRead(currentUser.uid)}
                  className="p-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold flex items-center gap-1 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span className="text-[11px]">Read all</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex px-3 pt-2 pb-1 gap-1 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-slate-900/30 overflow-x-auto scrollbar-none text-[11px] font-semibold">
            {['all', 'messages', 'calls', 'posts', 'follows'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-xl capitalize transition whitespace-nowrap ${
                  filterType === f
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800/60'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading your notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 space-y-2">
                <Bell size={28} className="mx-auto opacity-30 text-purple-400" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {filterType === 'all'
                    ? 'You have zero notifications right now'
                    : `No ${filterType} alerts at this time`}
                </p>
                <p className="text-[11px]">
                  Alerts for direct messages, WebRTC calls, post likes &amp; follows will appear here in real-time.
                </p>
                <button
                  onClick={handleSendSampleAlert}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 text-xs font-bold transition hover:bg-purple-100 dark:hover:bg-purple-900/60 inline-flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Simulate Community Alert</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 transition cursor-pointer flex items-start justify-between gap-3 group ${
                    !n.read
                      ? 'bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-900/40'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={n.actorPhotoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${n.actorId}`}
                        alt="Actor"
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500/20"
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-[#0f1422] ring-1 ring-gray-200 dark:ring-gray-700">
                        {renderIcon(n.type)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-500 opacity-40 group-hover:opacity-100 transition shrink-0"
                    title="Dismiss"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-gray-50 dark:bg-slate-950/80 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span>Real-Time Notifications</span>
            {onNavigateTab && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateTab('announcements');
                }}
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Announcements</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
