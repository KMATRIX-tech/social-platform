import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CrystalBadge } from './CrystalBadge';
import { ActiveTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { AdsterraAdBanner } from './AdsterraAdBanner';
import {
  Waves,
  Rss,
  Film,
  Megaphone,
  MessageSquare,
  Users,
  Shield,
  Settings,
  LogOut,
  Sun,
  Moon,
  Laptop,
  X,
  Wand2,
  BarChart3,
  Crown,
  Sparkles,
  Coins,
  CalendarDays
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile
}) => {
  const { currentUser, userProfile, isAdmin, isSuperAdmin, isSubAdmin, isProEffective, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const isProUser = isProEffective;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'feed', label: 'Home', icon: <Rss size={18} /> },
    { id: 'videos', label: 'Explore', icon: <Film size={18} /> },
    { id: 'studio', label: 'Create', icon: <Wand2 size={18} />, badge: 'Studio' },
    { id: 'announcements', label: 'Notice Board & Events', icon: <CalendarDays size={18} />, badge: 'Events' },
    { id: 'chat', label: 'Messages', icon: <MessageSquare size={18} /> },
    { id: 'monetization', label: 'Monetization Hub', icon: <Coins size={18} />, badge: 'TZS' },
    { id: 'directory', label: 'Members', icon: <Users size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, badge: isProUser ? 'Pro' : undefined },
    // Restrict Admin / Moderator Desk to authorized admins
    ...(isAdmin
      ? [{
          id: 'admin' as ActiveTab,
          label: isSuperAdmin ? 'Admin Desk' : 'Moderator Desk',
          icon: <Shield size={18} />,
          badge: isSuperAdmin ? 'Owner' : 'Mod'
        }]
      : []),
    { id: 'settings', label: 'Profile', icon: <Settings size={18} /> },
  ];


  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f1422] border-r border-gray-200/80 dark:border-gray-800 transition-colors select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-gray-800/80 flex items-center justify-between">
        <div
          onClick={() => handleSelectTab('feed')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-500 text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Waves size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-600 bg-clip-text text-transparent">
              WaveLink
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 -mt-0.5">
              Connect &amp; Share
            </span>
          </div>
        </div>

        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg md:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 px-3 py-1 mb-1">
          Menu
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isItemAdmin = item.id === 'admin';

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100/90 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-gray-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isItemAdmin && isAdmin
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* WaveLink Pro Shortcut / Upgrade Button */}
      <div className="px-3.5 mb-2">
        {!isProUser ? (
          <button
            onClick={() => handleSelectTab('monetization')}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-between gap-2 group"
          >
            <div className="flex items-center gap-2 text-left min-w-0">
              <div className="p-1.5 rounded-xl bg-white/20">
                <Crown size={15} className="text-amber-200" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block tracking-tight">Upgrade to Pro</span>
                <span className="text-[10px] text-blue-100 block truncate">18,000 TZS Lipa Till</span>
              </div>
            </div>
            <Sparkles size={14} className="text-amber-200 shrink-0 group-hover:rotate-12 transition-transform" />
          </button>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Crown size={13} className="text-amber-500" />
              <span>WaveLink Pro Active</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">VIP</span>
          </div>
        )}

        {/* Adsterra Sidebar Sponsored Banner (Free Users Only - hidden if Pro, Blue Star, or Admin) */}
        <AdsterraAdBanner
          variant="sidebar"
          onOpenUpgradeModal={() => handleSelectTab('monetization')}
        />

        {/* PWA Install Button */}
        <div className="pt-2">
          <PWAInstallButton variant="full" />
        </div>
      </div>

      {/* User Account Footer */}
      <div className="p-3.5 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#0c101c]/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-200/60 dark:border-gray-700/60 shadow-2xs">
          <div
            onClick={() => handleSelectTab('settings')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
          >
            <img
              src={
                userProfile?.photoURL ||
                currentUser?.photoURL ||
                `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'user'}`
              }
              alt="Avatar"
              className={`w-9 h-9 rounded-full object-cover shrink-0 ${
                userProfile?.isPro
                  ? 'pro-aura-gold ring-2 ring-amber-400'
                  : 'ring-2 ring-purple-500/20'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <CrystalBadge
                  email={currentUser?.email}
                  name={userProfile?.displayName || currentUser?.displayName || 'Waver'}
                  isPro={userProfile?.isPro}
                  hasBlueStar={isProUser}
                  isSubAdmin={isSubAdmin}
                  size="sm"
                  showAdminTag={isAdmin}
                />
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {currentUser?.email}
              </div>
            </div>
          </div>


          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={cycleTheme}
              title={`Switch Theme (Current: ${theme})`}
              className="p-1.5 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition"
            >
              {theme === 'light' ? (
                <Sun size={15} className="text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon size={15} className="text-purple-400" />
              ) : (
                <Laptop size={15} className="text-blue-500" />
              )}
            </button>

            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (Width >= 768px) */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay (Width < 768px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
