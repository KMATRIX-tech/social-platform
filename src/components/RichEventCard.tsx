import React, { useState } from 'react';
import { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { CrystalBadge } from './CrystalBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Share2,
  Bell,
  Pin,
  Trash2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building2,
  BookmarkCheck
} from 'lucide-react';

interface RichEventCardProps {
  announcement: Announcement;
  onRsvp?: (id: string) => void;
  onDelete?: (id: string) => void;
  isFeedBanner?: boolean;
}

export const RichEventCard: React.FC<RichEventCardProps> = ({
  announcement,
  onRsvp,
  onDelete,
  isFeedBanner = false
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [isCopied, setIsCopied] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);

  const isRsvped = Boolean(
    currentUser && announcement.rsvpUserIds?.includes(currentUser.uid)
  );

  const rsvpCount =
    (announcement.rsvpUserIds?.length ?? announcement.rsvpCount) || 0;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${announcement.title} - WaveLink Community`;
    const shareText = `${announcement.title}\n${announcement.eventLocation || ''} • ${announcement.eventDate || ''}`;

    if (navigator?.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (_) {
        // Fallback to clipboard
      }
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const handleToggleReminder = () => {
    setIsReminderSet((prev) => !prev);
  };

  return (
    <article
      className={`rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${
        isFeedBanner ? 'border-blue-300 ring-2 ring-blue-500/10' : ''
      }`}
    >
      {/* Top Pinned Banner for Admin / Verified Orgs */}
      {announcement.isPinned && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 px-4 py-1.5 text-white flex items-center justify-between text-xs font-black tracking-wide shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Pin size={13} className="fill-white rotate-45" />
            <span className="uppercase text-[11px] tracking-wider">
              Pinned Community Announcement
            </span>
          </div>
          <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full uppercase">
            Official Broadcast
          </span>
        </div>
      )}

      {/* Optional Header Event Banner Image */}
      {announcement.imageUrl && (
        <div className="relative w-full aspect-21/9 max-h-64 overflow-hidden bg-slate-100">
          <img
            src={announcement.imageUrl}
            alt={announcement.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          
          {announcement.type && (
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-md text-slate-900 shadow-sm border border-white">
                {announcement.type === 'schedule'
                  ? 'Church Schedule'
                  : announcement.type === 'event'
                  ? 'Community Event'
                  : 'Platform Bulletin'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col space-y-4">
        {/* Author & Header Metadata Row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                announcement.authorPhotoURL ||
                `https://api.dicebear.com/7.x/shapes/svg?seed=${announcement.authorId}`
              }
              alt={announcement.authorName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CrystalBadge
                  email={announcement.authorEmail}
                  name={announcement.authorName}
                  size="sm"
                />

                {/* Official Partner / Verified Entity Badge */}
                {(announcement.isOfficialPartner ||
                  announcement.partnerType ||
                  announcement.authorEmail === 'keylanmbilinyi5@gmail.com') && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
                    title="Verified Partner / Community Leader"
                  >
                    <Building2 size={11} className="text-emerald-600" />
                    <span>
                      {announcement.partnerBadgeTitle ||
                        (announcement.partnerType === 'church'
                          ? 'Church Leader'
                          : 'Official Partner')}
                    </span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>
                  {new Date(announcement.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {announcement.priority === 'urgent' && (
                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.2 rounded-full border border-rose-200 uppercase">
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Delete action for Admin */}
          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(announcement.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Delete Notice"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Headline & Body Text */}
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
            {announcement.title}
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
            {announcement.content}
          </p>
        </div>

        {/* Formatted Event Metadata Fields (Date, Time, Location) */}
        {(announcement.eventDate ||
          announcement.eventTime ||
          announcement.eventLocation) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            {announcement.eventDate && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-semibold">
                <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Calendar size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Date</div>
                  <div className="truncate font-bold text-slate-900">{announcement.eventDate}</div>
                </div>
              </div>
            )}

            {announcement.eventTime && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-semibold">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Clock size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Time</div>
                  <div className="truncate font-bold text-slate-900">{announcement.eventTime}</div>
                </div>
              </div>
            )}

            {announcement.eventLocation && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-semibold">
                <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Location</div>
                  <div className="truncate font-bold text-slate-900">{announcement.eventLocation}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons & RSVP Counter Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          {/* RSVP Counter & Toggle Button */}
          <div className="flex items-center gap-2">
            {onRsvp && (
              <button
                type="button"
                onClick={() => onRsvp(announcement.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                  isRsvped
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <CheckCircle2 size={14} className={isRsvped ? 'fill-white text-emerald-600' : ''} />
                <span>{isRsvped ? 'Going (RSVPed)' : 'RSVP Going'}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-3 py-1.5 rounded-2xl bg-slate-100/80">
              <Users size={14} className="text-slate-500" />
              <span>
                {rsvpCount} {rsvpCount === 1 ? 'Person' : 'People'} Attending
              </span>
            </div>
          </div>

          {/* Social Actions: Remind Me & Share */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleReminder}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 border transition active:scale-95 ${
                isReminderSet
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Set Event Reminder"
            >
              {isReminderSet ? (
                <>
                  <BookmarkCheck size={14} className="text-amber-600" />
                  <span>Reminder Set</span>
                </>
              ) : (
                <>
                  <Bell size={14} className="text-slate-500" />
                  <span>Remind Me</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              title="Share Event / Announcement"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
