import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';
import { LegalModal, LegalDocType } from './LegalModals';
import {
  Crown,
  TrendingUp,
  Zap,
  HandCoins,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  Smartphone,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface RightSidebarProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

const TRENDING_TOPICS = [
  { tag: '#WaveLinkTZ', category: 'Social & Trending', waves: '18.4k waves' },
  { tag: '#AirtelMoneyTZ', category: 'Mobile Payments', waves: '12.1k waves' },
  { tag: '#BongoCreatives', category: 'Music & Reels', waves: '9.8k waves' },
  { tag: '#DarTech2026', category: 'Innovation & AI', waves: '6.5k waves' },
  { tag: '#PostBoostTZ', category: 'Monetization', waves: '4.2k waves' },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({ onNavigateTab }) => {
  const { currentUser, userProfile, isAdmin, isProEffective, isExemptFromPayments } = useAuth();
  const isProUser = isProEffective || isExemptFromPayments;
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  return (
    <aside className="hidden md:block w-72 lg:w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto space-y-4 py-5 pr-4 pl-1">
      {/* 1. WaveLink Pro Feature Highlights Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 text-white shadow-xl shadow-purple-950/20">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
            <Crown size={12} className="text-amber-400" />
            <span>WaveLink Pro</span>
          </div>
          {isProUser && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Active VIP
            </span>
          )}
        </div>

        <h3 className="font-extrabold text-base tracking-tight mb-1">
          {isProUser ? 'VIP Superpowers Unlocked' : 'Elevate Your Wave Presence'}
        </h3>
        <p className="text-xs text-purple-200/80 mb-3.5 leading-relaxed">
          {isProUser
            ? 'All creator tools active with 500MB uploads, 1080p WebRTC calls, free post boosts & zero platform fees.'
            : 'Unlock maximum reach, high-definition streams, and instant Airtel Money payouts.'}
        </p>

        {/* Pro Feature Checklist */}
        <div className="space-y-2 mb-4 text-xs text-purple-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <span>500MB Video & Audio Uploads</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <span>1080p HD Video & Voice Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <span>Exclusive Golden Sparkle Aura Badge</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <span>100% Ad-Free Clean Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <span>Complimentary 0 TZS Post Boosting</span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('monetization')}
          className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <span>{isProUser ? 'Manage Subscription & Wallet' : 'Upgrade to Pro • 18,000 TZS/mo'}</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 2. Trending Topics in Tanzania */}
      <div className="bg-white dark:bg-[#111625] border border-gray-200/90 dark:border-gray-800/90 rounded-3xl p-4.5 shadow-2xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />
            <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
              Trending on WaveLink
            </h4>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            East Africa
          </span>
        </div>

        <div className="space-y-2">
          {TRENDING_TOPICS.map((topic, idx) => (
            <div
              key={topic.tag}
              onClick={() => onNavigateTab('feed')}
              className="p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition group flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">
                  {topic.category}
                </span>
                <span className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                  {topic.tag}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  {topic.waves}
                </span>
              </div>
              <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Creator Monetization & Post Boosting Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-slate-800 rounded-3xl p-4.5 text-white shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Zap size={15} />
            <span className="font-black text-xs uppercase tracking-wider">Creator Earnings</span>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-purple-200">
            Airtel Money
          </span>
        </div>

        <h4 className="font-bold text-sm mb-1">
          Post Boosting & Tipping
        </h4>
        <p className="text-xs text-gray-300 leading-relaxed mb-3">
          Boost your post reach +300% for 2,000 TZS or receive instant tips directly to your mobile wallet.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Post Boost</span>
            <span className="font-extrabold text-sm text-amber-300">2,000 TZS</span>
            <span className="text-[9px] text-emerald-400 block mt-0.5">+300% Reach</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Creator Tip</span>
            <span className="font-extrabold text-sm text-purple-300">Instant</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">10% Platform Cut</span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('monetization')}
          className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <HandCoins size={13} />
          <span>Open Monetization Hub</span>
        </button>
      </div>

      {/* Footer Links & Copyright */}
      <div className="px-2 pt-1 pb-4 text-[11px] text-gray-400 dark:text-gray-500 space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button onClick={() => setLegalDoc('privacy')} className="hover:underline hover:text-purple-400">Privacy</button>
          <button onClick={() => setLegalDoc('terms')} className="hover:underline hover:text-purple-400">Terms</button>
          <button onClick={() => setLegalDoc('refund')} className="hover:underline hover:text-purple-400">Refund</button>
          <button onClick={() => onNavigateTab('announcements')} className="hover:underline">Announcements</button>
          <button onClick={() => onNavigateTab('monetization')} className="hover:underline">Monetization</button>
        </div>
        <p className="text-[10px] pt-1">WaveLink © 2026. Empowering East African Creators.</p>
      </div>

      {legalDoc && (
        <LegalModal
          isOpen={true}
          initialDoc={legalDoc}
          onClose={() => setLegalDoc(null)}
        />
      )}
    </aside>
  );
};
