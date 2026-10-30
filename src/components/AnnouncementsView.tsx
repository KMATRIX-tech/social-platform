import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Announcement } from '../types';
import { RichEventCard } from './RichEventCard';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import {
  CalendarDays,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Crown,
  PlusCircle,
  X,
  Filter,
  Megaphone,
  Church,
  Users,
  Pin,
  Send,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { currentUser, userProfile, isAdmin, isProEffective } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'event' | 'schedule' | 'announcement'>('all');

  // Creator Modal / Form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'announcement' | 'event' | 'schedule'>('event');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Can the current user create notices? Only Pro users & Admins!
  const canCreate = Boolean(userProfile?.isPro === true || isAdmin);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Event banner image must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !currentUser || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const id = `notice_${Date.now()}`;
      const isOfficialPartner = Boolean(
        userProfile?.isOfficialPartner ||
        userProfile?.partnerType ||
        isAdmin ||
        currentUser.email === 'keylanmbilinyi5@gmail.com'
      );

      const newNotice: Announcement = {
        id,
        authorId: currentUser.uid,
        authorEmail: currentUser.email || '',
        authorName: userProfile?.displayName || currentUser.displayName || 'Community Member',
        authorUsername: userProfile?.username,
        authorPhotoURL: userProfile?.photoURL || currentUser.photoURL || undefined,
        title: title.trim(),
        content: content.trim(),
        priority,
        type,
        eventDate: eventDate.trim() || undefined,
        eventTime: eventTime.trim() || undefined,
        eventLocation: eventLocation.trim() || undefined,
        imageUrl: imagePreview || undefined,
        rsvpUserIds: [],
        rsvpCount: 0,
        isPinned: isAdmin ? isPinned : false,
        isOfficialPartner,
        partnerType: userProfile?.partnerType || (type === 'schedule' ? 'church' : undefined),
        partnerBadgeTitle: userProfile?.partnerBadgeTitle || (isAdmin ? 'Admin Broadcast' : 'Verified Partner'),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'announcements', id), newNotice);

      // Reset Form
      setTitle('');
      setContent('');
      setEventDate('');
      setEventTime('');
      setEventLocation('');
      setImagePreview(null);
      setIsPinned(false);
      setIsCreateModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRsvp = async (id: string) => {
    if (!currentUser) return;
    const target = announcements.find((a) => a.id === id);
    if (!target) return;

    const alreadyGoing = target.rsvpUserIds?.includes(currentUser.uid);
    const docRef = doc(db, 'announcements', id);

    try {
      await updateDoc(docRef, {
        rsvpUserIds: alreadyGoing
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid)
      });
    } catch (err) {
      console.error('Failed to update RSVP:', err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this community notice / event?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  // Filtered list
  const filteredAnnouncements = announcements.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'event') return item.type === 'event' || Boolean(item.eventDate);
    if (activeFilter === 'schedule') return item.type === 'schedule' || item.partnerType === 'church';
    if (activeFilter === 'announcement') return item.type === 'announcement' || (!item.type && !item.eventDate);
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Warm, Bright Light Mode Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-blue-500/20 flex items-center justify-between flex-wrap gap-4">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2.5">
            <CalendarDays size={14} className="text-amber-200" />
            <span>Community Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Community Notice Board &amp; Events
          </h2>
          <p className="text-blue-50 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Discover local announcements, church schedules, and neighborhood gatherings. Verified leaders and Pro creators keep your community connected.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-900/10 active:scale-95 transition"
            >
              <PlusCircle size={18} className="text-emerald-500" />
              <span>Post Event / Notice</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/20 active:scale-95 transition"
            >
              <Crown size={16} />
              <span>Upgrade to Post</span>
            </button>
          )}
        </div>
      </div>

      {/* Pro Perks Notice for Free Non-Admin Users */}
      {!canCreate && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-blue-200/90 shadow-xs flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
              <Crown size={20} className="text-amber-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Pro Community Privilege: Post Events &amp; Bulletins
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                WaveLink Pro members and verified partners can broadcast public events with formatted dates, venues, header photos, and collect RSVPs.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black text-xs shadow-xs hover:opacity-95 active:scale-95 transition"
          >
            Unlock with Pro
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Notices ({announcements.length})
        </button>

        <button
          onClick={() => setActiveFilter('event')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'event'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar size={13} />
          <span>Community Events</span>
        </button>

        <button
          onClick={() => setActiveFilter('schedule')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'schedule'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Church size={13} />
          <span>Church Schedules</span>
        </button>

        <button
          onClick={() => setActiveFilter('announcement')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'announcement'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Megaphone size={13} />
          <span>Official Bulletins</span>
        </button>
      </div>

      {/* Announcements & Events Feed List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <span>Loading community notice board...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xs">
            <CalendarDays size={36} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-base font-extrabold text-slate-900">
              No Notices in this Category
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first to share upcoming neighborhood events or church services with the community!
            </p>
            {canCreate && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Post First Event
              </button>
            )}
          </div>
        ) : (
          filteredAnnouncements.map((ann) => (
            <RichEventCard
              key={ann.id}
              announcement={ann}
              onRsvp={handleToggleRsvp}
              onDelete={handleDeleteNotice}
            />
          ))
        )}
      </div>

      {/* Create Event / Notice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-emerald-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500 text-white shadow-xs">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Publish Community Notice / Event
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visible to all members on the Community Notice Board
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('event')}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      type === 'event'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Event</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('schedule')}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      type === 'schedule'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Church size={16} />
                    <span>Church Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('announcement')}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      type === 'announcement'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone size={16} />
                    <span>Announcement</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title / Headline
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Youth Choir Service & Gathering"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Formatted Event Metadata: Date, Time, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g. Sun, Nov 15"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Venue / Location
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Kinondoni Church"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Message Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Details &amp; Schedule
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide all essential event details, speaker lineup, or order of service..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {/* Optional Header Banner Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header Event Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-21/9 bg-slate-100 border border-slate-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 text-slate-500 text-xs font-bold flex flex-col items-center justify-center gap-1 transition"
                  >
                    <ImageIcon size={20} className="text-slate-400" />
                    <span>Upload Event Header Photo (Max 5MB)</span>
                  </button>
                )}
              </div>

              {/* Admin Options: Pin to Top */}
              {isAdmin && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pin size={16} className="text-amber-600 rotate-45" />
                    <div>
                      <div className="text-xs font-bold text-amber-950">
                        Pin to Top of Notice Board &amp; Feed
                      </div>
                      <div className="text-[10px] text-amber-700">
                        Displays high-priority banner at top of all feeds
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Publish to Community</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      {isUpgradeModalOpen && (
        <MobileMoneyPaymentModal
          onClose={() => setIsUpgradeModalOpen(false)}
          onSuccess={() => setIsUpgradeModalOpen(false)}
        />
      )}
    </div>
  );
};
