import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActiveTab } from '../types';
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  Waves,
  Crown,
  Sparkles
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationsPopover } from './NotificationsPopover';

interface TopHeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  onStartChat?: (userId: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  feed: { title: 'Wave Feed', subtitle: 'Community social waves and photos' },
  studio: { title: 'Media Studio', subtitle: 'Create, edit photos & videos with text, filters and music' },
  videos: { title: 'Wave Reels & Videos', subtitle: 'Watch, like, save, and share community clips' },
  announcements: { title: 'Community Notice Board & Events', subtitle: 'Local announcements, church schedules, and neighborhood events' },
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
  const { isAdmin, isSuperAdmin, isProEffective, isExemptFromPayments } = useAuth();
  const { theme, setTheme } = useTheme();
  const isProUser = isProEffective || isExemptFromPayments;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'WaveLink', subtitle: 'Social Platform' };

  return (
    <header className="sticky top-0 z-20 w-full backdrop-blur-md bg-[#FFFFFF]/95 dark:bg-[#0B0F19]/95 border-b border-slate-200/80 dark:border-gray-800/80 transition-colors shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Left: Mobile Brand & Menu, or Desktop View Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenMobileMenu}
              className="p-2 -ml-1 rounded-xl text-[#0F172A] dark:text-gray-300 hover:bg-[#F8FAFC] dark:hover:bg-gray-800 md:hidden transition"
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
                <span className="font-black text-sm sm:text-base tracking-tight text-[#0F172A] dark:text-white hidden sm:inline">
                  Wave<span className="text-[#3B82F6]">Link</span>
                </span>
              </div>
            </div>

            {/* Desktop View Title (>= 768px) */}
            <div className="hidden lg:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base lg:text-lg text-[#0F172A] dark:text-white tracking-tight">
                  {currentTabInfo.title}
                </h1>
                {isProUser && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1">
                    <Crown size={11} className="text-amber-500" />
                    Pro
                  </span>
                )}
                {activeTab === 'admin' && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isSuperAdmin
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-400/40'
                        : isAdmin
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isSuperAdmin ? 'Platform Owner' : isAdmin ? 'Sub-Admin (Mod)' : 'Guarded (403)'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-gray-400 -mt-0.5 font-medium truncate max-w-[240px]">
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

          {/* Right: Notifications Popover, PWA Install Button & Theme switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notifications Popover (Messages, Calls, Posts, Follows) */}
            <NotificationsPopover
              onNavigateTab={onNavigateTab}
              onStartChat={onStartChat}
            />

            <PWAInstallButton variant="compact" />

            <button
              onClick={cycleTheme}
              title={`Switch Appearance (Current: ${theme})`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F8FAFC] hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-[#0F172A] dark:text-gray-200 border border-slate-200/90 dark:border-gray-700 flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
            >
              {theme === 'light' ? (
                <>
                  <Sun size={15} className="text-amber-500" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : theme === 'dark' ? (
                <>
                  <Moon size={15} className="text-[#3B82F6]" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              ) : (
                <>
                  <Laptop size={15} className="text-[#10B981]" />
                  <span className="hidden sm:inline">Auto (Device)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
