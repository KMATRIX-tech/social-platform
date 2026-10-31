import React, { useState } from 'react';
import { useAuth, DAILY_REWARD_SCHEDULE, getLocalDateKey } from '../context/AuthContext';
import { ActiveTab } from '../types';
import {
  Menu,
  Waves,
  Crown,
  CalendarDays,
  PlusCircle,
  Flame,
  Coins,
  Gift
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationsPopover } from './NotificationsPopover';
import { DailyRewardModal } from './DailyRewardModal';

interface TopHeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  onStartChat?: (userId: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  feed: { title: 'Wave Feed', subtitle: 'Community social waves, photos & Firestore video reels' },
  studio: { title: 'Media Studio', subtitle: 'Create, edit photos & videos with text, filters and music' },
  videos: { title: 'Wave Reels & Videos', subtitle: 'Watch, like, save, and upload community clips to Firestore' },
  announcements: { title: 'Notice Board & Events', subtitle: 'Official announcements, church schedules, and community events' },
  chat: { title: 'Chat & Groups', subtitle: 'Direct 1-on-1 messaging & user-created group chats' },
  directory: { title: 'Members Directory', subtitle: 'Real verified community members' },
  analytics: { title: 'Creator Analytics', subtitle: 'Wave impressions, engagement ratios & reach' },
  monetization: { title: 'Monetization Hub', subtitle: 'Pro subscriptions, creator tipping (10% fee), and post boosting' },
  admin: { title: 'Admin Desk', subtitle: 'Restricted system governance console' },
  settings: { title: 'Settings & Pro', subtitle: 'Account preferences, subscriptions and helpdesk' },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onNavigateTab,
  onStartChat,
  onSelectHashtag
}) => {
  const { currentUser, userProfile, isAdmin, isSuperAdmin, isProEffective, isExemptFromPayments } = useAuth();
  const isProUser = isProEffective || isExemptFromPayments;
  const [isDailyRewardOpen, setIsDailyRewardOpen] = useState(false);

  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'WaveLink', subtitle: 'Social Platform' };

  const todayKey = getLocalDateKey();
  const isClaimedToday = userProfile?.lastDailyRewardDate === todayKey;
  const wavePoints = userProfile?.wavePoints ?? DAILY_REWARD_SCHEDULE[0];
  const loginStreak = Math.max(1, userProfile?.loginStreak ?? 1);
  const todayBonus = userProfile?.lastDailyRewardAmount ?? DAILY_REWARD_SCHEDULE[(loginStreak - 1) % DAILY_REWARD_SCHEDULE.length];

  return (
    <>
      <header className="sticky top-0 z-20 w-full backdrop-blur-md bg-[#FFFFFF]/95 border-b border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
            {/* Left: Mobile Brand & Menu, or Desktop View Title */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={onOpenMobileMenu}
                className="p-2 -ml-1 rounded-xl text-[#0F172A] hover:bg-[#F8FAFC] md:hidden transition"
                title="Open Navigation"
              >
                <Menu size={20} />
              </button>

              {/* Mobile Logo (< 768px) */}
              <div className="flex items-center gap-1.5 md:hidden">
                <div
                  onClick={() => onNavigateTab && onNavigateTab('feed')}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#10B981] text-white shadow-xs">
                    <Waves size={16} />
                  </div>
                  <span className="font-black text-sm sm:text-base tracking-tight text-[#0F172A] hidden sm:inline">
                    Wave<span className="text-[#3B82F6]">Link</span>
                  </span>
                </div>
              </div>

              {/* Desktop View Title (>= 768px) */}
              <div className="hidden lg:flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base lg:text-lg text-[#0F172A] tracking-tight">
                    {currentTabInfo.title}
                  </h1>
                  {isProUser && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Crown size={11} className="text-amber-500" />
                      Pro
                    </span>
                  )}
                  {activeTab === 'admin' && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSuperAdmin
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-400/40'
                          : isAdmin
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/40'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isSuperAdmin ? 'Platform Owner' : isAdmin ? 'Sub-Admin (Mod)' : 'Guarded (403)'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 -mt-0.5 font-medium truncate max-w-[260px]">
                  {currentTabInfo.subtitle}
                </span>
              </div>
            </div>

            {/* Center: Global Real-Time Search Bar across Users, Posts & Hashtags */}
            <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-3">
              <GlobalSearchBar
                onNavigateTab={(tab) => onNavigateTab && onNavigateTab(tab)}
                onStartChat={onStartChat}
                onSelectHashtag={onSelectHashtag}
              />
            </div>

            {/* Right: Profile Daily Reward Pill, Quick Post Event & Studio Actions, Notifications & PWA */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Profile Daily Reward & Streak Header Badge */}
              <button
                type="button"
                onClick={() => setIsDailyRewardOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-50 via-blue-50/70 to-emerald-50 hover:from-amber-100/80 hover:to-emerald-100/80 border border-amber-200/80 text-[#0F172A] shadow-2xs transition active:scale-95"
                title={`Daily Login Reward: +${todayBonus} pts today • ${loginStreak}-Day Streak • ${wavePoints} Total WavePoints`}
              >
                <img
                  src={
                    userProfile?.photoURL ||
                    currentUser?.photoURL ||
                    `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'user'}`
                  }
                  alt="Profile"
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400 hidden sm:block"
                />
                <div className="flex items-center gap-1 text-xs font-extrabold text-amber-700">
                  <Coins size={13} className="text-amber-500 shrink-0" />
                  <span className="font-mono">{wavePoints}</span>
                  <span className="hidden md:inline text-[10px] font-bold text-slate-500">pts</span>
                </div>
                <span className="h-3 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-0.5 text-[11px] font-extrabold text-orange-600">
                  <Flame size={12} className="fill-orange-500 text-orange-500 shrink-0" />
                  <span>{loginStreak}d</span>
                </div>
                {isClaimedToday ? (
                  <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-[#10B981] text-[9px] font-black uppercase">
                    +{todayBonus}
                  </span>
                ) : (
                  <Gift size={12} className="text-[#3B82F6] animate-bounce" />
                )}
              </button>

              {onNavigateTab && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('announcements')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border border-slate-200/90 transition active:scale-95"
                    title="Post or View Community Events"
                  >
                    <CalendarDays size={14} className="text-[#10B981]" />
                    <span>Events</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('studio')}
                    className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3B82F6] hover:bg-blue-600 text-white shadow-2xs transition active:scale-95"
                    title="Open Media Studio"
                  >
                    <PlusCircle size={14} />
                    <span>Create</span>
                  </button>
                </>
              )}

              {/* Notifications Popover (Messages, Calls, Posts, Follows) */}
              <NotificationsPopover
                onNavigateTab={onNavigateTab}
                onStartChat={onStartChat}
              />

              <PWAInstallButton variant="compact" />
            </div>
          </div>
        </div>
      </header>

      <DailyRewardModal
        isOpen={isDailyRewardOpen}
        onClose={() => setIsDailyRewardOpen(false)}
      />
    </>
  );
};

