import React from 'react';
import { ShieldAlert, ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const AccessDeniedView = ({
  sectionName,
  currentUser,
  onSwitchRole,
  onNavigate
}) => {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
        {/* Logo & Shield Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <img
            src={WARHAWKS_LOGO_URL}
            alt="Warhawks"
            className="w-20 h-20 rounded-2xl object-contain bg-white p-1 border border-slate-200 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center ring-2 ring-white">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Status Code & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold font-mono">
            <span>HTTP 403 · Access Forbidden</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Organizer Privileges Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            The <strong className="text-slate-800">{sectionName}</strong> module is restricted to authorized <strong className="text-slate-800">Warhawks Tournament Organizers</strong>. Your current active session is assigned the <strong className="text-blue-700 font-bold">Player</strong> role.
          </p>
        </div>

        {/* Two-Role Policy Explanation Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Warhawks Two-Role RBAC Policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Organizer Role
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Full operational control: Create/edit tournaments, schedule fixtures, enter scores, manage registrations, expenses, and auctions.
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-blue-800 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Player Role (Active)
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Browse tournaments, view live scorecards, standings & rules, and submit tournament registration applications.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('fixtures_results')}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Fixtures & Results</span>
          </button>

          <button
            onClick={() => onSwitchRole('organizer')}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Switch Session to Organizer (Test RBAC)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
