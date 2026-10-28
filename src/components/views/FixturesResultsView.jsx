import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Trophy,
  Edit,
  Trash2,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Radio,
  Tv,
  BarChart3
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WARHAWKS_LOGO_URL } from '../../constants';
import { formatOptionBDate } from '../../utils/date';
import { getOrganizerSession } from '../../services/auth';

const DEFAULT_CRICHEROES_URL = 'https://cricheroes.com/tournament/1999506/warhawk-tournament-s04/matches/live-matches';

const getCricHeroesLinks = (url, fallbackTournamentName = '') => {
  const defaultBase = 'https://cricheroes.com/tournament/1999506/warhawk-tournament-s04';
  const cleanUrl = String(url || '').trim();
  try {
    const match = cleanUrl.match(/cricheroes\.com\/tournament\/([0-9]+)\/([^\/?#]+)/i);
    if (match) {
      const tourId = match[1];
      const tourSlug = match[2];
      const base = `https://cricheroes.com/tournament/${tourId}/${tourSlug}`;
      const humanSlug = tourSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        tournamentId: tourId,
        tournamentSlug: tourSlug,
        displayName: fallbackTournamentName || humanSlug,
        base,
        live: `${base}/matches/live-matches`,
        upcoming: `${base}/matches/upcoming-matches`,
        past: `${base}/matches/past-matches`,
        pointsTable: `${base}/point-table`,
        leaderboard: `${base}/leaderboard`
      };
    }
  } catch {}
  return {
    tournamentId: '1999506',
    tournamentSlug: 'warhawk-tournament-s04',
    displayName: fallbackTournamentName || 'Warhawks Tournament',
    base: cleanUrl || defaultBase,
    live: cleanUrl ? (cleanUrl.includes('/matches/') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/matches/live-matches`) : `${defaultBase}/matches/live-matches`,
    upcoming: cleanUrl ? (cleanUrl.includes('/matches/') ? cleanUrl.replace(/live-matches|past-matches/, 'upcoming-matches') : `${cleanUrl.replace(/\/$/, '')}/matches/upcoming-matches`) : `${defaultBase}/matches/upcoming-matches`,
    past: cleanUrl ? (cleanUrl.includes('/matches/') ? cleanUrl.replace(/live-matches|upcoming-matches/, 'past-matches') : `${cleanUrl.replace(/\/$/, '')}/matches/past-matches`) : `${defaultBase}/matches/past-matches`,
    pointsTable: cleanUrl ? `${cleanUrl.split('/matches/')[0].replace(/\/$/, '')}/point-table` : `${defaultBase}/point-table`,
    leaderboard: cleanUrl ? `${cleanUrl.split('/matches/')[0].replace(/\/$/, '')}/leaderboard` : `${defaultBase}/leaderboard`
  };
};

export const FixturesResultsView = ({
  tournament,
  matches,
  teams,
  players,
  currentUser,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
  onNavigateToEditions,
  onUpdateTournament
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [filterStatus, setFilterStatus] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scoringMatch, setScoringMatch] = useState(null);

  // Dynamic CricHeroes Live URL State: prioritize database tournament setting, with browser fallback
  const resolveCricHeroesUrl = (t) => {
    return (
      t?.cricheroesUrl ||
      t?.cricheroes_url ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(`warhawks_cricheroes_url_${t?.id}`) || localStorage.getItem('warhawks_cricheroes_url')
        : '') ||
      DEFAULT_CRICHEROES_URL
    );
  };

  const [liveUrl, setLiveUrl] = useState(() => resolveCricHeroesUrl(tournament));
  const [configUrlModalOpen, setConfigUrlModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(() => resolveCricHeroesUrl(tournament));
  const cricLinks = useMemo(
    () => getCricHeroesLinks(liveUrl, tournament?.name),
    [liveUrl, tournament?.name]
  );
  const [activeTab, setActiveTab] = useState('all');

  // Synchronize when tournament or tournament.cricheroesUrl updates from server/database
  useEffect(() => {
    const url = resolveCricHeroesUrl(tournament);
    setLiveUrl(url);
    setTempUrl(url);
  }, [tournament?.id, tournament?.cricheroesUrl, tournament?.cricheroes_url]);

  const handleSaveLiveUrl = async (e) => {
    e.preventDefault();
    const clean = tempUrl.trim() || DEFAULT_CRICHEROES_URL;
    setLiveUrl(clean);
    try {
      localStorage.setItem(`warhawks_cricheroes_url_${tournament?.id}`, clean);
      localStorage.setItem('warhawks_cricheroes_url', clean);
    } catch {}

    // Persist to tournament database so that players across all sessions receive the updated live URL immediately
    if (tournament?.id) {
      if (onUpdateTournament) {
        onUpdateTournament(tournament.id, { cricheroesUrl: clean, cricheroes_url: clean });
      }
      try {
        const session = getOrganizerSession();
        await fetch(`/api/tournaments/${tournament.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.token || ''}`
          },
          body: JSON.stringify({ cricheroesUrl: clean, cricheroes_url: clean })
        });
      } catch (err) {
        console.warn('API save cricheroesUrl notification:', err);
      }
    }
    setConfigUrlModalOpen(false);
  };

  // New Match Form State
  const [matchForm, setMatchForm] = useState({
    matchNumber: matches.length + 1,
    round: 'Group Stage',
    teamAId: teams[0]?.id || '',
    teamBId: teams[1]?.id || '',
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    venue: tournament?.venue || 'Stadium Ground',
    status: 'scheduled'
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.id) {
      setCreateModalOpen(false);
      onNavigateToEditions?.();
      return;
    }
    if (!matchForm.teamAId || !matchForm.teamBId) {
      alert('Please select both Team A and Team B from the registered tournament teams.');
      return;
    }
    if (matchForm.teamAId === matchForm.teamBId) {
      alert('Team A and Team B cannot be the same franchise. Please select two distinct registered teams.');
      return;
    }
    const rawMatchNum = String(matchForm.matchNumber ?? '').trim();
    if (rawMatchNum === '' || isNaN(Number(rawMatchNum)) || Number(rawMatchNum) < 1) {
      alert('Please enter a valid match number (1 or greater).');
      return;
    }
    onCreateMatch({
      tournamentId: tournament?.id || '',
      matchNumber: Number(rawMatchNum),
      round: matchForm.round || 'Group Stage',
      teamAId: matchForm.teamAId,
      teamBId: matchForm.teamBId,
      date: matchForm.date,
      time: matchForm.time,
      venue: matchForm.venue,
      status: matchForm.status || 'scheduled',
      isImported: false,
      importSource: 'manual'
    });
    setCreateModalOpen(false);
  };

  const handleScorecardSubmit = (e) => {
    e.preventDefault();
    if (!scoringMatch) return;
    if (isOrganizer && scoringMatch.teamAId && scoringMatch.teamBId && scoringMatch.teamAId === scoringMatch.teamBId) {
      alert('Team A and Team B cannot be the same franchise. Please select two distinct registered teams.');
      return;
    }
    const rawAOvers = String(scoringMatch.teamAOvers ?? '').trim();
    const rawBOvers = String(scoringMatch.teamBOvers ?? '').trim();
    if (rawAOvers !== '' && (isNaN(Number(rawAOvers)) || Number(rawAOvers) < 0 || Number(rawAOvers) > 100)) {
      alert('Team A overs faced must be a valid number between 0 and 100.');
      return;
    }
    if (rawBOvers !== '' && (isNaN(Number(rawBOvers)) || Number(rawBOvers) < 0 || Number(rawBOvers) > 100)) {
      alert('Team B overs faced must be a valid number between 0 and 100.');
      return;
    }
    const cleanMatch = {
      ...scoringMatch,
      teamAId: scoringMatch.teamAId,
      teamBId: scoringMatch.teamBId,
      round: scoringMatch.round || 'Group Stage',
      date: scoringMatch.date,
      time: scoringMatch.time,
      venue: scoringMatch.venue,
      teamAOvers: rawAOvers === '' ? undefined : parseFloat(rawAOvers),
      teamBOvers: rawBOvers === '' ? undefined : parseFloat(rawBOvers)
    };
    onUpdateMatch(scoringMatch.id, cleanMatch);
    setScoringMatch(null);
  };

  const filteredMatches = matches.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          📅
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Match fixtures and live scorecards belong to a specific tournament edition. Create your first edition in the <strong>Tournament Editions</strong> module to schedule matches and record scorecards.
        </p>
        {isOrganizer && (
          <button
            type="button"
            onClick={onNavigateToEditions}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Create Tournament Edition
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Sanctioned & Managed by Warhawks</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Fixtures, Live Scores & Results</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official match fixtures, real-time CricHeroes match results, and verified outcomes for {tournament?.name} (Organized by Warhawks).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOrganizer ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setTempUrl(liveUrl);
                  setConfigUrlModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-600" />
                <span>Configure Live Feed</span>
              </button>
              <button
                onClick={() => {
                  if (teams.length < 2) {
                    alert('At least 2 registered teams are required in this tournament edition before scheduling matches. Please register teams in the Teams & Squads tab first.');
                    return;
                  }
                  const maxNum = matches.reduce((max, m) => Math.max(max, Number(m.matchNumber) || 0), 0);
                  const defaultTeamA = teams[0]?.id || '';
                  const defaultTeamB = (teams[1]?.id && teams[1]?.id !== defaultTeamA)
                    ? teams[1]?.id
                    : (teams.find(t => t.id !== defaultTeamA)?.id || '');
                  setMatchForm({
                    matchNumber: maxNum + 1,
                    round: 'Group Stage',
                    teamAId: defaultTeamA,
                    teamBId: defaultTeamB,
                    date: new Date().toISOString().split('T')[0],
                    time: '19:30',
                    venue: tournament?.venue || 'Stadium Ground',
                    status: 'scheduled'
                  });
                  setCreateModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Match</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live CricHeroes Match Center</span>
              </span>
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Official CricHeroes Tournament Match Center */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Match Center Header Bar */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>CricHeroes Live Match Center</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                {liveUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
            {isOrganizer && (
              <button
                type="button"
                onClick={() => {
                  setTempUrl(liveUrl);
                  setConfigUrlModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Configure CricHeroes tournament URL"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span>Configure URL</span>
              </button>
            )}

            <a
              href={liveUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
            >
              <span>Open in CricHeroes</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Match Center Body */}
        <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 bg-gradient-to-b from-slate-50/70 to-white">
          {/* Featured Match Center Hero Banner */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-4 sm:p-6 lg:p-7 border border-slate-800 shadow-sm">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
              <div className="space-y-1.5 sm:space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Official Tournament Portal
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID #{cricLinks.tournamentId}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-white">
                  {tournament?.name || cricLinks.displayName || 'Tournament'} — Match Center
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Real-time ball-by-ball updates, wagon wheels, over summaries, and official tournament scorecards powered by CricHeroes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 shrink-0">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
                  <span>Launch Live Matches ↗</span>
                </a>
                <a
                  href={cricLinks.base}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-colors"
                >
                  <span>Tournament Overview</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Access Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Live Matches */}
            <a
              href={cricLinks.live}
              target="_blank"
              rel="noopener"
              className="group p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 hover:border-rose-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 sm:p-2.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                    LIVE
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                  Live Matches & Scores
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Real-time ball-by-ball scoring, current run rate, commentary & live match scorecards.
                </p>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-rose-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Open Live Feed</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Card 2: Upcoming Fixtures */}
            <a
              href={cricLinks.upcoming}
              target="_blank"
              rel="noopener"
              className="group p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 sm:p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    SCHEDULE
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Upcoming Fixtures
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Match schedule, ground allocations, dates, and tournament match timings.
                </p>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Schedule</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Card 3: Past Matches & Results */}
            <a
              href={cricLinks.past}
              target="_blank"
              rel="noopener"
              className="group p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 sm:p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                    RESULTS
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  Match Results & Recaps
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Completed match scorecards, Player of the Match awards & comprehensive summaries.
                </p>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Results</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Card 4: Points Table & Stats */}
            <a
              href={cricLinks.pointsTable}
              target="_blank"
              rel="noopener"
              className="group p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 sm:p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                    STANDINGS
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Points Table & Stats
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Group standings, Net Run Rate (NRR), top run scorers & leading wicket takers.
                </p>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Standings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Status Segment Filter */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
        <span className="text-slate-500 font-medium mr-1 text-[11px] sm:text-xs">Filter Fixtures:</span>
        {[
          { id: 'all', label: `All (${matches.length})` },
          { id: 'live', label: `Live (${matches.filter(m => m.status === 'live').length})` },
          { id: 'scheduled', label: `Scheduled (${matches.filter(m => m.status === 'scheduled').length})` },
          { id: 'completed', label: `Completed (${matches.filter(m => m.status === 'completed').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-lg transition-colors font-semibold cursor-pointer text-xs ${
              filterStatus === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-200 p-8 sm:p-12 text-center text-xs text-slate-500">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">
              {matches.length === 0 ? 'Fixtures have not been created yet.' : 'No matches found for the selected filter.'}
            </p>
            {matches.length === 0 && (
              <p className="text-slate-400 mt-1">Schedule group stage matches or import verified fixtures from CricHeroes.</p>
            )}
          </div>
        ) : (
          filteredMatches.map(match => {
            const teamA = teams.find(t => t.id === match.teamAId);
            const teamB = teams.find(t => t.id === match.teamBId);
            const motm = players.find(p => p.id === match.manOfTheMatchPlayerId);

            return (
              <div
                key={match.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-3 sm:p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="font-bold text-slate-800 shrink-0">Match #{match.matchNumber}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-medium truncate">{match.round}</span>
                    {match.isImported && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.2 rounded font-mono shrink-0">
                        CricHeroes
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOrganizer && match.status === 'scheduled' && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200 hidden xs:inline-block">
                        Teams Editable
                      </span>
                    )}

                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                        match.status === 'live'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : match.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {match.status}
                    </span>

                    {isOrganizer && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setScoringMatch({ ...match })}
                          className="min-w-[32px] min-h-[32px] p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                          title={match.status === 'scheduled' ? "Edit competing teams & fixture" : "Update match scorecard & teams"}
                          aria-label={match.status === 'scheduled' ? "Edit competing teams" : "Edit match scorecard"}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Match #${match.matchNumber}?`)) {
                              onDeleteMatch(match.id);
                            }
                          }}
                          className="min-w-[32px] min-h-[32px] p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
                          title="Delete fixture"
                          aria-label="Delete match"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Area */}
                <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                  {/* Team A */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: teamA?.primaryColor || '#0284c7' }}
                      />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[200px]">
                        {teamA?.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">({teamA?.shortCode})</span>
                    </div>
                    <div className="font-mono text-right shrink-0">
                      <span className="text-sm sm:text-base font-bold text-slate-900">{match.teamAScore || '—'}</span>
                      {match.teamAOvers !== undefined && (
                        <span className="text-[11px] sm:text-xs text-slate-400 ml-1">({match.teamAOvers} ov)</span>
                      )}
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: teamB?.primaryColor || '#dc2626' }}
                      />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[200px]">
                        {teamB?.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">({teamB?.shortCode})</span>
                    </div>
                    <div className="font-mono text-right shrink-0">
                      <span className="text-sm sm:text-base font-bold text-slate-900">{match.teamBScore || '—'}</span>
                      {match.teamBOvers !== undefined && (
                        <span className="text-[11px] sm:text-xs text-slate-400 ml-1">({match.teamBOvers} ov)</span>
                      )}
                    </div>
                  </div>

                  {/* Result banner */}
                  {match.resultSummary && (
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-900 flex flex-wrap items-center justify-between gap-1">
                      <span>{match.resultSummary}</span>
                      {motm && (
                        <span className="text-[11px] text-emerald-700 font-normal">
                          PoM: {motm.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatOptionBDate(match.date)} · {match.time}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{match.venue?.split(',')[0]}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => setScoringMatch({ ...match })}
                    className={`font-semibold hover:underline cursor-pointer ml-auto ${
                      isOrganizer ? 'text-emerald-700' : 'text-blue-700'
                    }`}
                  >
                    {isOrganizer
                      ? (match.status === 'scheduled' ? 'Edit Teams & Fixture →' : 'Edit Scorecard & Teams →')
                      : 'View Full Scorecard →'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Match Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Schedule New Fixture"
        subtitle={`Schedule match in ${tournament?.name}`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Match Number</label>
              <input
                type="number"
                required
                min={1}
                value={matchForm.matchNumber ?? ''}
                onChange={e => setMatchForm({ ...matchForm, matchNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tournament Stage / Round</label>
              <select
                value={matchForm.round}
                onChange={e => setMatchForm({ ...matchForm, round: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Group Stage">Group Stage</option>
                <option value="Quarter Final">Quarter Final</option>
                <option value="Semi Final 1">Semi Final 1</option>
                <option value="Semi Final 2">Semi Final 2</option>
                <option value="Grand Final">Grand Final</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: teams.find(t => t.id === matchForm.teamAId)?.primaryColor || '#0284c7' }}
                />
                <span>Team A (Home)</span>
              </label>
              <select
                required
                value={matchForm.teamAId}
                onChange={e => setMatchForm({ ...matchForm, teamAId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">Select Team A...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: teams.find(t => t.id === matchForm.teamBId)?.primaryColor || '#dc2626' }}
                />
                <span>Team B (Away)</span>
              </label>
              <select
                required
                value={matchForm.teamBId}
                onChange={e => setMatchForm({ ...matchForm, teamBId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">Select Team B...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortCode})
                  </option>
                ))}
              </select>
            </div>
            {matchForm.teamAId && matchForm.teamBId && matchForm.teamAId === matchForm.teamBId && (
              <div className="col-span-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Team A and Team B cannot be the same franchise. Please choose two distinct teams.</span>
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={matchForm.date}
                onChange={e => setMatchForm({ ...matchForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={matchForm.time}
                onChange={e => setMatchForm({ ...matchForm, time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Ground & Pitch Venue</label>
              <input
                type="text"
                required
                value={matchForm.venue}
                onChange={e => setMatchForm({ ...matchForm, venue: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Schedule Fixture
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Scorecard & Match Edit Modal */}
      {scoringMatch && (
        <Modal
          isOpen={true}
          onClose={() => setScoringMatch(null)}
          title={isOrganizer ? (scoringMatch.status === 'scheduled' ? `Edit Scheduled Fixture: Match #${scoringMatch.matchNumber}` : `Scorecard & Match #${scoringMatch.matchNumber}`) : `Scorecard: Match #${scoringMatch.matchNumber}`}
          subtitle={`${teams.find(t => t.id === scoringMatch.teamAId)?.name || 'Team A'} vs ${teams.find(t => t.id === scoringMatch.teamBId)?.name || 'Team B'}`}
          maxWidth="xl"
        >
          {!isOrganizer && (
            <div className="p-3 mb-3 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs flex items-center justify-between">
              <span className="font-semibold">🏏 Official Match Scorecard · Verified by Warhawks Operations</span>
              <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold">Read-Only</span>
            </div>
          )}
          <form onSubmit={handleScorecardSubmit} className="space-y-4 text-xs">
            {/* Organizer: Editable Competing Teams from Registered Teams */}
            {isOrganizer ? (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-slate-50 to-blue-50/80 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Competing Teams (Select Registered Franchise)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Change Team A or Team B between any registered teams for this scheduled match.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    Organizer Editable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Team A Dropdown */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-xs">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: teams.find(t => t.id === scoringMatch.teamAId)?.primaryColor || '#0284c7' }}
                        />
                        <span>Team A (Home Franchise)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {teams.find(t => t.id === scoringMatch.teamAId)?.shortCode || ''}
                      </span>
                    </label>
                    <select
                      value={scoringMatch.teamAId}
                      onChange={e => {
                        const newId = e.target.value;
                        setScoringMatch(prev => ({
                          ...prev,
                          teamAId: newId,
                          winnerId: prev.winnerId === prev.teamAId ? newId : (prev.winnerId === prev.teamBId ? prev.winnerId : undefined)
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.shortCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team B Dropdown */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-xs">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: teams.find(t => t.id === scoringMatch.teamBId)?.primaryColor || '#dc2626' }}
                        />
                        <span>Team B (Away Franchise)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {teams.find(t => t.id === scoringMatch.teamBId)?.shortCode || ''}
                      </span>
                    </label>
                    <select
                      value={scoringMatch.teamBId}
                      onChange={e => {
                        const newId = e.target.value;
                        setScoringMatch(prev => ({
                          ...prev,
                          teamBId: newId,
                          winnerId: prev.winnerId === prev.teamBId ? newId : (prev.winnerId === prev.teamAId ? prev.winnerId : undefined)
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.shortCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {scoringMatch.teamAId === scoringMatch.teamBId && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Team A and Team B cannot be the same franchise. Please select two distinct registered teams.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: teams.find(t => t.id === scoringMatch.teamAId)?.primaryColor || '#0284c7' }}
                  />
                  <span className="font-bold text-slate-800">
                    {teams.find(t => t.id === scoringMatch.teamAId)?.name}
                  </span>
                </div>
                <span className="font-bold text-slate-400">VS</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    {teams.find(t => t.id === scoringMatch.teamBId)?.name}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: teams.find(t => t.id === scoringMatch.teamBId)?.primaryColor || '#dc2626' }}
                  />
                </div>
              </div>
            )}

            {/* Organizer: Schedule & Venue Details */}
            {isOrganizer && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Schedule & Venue Details</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Round / Stage</label>
                    <select
                      value={scoringMatch.round || 'Group Stage'}
                      onChange={e => setScoringMatch({ ...scoringMatch, round: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Group Stage">Group Stage</option>
                      <option value="Quarter Final">Quarter Final</option>
                      <option value="Semi Final 1">Semi Final 1</option>
                      <option value="Semi Final 2">Semi Final 2</option>
                      <option value="Grand Final">Grand Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Match Date</label>
                    <input
                      type="date"
                      value={scoringMatch.date ? (String(scoringMatch.date).includes('T') ? String(scoringMatch.date).split('T')[0] : scoringMatch.date) : ''}
                      onChange={e => setScoringMatch({ ...scoringMatch, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Match Time</label>
                    <input
                      type="time"
                      value={scoringMatch.time || ''}
                      onChange={e => setScoringMatch({ ...scoringMatch, time: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Ground Venue</label>
                    <input
                      type="text"
                      value={scoringMatch.venue || ''}
                      onChange={e => setScoringMatch({ ...scoringMatch, venue: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <fieldset disabled={!isOrganizer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Match Status</label>
                  <select
                    value={scoringMatch.status}
                    onChange={e => setScoringMatch({ ...scoringMatch, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live In Progress</option>
                    <option value="completed">Completed (Final Result)</option>
                    <option value="abandoned">Abandoned / Washout</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Winning Team</label>
                  <select
                    value={scoringMatch.winnerId || ''}
                    onChange={e => setScoringMatch({ ...scoringMatch, winnerId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="">No Winner / Ongoing</option>
                    <option value={scoringMatch.teamAId}>{teams.find(t => t.id === scoringMatch.teamAId)?.name || 'Team A'}</option>
                    <option value={scoringMatch.teamBId}>{teams.find(t => t.id === scoringMatch.teamBId)?.name || 'Team B'}</option>
                    <option value="tie">Match Tied</option>
                    <option value="no_result">No Result / Washout</option>
                  </select>
                </div>

                {/* Team A Scores */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-2">
                    {teams.find(t => t.id === scoringMatch.teamAId)?.name || 'Team A'} Score
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Runs / Wickets (e.g. 188/5)</label>
                      <input
                        type="text"
                        placeholder="188/5"
                        value={scoringMatch.teamAScore || ''}
                        onChange={e => setScoringMatch({ ...scoringMatch, teamAScore: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Overs Faced</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="20.0"
                        value={scoringMatch.teamAOvers ?? ''}
                        onChange={e => setScoringMatch({ ...scoringMatch, teamAOvers: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Team B Scores */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-2">
                    {teams.find(t => t.id === scoringMatch.teamBId)?.name || 'Team B'} Score
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Runs / Wickets (e.g. 182/7)</label>
                      <input
                        type="text"
                        placeholder="182/7"
                        value={scoringMatch.teamBScore || ''}
                        onChange={e => setScoringMatch({ ...scoringMatch, teamBScore: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Overs Faced</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="20.0"
                        value={scoringMatch.teamBOvers ?? ''}
                        onChange={e => setScoringMatch({ ...scoringMatch, teamBOvers: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Official Result Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Titans won by 6 runs"
                    value={scoringMatch.resultSummary || ''}
                    onChange={e => setScoringMatch({ ...scoringMatch, resultSummary: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Player of the Match</label>
                  <select
                    value={scoringMatch.manOfTheMatchPlayerId || ''}
                    onChange={e => setScoringMatch({ ...scoringMatch, manOfTheMatchPlayerId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    <option value="">Select Player...</option>
                    {players
                      .filter(p => p.teamId === scoringMatch.teamAId || p.teamId === scoringMatch.teamBId)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({teams.find(t => t.id === p.teamId)?.shortCode})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CricHeroes Scorecard ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="CH-2026-M04"
                    value={scoringMatch.cricheroesMatchId || ''}
                    onChange={e => setScoringMatch({ ...scoringMatch, cricheroesMatchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                {isOrganizer ? 'Cancel' : 'Close Scorecard'}
              </button>
              {isOrganizer && (
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {scoringMatch.status === 'scheduled' ? 'Save Teams & Match Fixture' : 'Sign-off & Update Standings'}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Configure CricHeroes URL Modal (Organizer Exclusive) */}
      {configUrlModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setConfigUrlModalOpen(false)}
          title="Configure CricHeroes Live URL"
          subtitle="Set the CricHeroes live match center URL displayed to all tournament organizers and players"
        >
          <form onSubmit={handleSaveLiveUrl} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                CricHeroes Live Matches URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://cricheroes.com/tournament/..."
                value={tempUrl}
                onChange={e => setTempUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Paste any valid CricHeroes live match URL, tournament page, or live scoreboard link.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-700 block">Default Official URL:</span>
              <p className="text-[11px] font-mono text-slate-600 break-all select-all">
                {DEFAULT_CRICHEROES_URL}
              </p>
              <button
                type="button"
                onClick={() => setTempUrl(DEFAULT_CRICHEROES_URL)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline mt-1"
              >
                Reset to Default Official URL
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfigUrlModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Save Live Feed URL
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
