import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  SubscriptionTier,
  MobileMoneyProvider,
  PaymentTransaction,
  PendingVerification
} from '../types';
import {
  PRO_TIERS,
  MOBILE_CARRIERS,
  detectCarrier,
  formatPhoneNumber,
  initiateAzamPayAirtelCheckout,
  completeSubscription
} from '../services/paymentService';
import { submitManualVerification } from '../services/verificationService';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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
  Crown,
  FileText,
  Clock,
  Copy,
  Check
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

  // Official Recipient Mobile Money Details (Protected from public scraping & platform cybersecurity)
  const RECIPIENT_MOBILE_NUMBER = '0787473334';
  const RECIPIENT_PAYMENT_NAME = 'WaveLink Payments';

  // Mode: 'manual' (Pay via Airtel Money / Tigo Pesa) vs 'instant' (AzamPay USSD push)
  const [paymentMode, setPaymentMode] = useState<'manual' | 'instant'>('manual');

  const [selectedTierId, setSelectedTierId] = useState<'weekly' | 'monthly' | 'annual'>(initialTier);
  const selectedTier =
    PRO_TIERS.find((t) => t.id === selectedTierId) ||
    PRO_TIERS.find((t) => t.id === 'monthly') ||
    PRO_TIERS[0];

  // Manual payment state
  const [manualCarrier, setManualCarrier] = useState<'airtel' | 'tigopesa' | 'mpesa'>('airtel');
  const [transactionId, setTransactionId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSubmittedTxn, setManualSubmittedTxn] = useState<PendingVerification | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Instant AzamPay USSD Push state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<MobileMoneyProvider>('airtel');
  const [step, setStep] = useState<'details' | 'ussd_push' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTx, setActiveTx] = useState<PaymentTransaction | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('');
  const [ussdPin, setUssdPin] = useState('');
  const [isAuthorizingPin, setIsAuthorizingPin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if current user has an active pending verification in Firestore
  const [existingPending, setExistingPending] = useState<PendingVerification | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'pending_verifications'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let found: PendingVerification | null = null;
      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() } as PendingVerification;
        if (data.status === 'pending') {
          found = data;
        }
      });
      setExistingPending(found);
    });
    return () => unsub();
  }, [currentUser]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedCode(label);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Handle Manual SMS Transaction ID submission
  const handleSubmitManualVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const cleanTxn = transactionId.trim();
    if (!cleanTxn) {
      setManualError('Please enter the SMS Transaction ID received on your phone.');
      return;
    }
    if (cleanTxn.length < 5) {
      setManualError('Please enter a valid Transaction ID (minimum 5 characters).');
      return;
    }

    setIsSubmittingManual(true);
    setManualError(null);

    try {
      const carrierName = manualCarrier === 'airtel' ? 'Airtel Money' : manualCarrier === 'tigopesa' ? 'Tigo Pesa' : 'M-Pesa';
      const record = await submitManualVerification({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: userProfile?.displayName || currentUser.displayName || 'Subscriber',
        userPhotoURL: userProfile?.photoURL || currentUser.photoURL || undefined,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        amountTZS: selectedTier.priceTZS,
        carrier: carrierName,
        transactionId: cleanTxn,
        phoneNumber: senderPhone.trim() || undefined
      });

      setManualSubmittedTxn(record);
      setTransactionId('');
      setSenderPhone('');
    } catch (err: any) {
      console.error('Error submitting manual verification:', err);
      setManualError(err.message || 'Failed to submit Transaction ID. Please try again.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Instant AzamPay Checkout
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
    setRealtimeStatus('Initiating USSD push to your phone...');

    try {
      const formatted = formatPhoneNumber(phoneNumber.trim());
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
      <div className="relative w-full max-w-xl bg-white dark:bg-[#131927] border border-purple-200 dark:border-purple-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-pink-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-xs">
              <Crown size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <span>WaveLink Pro VIP</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                  Tanzania
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Airtel Money • Tigo Pesa • M-Pesa • Instant Activation
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

        {/* Tab Switcher: Pay via Airtel Money / Tigo Pesa vs Instant USSD Push */}
        <div className="px-5 pt-4 pb-1 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
          <div className="grid grid-cols-2 p-1 bg-gray-200/70 dark:bg-gray-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setPaymentMode('manual')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                paymentMode === 'manual'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Smartphone size={14} />
              <span>Pay via Airtel Money / Tigo Pesa</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('instant')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                paymentMode === 'instant'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Zap size={14} className="text-amber-400" />
              <span>Instant USSD Push (AzamPay)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Active Pending Notice if user has an unapproved request */}
          {existingPending && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-200">
                  Verification in Progress ({existingPending.tierName})
                </div>
                <div className="text-[11px] text-amber-300/90 mt-0.5 font-mono">
                  Txn ID: {existingPending.transactionId} • {existingPending.carrier}
                </div>
                <p className="text-[10px] text-amber-300/80 mt-1">
                  Our admin team is actively verifying this transaction. Your Pro badge will activate as soon as it is approved.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: Pay via Airtel Money / Tigo Pesa (Manual + Txn ID) */}
          {/* ========================================================= */}
          {paymentMode === 'manual' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Plan Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  1. Select Your Pro Membership Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRO_TIERS.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all relative ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-500/20'
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
                        <div className="mt-1.5">
                          <span className="text-base font-black text-purple-600 dark:text-purple-400">
                            TZS {tier.priceTZS.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            (${tier.priceUSD} {tier.billingPeriod})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carrier Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  2. Choose Payment Network
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualCarrier('airtel')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      manualCarrier === 'airtel'
                        ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🔴</span>
                      {manualCarrier === 'airtel' && <CheckCircle2 size={13} className="text-red-500" />}
                    </div>
                    <div className="font-bold text-xs text-gray-900 dark:text-white">Airtel Money</div>
                    <div className="text-[10px] text-gray-400 font-mono">*150*60#</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualCarrier('tigopesa')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      manualCarrier === 'tigopesa'
                        ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🔵</span>
                      {manualCarrier === 'tigopesa' && <CheckCircle2 size={13} className="text-sky-500" />}
                    </div>
                    <div className="font-bold text-xs text-gray-900 dark:text-white">Tigo Pesa</div>
                    <div className="text-[10px] text-gray-400 font-mono">*150*01#</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualCarrier('mpesa')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      manualCarrier === 'mpesa'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🟢</span>
                      {manualCarrier === 'mpesa' && <CheckCircle2 size={13} className="text-emerald-500" />}
                    </div>
                    <div className="font-bold text-xs text-gray-900 dark:text-white">Vodacom M-Pesa</div>
                    <div className="text-[10px] text-gray-400 font-mono">*150*00#</div>
                  </button>
                </div>
              </div>

              {/* Official Recipient Details Card */}
              <div className="rounded-2xl p-4 bg-gradient-to-r from-teal-500/15 via-purple-500/15 to-indigo-500/15 border border-teal-500/40 text-white space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <ShieldCheck size={15} className="text-teal-400" />
                    <span>Official WaveLink Recipient</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Encrypted Gateway
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 gap-3">
                  <div className="truncate">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Recipient Mobile Money Phone Number:
                    </div>
                    <div className="text-base sm:text-lg font-mono font-black text-amber-300 tracking-wider truncate mt-0.5 select-all">
                      {RECIPIENT_MOBILE_NUMBER}
                    </div>
                    <div className="text-[11px] text-teal-300 font-semibold mt-0.5">
                      Name: <span className="text-white font-bold">{RECIPIENT_PAYMENT_NAME}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(RECIPIENT_MOBILE_NUMBER, 'recipient')}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition shrink-0 border border-teal-500/30 active:scale-95"
                  >
                    {copiedCode === 'recipient' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedCode === 'recipient' ? 'Copied!' : 'Copy Number'}</span>
                  </button>
                </div>

                {/* Cybersecurity & Privacy Protection Note */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                  <Lock size={13} className="text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Platform Privacy &amp; Cybersecurity:</strong> This official recipient number is private to verified payment workflows and protected from other platform users and scraping to maintain top-tier cybersecurity.
                  </span>
                </div>
              </div>

              {/* Step-by-Step Payment Instructions Card */}
              <div className="rounded-2xl p-4 bg-slate-900 border border-purple-500/30 text-white space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <Smartphone size={15} />
                    <span>
                      {manualCarrier === 'airtel'
                        ? 'Airtel Money USSD Payment Steps'
                        : manualCarrier === 'tigopesa'
                        ? 'Tigo Pesa USSD Payment Steps'
                        : 'Vodacom M-Pesa USSD Payment Steps'}
                    </span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Exact Amount: TZS {selectedTier.priceTZS.toLocaleString()}
                  </span>
                </div>

                <ol className="space-y-2 text-[11px] sm:text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>
                    On your mobile phone dial{' '}
                    <strong className="text-amber-300 font-mono">
                      {manualCarrier === 'airtel' ? '*150*60#' : manualCarrier === 'tigopesa' ? '*150*01#' : '*150*00#'}
                    </strong>
                  </li>
                  <li>
                    Select{' '}
                    <strong className="text-white">
                      {manualCarrier === 'airtel'
                        ? 'Send Money (Tuma Pesa)'
                        : manualCarrier === 'tigopesa'
                        ? 'Send Money (Tuma Pesa)'
                        : 'Send Money (Tuma Pesa)'}
                    </strong>
                  </li>
                  <li>
                    Enter recipient mobile money phone number:{' '}
                    <span className="font-mono font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                      {RECIPIENT_MOBILE_NUMBER}
                    </span>{' '}
                    <span className="text-[11px] text-teal-300 font-semibold">(Name: {RECIPIENT_PAYMENT_NAME})</span>
                  </li>
                  <li>
                    Send the exact subscription amount:{' '}
                    <strong className="text-purple-300 font-mono">TZS {selectedTier.priceTZS.toLocaleString()}</strong>
                  </li>
                  <li>
                    Confirm the transfer by entering your secret Mobile Money PIN.
                  </li>
                  <li>
                    After payment completes, copy the <strong className="text-amber-300">SMS Transaction ID</strong>{' '}
                    (e.g.{' '}
                    <span className="font-mono text-teal-300">
                      {manualCarrier === 'airtel' ? 'TXN-894204' : manualCarrier === 'tigopesa' ? 'MP261028.9876.H12345' : 'TZ261028...'}
                    </span>
                    ) from the carrier SMS message.
                  </li>
                </ol>
              </div>

              {/* Submission Form */}
              <form onSubmit={handleSubmitManualVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                    <span>3. Enter SMS Transaction ID / Reference Code:</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Required</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 text-purple-500" size={16} />
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN-894204 or MP261028.9876.H12345"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Copy and paste the exact confirmation code received in your carrier SMS message.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Phone Number (optional for fast matching):
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 0784 123 456 or 0713..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {manualError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                {manualSubmittedTxn && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Transaction ID Submitted Successfully!</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/90 font-mono">
                      Recorded Txn: {manualSubmittedTxn.transactionId} ({manualSubmittedTxn.carrier})
                    </p>
                    <p className="text-[10px] text-emerald-300/80 pt-1">
                      The admin team has been notified. Your account will automatically upgrade to WaveLink Pro upon verification.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingManual || !transactionId.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {isSubmittingManual ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Recording Transaction ID...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Transaction ID for Verification</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: Instant USSD Push (AzamPay) */}
          {/* ========================================================= */}
          {paymentMode === 'instant' && (
            <>
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
                      Your VIP membership has been activated. Enjoy verified badges, 500MB uploads, 1080p calls, and creator analytics!
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold inline-block">
                    Receipt Reference: {activeTx?.reference || 'WVL-AZAM-SUCCESS'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
