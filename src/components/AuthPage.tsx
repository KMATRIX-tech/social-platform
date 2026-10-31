import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { auth, ADMIN_EMAIL, isOwnerEmail } from '../firebase';
import { recordSystemDomain } from '../services/verificationService';
import { useAuth } from '../context/AuthContext';
import {
  Waves,
  Mail,
  Lock,
  User,
  AtSign,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Crown,
  Eye,
  EyeOff,
  UserPlus,
  LogIn
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { quickSignIn } = useAuth();
  
  // Tab state: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Automatically record current domain in Firebase on mount for tracking
  React.useEffect(() => {
    recordSystemDomain().catch(() => {});
  }, []);

  /**
   * 1. Built-in Firebase Google Sign-In via standard signInWithPopup(auth, googleProvider)
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setStatusMessage('Connecting to Google...');
    setIsGoogleLoading(true);

    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      setStatusMessage('Signed in successfully! Loading your profile...');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('auth/popup-closed-by-user') && !msg.includes('auth/cancelled-popup-request')) {
        setError(msg.replace('Firebase: ', ''));
      }
      setStatusMessage(null);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * 2. Built-in Firebase Email & Password Form Handler
   * Explicitly supports both Signing Up (creating a new account) and Signing In
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);

    if (authMode === 'signup') {
      // ==========================================
      // SIGN UP: Built-in Firebase User Creation
      // ==========================================
      const name = displayName.trim() || cleanEmail.split('@')[0];
      setStatusMessage('Creating your WaveLink account with Firebase...');

      try {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await fbUpdateProfile(res.user, {
          displayName: name
        });
        setStatusMessage('Welcome to WaveLink! Opening your dashboard...');
      } catch (err: any) {
        const code = err?.code || '';
        const msg = err?.message || String(err);

        if (code === 'auth/email-already-in-use') {
          setError('An account with this email already exists. Switching to Sign In...');
          setAuthMode('signin');
        } else if (code === 'auth/weak-password') {
          setError('Password is too weak. Please use at least 6 characters.');
        } else if (code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else {
          setError(msg.replace('Firebase: ', ''));
        }
        setStatusMessage(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // ==========================================
      // SIGN IN: Built-in Firebase Sign In
      // ==========================================
      setStatusMessage('Signing in to your WaveLink account...');

      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        setStatusMessage('Welcome back! Logging you in...');
      } catch (err: any) {
        const code = err?.code || '';
        const msg = err?.message || String(err);

        if (
          code === 'auth/user-not-found' ||
          code === 'auth/invalid-credential' ||
          msg.includes('user-not-found') ||
          msg.includes('invalid-credential')
        ) {
          // Offer seamless auto-registration or switch to signup
          setStatusMessage('No account found. Automatically registering your new account with Firebase...');
          try {
            const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const name = displayName.trim() || cleanEmail.split('@')[0];
            await fbUpdateProfile(createRes.user, { displayName: name });
            setStatusMessage('Account created successfully! Welcome to WaveLink 🌊');
            return;
          } catch (createErr: any) {
            const createCode = createErr?.code || '';
            const createMsg = createErr?.message || String(createErr);

            if (createCode === 'auth/email-already-in-use') {
              setError('Incorrect password for this account. Please try again.');
            } else if (createCode === 'auth/weak-password') {
              setError('Password is too weak. Must be at least 6 characters.');
            } else {
              setError(createMsg.replace('Firebase: ', ''));
            }
            setStatusMessage(null);
            return;
          }
        } else if (code === 'auth/wrong-password') {
          setError('Incorrect password. Please verify your password and try again.');
          setStatusMessage(null);
        } else if (code === 'auth/too-many-requests') {
          setError('Too many attempts. Please wait a minute and try again.');
          setStatusMessage(null);
        } else if (code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
          setStatusMessage(null);
        } else {
          setError(msg.replace('Firebase: ', ''));
          setStatusMessage(null);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Quick Owner fill & sign-in for Keylan (Platform Owner)
   */
  const handleOwnerQuickAccess = async () => {
    setEmail(ADMIN_EMAIL);
    setPassword('WaveLinkAdmin2025!');
    setDisplayName('Keylan Mbilinyi (Platform Owner)');
    setUsername('keylan');
    setError(null);
    setStatusMessage('Signing in as Platform Owner (Keylan)...');
    setIsLoading(true);

    try {
      await quickSignIn(
        ADMIN_EMAIL,
        'WaveLinkAdmin2025!',
        'Keylan Mbilinyi (Platform Owner)',
        '@keylan'
      );
    } catch (err: any) {
      console.log('Owner quick sign-in ready in form:', err);
      // If error, values are populated in the form for 1-click submit
      setStatusMessage('Owner credentials loaded into form. Click Sign In to proceed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      {/* Warm, inviting ambient sky blue & emerald glows */}
      <div
        className="absolute top-[-12%] left-[-10%] w-[560px] h-[560px] rounded-full bg-[#3B82F6]/12 blur-[120px] pointer-events-none"
      />
      <div
        className="absolute bottom-[-12%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#10B981]/12 blur-[130px] pointer-events-none"
      />
      <div
        className="absolute top-[35%] right-[20%] w-[400px] h-[400px] rounded-full bg-amber-200/20 blur-[100px] pointer-events-none"
      />

      {/* Main Welcoming Onboarding Container */}
      <div className="relative w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-tr from-[#3B82F6] to-[#10B981] shadow-lg shadow-blue-500/20 mb-3.5 ring-4 ring-white">
            <Waves className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
            Welcome to <span className="bg-gradient-to-r from-[#3B82F6] to-[#10B981] bg-clip-text text-transparent">WaveLink</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            A bright, warm community to connect with friends, share stories &amp; reels, and support creators across East Africa.
          </p>

          {/* Welcoming Onboarding Feature Highlights */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs font-semibold text-slate-700">
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              Live Community Feed
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              HD Reels &amp; Calling
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              Creator Mobile Wallet
            </span>
          </div>
        </div>

        {/* Soft Rounded White Card with Clean Drop Shadow */}
        <div className="bg-[#FFFFFF] border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08)]">
          {/* Mode Switcher Tabs: Sign In vs Sign Up */}
          <div className="grid grid-cols-2 p-1.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
                setStatusMessage(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                authMode === 'signin'
                  ? 'bg-[#3B82F6] text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
                setStatusMessage(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                authMode === 'signup'
                  ? 'bg-[#10B981] text-white shadow-sm shadow-emerald-500/25'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center justify-center gap-2">
              <Sparkles size={17} className={authMode === 'signup' ? 'text-[#10B981]' : 'text-[#3B82F6]'} />
              <span>
                {authMode === 'signup'
                  ? 'Create Your Free Account'
                  : 'Sign In to Your Account'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {authMode === 'signup'
                ? 'Join in seconds to share waves, chat with members, and explore reels'
                : 'Welcome back! Enter your details to jump right into the feed'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">
                <span>{error}</span>
              </div>
            </div>
          )}

          {statusMessage && !error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2.5 animate-in fade-in font-medium">
              <div className="w-3.5 h-3.5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* 1. Firebase Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-slate-200 text-[#0F172A] font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition shadow-2xs active:scale-[0.99] disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
            ) : (
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
            )}
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              or with email &amp; password
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* 2. Built-in Firebase Sign In & Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Full Name / Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Keylan Mbilinyi"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 text-xs sm:text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Username (optional)
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. keylan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 text-xs sm:text-sm transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 text-xs sm:text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F172A]">
                  Password
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Min. 6 characters</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 text-xs sm:text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={`w-full mt-2 py-3.5 px-5 rounded-2xl font-extrabold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition disabled:opacity-50 ${
                authMode === 'signup'
                  ? 'bg-[#10B981] hover:bg-emerald-600 shadow-emerald-500/20'
                  : 'bg-[#3B82F6] hover:bg-blue-600 shadow-blue-500/20'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'signup' ? 'Create WaveLink Account' : 'Sign In to WaveLink'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Toggle between modes */}
          <div className="mt-5 text-center">
            {authMode === 'signin' ? (
              <p className="text-xs text-slate-600">
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="text-[#10B981] hover:text-emerald-700 font-bold underline transition"
                >
                  Sign Up Here
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="text-[#3B82F6] hover:text-blue-700 font-bold underline transition"
                >
                  Sign In Here
                </button>
              </p>
            )}
          </div>

          {/* Quick Helper for Platform Owner (Keylan) */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              onClick={handleOwnerQuickAccess}
              className="inline-flex items-center gap-1.5 text-[#3B82F6] hover:text-blue-700 font-semibold transition"
              title="Quickly fill Platform Owner (Keylan) credentials"
            >
              <Crown size={13} className="text-amber-500" />
              <span>Owner (Keylan) 1-Click Access</span>
            </button>
            <span className="text-slate-400">Light &amp; Welcoming UI</span>
          </div>
        </div>

        {/* Footer credits */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          WaveLink © 2026 • Empowering East African Creators
        </p>
      </div>
    </div>
  );
};
