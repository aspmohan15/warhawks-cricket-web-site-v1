import React from 'react';
import {
  Users,
  Trophy,
  Calendar,
  Receipt,
  Gavel,
  BadgePercent,
  UserPlus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { DEFAULT_ORGANIZER_NAME, ORGANIZER_DETAILS, WARHAWKS_LOGO_URL } from '../../constants';
import { AnnouncementsManager } from '../dashboard/AnnouncementsManager';

export const DashboardView = ({
  tournament,
  teams,
  players,
  matches,
  sponsors,
  expenses,
  auditLogs,
  registrations,
  announcements = [],
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onSwapAnnouncements,
  onNavigate,
  onQuickAction
}) => {
  const completedMatches = matches.filter(m => m.status === 'completed');
  const liveMatches = matches.filter(m => m.status === 'live');
  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSponsorSum = sponsors.reduce((sum, s) => sum + s.contributionAmount, 0);
  const soldPlayers = players.filter(p => p.auctionStatus === 'sold');
  const pendingRegistrations = registrations.filter(r => r.approvalStatus === 'pending');

  const statCards = [
    {
      label: 'Franchise Teams',
      value: teams.length,
      subtext: `${teams.reduce((acc, t) => acc + t.totalPlayersAssigned, 0)} squad slots filled`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => onNavigate('teams_players')
    },
    {
      label: 'Registered Players',
      value: players.length,
      subtext: `${soldPlayers.length} auctioned / retained`,
      icon: Trophy,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      onClick: () => onNavigate('teams_players')
    },
    {
      label: 'Fixtures & Results',
      value: matches.length,
      subtext: `${completedMatches.length} done · ${liveMatches.length} live`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      onClick: () => onNavigate('fixtures_results')
    },
    {
      label: 'Auction Status',
      value: `${soldPlayers.length}/${players.length}`,
      subtext: `${players.filter(p => p.auctionStatus === 'available').length} in active pool`,
      icon: Gavel,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      onClick: () => onNavigate('auction')
    },
    {
      label: 'Active Sponsors',
      value: sponsors.length,
      subtext: `₹${totalSponsorSum.toLocaleString()} committed`,
      icon: BadgePercent,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      onClick: () => onNavigate('sponsorships')
    },
    {
      label: 'Total Expenses',
      value: `₹${totalExpenseSum.toLocaleString()}`,
      subtext: `${expenses.length} ledger vouchers recorded`,
      icon: Receipt,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      onClick: () => onNavigate('expenses')
    },
    {
      label: 'Registration Queue',
      value: pendingRegistrations.length,
      subtext: tournament?.registrationOpen ? 'Window: OPEN' : 'Window Closed',
      icon: UserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      onClick: () => onNavigate('registrations')
    },
    {
      label: 'Operating Delta',
      value: `₹${(totalSponsorSum - totalExpenseSum).toLocaleString()}`,
      subtext: 'Sponsorships less expenses',
      icon: TrendingUp,
      color: totalSponsorSum >= totalExpenseSum ? 'text-emerald-600' : 'text-rose-600',
      bgColor: totalSponsorSum >= totalExpenseSum ? 'bg-emerald-50' : 'bg-rose-50',
      onClick: () => onNavigate('expenses')
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Tournament Headline Banner / Empty State */}
      {!tournament ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold mb-2.5 shadow-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                <span>{DEFAULT_ORGANIZER_NAME}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">No Tournaments Available Yet</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The tournament database is currently clean and empty. Create your first tournament edition to establish franchise rosters, schedule fixtures, and open athlete registrations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('editions')}
            className="px-5 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Trophy className="w-4 h-4" />
            <span>Create First Tournament Edition</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            {/* Official Organizer Identification Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold mb-2.5 shadow-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                <span>{DEFAULT_ORGANIZER_NAME}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
              <span>Edition {tournament?.editionNumber || 1}</span>
              <span>·</span>
              <span>{tournament?.year || 2026} Season</span>
              <span>·</span>
              <span className="font-mono">{tournament?.format || 'T20'}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug break-words">
              {tournament?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="text-slate-400">Organizer:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {tournament?.organizer || DEFAULT_ORGANIZER_NAME}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{tournament?.venue}, {tournament?.city}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{tournament?.startDate} to {tournament?.endDate}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    tournament?.status === 'current'
                      ? 'bg-emerald-500'
                      : tournament?.status === 'upcoming'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="capitalize">{tournament?.status}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
            <button
              onClick={() => onQuickAction('schedule_match')}
              className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer text-center"
            >
              Schedule Match
            </button>
            <button
              onClick={() => onQuickAction('record_expense')}
              className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Add Expense
            </button>
            <button
              onClick={() => onQuickAction('import_cricheroes')}
              className="w-full sm:w-auto min-h-[38px] px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Import CricHeroes
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.onClick}
              className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4.5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 line-clamp-1">{card.label}</span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight block">
                  {card.value}
                </span>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tournament Announcements Manager (To-Do list style for player ribbon) */}
      <AnnouncementsManager
        announcements={announcements}
        onCreateAnnouncement={onCreateAnnouncement}
        onUpdateAnnouncement={onUpdateAnnouncement}
        onDeleteAnnouncement={onDeleteAnnouncement}
        onSwapAnnouncements={onSwapAnnouncements}
        tournamentId={tournament?.id}
      />

      {/* Two Column Layout: Fixtures & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Upcoming Fixtures */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">Upcoming & Recent Fixtures</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Live scoring and match schedule</p>
            </div>
            <button
              onClick={() => onNavigate('fixtures_results')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Fixtures have not been created yet.
              </div>
            ) : (
              matches.slice(0, 4).map(match => {
                const teamA = teams.find(t => t.id === match.teamAId);
                const teamB = teams.find(t => t.id === match.teamBId);
                return (
                  <div key={match.id} className="p-3.5 sm:p-4 hover:bg-slate-50/50 transition-colors min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 gap-2">
                      <span className="font-semibold text-slate-700 truncate">Match #{match.matchNumber} · {match.round}</span>
                      <span className="flex items-center gap-1.5 font-medium shrink-0 text-[11px] sm:text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {match.date}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Teams block: flexible wrap for mobile */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                        {/* Team A */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                            style={{ backgroundColor: teamA?.primaryColor || '#0284c7' }}
                          />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{teamA?.shortCode || 'TMA'}</span>
                          <span className="text-xs text-slate-600 truncate max-w-[100px] xs:max-w-[120px]">{teamA?.name}</span>
                          {match.teamAScore && (
                            <span className="font-mono text-xs font-bold text-slate-900 ml-1">{match.teamAScore}</span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 font-bold shrink-0">vs</span>

                        {/* Team B */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                            style={{ backgroundColor: teamB?.primaryColor || '#dc2626' }}
                          />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{teamB?.shortCode || 'TMB'}</span>
                          <span className="text-xs text-slate-600 truncate max-w-[100px] xs:max-w-[120px]">{teamB?.name}</span>
                          {match.teamBScore && (
                            <span className="font-mono text-xs font-bold text-slate-900 ml-1">{match.teamBScore}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        {match.status === 'completed' ? (
                          <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {match.resultSummary || 'Completed'}
                          </span>
                        ) : match.status === 'live' ? (
                          <span className="inline-block text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded animate-pulse">
                            ● {match.resultSummary || 'Live Match'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {match.venue?.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Administrative Audit Feed */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">Recent Activity</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Audit log of system events</p>
            </div>
            <button
              onClick={() => onNavigate('import_history')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
            >
              Logs
            </button>
          </div>

          <div className="p-3.5 sm:p-4 space-y-3 max-h-[360px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent activity recorded yet.
              </div>
            ) : (
              auditLogs.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 leading-snug font-medium break-words">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <span className="font-semibold text-slate-600 truncate max-w-[120px]">{log.userName}</span>
                      <span>·</span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Expenses & Registration Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {/* Latest Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">Latest Tournament Expenses</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Recent disbursements</p>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {expenses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No expense vouchers recorded yet.
              </div>
            ) : (
              expenses.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs gap-2">
                  <div className="min-w-0 pr-1">
                    <div className="font-semibold text-slate-800 truncate">{e.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {e.category} · {e.vendorName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900">₹{e.amount.toLocaleString()}</div>
                    <span className="text-[10px] text-emerald-700 font-medium capitalize">{e.paymentStatus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registration Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">Player Registration Summary</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Applicant approvals & roster pipeline</p>
            </div>
            <button
              onClick={() => onNavigate('registrations')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3.5 text-center">
            <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-lg">
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-700 block">
                {registrations.filter(r => r.approvalStatus === 'approved').length}
              </span>
              <span className="block text-[10px] sm:text-[11px] font-medium text-emerald-800 mt-0.5 truncate">Approved</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50 rounded-lg">
              <span className="text-base sm:text-lg font-bold font-mono text-amber-700 block">
                {registrations.filter(r => r.approvalStatus === 'pending').length}
              </span>
              <span className="block text-[10px] sm:text-[11px] font-medium text-amber-800 mt-0.5 truncate">Pending</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-slate-100 rounded-lg">
              <span className="text-base sm:text-lg font-bold font-mono text-slate-700 block">
                {registrations.filter(r => r.approvalStatus === 'waitlisted').length}
              </span>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-700 mt-0.5 truncate">Waitlisted</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700 truncate">Portal Status</span>
            </div>
            <span className={`font-semibold px-2 py-0.5 rounded text-[11px] shrink-0 ${
              tournament?.registrationOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {tournament?.registrationOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      </div>

      {/* About Warhawks: Official Tournament Organizer Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-xl p-4 sm:p-6 text-white border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src={WARHAWKS_LOGO_URL}
              alt="Warhawks Official Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white p-1 shadow-lg shrink-0 border border-slate-700/80"
            />
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Tournament Host & Governing Branch
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                  Official Organizer
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                About Warhawks Tournament Operations
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Warhawks</strong> is the official tournament organizer and hosting branch responsible for creating, scheduling, and orchestrating championships, auctions, and competitive tournaments on this platform. Participating franchise teams (such as Apex Titans, Royal Strikers, and Coastal Blasters) and athletes compete under rules and schedules sanctioned by Warhawks.
              </p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Organizer Contact</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">{ORGANIZER_DETAILS.contactEmail}</span>
            </div>
            <button
              onClick={() => onNavigate('editions')}
              className="px-3.5 py-1.5 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Manage Editions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
