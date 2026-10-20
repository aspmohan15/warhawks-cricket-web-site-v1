import React, { useState } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  Loader2,
  KeyRound
} from 'lucide-react';
import { loginOrganizer, normalizeMobile } from '../../services/auth';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const OrganizerLoginModal = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) => {
  // Credentials inputs - clean and un-prefilled
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const session = await loginOrganizer(mobile, password);
      onShowToast?.(`Welcome back, ${session.user.name}! Authorized as ${session.user.title || 'Organizer'}.`, 'success');
      onSuccess(session.user);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Invalid administrator credentials. Please check your phone number and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <img
              src={WARHAWKS_LOGO_URL}
              alt="Warhawks Official Logo"
              className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-md shadow-emerald-950/50 shrink-0 border border-slate-700/60"
            />
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">
                Warhawks Official Host
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Organizer Administrative Sign-In
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            Sign in with your registered phone number and administrator password.
          </p>
        </div>

        {/* Form: Phone Number & Password */}
        <form onSubmit={handleLogin} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Phone Number Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              Organizer Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                autoFocus
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Enter registered mobile number"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white text-slate-900 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white text-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Public players never need an account</span>
          </span>
          <span className="font-mono text-slate-400 text-[10px]">Warhawks Security</span>
        </div>
      </div>
    </div>
  );
};
