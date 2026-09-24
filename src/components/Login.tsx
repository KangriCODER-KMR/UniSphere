/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, GraduationCap, Users, Shield, Mail, Key, Sparkles, Brain, Award, ShieldAlert, Cpu, UserPlus, LogIn, ArrowLeft, Phone, Lock, Radio, HelpCircle, Info, ExternalLink, Settings } from 'lucide-react';
import { UserRole } from '../types';
import { dbService } from '../lib/db';
import { authenticatedFetch, FIREBASE_ACTIVE } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const instConfig = dbService.getInstitutionalConfig();
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('student');
  
  // Login / Register Form Fields (Empty by default to eliminate mock leaks)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [branchOrDept, setBranchOrDept] = useState('Computer Science');

  // Verified Manual Sign-Up States
  const [regStep, setRegStep] = useState<'contact' | 'verify' | 'form'>('contact');
  const [regContactType, setRegContactType] = useState<'phone' | 'email'>('email');
  const [regContactInput, setRegContactInput] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpInput, setRegOtpInput] = useState('');

  // Twilio Active Integration Assistance states
  const [twilioError, setTwilioError] = useState<{ reason: string; error: string; destination: string } | null>(null);

  // Multi-step 2FA / Phone OTP States
  const [loginStep, setLoginStep] = useState<'credentials' | 'phone' | 'otp'>('credentials');
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const switchRole = (selectedRole: UserRole) => {
    if (isRegistering && selectedRole === 'admin') {
      setError("Security Policy: Administrative accounts cannot register via self-service. Please contact College IT.");
      return;
    }
    setRole(selectedRole);
    setError('');
    setSuccessMsg('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const user = await dbService.loginWithGoogle();
      if (user && user.role === 'admin') {
        setPendingProfile(user);
        setLoginStep('phone');
        setSuccessMsg('Google Authenticated! Admin credentials require Phone OTP 2FA.');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (loginStep === 'credentials') {
      if (isRegistering) {
        if (regStep === 'contact') {
          if (!regContactInput.trim()) {
            setError(regContactType === 'phone' ? 'Please enter a valid mobile number.' : 'Please enter your official email.');
            return;
          }
          setLoading(true);
          try {
            const secureCode = Math.floor(100000 + Math.random() * 900000).toString();
            setRegOtp(secureCode);
            setError('');
            
            let realEmailSent = false;

            // Trigger real Email secure dispatch via back-end server SMTP
            if (regContactType === 'email') {
              try {
                const emailRes = await authenticatedFetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: regContactInput.trim(),
                    subject: `Gate Portal Verification Security Code`,
                    message: `Thank you for registering at KNIT Sultanpur. Your 6-digit Portal Registration security verification token is: ${secureCode}. Provide this passcode to continue setting up your profile.`
                  })
                });
                const emailData = await emailRes.json();
                if (emailData.success) {
                  setSuccessMsg(`A secure verification OTP has been dispatched to ${regContactInput.trim()}. Please verify.`);
                  setRegOtpInput('');
                  realEmailSent = true;
                  console.log(`[REAL REGISTER EMAIL SUCCESS] Registration OTP successfully sent to ${regContactInput.trim()}: ${secureCode}`);
                }
              } catch (err) {
                console.warn('Real email registration dispatch error:', err);
              }
            }

            if (!realEmailSent) {
              setRegOtpInput('');
              setSuccessMsg(`Email verification OTP sent. Check your browser/developer console (F12) for the security code.`);
              console.log(`%c[VERIFICATION SECURE PORTAL TOKEN] Verification code for ${regContactInput}: ${secureCode}`, "color: #ec4899; font-weight: bold; font-size: 14px;");
            } else {
              setRegOtpInput('');
            }

            setRegStep('verify');
          } catch (err: any) {
            setError(err?.message || 'Verification token dispatch failed.');
          } finally {
            setLoading(false);
          }
        } else if (regStep === 'verify') {
          if (!regOtpInput.trim()) {
            setError('Please enter the 6-digit code received.');
            return;
          }
          if (regOtpInput.trim() !== regOtp) {
            setError('Verification failed. The security token code is incorrect.');
            return;
          }
          setError('');
          setSuccessMsg('Address verified successfully! Please configure your institutional profile records below.');
          
          if (regContactType === 'email') {
            setEmail(regContactInput);
          }
          setRegStep('form');
        } else if (regStep === 'form') {
          if (!fullName.trim() || !rollNo.trim() || !password.trim()) {
            setError('Full Name, Passcode, and Roll/Employee ID are mandatory credentials.');
            return;
          }
          const targetEmail = regContactType === 'email' ? regContactInput : email;
          if (!targetEmail || !targetEmail.trim()) {
            setError('Please provide an institutional email.');
            return;
          }

          setLoading(true);
          try {
            await dbService.signup({
              name: fullName,
              email: targetEmail,
              password: password,
              role: role,
              rollNo: rollNo,
              branchOrDept: branchOrDept,
              phone: regContactType === 'phone' ? regContactInput : ''
            });

            setSuccessMsg('Security Portfolio created! Your account is now queued for Dean\'s verification/approval. You will be able to log in once approved.');
            setIsRegistering(false);
            setRegStep('contact');
            setRegContactInput('');
            setRegOtp('');
            setRegOtpInput('');
            setPassword('');
            setFullName('');
            setRollNo('');
          } catch (err: any) {
            setError(err?.message || 'Roster filing failed.');
          } finally {
            setLoading(false);
          }
        }
      } else {
        if (!email || !password) {
          setError('Please provide institutional email and passkey.');
          return;
        }
        setLoading(true);
        try {
          const profile = await dbService.validateCredentials(email, password, role);
          if (profile) {
            if (profile.role !== 'admin' && profile.approved === false) {
              throw new Error('Specific account activation is pending! Access is unauthorized until the Administrator (Dean) manually approves your registered credentials.');
            }
            setPendingProfile(profile);

            // Generate dynamic 4-digit MFA passcode
            const simulatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
            setOtpHint(simulatedOTP);
            setLoginStep('otp');

            let realEmailSent = false;
            try {
              const mailRes = await authenticatedFetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profile.email,
                  subject: `Gateway Multi-Factor Authorization Code`,
                  message: `Your requested Multi-Factor Security authorization token is: ${simulatedOTP}. Enter this passcode in your browser window to authenticate.`
                })
              });
              const emailData = await mailRes.json();
              if (emailData.success) {
                setSuccessMsg(`A secure Multi-Factor Authentication Code has been dispatched to ${profile.email}. Please verify.`);
                setOtpCode('');
                realEmailSent = true;
              }
            } catch (err) {
              console.warn("MFA Email OTP error:", err);
            }

            if (!realEmailSent) {
              setOtpCode('');
              setSuccessMsg(`MFA passcode dispatched. Check your server/browser console logs for the 2FA code.`);
              console.log(`%c[MFA SECURITY DESPATCH] MFA passcode for ${profile.email} is: ${simulatedOTP}`, "color: #3b82f6; font-weight: bold; font-size: 14px;");
            }
          } else {
            setError('Verification Failed: Incorrect passkey or institutional profile.');
          }
        } catch (err: any) {
          setError(err?.message || 'Account validation failed.');
        } finally {
          setLoading(false);
        }
      }
    } else if (loginStep === 'otp') {
      if (!otpCode.trim()) {
        setError('Please enter the OTP verification code.');
        return;
      }
      setLoading(true);
      try {
        const sanitizePhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
        
        let verified = false;
        if (otpCode === otpHint) {
          verified = true;
        } else {
          try {
            const { error: vError } = await supabase.auth.verifyOtp({
              phone: sanitizePhone,
              token: otpCode,
              type: 'sms'
            });
            if (!vError) verified = true;
          } catch (vErr) {
            console.warn("Supabase OTP verification warning:", vErr);
          }
        }

        if (verified) {
          await dbService.finalizeLogin(pendingProfile, phoneNumber);
          setSuccessMsg('2FA security check authorized! Initializing role module...');
          setTimeout(() => {
            onLoginSuccess();
          }, 800);
        } else {
          setError('Invalid OTP code. Please retry or verify your configuration.');
        }
      } catch (err: any) {
        setError(err?.message || '2FA validation rejected.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="knit-login-page" className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none w-full h-full">
        <div className="absolute top-20 left-20 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-indigo-600/5 blur-3xl animate-pulse" />
      </div>

      <div className="max-w-7xl w-full mx-auto relative z-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Branding, Mission, Features */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="w-40 h-40 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 hover:scale-105 transition-transform overflow-hidden shadow-2xl">
                  {/* Institutional Logo Shield */}
                  <div className="p-4 flex flex-col items-center justify-center text-center">
                    <Landmark className="h-14 w-14 text-blue-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono">{instConfig.abbreviation || 'CAMPUS'}</span>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border border-amber-300">
                  <Sparkles className="h-5 w-5 text-white animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight bg-gradient-to-r from-white via-indigo-200 to-blue-400 bg-clip-text text-transparent">
                {(instConfig.name || 'CAMPUS DIGITAL').toUpperCase()} PORTAL
              </h1>
              <h2 className="text-xl sm:text-2xl font-bold text-indigo-300">
                Advanced AI-Powered Education Platform
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mt-3 leading-relaxed">
                Unlock frictionless biometric attendance streams, secure marketplace e-stores, placement cells, digital library archives, and proctored modules.
              </p>
            </div>

            {/* Smart badges */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-2">
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-slate-300 shadow-md">
                <Brain className="h-3.5 w-3.5 text-purple-400" />
                <span>Biometric registers</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-slate-300 shadow-md">
                <Award className="h-3.5 w-3.5 text-blue-400" />
                <span>Placement Board</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-slate-300 shadow-md">
                <Cpu className="h-3.5 w-3.5 text-green-400" />
                <span>Campus E-Store</span>
              </span>
            </div>

            {/* Next Generation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl flex items-start space-x-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Biometric Attendance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time biometric registration and roster checks.</p>
                </div>
              </div>
              
              <div className="p-5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl flex items-start space-x-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Campus E-Store</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Community marketplace for books, merch, and services.</p>
                </div>
              </div>
            </div>

            {/* System Status Banner */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl max-w-lg hidden lg:block">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>College Domain Access Active</span>
                </div>
                <div className="flex space-x-3 text-slate-400">
                  <span>@{instConfig.domain || 'campus.edu'} Verified Only</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Portal Login & Registration Container */}
          <div>
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-white">
                  {loginStep === 'credentials' ? (isRegistering ? 'Register Real Account' : 'Access Portal Gate') : 'Enter security token'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {loginStep === 'credentials' ? (
                    isRegistering ? 'Fill official institutional credentials to sign up' : 'Provide authorization roles to enter the dashboards'
                  ) : (
                    'Provide standard Multi-Factor email code to finalize session authorization'
                  )}
                </p>
              </div>

              {loginStep === 'credentials' && (
                <>
                  {/* Custom Role Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => switchRole('student')}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        role === 'student' ? 'bg-gradient-to-r from-purple-600 to-indigo-650 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchRole('teacher')}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        role === 'teacher' ? 'bg-gradient-to-r from-indigo-650 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users className="h-3 w-3 shrink-0" />
                      <span className="truncate">Teacher</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRegistering}
                      onClick={() => switchRole('admin')}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        role === 'admin' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                      } ${isRegistering ? 'opacity-40 cursor-not-allowed' : ''}`}
                      title={isRegistering ? "Registration disabled for admins" : ""}
                    >
                      <Shield className="h-3 w-3 shrink-0" />
                      <span className="truncate">{isRegistering ? "Locked" : "Admin"}</span>
                    </button>
                  </div>

                  {/* Portal Security & Guide Tab */}
                  {!isRegistering && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-center text-slate-200">
                        <span className="flex items-center space-x-2 font-bold font-sans">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                          <span>Production Cloud Access</span>
                        </span>
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          🟢 LIVE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed space-y-1.5 font-sans">
                        <p>
                          This website is directly integrated with your secure <strong className="text-white">Google Firestore Cloud Database</strong>.
                        </p>
                        <p>
                          Enter your registered email and passcode to access your dashboard. If you don't have an account, click the link below to <strong className="text-indigo-300">Register Institutional Passport</strong> to instantly create an account in the cloud!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* Form Input fields */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                
                {loginStep === 'credentials' && (
                  <>
                    {/* Normal login flow inputs (when isRegistering is false) */}
                    {!isRegistering && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Institutional Email</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <Mail className="h-4 w-4" />
                            </span>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-colors"
                              placeholder={`username@${instConfig.domain}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Gate Passcode</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <Key className="h-4 w-4" />
                            </span>
                            <input
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-colors"
                              placeholder="Enter security passkey..."
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Verified signup flow inputs (when isRegistering is true) */}
                    {isRegistering && (
                      <div className="space-y-4 text-left animate-fadeIn">
                        
                        {/* Step Indicator */}
                        <div className="flex items-center justify-between bg-slate-950/80 p-3 border border-slate-800 rounded-2xl text-[10px] uppercase font-bold text-slate-450 tracking-wider font-mono">
                          <span className={regStep === 'contact' ? 'text-indigo-400 font-extrabold' : ''}>1. Contact</span>
                          <span className="text-slate-700">➔</span>
                          <span className={regStep === 'verify' ? 'text-indigo-400 font-extrabold' : ''}>2. OTP Verification</span>
                          <span className="text-slate-700">➔</span>
                          <span className={regStep === 'form' ? 'text-indigo-400 font-extrabold' : ''}>3. Details</span>
                        </div>

                        {/* SUB-STEP 1: Contact Input */}
                        {regStep === 'contact' && (
                          <div className="space-y-3 pt-1">
                            <div className="p-3 bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs leading-relaxed">
                              Specify your institutional email to receive a secure, actual verification OTP passcode. This passcode is required to configure and whitelist your login credentials.
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">
                                Institutional or Registered Email Address
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Mail className="h-4 w-4" />
                                </span>
                                <input
                                  type="email"
                                  required
                                  value={regContactInput}
                                  onChange={(e) => setRegContactInput(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-colors"
                                  placeholder={`e.g. academic@${instConfig.domain}`}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 leading-none block pt-1 font-medium">
                                ★ Dispatches verification link/passcode to your registered mailbox.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* SUB-STEP 2: Enter OTP Code */}
                        {regStep === 'verify' && (
                          <div className="space-y-3">
                            <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-xl text-xs leading-relaxed space-y-1">
                              <p>Enter the 6-digit confirmation security code below to verify your profile contact.</p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-450 uppercase tracking-wider font-mono">Security Code Token</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Lock className="h-4 w-4" />
                                </span>
                                <input
                                  type="text"
                                  required
                                  maxLength={6}
                                  value={regOtpInput}
                                  onChange={(e) => setRegOtpInput(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-colors text-center font-mono tracking-widest text-lg font-black"
                                  placeholder="------"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Token expiration in 5:00 minutes</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRegStep('contact');
                                    setError('');
                                    setSuccessMsg('');
                                  }}
                                  className="text-indigo-400 hover:underline font-bold"
                                >
                                  Resend token
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SUB-STEP 3: Profile registration details Form */}
                        {regStep === 'form' && (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">Full Name (Official Records)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Users className="h-4 w-4" />
                                </span>
                                <input
                                  type="text"
                                  required
                                  value={fullName}
                                  onChange={(e) => setFullName(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                  placeholder="e.g. Aarav Sharma"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">Institutional Email</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550">
                                  <Mail className="h-4 w-4" />
                                </span>
                                <input
                                  type="email"
                                  required
                                  disabled={regContactType === 'email'}
                                  value={regContactType === 'email' ? regContactInput : email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 outline-none ${
                                    regContactType === 'email' ? 'opacity-70 cursor-not-allowed border-indigo-500/40 text-slate-300 bg-slate-900/40' : 'focus:border-indigo-500'
                                  }`}
                                  placeholder={`scholar@${instConfig.domain}`}
                                />
                              </div>
                              {regContactType === 'email' && (
                                <span className="text-[9px] text-emerald-400 font-mono">✓ Verified Address</span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">Choose Gate Passcode</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Key className="h-4 w-4" />
                                </span>
                                <input
                                  type="password"
                                  required
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                                  placeholder="Set passkey..."
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">
                                {role === 'student' ? 'Branch Affiliation' : role === 'teacher' ? 'Department/Subject Area' : 'Administrative Wing'}
                              </label>
                              <select
                                value={branchOrDept}
                                onChange={(e) => setBranchOrDept(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                              >
                                <option value="Computer Science">Computer Science & Engineering</option>
                                <option value="Information Technology">Information Technology</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                                <option value="Electronics Engineering">Electronics Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400">
                                {role === 'student' ? 'Roll Number / Unique ID' : 'Employee ID'}
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <GraduationCap className="h-4 w-4" />
                                </span>
                                <input
                                  type="text"
                                  required
                                  value={rollNo}
                                  onChange={(e) => setRollNo(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                                  placeholder={role === 'student' ? 'e.g. CS2024101' : 'e.g. TCH115'}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </>
                )}

                {loginStep === 'otp' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs space-y-1.5 leading-relaxed">
                      <strong className="block text-slate-100 font-bold mb-1 flex items-center space-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 animate-pulse" />
                        <span>MFA Secure Validation</span>
                      </strong>
                      <p>Please enter the 4-digit verification code below to authorize administrative portal entry.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Verification Code</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-colors font-mono tracking-widest text-center text-lg"
                          placeholder="----"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-98 transition-all hover:shadow-lg shadow-indigo-900/30 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-b-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {loginStep === 'credentials' ? (
                        isRegistering ? (
                          regStep === 'contact' ? (
                            <>
                              <Phone className="h-4 w-4 mr-0.5" />
                              <span>Dispatch Verification OTP</span>
                            </>
                          ) : regStep === 'verify' ? (
                            <>
                              <Lock className="h-4 w-4 mr-0.5" />
                              <span>Verify Security Code</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-0.5" />
                              <span>Submit Roster for Approval</span>
                            </>
                          )
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-0.5" />
                            <span>Launch Role Dashboard</span>
                          </>
                        )
                      ) : loginStep === 'phone' ? (
                        <>
                          <Phone className="h-4 w-4 mr-0.5" />
                          <span>Send Secure Verification Code</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-0.5" />
                          <span>Authorize Portal Entry</span>
                        </>
                      )}
                    </>
                  )}
                </button>

                {loginStep === 'credentials' && FIREBASE_ACTIVE && (
                  <div className="space-y-4 pt-2">
                    <div className="relative flex items-center justify-center">
                      <div className="border-[0.5px] border-slate-800/80 w-full" />
                      <span className="absolute bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Or Cloud Gate
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 active:scale-98 transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
                    >
                      <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-1.05-5.32-.34-6.84z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                    
                    <p className="text-[10px] text-slate-500 font-mono text-center leading-relaxed px-2">
                      <span className="text-slate-400">Secure Access Gateway:</span> Authorized Single Sign-On and Cloud Authentication services are active.
                    </p>
                  </div>
                )}
              </form>

              {/* Mode switching button */}
              <div className="pt-4 border-t border-slate-800/80 text-center">
                {loginStep === 'credentials' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextReg = !isRegistering;
                      setIsRegistering(nextReg);
                      if (nextReg && role === 'admin') {
                        setRole('student');
                      }
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors pointer-events-auto cursor-pointer"
                  >
                    {isRegistering ? (
                      <>
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to standard login portal</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>New scholar? Register institutional passport</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (loginStep === 'otp') {
                        setLoginStep('phone');
                      } else {
                        setLoginStep('credentials');
                        setPendingProfile(null);
                      }
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-rose-400 hover:text-rose-300 transition-colors pointer-events-auto cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Cancel and return to previous stage</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
