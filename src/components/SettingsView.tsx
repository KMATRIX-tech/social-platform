import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, ProBorderEffect, ProAccentColor } from '../types';
import { CrystalBadge } from './CrystalBadge';
import { SupportDeskView } from './SupportDeskView';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import { PRO_TIERS } from '../services/paymentService';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Check,
  User,
  Shield,
  ShieldCheck,
  Save,
  CheckCircle2,
  Upload,
  HelpCircle,
  AtSign,
  Fingerprint,
  Crown,
  Sparkles,
  Zap,
  Palette,
  CreditCard,
  Calendar,
  ArrowRight,
  Flame
} from 'lucide-react';

import { LegalModal, LegalDocType } from './LegalModals';

export const SettingsView: React.FC = () => {
  const { currentUser, userProfile, isAdmin, isSuperAdmin, isSubAdmin, isProEffective, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'pro' | 'support' | 'legal'>('profile');
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocType | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || (currentUser?.email ? `@${currentUser.email.split('@')[0]}` : '@waver'));
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || '');

  // Pro customization state
  const [proBorderEffect, setProBorderEffect] = useState<ProBorderEffect>(userProfile?.proBorderEffect || 'aura-gold');
  const [proAccentColor, setProAccentColor] = useState<ProAccentColor>(userProfile?.proAccentColor || 'purple');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const isProUser = isProEffective;

  // File upload for profile picture from local folders
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoURL(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        photoURL: photoURL.trim() || undefined,
        proBorderEffect,
        proAccentColor
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const themeOptions: {
    id: ThemeMode;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'light',
      title: 'Light (selected)',
      description: 'Clean off-white (#F8F9FA) background, soft light gray card containers, purple accent borders',
      icon: <Sun size={20} className="text-amber-500" />
    },
    {
      id: 'dark',
      title: 'Dark',
      description: 'Deep cosmic slate (#0B0F19) with rich contrast and luminous purple highlights',
      icon: <Moon size={20} className="text-purple-400" />
    },
    {
      id: 'system',
      title: 'Match my device',
      description: 'Automatically synchronizes with your operating system light/dark preference',
      icon: <Laptop size={20} className="text-blue-500" />
    }
  ];

  const borderOptions: { id: ProBorderEffect; name: string; ringClass: string }[] = [
    { id: 'aura-gold', name: 'Golden Aura ✨', ringClass: 'pro-aura-gold ring-4 ring-amber-400' },
    { id: 'neon-pulse', name: 'Cyber Neon ⚡', ringClass: 'pro-aura-neon ring-4 ring-cyan-400' },
    { id: 'emerald-ring', name: 'Emerald Wave 🌊', ringClass: 'pro-aura-emerald ring-4 ring-emerald-400' },
    { id: 'cosmic-glow', name: 'Cosmic Violet 🔮', ringClass: 'pro-aura-cosmic ring-4 ring-purple-500' },
    { id: 'none', name: 'Classic Clean', ringClass: 'ring-2 ring-purple-500/20' }
  ];

  const accentColors: { id: ProAccentColor; name: string; bg: string; border: string }[] = [
    { id: 'purple', name: 'Amethyst Pro', bg: 'bg-purple-600', border: 'border-purple-600' },
    { id: 'gold', name: 'Royal Gold', bg: 'bg-amber-500', border: 'border-amber-500' },
    { id: 'emerald', name: 'Emerald Wave', bg: 'bg-emerald-500', border: 'border-emerald-500' },
    { id: 'neon', name: 'Cyber Neon', bg: 'bg-cyan-500', border: 'border-cyan-500' },
    { id: 'crimson', name: 'Crimson Velvet', bg: 'bg-rose-600', border: 'border-rose-600' }
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings size={13} />
            <span>Settings & Preferences</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Account Preferences & WaveLink Pro
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal profile identity, WaveLink Pro subscription, and support desk inquiries.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSettingsSection('profile')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsSection === 'profile'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <User size={14} />
            <span>Profile & Identity</span>
          </button>

          <button
            onClick={() => setActiveSettingsSection('pro')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsSection === 'pro'
                ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <Crown size={14} className={isProUser ? 'text-amber-400' : 'text-gray-400'} />
            <span>WaveLink Pro {isProUser ? '✓' : ''}</span>
          </button>

          <button
            onClick={() => setActiveSettingsSection('support')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsSection === 'support'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <HelpCircle size={14} />
            <span>Support Desk</span>
          </button>

          <button
            onClick={() => setActiveSettingsSection('legal')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSettingsSection === 'legal'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Legal Center</span>
          </button>
        </div>
      </div>

      {activeSettingsSection === 'support' && (
        <SupportDeskView />
      )}

      {activeSettingsSection === 'legal' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-2">
              WaveLink Legal &amp; Compliance Center
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
              Review our commitments to community safety, data protection under Tanzania data laws, and transparent billing for mobile money services.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Privacy Policy */}
              <div
                onClick={() => setSelectedLegalDoc('privacy')}
                className="p-5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                    Privacy Policy
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Zero sale of user data, strict peer-to-peer chat confidentiality, and right to account deletion.
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-4 flex items-center gap-1">
                  <span>Read Policy</span>
                  <ArrowRight size={13} />
                </span>
              </div>

              {/* Terms of Service */}
              <div
                onClick={() => setSelectedLegalDoc('terms')}
                className="p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 hover:border-indigo-500/40 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <Shield size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    Terms of Service
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Community safety guidelines, creator media copyright ownership, and 10% tipping platform fee rules.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-4 flex items-center gap-1">
                  <span>Read Terms</span>
                  <ArrowRight size={13} />
                </span>
              </div>

              {/* Refund Policy */}
              <div
                onClick={() => setSelectedLegalDoc('refund')}
                className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/40 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    Refund Policy
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Transparent rules for Airtel Money &amp; AzamPay Pro subscriptions, post boosting, and dispute resolution.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-4 flex items-center gap-1">
                  <span>Read Policy</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLegalDoc && (
        <LegalModal
          isOpen={true}
          initialDoc={selectedLegalDoc}
          onClose={() => setSelectedLegalDoc(null)}
        />
      )}

      {activeSettingsSection === 'pro' && (
        <div className="space-y-6">
          {/* Pro Status Card */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 text-xs font-bold uppercase tracking-wider mb-2">
                <Crown size={14} />
                <span>{isAdmin ? '👑 Administrator Privilege Active' : isProUser ? 'Active Pro VIP Membership' : 'Standard Free Membership'}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {isAdmin
                  ? 'All WaveLink Pro Features Unlocked (No Payment Needed)'
                  : isProUser
                  ? 'You are a WaveLink Pro Subscriber'
                  : 'Upgrade to WaveLink Pro'}
              </h3>
              <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-xl">
                {isAdmin
                  ? 'As a platform administrator, all premium privileges (500MB media uploads, 1080p WebRTC calling, Verified Star, Creator Analytics, and custom profile styling) are permanently active without requiring payment.'
                  : isProUser
                  ? 'Your account is enhanced with 500MB uploads, 1080p WebRTC calls, verified Blue Star badge, and creator analytics.'
                  : 'Supercharge your social presence with verified checkmarks, glowing borders, 500MB uploads, and mobile money billing.'}
              </p>
            </div>

            <div>
              {isAdmin ? (
                <div className="py-2.5 px-5 rounded-2xl bg-white/20 backdrop-blur-md text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-white/30 shadow-sm">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Admin Clearance Active</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-pink-500 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-950/40 transition hover:scale-105"
                >
                  <Sparkles size={16} />
                  <span>{isProUser ? 'Manage / Renew Plan' : 'Subscribe via Mobile Money'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Pricing Tiers Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRO_TIERS.map((tier) => {
              const isCurrent = userProfile?.proPlan === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`bg-white dark:bg-[#131927] border-2 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between relative transition ${
                    isCurrent
                      ? 'border-amber-500 ring-4 ring-amber-500/15'
                      : tier.popular
                      ? 'border-purple-600 ring-2 ring-purple-500/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {tier.discountBadge && (
                    <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md">
                      {tier.discountBadge}
                    </span>
                  )}

                  <div>
                    <h4 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {tier.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {tier.tagline}
                    </p>

                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        TZS {tier.priceTZS.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 font-medium">
                        (${tier.priceUSD} {tier.billingPeriod})
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                          <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                    {isAdmin ? (
                      <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Included in Admin Clearance
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition shadow-md ${
                          tier.popular
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <CreditCard size={15} />
                        <span>{isCurrent ? 'Current Plan (Click to Renew)' : `Select ${tier.name}`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSettingsSection === 'profile' && (
        <div className="space-y-6">
          {/* Profile Form */}
          <div className="bg-white dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Profile Customizations & Aura Ring
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Update your display name, handle username, bio, and upload custom avatar from your device folders.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Profile details successfully updated!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Photo Upload with Border Ring Preview */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <img
                    src={
                      photoURL ||
                      `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'user'}`
                    }
                    alt="Avatar"
                    className={`w-18 h-18 rounded-full object-cover transition-all ${
                      isProUser && proBorderEffect !== 'none'
                        ? borderOptions.find((b) => b.id === proBorderEffect)?.ringClass
                        : 'ring-2 ring-purple-500/20'
                    }`}
                  />
                  {isProUser && (
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                      <Crown size={12} />
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                    Profile Picture
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Select an image file from your computer or phone folders.
                  </p>

                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold cursor-pointer transition">
                    <Upload size={14} />
                    <span>Choose from Folders</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Pro Customization: Aura Rings & Accents */}
              {isProUser && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800/60 space-y-4">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-amber-500" />
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                      WaveLink Pro Avatar Border Effect
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {borderOptions.map((opt) => {
                      const isSelected = proBorderEffect === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setProBorderEffect(opt.id)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                            isSelected
                              ? 'border-purple-600 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 shadow-xs'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white/50'
                          }`}
                        >
                          <span className="truncate">{opt.name}</span>
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pro Accent Color Themes */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Pro Profile Accent Theme:
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {accentColors.map((acc) => {
                        const isSelected = proAccentColor === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setProAccentColor(acc.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition text-xs font-semibold ${
                              isSelected
                                ? `${acc.border} bg-white dark:bg-gray-800 shadow-xs ring-2 ring-purple-500/20`
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${acc.bg}`} />
                            <span>{acc.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    placeholder="e.g. Keylan Mbilinyi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username Handle
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-3 text-purple-400" size={15} />
                    <input
                      type="text"
                      required
                      value={username.startsWith('@') ? username.substring(1) : username}
                      onChange={(e) => setUsername(`@${e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}`)}
                      maxLength={35}
                      placeholder="username"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Bio / Status
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                  placeholder="Tell the WaveLink community about yourself..."
                  className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Account ID Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold">
                    User UID:
                  </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 break-all select-all flex items-center gap-1">
                    <Fingerprint size={12} className="text-purple-500" />
                    {currentUser?.uid}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold">
                    Email Address:
                  </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 break-all">
                    {currentUser?.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Live Preview:</span>
                  <CrystalBadge
                    email={currentUser?.email}
                    name={displayName || 'You'}
                    isPro={isProUser}
                    size="sm"
                  />
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                    {username}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-purple-600/30 transition disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Saving changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Theme Mode Box: Light default (#F8F9FA) with Instant switching */}
          <div className="bg-white dark:bg-[#131927] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Appearance & Theme Mode
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Choose your preferred styling mode. Light mode applies the signature #F8F9FA off-white aesthetic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 ring-2 ring-purple-500/20 shadow-md shadow-purple-600/10'
                        : 'border-gray-200 dark:border-gray-700/80 hover:border-purple-300 dark:hover:border-purple-800 bg-gray-50/50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-2xs">
                          {opt.icon}
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                        {opt.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      <span>{isSelected ? 'Active Mode' : 'Click to select'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <MobileMoneyPaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => setIsPaymentModalOpen(false)}
        />
      )}
    </div>
  );
};
