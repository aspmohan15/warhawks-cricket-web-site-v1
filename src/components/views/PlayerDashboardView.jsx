import React, { useState, useEffect } from 'react';
import {
  Trophy,
  User,
  Calendar,
  ListOrdered,
  Users,
  Gavel,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Utensils,
  MapPin,
  QrCode,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  Shirt
} from 'lucide-react';
import { WARHAWKS_LOGO_URL } from '../../constants';
import { formatTournamentDateRange, formatOptionBDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/phone';

export const PlayerDashboardView = ({
  tournament,
  teams = [],
  players = [],
  matches = [],
  standings = [],
  registrations = [],
  announcements = [],
  currentUser,
  onNavigate
}) => {
  // Player identity: resolved from currentUser or stored registration email
  const activeEmail = (
    currentUser?.email ||
    (typeof window !== 'undefined' ? localStorage.getItem('warhawks_player_email') : '') ||
    ''
  ).trim().toLowerCase();

  // Find player's active registration for this tournament
  // Exclude rejected registrations from being considered as active player registrations
  const playerRegistration = (registrations || []).find(r => {
    if (r.tournamentId !== tournament?.id) return false;
    if (r.approvalStatus === 'rejected') return false;
    const target = activeEmail.trim().toLowerCase();
    if (!target) return false;
    return (
      (r.email && r.email.toLowerCase() === target) ||
      (r.phone && r.phone.replace(/[\s\-()]/g, '').includes(target.replace(/[\s\-()]/g, '')))
    );
  });

  // Check if player also has a rejected record to display appropriate guidance if searched
  const rejectedRegistration = !playerRegistration && (registrations || []).find(r => {
    if (r.tournamentId !== tournament?.id) return false;
    if (r.approvalStatus !== 'rejected') return false;
    const target = activeEmail.trim().toLowerCase();
    if (!target) return false;
    return (
      (r.email && r.email.toLowerCase() === target) ||
      (r.phone && r.phone.replace(/[\s\-()]/g, '').includes(target.replace(/[\s\-()]/g, '')))
    );
  });

  // Find corresponding player in the active tournament player pool / roster
  const playerProfile = (players || []).find(p => {
    if (p.tournamentId !== tournament?.id) return false;
    if (p.registrationStatus === 'rejected') return false;
    const target = activeEmail.trim().toLowerCase();
    if (!target) return false;
    return (
      (p.email && p.email.toLowerCase() === target) ||
      (playerRegistration && p.id === playerRegistration.id) ||
      (playerRegistration?.fullName && p.name && p.name.toLowerCase() === playerRegistration.fullName.toLowerCase())
    );
  });

  // Find player's assigned team if any
  const myTeam = playerProfile?.teamId
    ? teams.find(t => t.id === playerProfile.teamId)
    : null;

  // Next match for player's team (or next general upcoming tournament match)
  const upcomingMatches = (matches || [])
    .filter(m => m.status === 'scheduled' || m.status === 'live')
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const myTeamUpcomingMatch = myTeam
    ? upcomingMatches.find(m => m.teamAId === myTeam.id || m.teamBId === myTeam.id)
    : null;

  const nextTournamentMatch = myTeamUpcomingMatch || upcomingMatches[0] || null;

  // Active public announcements
  const activeAnnouncements = (announcements || []).filter(
    a => a.isActive !== false && a.is_active !== false
  );

  // Standings preview (Top 4 teams)
  const topStandings = (standings || []).slice(0, 4);

  const getTeamName = (teamId) => {
    const t = teams.find(item => item.id === teamId);
    return t ? t.name : 'TBD';
  };

  const getTeamColor = (teamId) => {
    const t = teams.find(item => item.id === teamId);
    return t?.primaryColor || '#059669';
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Warhawks Tournament Command</span>
            <span>·</span>
            <span>Player Portal</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Player Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {playerRegistration
              ? `Welcome back, ${playerRegistration.fullName}! Official player profile, squad allocation, and match schedules for ${tournament?.name || 'Tournament'}.`
              : `Official player overview for ${tournament?.name || 'Tournament'} · Review your tournament status, squad rosters, upcoming matches, and live standings.`}
          </p>
        </div>
      </div>

      {/* 2. REJECTED REGISTRATION NOTICE (if applicable) */}
      {rejectedRegistration && !playerRegistration && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-900">Application Status: Not Accepted</h4>
            <p className="text-xs text-rose-700">
              The registration submitted under <span className="font-semibold">{activeEmail}</span> was rejected during tournament review. 
              Its entries have been excluded from squads, auction, and catering. If you believe this was an error, please contact Warhawks Tournament Operations.
            </p>
          </div>
        </div>
      )}

      {/* 3. ACTIVE REGISTRATION & PLAYER STATUS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Application / Squad Card */}
        <div className="lg:col-span-2 space-y-6">
          {playerRegistration ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0">
                    {playerRegistration.preferredJerseyNo ? `#${playerRegistration.preferredJerseyNo}` : playerRegistration.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{playerRegistration.fullName}</h2>
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Ref #{playerRegistration.id.slice(-6)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{playerRegistration.primaryRole}</span>
                      <span>•</span>
                      <span>{playerRegistration.city}</span>
                      <span>•</span>
                      <span className="font-mono">{formatPhoneNumber(playerRegistration.phone)}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      playerRegistration.approvalStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : playerRegistration.approvalStatus === 'waitlisted'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {playerRegistration.approvalStatus === 'approved' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span className="capitalize">
                      {playerRegistration.approvalStatus === 'approved' ? 'Roster Approved' : `Status: ${playerRegistration.approvalStatus}`}
                    </span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      playerRegistration.paymentStatus === 'paid' || playerRegistration.paymentStatus === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : playerRegistration.paymentStatus === 'submitted'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    Fee: {playerRegistration.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Player Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Primary Role</span>
                  <span className="font-bold text-slate-800 block mt-1 text-sm">{playerRegistration.primaryRole}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Batting Style</span>
                  <span className="font-bold text-slate-800 block mt-1">{playerRegistration.battingStyle}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bowling Style</span>
                  <span className="font-bold text-slate-800 block mt-1">{playerRegistration.bowlingStyle}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jersey & Kit</span>
                  <span className="font-bold text-slate-800 block mt-1 font-mono">
                    #{playerRegistration.preferredJerseyNo} (Size {playerRegistration.shirtSize})
                  </span>
                </div>
              </div>

              {/* Dietary & Hospitality Summary */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 flex items-center gap-2">
                      <span>Catering Requisition</span>
                      <span className="text-[10px] font-semibold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-sans">
                        {playerRegistration.foodPreference} Diet
                      </span>
                    </div>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      {[playerRegistration.hasBreakfast ? 'Breakfast' : null, playerRegistration.hasLunch ? 'Lunch' : null].filter(Boolean).join(' & ') || 'No meals requested'}
                      {playerRegistration.guestCount > 0 && ` · ${playerRegistration.guestCount} Guest(s)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('registrations')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Manage Registration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Franchise Assignment Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-inner shrink-0"
                    style={{ backgroundColor: myTeam?.primaryColor || '#059669' }}
                  >
                    {myTeam ? myTeam.shortCode || myTeam.name.substring(0, 2).toUpperCase() : 'AUC'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Franchise Squad Assignment
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {myTeam ? myTeam.name : 'In Player Auction Pool'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {myTeam
                        ? `Captain: ${myTeam.captainPlayerId ? 'Assigned' : 'Warhawks Captain'} · City: ${myTeam.city || tournament?.city || 'Bengaluru'}`
                        : 'Awaiting team draft in the upcoming player auction.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(myTeam ? 'teams_players' : 'auction')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>{myTeam ? 'View Team Roster' : 'Go to Auction Room'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Unregistered State: Welcoming Invitation */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="max-w-xl space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Registration Open for Athletes</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Ready to compete in {tournament?.name || 'Warhawks Cricket'}?
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Join premier athletes across Bengaluru. Complete your player registration to secure your spot in the franchise auction and receive your official kit.
                </p>
              </div>

              {/* 3 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-2">Submit Profile</h4>
                  <p className="text-[11px] text-slate-500">Enter your playing role, batting/bowling style & jersey size.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-2">UPI Payment</h4>
                  <p className="text-[11px] text-slate-500">Pay official registration fee (₹{tournament?.registrationFee || 1500}) via UPI QR.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-2">Franchise Draft</h4>
                  <p className="text-[11px] text-slate-500">Get drafted by franchise owners in the live player auction.</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('registrations')}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Register for Tournament Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('rules_videos')}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpenCheck className="w-4 h-4 text-slate-500" />
                  <span>Read Tournament Rules</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. UPCOMING FIXTURES / MATCH CENTER PREVIEW */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Tournament Match Schedule</span>
                </h3>
                <p className="text-xs text-slate-500">Upcoming fixtures & live match updates</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('fixtures_results')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs">
                No scheduled matches pending. Check completed match results in the Fixtures Center.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.slice(0, 3).map((match, idx) => {
                  const isMyMatch = myTeam && (match.teamAId === myTeam.id || match.teamBId === myTeam.id);
                  return (
                    <div
                      key={match.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isMyMatch
                          ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2.5">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          {isMyMatch && (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              My Team
                            </span>
                          )}
                          <span>Match #{match.matchNumber || idx + 1} · {match.round || 'League Stage'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{match.venue || tournament?.venue || 'BK Cricket Ground'}</span>
                        </span>
                      </div>

                      {/* Teams vs row */}
                      <div className="flex items-center justify-between gap-3 py-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: getTeamColor(match.teamAId) }}
                          />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {getTeamName(match.teamAId)}
                          </span>
                        </div>

                        <div className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          VS
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {getTeamName(match.teamBId)}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: getTeamColor(match.teamBId) }}
                          />
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">
                          {match.date ? formatOptionBDate(match.date) : 'TBD'} {match.time ? `· ${match.time}` : ''}
                        </span>
                        <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                          match.status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {match.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links, Tournament Specs & Standings Snapshot */}
        <div className="space-y-6">
          {/* Tournament Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Edition Overview</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tournament</span>
                <span className="font-bold text-slate-900 truncate max-w-[170px]">{tournament?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Edition / Year</span>
                <span className="font-bold text-slate-900">Ed. {tournament?.editionNumber || '1'} · {tournament?.year || '2026'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Match Format</span>
                <span className="font-bold text-slate-900">{tournament?.format || '8 Overs'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Ground Venue</span>
                <span className="font-bold text-slate-900">{tournament?.venue || 'BK Ground'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Registration Fee</span>
                <span className="font-mono font-bold text-emerald-700">₹{tournament?.registrationFee || 1500}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Organizer</span>
                <span className="font-semibold text-slate-800">Warhawks</span>
              </div>
            </div>
          </div>

          {/* Points Table Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                <span>Points Table Top 4</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('standings')}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            {topStandings.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                Points table will update once league matches commence.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {topStandings.map((item, index) => (
                  <div key={item.id || item.teamId || index} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-bold text-slate-400 text-[11px]">#{index + 1}</span>
                      <span className="font-semibold text-slate-800 truncate">{item.teamName || getTeamName(item.teamId)}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono shrink-0">
                      <span className="text-slate-500 text-[11px]">{item.matchesPlayed || 0}P</span>
                      <span className="font-bold text-emerald-700 text-xs">{item.points || 0} Pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Player Action Links */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
              Player Navigation
            </span>

            <button
              type="button"
              onClick={() => onNavigate('registrations')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-emerald-600" />
                <span>My Registration & Payment</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('fixtures_results')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Fixtures, Scores & Results</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('standings')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                <span>Points Table & NRR</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('teams_players')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Franchise Rosters & Squads</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('auction')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Gavel className="w-4 h-4 text-emerald-600" />
                <span>Live Auction Viewer</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('rules_videos')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-left text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                <span>Official Rules & Demo Videos</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. PUBLISHED TOURNAMENT ANNOUNCEMENTS FEED (if any) */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Tournament Notice Board & Bulletins</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 text-xs text-slate-800 flex items-start gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="leading-relaxed font-medium">{ann.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
