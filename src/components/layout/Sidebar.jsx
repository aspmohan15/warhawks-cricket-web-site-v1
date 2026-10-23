import React from 'react';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  ListOrdered,
  Gavel,
  BadgePercent,
  Receipt,
  Utensils,
  BookOpenCheck,
  UserPlus,
  Image,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  ChevronRight,
  Sparkles,
  X,
  LogIn,
  LogOut,
  Lock,
  Database
} from 'lucide-react';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const Sidebar = ({
  currentSection,
  onSelectSection,
  activeTournament,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onOpenOrganizerLogin,
  onLogout,
  onOpenDatabaseModal,
  isDbConnected
}) => {
  const isOrganizer = currentUser?.role === 'organizer';

  // Navigation tailored to active role (Organizer vs Player)
  const navItems = isOrganizer
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'editions', label: 'Tournament Editions', icon: Trophy, badge: 'Multi' },
        { id: 'teams_players', label: 'Teams & Players', icon: Users },
        { id: 'fixtures_results', label: 'Fixtures & Results', icon: Calendar },
        { id: 'standings', label: 'Standings & NRR', icon: ListOrdered },
        { id: 'auction', label: 'Auction Management', icon: Gavel, badge: 'Live' },
        { id: 'sponsorships', label: 'Sponsorships', icon: BadgePercent },
        { id: 'expenses', label: 'Tournament Expenses', icon: Receipt },
        { id: 'food_preferences', label: 'Food Preferences', icon: Utensils },
        { id: 'rules_videos', label: 'Rules & Demo Videos', icon: BookOpenCheck },
        { id: 'registrations', label: 'Registration Queue', icon: UserPlus },
        { id: 'media_library', label: 'Media Library', icon: Image },
        { id: 'import_history', label: 'Import History', icon: FileSpreadsheet, badge: 'CSV' },
        { id: 'user_access', label: 'User & Access RBAC', icon: ShieldCheck, badge: '2-Role' },
        { id: 'settings', label: 'Settings & Integrations', icon: Settings }
      ]
    : [
        { id: 'fixtures_results', label: 'Fixtures & Scores', icon: Calendar },
        { id: 'standings', label: 'Points Table & NRR', icon: ListOrdered },
        { id: 'registrations', label: 'Tournament Registration', icon: UserPlus, badge: 'Apply' },
        { id: 'teams_players', label: 'Teams & Squads', icon: Users },
        { id: 'auction', label: 'Auction Live Viewer', icon: Gavel, badge: 'Live' },
        { id: 'sponsorships', label: 'Sponsors & Partners', icon: BadgePercent },
        { id: 'rules_videos', label: 'Rules & Demo Videos', icon: BookOpenCheck }
      ];

  const handleNavClick = (id) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 sm:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Explicit Mobile Close Button */}
        <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={WARHAWKS_LOGO_URL}
              alt="Warhawks Official Logo"
              className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 shadow-md shadow-emerald-950/40 shrink-0 border border-slate-700/60"
            />
            <div>
              <span className="text-base font-bold text-white tracking-tight block leading-tight">
                Warhawks
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">
                Cricket Tournament
              </span>
            </div>
          </div>

          {/* Close button for mobile drawers */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden min-w-[42px] min-h-[42px] p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Edition Context Card */}
        <div className="p-3 mx-3 my-2 bg-slate-800/70 rounded-lg border border-slate-700/60 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-medium uppercase tracking-wider text-[10px] text-emerald-400 font-bold">
              Host: Warhawks
            </span>
            <span className="font-mono text-white font-bold">Ed. {activeTournament?.editionNumber || '—'}</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">
            {activeTournament?.name || 'No Tournament Selected'}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>{activeTournament?.year || '—'} · {activeTournament?.format || 'T20'}</span>
            <button
              onClick={() => handleNavClick('editions')}
              className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5 cursor-pointer font-medium"
            >
              Switch <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs font-medium">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-left group min-h-[42px] cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-950'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase tracking-wider shrink-0 ml-1.5 ${
                      isActive
                        ? 'bg-emerald-800/60 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Auth Action in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isOrganizer ? (
            <button
              onClick={() => {
                onLogout?.();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition-colors text-xs font-semibold cursor-pointer border border-slate-700/50"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Organizer</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenOrganizerLogin?.();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 transition-colors text-xs font-semibold cursor-pointer border border-emerald-800/40"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Organizer Sign In</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Host</span>
            </button>
          )}

          {/* Database Connection Status Trigger (Restricted Exclusively to Admin / Organizer) */}
          {isOrganizer && (
            <button
              type="button"
              onClick={() => {
                onOpenDatabaseModal?.();
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                isDbConnected
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
              title="Admin Console: Inspect Supabase PostgreSQL connection & diagnostic status"
            >
              <span className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-sans font-medium">Database Config</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isDbConnected ? 'Supabase' : 'Local Store'}</span>
              </span>
            </button>
          )}

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span className="font-medium text-slate-400 flex items-center gap-1.5">
              <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2" />
              <span>Warhawks Operations</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium text-[10px]">
              <Sparkles className="w-3 h-3" /> Certified
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
