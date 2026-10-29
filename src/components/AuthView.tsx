import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isOwnerEmail, ADMIN_EMAIL } from '../firebase';
import {
  Waves,
  Sparkles,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Crown,
  ShieldAlert
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, quickSignIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('WaveLinkAdmin2025!');
  const [displayName, setDisplayName] = useState('Keylan Mbilinyi (Platform Owner)');
  const [username, setUsername] = useState('keylan');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);

  // Domain authorization dialog & clipboard state
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseProjectId = 'red-bonito-16tvw';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict owner verification check
    if (!isOwnerEmail(email)) {
      setError(`Access Restricted: WaveLink is in Private Owner Mode. Only ${ADMIN_EMAIL} is allowed to enter.`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName.trim() || 'Keylan Mbilinyi (Platform Owner)', username.trim() || 'keylan');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/wrong-password') ||
        msg.includes('auth/user-not-found')
      ) {
        setError('Invalid credentials. Use 1-Click Owner Launch below for instant access.');
      } else if (msg.includes('auth/email-already-in-use')) {
        // If owner already exists, switch to sign-in and proceed
        setMode('signin');
        setError('Account exists. Please enter your password or click 1-Click Owner Launch.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters.');
      } else {
        setError(msg.replace('Firebase: ', ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/unauthorized-domain')) {
        setShowDomainGuide(true);
        setError(
          `Google Sign-In blocked: Current preview domain (${currentDomain}) is not yet added to Firebase Authorized Domains.`
        );
      } else if (!msg.includes('auth/popup-closed-by-user')) {
        setError(msg.replace('Firebase: ', ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOwnerQuickLaunch = async () => {
    setError(null);
    setQuickLoading(true);
    try {
      await quickSignIn(
        ADMIN_EMAIL,
        'WaveLinkAdmin2025!',
        'Keylan Mbilinyi (Platform Owner)',
        '@keylan'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Owner quick launch error:', err);
      setEmail(ADMIN_EMAIL);
      setPassword('WaveLinkAdmin2025!');
      setError(`Owner launch attempt: ${msg.replace('Firebase: ', '')}. Credentials filled above.`);
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 text-white">
      {/* Ambient background glows */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-purple-600/20 blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '6s' }}
      />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-pink-600/15 blur-3xl pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[400px] h-[400px] rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-xl shadow-purple-950/50 mb-3 ring-1 ring-white/20">
            <Waves className="w-8 h-8 text-white animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
            WaveLink
          </h1>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Crown size={12} className="text-amber-400" />
            <span>Private Platform • Owner Edition</span>
          </div>
          <p className="mt-2 text-xs text-purple-200/70 font-medium">
            Exclusive access reserved for <span className="text-white font-mono">{ADMIN_EMAIL}</span>
          </p>
        </div>

        {/* Auth form box */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/60">
          {/* Strict Owner Lock Notice */}
          <div className="mb-4 p-3 rounded-2xl bg-purple-950/60 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-white">Owner Security Gate Active:</span> All other registrations and sign-ins are strictly blocked.
            </div>
          </div>

          {/* Primary Owner 1-Click Launch Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleOwnerQuickLaunch}
              disabled={quickLoading || isSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 font-bold text-sm text-white flex items-center justify-center gap-2.5 shadow-xl shadow-purple-950/60 active:scale-[0.99] transition border border-amber-300/30 disabled:opacity-50"
            >
              {quickLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Crown size={16} className="text-amber-200" />
                  <span>Enter as Platform Owner</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-purple-300/60 mt-1.5">
              1-Click instant sign-in with full super administrator authority
            </p>
          </div>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-white/15" />
            <span className="px-3 text-[10px] uppercase tracking-wider text-purple-200/50 font-bold">
              or credentials
            </span>
            <div className="flex-1 border-t border-white/15" />
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-2xl bg-black/25 p-1 mb-4 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              <LogIn size={13} />
              Owner Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-900/50'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              <UserPlus size={13} />
              Owner Setup
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
              {error.includes('unauthorized-domain') && (
                <button
                  type="button"
                  onClick={() => setShowDomainGuide(true)}
                  className="self-start text-[11px] underline text-rose-300 hover:text-white flex items-center gap-1 font-medium"
                >
                  <HelpCircle size={13} />
                  View Domain Whitelist Instructions
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/90 mb-1">
                Owner Email Address (Locked)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-purple-300/60" size={15} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="keylanmbilinyi5@gmail.com"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-400 text-xs sm:text-sm font-mono"
                />
              </div>
              {!isOwnerEmail(email) && (
                <p className="text-[10px] text-rose-300 mt-1 flex items-center gap-1">
                  <ShieldAlert size={11} /> Only {ADMIN_EMAIL} can enter.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-purple-200/90 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-purple-300/60" size={15} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-400 text-xs sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || quickLoading || !isOwnerEmail(email)}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 active:scale-[0.99] transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In as Owner' : 'Initialize Owner Account'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-in */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || quickLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Owner Google Account</span>
            </button>
          </div>

          {/* Domain Setup Trigger */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200/60">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Owner: <code className="text-purple-300 font-mono">keylanmbilinyi5@...</code>
            </span>
            <button
              type="button"
              onClick={() => setShowDomainGuide(true)}
              className="text-purple-300 hover:text-white underline text-[10px] flex items-center gap-1"
            >
              <HelpCircle size={11} />
              OAuth Domain Whitelist
            </button>
          </div>
        </div>
      </div>

      {/* Domain Authorization Modal Guide */}
      {showDomainGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121624] border border-purple-500/30 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Firebase Authorized Domain Whitelist
                  </h3>
                  <p className="text-xs text-gray-400">
                    Fix for <code className="text-amber-300">auth/unauthorized-domain</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainGuide(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              To allow Google OAuth popups from your preview URL into Firebase Auth project <code className="text-purple-300 font-mono">{firebaseProjectId}</code>, add this domain to Authorized Domains:
            </p>

            <div className="mb-4 space-y-2">
              <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block">
                Preview Domain
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-cyan-300">
                <span className="truncate flex-1">{currentDomain || 'ais-dev-...run.app'}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentDomain)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans flex items-center gap-1 transition"
                >
                  {copiedDomain ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-3.5 mb-4 text-xs space-y-2 text-purple-200">
              <p className="font-semibold text-white">Quick 3-Step Setup in Firebase Console:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
                <li>
                  Open{' '}
                  <a
                    href={firebaseAuthSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 underline font-medium hover:text-white inline-flex items-center gap-0.5"
                  >
                    Firebase Console Settings
                    <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  Go to <strong className="text-white">Authorized domains</strong> and click{' '}
                  <strong className="text-white">Add domain</strong>
                </li>
                <li>
                  Paste <code className="text-cyan-300">{currentDomain}</code> and save.
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDomainGuide(false);
                  handleOwnerQuickLaunch();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition shadow"
              >
                <Crown size={14} className="text-amber-200" />
                Launch as Owner Now (No Wait)
              </button>
              <button
                type="button"
                onClick={() => setShowDomainGuide(false)}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-gray-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
