import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { Announcement } from '../types';
import { CrystalBadge } from './CrystalBadge';
import {
  Megaphone,
  AlertCircle,
  Bell,
  Trash2,
  Lock,
  Send,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Broadcast form state (only enabled for admin)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Announcement[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Announcement));
        setAnnouncements(list);
        setIsLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'announcements');
      }
    );

    return () => unsub();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !title.trim() || !content.trim() || !currentUser) return;
    setIsSubmitting(true);

    try {
      const id = `announcement_${Date.now()}`;
      const data: Announcement = {
        id,
        authorId: currentUser.uid,
        authorEmail: currentUser.email || 'keylanmbilinyi5@gmail.com',
        authorName: userProfile?.displayName || 'WaveLink Admin',
        title: title.trim(),
        content: content.trim(),
        priority,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'announcements', id), data);
      setTitle('');
      setContent('');
      setPriority('normal');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this platform announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 rounded-3xl p-6 text-white shadow-lg shadow-purple-900/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
            <Bell size={13} />
            <span>Community Feed</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Global Announcement Desk
          </h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl">
            Official platform-wide bulletins, updates, and community alerts. All members receive broadcasts in real time.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hidden sm:block">
          <Megaphone size={36} className="text-white" />
        </div>
      </div>

      {/* Broadcast Creation Form or Non-Admin Warning */}
      {isAdmin ? (
        <div className="bg-white dark:bg-[#131927] border-2 border-purple-500/40 rounded-3xl p-6 shadow-md shadow-purple-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-purple-600 dark:text-purple-400" size={20} />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Broadcast Official Announcement
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Admin Exclusive Clearance
            </span>
          </div>

          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Announcement Headline
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WaveLink v2.0 System Update & Feature Unlocks"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Broadcast Message
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Provide detailed information for all community members..."
                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Priority:
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked={priority === 'normal'}
                    onChange={() => setPriority('normal')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Normal</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-rose-600 dark:text-rose-400">
                  <input
                    type="radio"
                    name="priority"
                    value="urgent"
                    checked={priority === 'urgent'}
                    onChange={() => setPriority('urgent')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-bold">Urgent Alert</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-purple-600/30 transition disabled:opacity-40"
              >
                <Send size={15} />
                <span>Publish Broadcast</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Disabled input box for non-admin users per prompt */
        <div className="bg-gray-100 dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 text-center text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2 mb-2 text-purple-600 dark:text-purple-400 font-semibold text-sm">
            <Lock size={16} />
            <span>Posting Restricted</span>
          </div>
          <p className="text-xs max-w-md mx-auto">
            Input is disabled for standard community accounts. Global platform announcements are configured so only{' '}
            <span className="font-semibold text-purple-600 dark:text-purple-400">keylanmbilinyi5@gmail.com</span> can broadcast announcements.
          </p>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Loading community announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
            <Bell size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No Global Announcements Yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Platform administration will publish important system news and community highlights here.
            </p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white dark:bg-[#131927] rounded-3xl p-6 border transition shadow-xs ${
                ann.priority === 'urgent'
                  ? 'border-rose-400 dark:border-rose-900/60 ring-2 ring-rose-500/10'
                  : 'border-purple-200 dark:border-purple-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    }`}
                  >
                    {ann.priority === 'urgent' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    )}
                    {ann.priority === 'urgent' ? 'Urgent Alert' : 'Announcement'}
                  </span>

                  <span className="text-xs text-gray-400">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                    title="Delete Announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {ann.title}
              </h3>

              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                {ann.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Broadcasted by:</span>
                  <CrystalBadge email={ann.authorEmail} name={ann.authorName} size="sm" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
