import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Trophy,
  Shield,
  Trash2,
  Edit,
  UserCheck,
  Upload,
  Download,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { exportToCsv } from '../../utils/csv';

export const TeamsPlayersView = ({
  tournament,
  teams,
  players,
  currentUser,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onCreatePlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onOpenImport,
  onNavigateToEditions
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [activeTab, setActiveTab] = useState('squads');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [createPlayerModalOpen, setCreatePlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  // Team Form (Home City and Owner fields removed as requested)
  const [teamForm, setTeamForm] = useState({
    name: '',
    shortCode: '',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    budgetTotal: tournament?.totalBudgetPointsPerTeam || 10000000
  });

  // Player Form
  const [playerForm, setPlayerForm] = useState({
    name: '',
    jerseyNumber: 10,
    role: 'All-Rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    basePrice: 500000,
    soldPrice: 0,
    teamId: '',
    isCaptain: false,
    isOverseas: false,
    email: '',
    phone: '',
    city: tournament?.city || 'Mumbai',
    shirtSize: 'L',
    foodPreference: 'Veg',
    photoUrl: ''
  });

  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.id) {
      setCreateTeamModalOpen(false);
      onNavigateToEditions?.();
      return;
    }
    onCreateTeam({
      tournamentId: tournament?.id || '',
      name: teamForm.name,
      shortCode: (teamForm.shortCode || 'TEAM').toUpperCase(),
      primaryColor: teamForm.primaryColor || '#0284c7',
      secondaryColor: teamForm.secondaryColor || '#0f172a',
      budgetTotal: Number(teamForm.budgetTotal) || tournament?.totalBudgetPointsPerTeam || 10000000,
      budgetSpent: 0,
      budgetRemaining: Number(teamForm.budgetTotal) || tournament?.totalBudgetPointsPerTeam || 10000000,
      totalPlayersAssigned: 0
    });
    setCreateTeamModalOpen(false);
  };

  const handleCreatePlayerSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.id) {
      setCreatePlayerModalOpen(false);
      onNavigateToEditions?.();
      return;
    }
    onCreatePlayer({
      tournamentId: tournament?.id || '',
      name: playerForm.name,
      jerseyNumber: Number(playerForm.jerseyNumber) || 10,
      role: playerForm.role || 'All-Rounder',
      battingStyle: playerForm.battingStyle || 'Right-hand bat',
      bowlingStyle: playerForm.bowlingStyle || 'Right-arm medium',
      basePrice: Number(playerForm.basePrice) || 500000,
      soldPrice: playerForm.teamId ? (Number(playerForm.soldPrice) || Number(playerForm.basePrice) || 500000) : undefined,
      teamId: playerForm.teamId || undefined,
      auctionStatus: playerForm.teamId ? 'sold' : 'available',
      isCaptain: Boolean(playerForm.isCaptain),
      isOverseas: Boolean(playerForm.isOverseas),
      email: playerForm.email || `${(playerForm.name || 'player').toLowerCase().replace(/\s+/g, '.')}@crickethq.local`,
      phone: playerForm.phone || '+91 98000 00000',
      city: playerForm.city || tournament?.city || 'Mumbai',
      shirtSize: playerForm.shirtSize || 'L',
      foodPreference: playerForm.foodPreference || 'Veg',
      registrationStatus: 'approved',
      paymentStatus: 'paid',
      matchesPlayed: 0,
      runsScored: 0,
      highestScore: 0,
      wicketsTaken: 0,
      bestBowling: '-',
      strikeRate: 0,
      economyRate: 0
    });
    setCreatePlayerModalOpen(false);
  };

  const filteredPlayers = players.filter(p => {
    if (selectedTeamFilter !== 'all') {
      if (selectedTeamFilter === 'unassigned' && p.teamId) return false;
      if (selectedTeamFilter !== 'unassigned' && p.teamId !== selectedTeamFilter) return false;
    }
    if (selectedRoleFilter !== 'all' && p.role !== selectedRoleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportRoster = () => {
    const rows = players.map(p => {
      const team = teams.find(t => t.id === p.teamId);
      return {
        PlayerName: p.name,
        Jersey: p.jerseyNumber || '',
        Role: p.role,
        Team: team ? team.name : 'Unassigned Pool',
        Batting: p.battingStyle,
        Bowling: p.bowlingStyle,
        BasePrice: p.basePrice,
        SoldPrice: p.soldPrice || '',
        FoodPreference: p.foodPreference,
        ShirtSize: p.shirtSize,
        Email: p.email,
        Phone: p.phone
      };
    });
    exportToCsv(`${tournament?.name?.replace(/\s+/g, '_') || 'Tournament'}_Player_Roster`, rows);
  };

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          🏆
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Franchise teams, player rosters, and auction baselines belong to a specific tournament edition. Create your first edition in the <strong>Tournament Editions</strong> module to begin adding teams and player squads.
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
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Franchise Teams & Player Squads</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage franchise rosters, player bidding baselines, captaincy, and dietary profiles for {tournament?.name} (Organized by Warhawks).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {isOrganizer ? (
            <>
              <button
                onClick={onOpenImport}
                className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleExportRoster}
                className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Roster</span>
              </button>
              <button
                onClick={() => {
                  setTeamForm({
                    name: '',
                    shortCode: '',
                    city: tournament?.city || 'Mumbai',
                    primaryColor: '#0284c7',
                    secondaryColor: '#0f172a',
                    ownerName: '',
                    budgetTotal: tournament?.totalBudgetPointsPerTeam || 10000000
                  });
                  setCreateTeamModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Team</span>
              </button>
              <button
                onClick={() => {
                  setPlayerForm({
                    name: '',
                    jerseyNumber: Math.floor(Math.random() * 99) + 1,
                    role: 'All-Rounder',
                    battingStyle: 'Right-hand bat',
                    bowlingStyle: 'Right-arm medium',
                    basePrice: 500000,
                    soldPrice: 0,
                    teamId: '',
                    isCaptain: false,
                    isOverseas: false,
                    email: '',
                    phone: '',
                    city: tournament?.city || 'Mumbai',
                    shirtSize: 'L',
                    foodPreference: 'Veg',
                    photoUrl: ''
                  });
                  setCreatePlayerModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Player</span>
              </button>
            </>
          ) : (
            <>
              <span className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                🏏 Player View · Verified Squad Rosters
              </span>
              <button
                onClick={handleExportRoster}
                className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Roster</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Segmented View Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('squads')}
          className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
            activeTab === 'squads'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Franchise Squad Boards ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
            activeTab === 'players'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Master Players Directory ({players.length})
        </button>
      </div>

      {/* SQUADS TAB */}
      {activeTab === 'squads' && (
        teams.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 sm:p-12 text-center text-xs text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No franchise teams added yet.</h3>
            <p className="text-slate-400 mt-1 max-w-sm mx-auto">
              Create franchise squads or import team rosters from CSV to allocate player budgets and schedule fixtures.
            </p>
            {isOrganizer && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setTeamForm({
                      name: '',
                      shortCode: '',
                      city: tournament?.city || 'Mumbai',
                      primaryColor: '#0284c7',
                      secondaryColor: '#0f172a',
                      ownerName: '',
                      budgetTotal: tournament?.totalBudgetPointsPerTeam || 10000000
                    });
                    setCreateTeamModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Team
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => {
            const teamSquad = players.filter(p => p.teamId === team.id);
            const captain = teamSquad.find(p => p.isCaptain);
            const overseasCount = teamSquad.filter(p => p.isOverseas).length;
            const budgetPercent = Math.min(100, Math.round((team.budgetSpent / team.budgetTotal) * 100));

            return (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {/* Team Card Header */}
                <div
                  className="p-4 text-white flex items-center justify-between"
                  style={{ backgroundColor: team.primaryColor || '#0284c7' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center font-bold text-base border border-white/20">
                      {team.shortCode}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-tight">{team.name}</h3>
                      <p className="text-[11px] text-white/80 font-medium">
                        {team.city} · {team.ownerName}
                      </p>
                    </div>
                  </div>

                  {isOrganizer && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="p-1 rounded hover:bg-black/20 transition-colors text-white cursor-pointer"
                        title="Edit team"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete team ${team.name}? Players will return to unassigned pool.`)) {
                            onDeleteTeam(team.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-black/20 transition-colors text-white/80 hover:text-white cursor-pointer"
                        title="Delete team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Team Budget Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-500">Purse Utilization</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(team.budgetSpent / 100000).toFixed(1)}L / ₹{(team.budgetTotal / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>Remaining: ₹{(team.budgetRemaining / 100000).toFixed(1)}L</span>
                    <span>{budgetPercent}% spent</span>
                  </div>
                </div>

                {/* Squad List */}
                <div className="p-4 flex-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2.5">
                    <span>Squad Roster ({teamSquad.length}/{tournament?.maxSquadSize || 18})</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Overseas: {overseasCount}/{tournament?.maxOverseasPlayers || 4}
                    </span>
                  </div>

                  {teamSquad.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      No players assigned yet. Use Auction room or Add Player.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {teamSquad.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {player.isCaptain && (
                              <span className="text-[10px] bg-amber-500 text-white font-bold px-1 rounded">
                                C
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 truncate">{player.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{player.jerseyNumber || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono text-slate-600">
                              {player.soldPrice ? `₹${(player.soldPrice / 100000).toFixed(1)}L` : 'Base'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{player.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <span>Captain: {captain ? captain.name : 'Unassigned'}</span>
                  <button
                    onClick={() => {
                      setSelectedTeamFilter(team.id);
                      setActiveTab('players');
                    }}
                    className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* PLAYERS DIRECTORY TAB */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full md:w-72">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search player, city, style..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedTeamFilter}
                onChange={e => setSelectedTeamFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">All Teams / Pools</option>
                <option value="unassigned">Unassigned (Auction Pool)</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
              </select>
            </div>
          </div>

          {/* Mobile Players Cards (Mobile < 768px) */}
          <div className="md:hidden space-y-3">
            {filteredPlayers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                {players.length === 0 ? 'No players registered or added yet.' : 'No players found matching current search/filter.'}
              </div>
            ) : (
              filteredPlayers.map(player => {
                const assignedTeam = teams.find(t => t.id === player.teamId);

                return (
                  <div
                    key={player.id}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                            <span className="truncate">{player.name}</span>
                            {player.isCaptain && (
                              <span className="text-[10px] bg-amber-500 text-white font-bold px-1 rounded shrink-0">
                                C
                              </span>
                            )}
                            {player.isOverseas && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1 rounded shrink-0">
                                OS
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            #{player.jerseyNumber || '—'} · {player.role} · {player.city}
                          </div>
                        </div>
                      </div>

                      {isOrganizer && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                            aria-label="Edit Player"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove player ${player.name}?`)) {
                                onDeletePlayer(player.id);
                              }
                            }}
                            className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                            aria-label="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Team</span>
                        {assignedTeam ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-800 truncate">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: assignedTeam.primaryColor }}
                            />
                            <span className="truncate">{assignedTeam.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">Unassigned Pool</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Auction Price</span>
                        <div className="font-mono text-slate-800 font-bold">
                          {player.soldPrice ? (
                            <span className="text-emerald-700">₹{(player.soldPrice / 100000).toFixed(1)}L Sold</span>
                          ) : (
                            <span>₹{(player.basePrice / 100000).toFixed(1)}L Base</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Style</span>
                        <span className="text-slate-600 truncate block">{player.battingStyle}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Diet & Kit</span>
                        <span className="text-slate-600 font-medium block">{player.foodPreference} · Size {player.shirtSize}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Players Table (md+) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Role & Style</th>
                    <th className="py-3 px-4">Assigned Team</th>
                    <th className="py-3 px-4">Auction Base / Sold</th>
                    <th className="py-3 px-4">Dietary</th>
                    <th className="py-3 px-4">Match Stats</th>
                    <th className="py-3 px-4 text-right">{isOrganizer ? 'Actions' : 'Roster Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        {players.length === 0 ? 'No players registered or added yet.' : 'No players found matching current search/filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map(player => {
                      const assignedTeam = teams.find(t => t.id === player.teamId);

                      return (
                        <tr key={player.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {player.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {player.name}
                                  {player.isCaptain && (
                                    <span className="text-[10px] bg-amber-500 text-white font-bold px-1 rounded">
                                      Captain
                                    </span>
                                  )}
                                  {player.isOverseas && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1 rounded">
                                      Overseas
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Jersey #{player.jerseyNumber || '—'} · {player.city}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{player.role}</div>
                            <div className="text-[11px] text-slate-400">
                              {player.battingStyle} · {player.bowlingStyle}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {assignedTeam ? (
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: assignedTeam.primaryColor }}
                                />
                                {assignedTeam.name}
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                Auction Pool (Available)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <div className="text-slate-800 font-bold">
                              ₹{(player.basePrice / 100000).toFixed(1)}L Base
                            </div>
                            {player.soldPrice ? (
                              <div className="text-[11px] text-emerald-600 font-semibold">
                                Sold: ₹{(player.soldPrice / 100000).toFixed(1)}L
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">Unsold</div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {player.foodPreference} · {player.shirtSize}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div className="text-slate-800">
                              {player.runsScored} Runs (SR: {player.strikeRate || '—'})
                            </div>
                            <div className="text-slate-400">
                              {player.wicketsTaken} Wickets (Econ: {player.economyRate || '—'})
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isOrganizer ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingPlayer(player)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit player"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove player ${player.name}?`)) {
                                      onDeletePlayer(player.id);
                                    }
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete player"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                Verified Athlete
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        title="Add Franchise Team"
        subtitle={`Create team for ${tournament?.name || 'Tournament Edition'}`}
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Franchise Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Titans"
                value={teamForm.name}
                onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Short Code (2-4 Letters)</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="AT"
                value={teamForm.shortCode}
                onChange={e => setTeamForm({ ...teamForm, shortCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Auction Purse (Points)</label>
              <input
                type="number"
                required
                step={500000}
                value={teamForm.budgetTotal}
                onChange={e => setTeamForm({ ...teamForm, budgetTotal: parseInt(e.target.value, 10) || 10000000 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={teamForm.primaryColor}
                  onChange={e => setTeamForm({ ...teamForm, primaryColor: e.target.value })}
                  className="w-9 h-9 p-0.5 rounded cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={teamForm.primaryColor}
                  onChange={e => setTeamForm({ ...teamForm, primaryColor: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateTeamModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Save Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      {editingTeam && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTeam(null)}
          title={`Edit ${editingTeam.name}`}
          subtitle="Update franchise information"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              onUpdateTeam(editingTeam.id, editingTeam);
              setEditingTeam(null);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={editingTeam.name}
                  onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  value={editingTeam.shortCode}
                  onChange={e => setEditingTeam({ ...editingTeam, shortCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={editingTeam.city}
                  onChange={e => setEditingTeam({ ...editingTeam, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={editingTeam.ownerName}
                  onChange={e => setEditingTeam({ ...editingTeam, ownerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Player Modal */}
      <Modal
        isOpen={createPlayerModalOpen}
        onClose={() => setCreatePlayerModalOpen(false)}
        title="Add Player Profile"
        subtitle={`Register player into ${tournament?.name || 'Tournament Edition'}`}
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePlayerSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Rishabh Pant"
                value={playerForm.name}
                onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jersey Number</label>
              <input
                type="number"
                min={1}
                max={999}
                value={playerForm.jerseyNumber}
                onChange={e => setPlayerForm({ ...playerForm, jerseyNumber: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Role</label>
              <select
                value={playerForm.role}
                onChange={e => setPlayerForm({ ...playerForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batting Style</label>
              <select
                value={playerForm.battingStyle}
                onChange={e => setPlayerForm({ ...playerForm, battingStyle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bowling Style</label>
              <select
                value={playerForm.bowlingStyle}
                onChange={e => setPlayerForm({ ...playerForm, bowlingStyle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Right-arm fast">Right-arm fast</option>
                <option value="Right-arm medium">Right-arm medium</option>
                <option value="Left-arm fast">Left-arm fast</option>
                <option value="Right-arm offbreak">Right-arm offbreak</option>
                <option value="Right-arm legbreak">Right-arm legbreak</option>
                <option value="Slow left-arm orthodox">Slow left-arm orthodox</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Auction Base Price (Points)</label>
              <input
                type="number"
                step={50000}
                required
                value={playerForm.basePrice}
                onChange={e => setPlayerForm({ ...playerForm, basePrice: parseInt(e.target.value, 10) || 300000 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign to Team (Optional)</label>
              <select
                value={playerForm.teamId}
                onChange={e => setPlayerForm({ ...playerForm, teamId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Leave in Auction Pool (Unassigned)</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dietary Preference</label>
              <select
                value={playerForm.foodPreference}
                onChange={e => setPlayerForm({ ...playerForm, foodPreference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Veg">Vegetarian</option>
                <option value="Non-Veg">Non-Vegetarian</option>
                <option value="Jain">Jain (No Root Veg)</option>
                <option value="Vegan">Vegan</option>
                <option value="Halal">Halal</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shirt Size</label>
              <select
                value={playerForm.shirtSize}
                onChange={e => setPlayerForm({ ...playerForm, shirtSize: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="XL">Extra Large (XL)</option>
                <option value="XXL">Double Extra Large (XXL)</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={playerForm.isCaptain}
                  onChange={e => setPlayerForm({ ...playerForm, isCaptain: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Team Captain
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={playerForm.isOverseas}
                  onChange={e => setPlayerForm({ ...playerForm, isOverseas: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Overseas Player
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreatePlayerModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Save Player
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPlayer(null)}
          title={`Edit ${editingPlayer.name}`}
          subtitle="Update player profile details"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              onUpdatePlayer(editingPlayer.id, editingPlayer);
              setEditingPlayer(null);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingPlayer.name}
                  onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team</label>
                <select
                  value={editingPlayer.teamId || ''}
                  onChange={e => setEditingPlayer({ ...editingPlayer, teamId: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Unassigned Pool</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base Price</label>
                <input
                  type="number"
                  value={editingPlayer.basePrice}
                  onChange={e => setEditingPlayer({ ...editingPlayer, basePrice: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sold Price</label>
                <input
                  type="number"
                  value={editingPlayer.soldPrice || 0}
                  onChange={e => setEditingPlayer({ ...editingPlayer, soldPrice: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingPlayer.isCaptain}
                    onChange={e => setEditingPlayer({ ...editingPlayer, isCaptain: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Captain
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
