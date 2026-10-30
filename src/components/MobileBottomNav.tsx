import React from 'react';
import { ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Search,
  PlusCircle,
  CalendarDays,
  User,
  Crown
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile, currentUser, isProEffective, isExemptFromPayments } = useAuth();
  const isProUser = isProEffective || isExemptFromPayments;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; isAction?: boolean }[] = [
    { id: 'feed', label: 'Home', icon: <Home size={20} /> },
    { id: 'videos', label: 'Search', icon: <Search size={20} /> },
    { id: 'studio', label: 'Create', icon: <PlusCircle size={24} className="text-white" />, isAction: true },
    { id: 'announcements', label: 'Notices', icon: <CalendarDays size={20} /> },
    { id: 'settings', label: 'Profile', icon: <User size={20} /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-gray-800/80 pb-safe transition-colors shadow-lg">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center -mt-4 group active:scale-90 transition-transform"
                title="Create Wave Post or Story"
              >
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-500 shadow-md shadow-blue-500/25 group-hover:shadow-blue-500/40 transition">
                  {item.icon}
                </div>
                <span className="text-[9px] font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 relative ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold scale-105'
                  : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'announcements' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white dark:ring-[#0B0F19]" />
                )}
                {item.id === 'settings' && isProUser && (
                  <Crown size={9} className="absolute -top-1.5 -right-1.5 text-amber-400 fill-amber-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
