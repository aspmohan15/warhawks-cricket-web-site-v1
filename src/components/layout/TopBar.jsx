import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  ChevronDown,
  Trophy,
  Plus,
  ShieldCheck,
  Check,
  Calendar,
  Receipt,
  Users,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Lock,
  Database,
  KeyRound,
  BadgePercent,
  Globe
} from 'lucide-react';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const TopBar = ({
  currentSection,
  tournaments,
  activeTournament,
  onSelectTournament,
  currentUser,
  onSwitchRole,
  onOpenMobileSidebar,
  onQuickAction,
  onOpenOrganizerLogin,
  onLogout,
  onOpenChangePassword,
  onOpenDatabaseModal,
  isDbConnected
}) => {
  const [editionDropdownOpen, setEditionDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const topBarRef = useRef(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target)) {
        setEditionDropdownOpen(false);
        setRoleDropdownOpen(false);
        setQuickActionOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEditionDropdownOpen(false);
        setRoleDropdownOpen(false);
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const sectionTitles = {
    dashboard: 'Dashboard',
    editions: 'Editions',
    teams_players: 'Teams & Squads',
    fixtures_results: 'Fixtures & Scores',
    standings: 'Points Table & NRR',
    auction: 'Live Auction',
    sponsorships: 'Sponsorships',
    expenses: 'Expense Ledger',
    food_preferences: 'Food & Dietary',
    rules_videos: 'Rules & Videos',
    registrations: 'Registrations',
    media_library: 'Media Library',
    import_history: 'Imports & CricHeroes',
    user_access: 'User Access RBAC',
    settings: 'Settings & APIs'
  };

  const sectionFullTitles = {
    dashboard: 'Tournament Overview',
    editions: 'Tournament Editions',
    teams_players: 'Teams & Player Squads',
    fixtures_results: 'Fixtures & Live Results',
    standings: 'Points Table & Net Run Rate',
    auction: 'Live Player Auction Management',
    sponsorships: 'Sponsorship Partnerships',
    expenses: 'Financial Ledger & Expenses',
    food_preferences: 'Player Food & Dietary Management',
    rules_videos: 'Rules, Policies & Demo Videos',
    registrations: 'Player Registration Queue',
    media_library: 'Tournament Media Library',
    import_history: 'Spreadsheet & CricHeroes Imports',
    user_access: 'Role-Based Access Control',
    settings: 'System & API Settings'
  };

  const roles = [
    { id: 'organizer', label: 'Organizer', desc: 'Warhawks full operational control across all modules' },
    { id: 'player', label: 'Public Visitor', desc: 'Browse tournament fixtures, points table, public sponsors & registration' }
  ];

  return (
    <header
      ref={topBarRef}
      className="h-16 bg-white border-b border-slate-200 px-2 sm:px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs w-full"
    >
      {/* Left Zone: Mobile Hamburger & Section Label */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Responsive Breadcrumb / Current View title */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-medium min-w-0">
          <span className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src={WARHAWKS_LOGO_URL}
              alt="Warhawks"
              className="w-7 h-7 sm:w-9 sm:h-9 object-contain rounded-md sm:rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs shrink-0"
            />
            <span className="font-bold text-slate-900 text-sm tracking-tight hidden md:inline shrink-0">
              Warhawks
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-sans hidden lg:inline shrink-0">
              Host
            </span>
          </span>
          <span className="text-slate-300 shrink-0 hidden md:inline">/</span>
          <span className="text-slate-900 font-bold sm:font-semibold truncate max-w-[75px] xs:max-w-[105px] sm:max-w-[160px] md:max-w-[220px]">
            <span className="sm:hidden">{sectionTitles[currentSection] || 'Admin'}</span>
            <span className="hidden sm:inline">{sectionFullTitles[currentSection] || 'Admin Console'}</span>
          </span>
        </div>
      </div>

      {/* Center Zone: Active Tournament Edition Switcher (Dynamically shrinkable) */}
      <div className="relative mx-1 sm:mx-2 min-w-0 flex-1 max-w-[110px] xs:max-w-[150px] sm:max-w-xs md:max-w-sm lg:max-w-md">
        <button
          onClick={() => {
            setEditionDropdownOpen(!editionDropdownOpen);
            setRoleDropdownOpen(false);
            setQuickActionOpen(false);
          }}
          className="w-full flex items-center justify-between gap-1 sm:gap-1.5 px-1.5 xs:px-2 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-semibold text-slate-800 cursor-pointer min-w-0 shadow-2xs"
          aria-label="Switch Tournament Edition"
          title="Switch active tournament edition"
        >
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate text-left flex-1 min-w-0">
              {activeTournament ? (
                <>
                  <span className="sm:hidden font-mono">Ed. {activeTournament.editionNumber}</span>
                  <span className="hidden sm:inline">Ed. {activeTournament.editionNumber}: {activeTournament.name}</span>
                </>
              ) : (tournaments.length > 0 ? 'Select' : 'None')}
            </span>
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-500 shrink-0 transition-transform duration-150 ${editionDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {editionDropdownOpen && (
          <div className="fixed inset-x-3 top-16 mt-1 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-72 sm:max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
              <span>Warhawks Tournaments</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Host</span>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {tournaments.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No tournaments available yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Create your first edition in Tournament Editions to begin.</p>
                </div>
              ) : (
                tournaments.map(t => {
                  const isSelected = t.id === activeTournament?.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTournament(t.id);
                        setEditionDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-400 shrink-0">Ed. {t.editionNumber}</span>
                          <span className="truncate">{t.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.year} · {t.city} · {t.status}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Zone: Quick Actions & Profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setQuickActionOpen(!quickActionOpen);
              setEditionDropdownOpen(false);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            aria-label="Quick Administrative Actions"
            title="Quick Action"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {quickActionOpen && (
            <div className="fixed inset-x-3 top-16 mt-1 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 max-w-sm sm:max-w-none bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                <span>{currentUser.role === 'organizer' ? 'Organizer Actions' : 'Public Visitor Quick Links'}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${currentUser.role === 'organizer' ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {currentUser.role === 'organizer' ? 'Host' : 'Public'}
                </span>
              </div>
              {currentUser.role === 'organizer' ? (
                <>
                  <button
                    onClick={() => {
                      onQuickAction('add_team');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Add Franchise Team</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('schedule_match');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Schedule Fixture</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('record_expense');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Record Expense</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('import_cricheroes');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Import CricHeroes CSV</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onQuickAction('register_tournament');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Register for Tournament</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('view_fixtures');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>View Fixtures & Scores</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('view_standings');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>View Points Table</span>
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction('view_sponsors');
                      setQuickActionOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <BadgePercent className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>View Sponsors & Partners</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* User Role & Auth Action Zone */}
        {currentUser.role === 'organizer' ? (
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setEditionDropdownOpen(false);
                setQuickActionOpen(false);
              }}
              className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 min-h-[38px] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Organizer Profile and Settings"
            >
              <img
                src={WARHAWKS_LOGO_URL}
                alt="Warhawks Organizer"
                className="w-8 h-8 rounded-full object-contain bg-white p-0.5 ring-2 ring-emerald-500/20 shrink-0 border border-slate-200"
              />
              <div className="hidden md:block text-left max-w-[130px]">
                <div className="text-xs font-semibold text-slate-800 leading-tight truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold capitalize truncate flex items-center gap-1">
                  <span>Organizer</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block shrink-0" />
            </button>

            {/* Direct Logout Button */}
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors cursor-pointer"
              title="Log Out of Organizer Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            {roleDropdownOpen && (
              <div className="fixed inset-x-3 top-16 mt-1 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 max-w-sm sm:max-w-none bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.mobile}</div>
                  <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-bold">
                    Authenticated Organizer Session
                  </div>
                </div>

                <div className="p-2 space-y-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      onOpenDatabaseModal?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Database Connection & Health</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      {isDbConnected ? 'Connected' : 'Local'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      onOpenChangePassword?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Change My Password</span>
                    </span>
                    <span className="text-[10px] text-amber-600 font-mono font-normal">Account Security</span>
                  </button>

                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>End Organizer Session (Log Out)</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Public Visitor Portal</span>
            </span>

            <button
              onClick={onOpenOrganizerLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Organizer Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
