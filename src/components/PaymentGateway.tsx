/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, QrCode, Shield, CheckCircle, RefreshCw, X, Landmark, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { dbService } from '../lib/db';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  purpose: string;
  onSuccess: (method: string) => void;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking';

export default function PaymentGateway({ isOpen, onClose, amount, purpose, onSuccess }: PaymentGatewayProps) {
  const instConfig = dbService.getInstitutionalConfig();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [loadingText, setLoadingText] = useState('Initiating secure gateway...');
  
  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // UPI states
  const [upiId, setUpiId] = useState('');
  const [qrTimer, setQrTimer] = useState(120);

  // Netbanking states
  const [selectedBank, setSelectedBank] = useState('sbi');

  // Input validation
  const [error, setError] = useState('');

  // Countdown timer for QR
  useEffect(() => {
    if (method === 'upi' && step === 'details' && qrTimer > 0) {
      const t = setInterval(() => {
        setQrTimer((p) => p - 1);
      }, 1000);
      return () => clearInterval(t);
    }
  }, [method, step, qrTimer]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Format into clusters of 4
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  const handlePay = () => {
    setError('');

    if (method === 'card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length !== 16) {
        setError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry.includes('/') || cardExpiry.length !== 5) {
        setError('Please enter expiry details formatted as MM/YY.');
        return;
      }
      if (cardCvv.length !== 3) {
        setError('Please enter a 3-digit CVV verification code.');
        return;
      }
      if (!cardName.trim()) {
        setError('Please enter the name printed on your credit or debit card.');
        return;
      }
    } else if (method === 'upi' && !upiId.includes('@')) {
      setError('Please provide a valid UPI handle schema (e.g. name@upi-client).');
      return;
    }

    // Trigger loader chain
    setStep('processing');
    
    // Status text simulator sequence
    const statuses = [
      'Establishing SSL tunnel security...',
      'Handshaking with Indian National Card Network (NPCI)...',
      'Acquiring approval token from bank ledger...',
      'Synchronizing 256-bit institutional vault keys...',
      'Authorizing transaction ledger entry...'
    ];

    let currentStatusIdx = 0;
    setLoadingText(statuses[0]);

    const statusInterval = setInterval(() => {
      currentStatusIdx++;
      if (currentStatusIdx < statuses.length) {
        setLoadingText(statuses[currentStatusIdx]);
      } else {
        clearInterval(statusInterval);
        setStep('success');
      }
    }, 700);
  };

  const handleFinalize = () => {
    let resolvedMethod = 'Visa/MasterCard Network';
    if (method === 'upi') {
      resolvedMethod = `UPI Pay (${upiId || 'Instant Scan QR'})`;
    } else if (method === 'netbanking') {
      const sub = selectedBank === 'sbi' ? 'State Bank of India' :
                  selectedBank === 'hdfc' ? 'HDFC Bank' :
                  selectedBank === 'icici' ? 'ICICI Bank' : 'Axis Bank';
      resolvedMethod = `NetBanking via ${sub}`;
    }
    onSuccess(resolvedMethod);
    onClose();
    // reset
    setStep('details');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setUpiId('');
    setQrTimer(120);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="knit-payment-gateway-wrapper" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop overlay catcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          onClick={() => step !== 'processing' && onClose()}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer"
        />

        {/* Dialog Panel Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 text-left font-sans flex flex-col justify-between max-h-[90vh]"
        >
          {/* Top Branding Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 px-6 py-4 flex items-center justify-between shrink-0 shadow border-b border-indigo-900/40">
            <div className="flex items-center space-x-2">
              <Shield className="h-4.5 w-4.5 text-emerald-400 animate-pulse shrink-0" />
              <div>
                <h3 className="text-xs font-black tracking-wider text-white uppercase font-mono">Secured Payment Gateway</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">{instConfig.name} Integrated Accounts</p>
              </div>
            </div>
            {step !== 'processing' && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {step === 'details' && (
              <div className="space-y-4">
                {/* Meta details banner */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">Invoice Description</span>
                    <h4 className="text-[11px] font-black text-slate-200 truncate max-w-[210px]">{purpose}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">Payable Fee</span>
                    <h4 className="text-sm font-black text-emerald-400 font-mono">₹{amount.toLocaleString()}</h4>
                  </div>
                </div>

                {/* Interactive Method Toggles */}
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`py-2 px-2.5 rounded-lg text-[10px] font-bold text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                      method === 'card' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-800' : 'text-slate-450 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Card Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('upi')}
                    className={`py-2 px-2.5 rounded-lg text-[10px] font-bold text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                      method === 'upi' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-800' : 'text-slate-450 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>UPI Instant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('netbanking')}
                    className={`py-2 px-2.5 rounded-lg text-[10px] font-bold text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                      method === 'netbanking' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-800' : 'text-slate-450 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Landmark className="h-4 w-4" />
                    <span>NetBanking</span>
                  </button>
                </div>

                {/* Form Fields depend on method */}
                {method === 'card' && (
                  <div className="space-y-3.5 pt-1.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Credit / Debit Card Number</label>
                        {cardNumber.replace(/\s/g, '') === '4242424242424242' && (
                          <span className="text-[7.5px] bg-purple-900/40 text-purple-300 font-black px-1.5 py-0.5 rounded border border-purple-800 uppercase tracking-wider animate-pulse">
                            Stripe Test Mode Cured
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242 (Stripe Sandbox)"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-705 font-mono"
                      />
                      <div className="text-[8.5px] text-slate-500 font-sans leading-relaxed">
                        Tip: Propose <span className="font-mono text-purple-400 font-bold">4242 4242 4242 4242</span> as standard Stripe test suite parameters.
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-mono text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">CVV Pass Code</label>
                        <input
                          type="password"
                          placeholder="• • •"
                          value={cardCvv}
                          onChange={handleCvvChange}
                          className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Card Holder Name</label>
                      <input
                        type="text"
                        placeholder="As printed on card"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                )}

                {method === 'upi' && (
                  <div className="space-y-4 pt-1.5 flex flex-col items-center justify-center">
                    {/* Simulated Dynamic UPI QR code */}
                    <div className="p-3 bg-white rounded-2xl shadow-inner relative group border border-slate-200">
                      <div className="w-40 h-40 flex items-center justify-center bg-slate-100 rounded-xl relative overflow-hidden">
                        {/* Dynamic QR lines drawing simulation */}
                        <div className="absolute inset-0 p-1 flex flex-col items-center justify-center">
                          <QrCode className="h-32 w-32 text-slate-900" />
                        </div>
                        {/* Grid scanner animation bar */}
                        <div className="h-1 w-full bg-emerald-500 absolute top-0 left-0 animate-bounce" />
                      </div>
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-650 text-white font-mono text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-md">
                        Institutional QR Valid
                      </span>
                    </div>

                    <p className="text-[10px] text-center text-slate-450 leading-relaxed max-w-xs font-sans">
                      Scan QR code on any UPI application (GPay, PhonePe, Paytm, BHIM) to pay instantly. Valid for <span className="font-mono text-amber-400 font-extrabold">{Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, '0')}</span> minutes.
                    </p>

                    <div className="relative flex items-center justify-center w-full">
                      <div className="border-[0.5px] border-slate-800/80 w-full" />
                      <span className="absolute bg-slate-900 px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Or enter UPI handle</span>
                    </div>

                    <div className="w-full space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">UPI Handle</label>
                      <input
                        type="text"
                        placeholder="e.g. name@okhdfcbank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-mono"
                      />
                    </div>
                  </div>
                )}

                {method === 'netbanking' && (
                  <div className="space-y-3.5 pt-1.5 text-left">
                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Institutional Netbanking Partners</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'sbi', label: 'State Bank of India', code: 'SBI' },
                        { id: 'hdfc', label: 'HDFC Corporate Bank', code: 'HDFC' },
                        { id: 'icici', label: 'ICICI Bank Retail', code: 'ICICI' },
                        { id: 'axis', label: 'Axis Bank Unified', code: 'AXIS' }
                      ].map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBank(bank.id)}
                          className={`p-3 border rounded-xl flex flex-col justify-between items-start transition-all text-left outline-none cursor-pointer ${
                            selectedBank === bank.id 
                              ? 'bg-indigo-650/15 border-indigo-500 font-bold text-white shadow' 
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[9px] font-black uppercase text-indigo-400 font-mono">{bank.code}</span>
                          <span className="text-[10px] text-slate-350 leading-tight mt-1 truncate w-full">{bank.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-900/30 text-[10px] text-indigo-300 leading-normal flex items-start space-x-1.5 font-sans mt-2">
                      <Landmark className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                      <span>This connection redirects to standard institutional merchant ledger routing portal securely. No bank login details are cached in your local session portfolios.</span>
                    </div>
                  </div>
                )}

                {/* Validation and errors logs info */}
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-[10px] font-medium flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-indigo-900/30 active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5 font-mono"
                >
                  <span>Authorize Secure Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <RefreshCw className="h-6 w-6 text-indigo-400 absolute animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-black text-white uppercase tracking-wider font-mono">Verifying Transaction...</p>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-mono max-w-xs animate-pulse">
                    {loadingText}
                  </p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-bounce">
                  <CheckCircle className="h-14 w-14 text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-black text-white">Payment Authorized Successfully!</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-normal font-sans">
                    The RBI clearing system successfully verified your institutional ledger dues. A signed transaction receipt was dispatched.
                  </p>
                </div>

                {/* Final receipt metadata block */}
                <div className="w-full p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-2 text-left font-mono">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold">Transaction ID</span>
                    <span className="text-slate-300 font-extrabold font-mono">PAY_{Date.now().toString().slice(-8)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold">Paid Ledger Dues</span>
                    <span className="text-emerald-400 font-extrabold font-mono">{instConfig.currencySymbol || '₹'}{amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold">Clearing Route</span>
                    <span className="text-slate-300 font-extrabold capitalize font-mono text-[9px]">
                      {method === 'card' ? 'Visa/MasterCard' : method === 'upi' ? 'UPI Pay Network' : `${instConfig.abbreviation || 'CAMPUS'} NetBanking Partner`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinalize}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-white" />
                  <span>Update Account Ledgers</span>
                </button>
              </div>
            )}
          </div>

          {/* Secure gateway trust rail footer */}
          <div className="bg-slate-950 border-t border-slate-850 px-6 py-3 text-center text-[9px] text-slate-500 flex items-center justify-center space-x-1.5 shrink-0 font-mono">
            <Zap className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>Encrypted via ISO-8583 Card Protocol • Server Feed Live</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
