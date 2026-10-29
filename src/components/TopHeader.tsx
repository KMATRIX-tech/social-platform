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
  announcements: { title: 'Global Announcements', subtitle: 'Official platform broadcasts' },
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
    <header className="sticky top-0 z-20 w-full backdrop-blur-md bg-white/90 dark:bg-[#0B0F19]/90 border-b border-gray-200/80 dark:border-gray-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Left: Mobile Brand & Menu, or Desktop View Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenMobileMenu}
              className="p-1.5 -ml-1 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden transition"
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
                <div className="p-1.5 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-xs">
                  <Waves size={16} />
                </div>
                <span className="font-black text-sm sm:text-base tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent hidden sm:inline">
                  WaveLink
                </span>
              </div>
            </div>

            {/* Desktop View Title (>= 768px) */}
            <div className="hidden lg:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base lg:text-lg text-gray-900 dark:text-white tracking-tight">
                  {currentTabInfo.title}
                </h1>
                {isProUser && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Crown size={11} className="text-amber-500" />
                    Pro
                  </span>
                )}
                {activeTab === 'admin' && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 ring-1 ring-purple-400/40'
                        : isAdmin
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-1 ring-indigo-400/40'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isSuperAdmin ? 'Platform Owner' : isAdmin ? 'Sub-Admin (Mod)' : 'Guarded (403)'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5 font-medium truncate max-w-[200px]">
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
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
            >
              {theme === 'light' ? (
                <>
                  <Sun size={15} className="text-amber-500" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : theme === 'dark' ? (
                <>
                  <Moon size={15} className="text-purple-400" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              ) : (
                <>
                  <Laptop size={15} className="text-blue-500" />
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
