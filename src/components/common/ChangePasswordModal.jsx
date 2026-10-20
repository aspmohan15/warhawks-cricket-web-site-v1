import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { changeAdminPassword } from '../../services/auth';

export const ChangePasswordModal = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword.trim()) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await changeAdminPassword(currentPassword, newPassword);
      onShowToast?.(res?.message || 'Password changed successfully!', 'success');
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
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
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-amber-950/50">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block font-mono">
                Administrator Account Security
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Change My Password
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            Update your personal account password. Administrators can only change their own credentials.
          </p>
        </div>

        {/* Current Admin Account Badge */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              🦅
            </div>
            <div>
              <div className="font-bold text-slate-900">{currentUser?.name || 'Tournament Administrator'}</div>
              <div className="text-[11px] text-slate-500 font-mono">{currentUser?.mobile}</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
            {currentUser?.isPrimaryAdmin ? 'Primary Admin' : 'Administrator'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                autoFocus
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs bg-white text-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Initial common default password: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">warhawks2026</code>
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs bg-white text-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs bg-white text-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              disabled={submitting || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update My Password</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            <span>Strict Account Isolation Enforced</span>
          </span>
          <span className="font-mono text-slate-400 text-[10px]">Warhawks Security</span>
        </div>
      </div>
    </div>
  );
};
