import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { shouldShowAds } from './AdsterraManager';
import { Crown, Sparkles, X, ExternalLink, Shield, Zap } from 'lucide-react';

interface AdsterraBannerProps {
  onOpenUpgradeModal?: () => void;
  variant?: 'feed' | 'sidebar' | 'social_bar';
  slotId?: string;
}

/**
 * Conditional Adsterra Ad Unit
 * Strictly HIDES if user.isPro === true, user has Blue Star badge, or user.role === 'admin'.
 * Renders only for regular free non-paying users.
 */
export const AdsterraAdBanner: React.FC<AdsterraBannerProps> = ({
  onOpenUpgradeModal,
  variant = 'feed',
  slotId = 'slot_1'
}) => {
  const { userProfile, isAdmin, isVerified } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // If user is Pro, Blue Star, or Admin -> NEVER SHOW ADS
  if (!shouldShowAds(userProfile, isAdmin, isVerified) || isDismissed) {
    return null;
  }

  // 1. Social Bar Format (Floating Notification / Bottom Bar)
  if (variant === 'social_bar') {
    return (
      <div className="fixed bottom-16 md:bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-80 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#121727]/95 backdrop-blur-xl border border-teal-500/40 rounded-2xl p-3.5 shadow-2xl text-white">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Adsterra Social Bar
              </span>
              <span className="text-[10px] text-gray-400">Sponsored</span>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-gray-400 hover:text-white p-1 rounded-md transition"
              title="Close Ad"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white truncate">Trending in East Africa</h5>
              <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 leading-snug">
                Discover viral creator tools and exclusive offers powered by Adsterra network.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <a
              href="https://bicea.org/14/7e645d935c503875ebc92cbe20bfda35"
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] font-bold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
            >
              <span>Explore Partner</span>
              <ExternalLink size={11} />
            </a>

            {onOpenUpgradeModal && (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm transition active:scale-95"
              >
                <Crown size={11} className="text-amber-200" />
                <span>Go Ad-Free</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Sidebar Format (Placed in Desktop Sidebar)
  if (variant === 'sidebar') {
    return (
      <div className="p-3 mx-2 my-2 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/60 border border-purple-500/30 text-white shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Sponsored Banner</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300">Adsterra</span>
        </div>

        <p className="text-[11px] text-gray-300 leading-snug mb-2.5">
          Free account active. Upgrade to <strong className="text-teal-300">WaveLink Pro</strong> to remove all ads and unlock 1080p calls!
        </p>

        {onOpenUpgradeModal && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-[11px] font-black text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Crown size={12} className="text-amber-300" />
            <span>Remove Ads (TZS 10k/mo)</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Default Native In-Feed Banner Format
  return (
    <div
      id={`adsterra-feed-${slotId}`}
      className="w-full my-4 rounded-3xl border border-teal-500/30 bg-gradient-to-br from-slate-900/90 via-[#0d1222] to-slate-900/90 p-4 sm:p-5 overflow-hidden text-slate-100 shadow-xl transition relative group hover:border-teal-500/50"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
            Sponsored • Adsterra Network
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Verified Partner</span>
        </div>

        {onOpenUpgradeModal && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30 transition hover:bg-amber-500/20"
          >
            <Crown size={12} />
            <span>Remove All Ads</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-teal-400" />
            <span>Grow Your Reach &amp; Monetize Online</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            High-converting digital opportunities and creator sponsorships curated by the Adsterra ad network.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <a
            href="https://bicea.org/14/7e645d935c503875ebc92cbe20bfda35"
            target="_blank"
            rel="noreferrer noopener"
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-extrabold text-xs text-white flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <span>Visit Sponsor</span>
            <ExternalLink size={13} />
          </a>

          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 transition"
              title="Upgrade to WaveLink Pro to hide ads"
            >
              <Shield size={13} className="text-teal-400" />
              <span>Ad-Free</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
