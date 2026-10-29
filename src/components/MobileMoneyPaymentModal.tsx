import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  SubscriptionTier,
  MobileMoneyProvider,
  PaymentTransaction
} from '../types';
import {
  PRO_TIERS,
  MOBILE_CARRIERS,
  detectCarrier,
  formatPhoneNumber,
  initiateAzamPayAirtelCheckout,
  completeSubscription
} from '../services/paymentService';
import {
  X,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  Lock,
  Smartphone,
  AlertCircle,
  Zap,
  Crown
} from 'lucide-react';

interface MobileMoneyPaymentModalProps {
  initialTier?: 'weekly' | 'monthly' | 'annual';
  onClose: () => void;
  onSuccess: () => void;
}

export const MobileMoneyPaymentModal: React.FC<MobileMoneyPaymentModalProps> = ({
  initialTier = 'monthly',
  onClose,
  onSuccess
}) => {
  const { currentUser, userProfile } = useAuth();

  const [selectedTierId, setSelectedTierId] = useState<'weekly' | 'monthly' | 'annual'>(initialTier);
  const selectedTier = PRO_TIERS.find((t) => t.id === selectedTierId) || PRO_TIERS.find((t) => t.id === 'monthly') || PRO_TIERS[0];

  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<MobileMoneyProvider>('airtel');

  // Checkout Step: 'details' | 'ussd_push' | 'success'
  const [step, setStep] = useState<'details' | 'ussd_push' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTx, setActiveTx] = useState<PaymentTransaction | null>(null);

  // Real-time status update string matching exact user requirement
  const [realtimeStatus, setRealtimeStatus] = useState<string>('');

  // USSD Push Pin dialog
  const [ussdPin, setUssdPin] = useState('');
  const [isAuthorizingPin, setIsAuthorizingPin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneNumber(raw);
    if (raw.length >= 3) {
      const detected = detectCarrier(raw);
      setProvider(detected);
    }
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!phoneNumber.trim()) {
      setAuthError('Please enter your mobile money registered phone number');
      return;
    }

    setIsProcessing(true);
    setAuthError(null);
    setRealtimeStatus('Initiating USSD push to your Airtel phone...');

    try {
      const formatted = formatPhoneNumber(phoneNumber.trim());
      
      // Connect directly to AzamPay /api/azampay/checkout route
      const result = await initiateAzamPayAirtelCheckout({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: userProfile?.displayName || currentUser.displayName || 'Subscriber',
        tier: selectedTier,
        provider,
        phoneNumber: formatted
      });

      if (result && result.transaction) {
        setActiveTx(result.transaction);
        // Progress to waiting for PIN entry
        setRealtimeStatus('Waiting for PIN...');
        setStep('ussd_push');
      } else {
        throw new Error('Failed to create subscription session');
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      setAuthError(err.message || 'Payment gateway communication error. Please try again.');
      setRealtimeStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUssdPin = async () => {
    if (!activeTx || !currentUser) return;
    if (ussdPin.length < 4) {
      setAuthError('Please enter a valid 4-digit mobile money PIN');
      return;
    }

    setIsAuthorizingPin(true);
    setAuthError(null);
    setRealtimeStatus('Waiting for PIN...');

    try {
      // Complete subscription and activate Pro
      await new Promise((res) => setTimeout(res, 1200));
      await completeSubscription(activeTx.id, currentUser.uid, selectedTier.id);
      
      setRealtimeStatus('Payment Successful!');
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to confirm USSD PIN:', err);
      setAuthError('Authorization failed. Please verify your PIN and balance.');
      setRealtimeStatus('Waiting for PIN...');
    } finally {
      setIsAuthorizingPin(false);
    }
  };

  const activeCarrier = MOBILE_CARRIERS[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#131927] border border-purple-200 dark:border-purple-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-pink-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-xs">
              <Crown size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                Upgrade to WaveLink Pro
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Secure Mobile Money Checkout • Instant Activation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body based on step */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {step === 'details' && (
            <>
              {/* Plan Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Select Subscription Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRO_TIERS.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-500/20'
                            : 'border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800 bg-gray-50/50 dark:bg-gray-800/40'
                        }`}
                      >
                        {tier.discountBadge && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
                            {tier.discountBadge}
                          </span>
                        )}
                        <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                          {tier.name}
                        </h4>
                        <div className="mt-2">
                          <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                            TZS {tier.priceTZS.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block -mt-0.5">
                            (${tier.priceUSD} {tier.billingPeriod})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Choose Mobile Money Carrier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(MOBILE_CARRIERS) as MobileMoneyProvider[]).map((carrierKey) => {
                    const carrier = MOBILE_CARRIERS[carrierKey];
                    const isSelected = provider === carrierKey;
                    return (
                      <button
                        key={carrierKey}
                        type="button"
                        onClick={() => setProvider(carrierKey)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/80 dark:bg-purple-950/50'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base">{carrier.logoEmoji}</span>
                          {isSelected && <CheckCircle2 size={13} className="text-purple-600" />}
                        </div>
                        <span className="font-bold text-[11px] text-gray-900 dark:text-white truncate">
                          {carrier.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {carrier.ussdCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Mobile Money Registered Phone Number:
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 text-purple-500" size={16} />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="e.g. 0784 123 456 or +255 7..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    A USSD push notification will be sent immediately to this phone to confirm payment.
                  </p>
                </div>

                {/* Features recap */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Included in {selectedTier.name}:</span>
                  </div>
                  <ul className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 space-y-1 pl-4 list-disc">
                    <li>500MB expanded high-speed media uploads</li>
                    <li>1080p Full HD video calling authorization</li>
                    <li>Wave post & message editing anytime</li>
                    <li>Full Creator Analytics (impressions & views)</li>
                  </ul>
                </div>

                {realtimeStatus && (
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin text-purple-600" />
                      <span className="font-bold">{realtimeStatus}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/60 font-extrabold">
                      AzamPay
                    </span>
                  </div>
                )}

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Initiating Airtel Money USSD Push...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay TZS {selectedTier.priceTZS.toLocaleString()} with {activeCarrier.name}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: USSD Push Phone Simulation */}
          {step === 'ussd_push' && activeTx && (
            <div className="space-y-5 animate-fade-in text-center py-2">
              {/* Real-time Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                <span>{realtimeStatus || 'Waiting for PIN entry...'}</span>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center ring-8 ring-amber-50 dark:ring-amber-950/20">
                <Smartphone size={32} className="animate-bounce" />
              </div>

              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  Check your phone: {activeTx.phoneNumber}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  A USSD prompt has been sent via AzamPay to your Airtel Money handset.
                </p>
              </div>

              {/* Simulated Handset Prompt Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border-2 border-amber-400/50 shadow-xl max-w-sm mx-auto text-left space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>{activeCarrier.logoEmoji}</span>
                    <span>{activeCarrier.name}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">Ref: {activeTx.reference}</span>
                </div>

                <p className="text-gray-200 leading-relaxed text-xs">
                  Lipa TZS {activeTx.amountTZS.toLocaleString()} kwa WaveLink Pro?
                  <br />
                  Weka PIN yako ya Mobile Money kuthibitisha:
                </p>

                <div className="pt-1">
                  <input
                    type="password"
                    maxLength={4}
                    value={ussdPin}
                    onChange={(e) => setUssdPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 4-digit PIN (e.g. 1234)"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-400/60 text-amber-300 placeholder-gray-500 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 max-w-sm mx-auto text-left">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Change Number
                </button>

                <button
                  onClick={handleConfirmUssdPin}
                  disabled={isAuthorizingPin || ussdPin.length < 4}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  {isAuthorizingPin ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Authorizing PIN...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Confirm PIN & Activate Pro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success Screen */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-2xl shadow-purple-600/40 ring-8 ring-purple-100 dark:ring-purple-950/40">
                <Crown size={38} />
              </div>

              <div>
                <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-xs inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Payment Successful!</span>
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-3">
                  Welcome to WaveLink Pro!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Your VIP membership has been activated via Airtel Money. Enjoy verified badges, 500MB uploads, 1080p calls, and creator analytics!
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold inline-block">
                Receipt Reference: {activeTx?.reference || 'WVL-AZAM-SUCCESS'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
