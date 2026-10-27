// Warhawks Tournament Database Service
import { DEFAULT_ORGANIZER_NAME, ORGANIZER_DETAILS } from '../constants';
import { isSupabaseConfigured, getSupabaseClient } from './supabase';
import { supabaseDb } from './supabaseDb';
import { formatPhoneNumber } from '../utils/phone';
import { getDefaultEditionRules } from '../constants/officialRules';

const STORAGE_KEY = 'warhawks_tournament_db_v2';
const LEGACY_KEY_V1 = 'warhawks_admin_db_v1';
const LEGACY_KEY_PAVILION = 'pavilionhq_admin_db_v1';

// Static Configuration & Authentic User Personas (Organizer & Player)
const initialUsers = [
  {
    id: 'usr-organizer-01',
    name: 'Warhawks Tournament Operations',
    email: 'operations@warhawks.org',
    role: 'organizer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    title: 'Lead Tournament Operations Director'
  },
  {
    id: 'usr-player-01',
    name: 'Tournament Athlete Applicant',
    email: 'athlete@warhawks.org',
    role: 'player',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    title: 'Registered Athlete'
  }
];

const initialSettings = {
  appName: 'Warhawks Tournament Management',
  organizerName: DEFAULT_ORGANIZER_NAME,
  organizerBranch: ORGANIZER_DETAILS.branch,
  organizerEmail: ORGANIZER_DETAILS.contactEmail,
  headquarters: ORGANIZER_DETAILS.headquarters,
  defaultCurrency: 'INR (₹)',
  timezone: 'Asia/Kolkata (IST)',
  autoCalculatePointsTable: true,
  enableAuctionEngine: true,
  enableCricHeroesSync: true,
  enableSponsorPortal: true,
  supabaseProjectUrl: '',
  supabaseAnonKey: ''
};

class TournamentDatabase {
  constructor() {
    this.schema = this.loadFromStorage();
    this.initSupabaseSync();
  }

  // Returns a pristine clean schema with ZERO dummy business records
  getCleanSchema() {
    return {
      tournaments: [],
      teams: [],
      players: [],
      matches: [],
      standings: [],
      auctionConfigs: {},
      auctionBids: [],
      sponsors: [],
      expenses: [],
      foodOrders: [],
      rules: [],
      registrations: [],
      mediaAssets: [],
      importJobs: [],
      auditLogs: [],
      announcements: [],
      users: initialUsers,
      settings: initialSettings
    };
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all arrays are safely defined
        return {
          tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
          teams: Array.isArray(parsed.teams) ? parsed.teams : [],
          players: Array.isArray(parsed.players) ? parsed.players : [],
          matches: Array.isArray(parsed.matches) ? parsed.matches : [],
          standings: Array.isArray(parsed.standings) ? parsed.standings : [],
          auctionConfigs: parsed.auctionConfigs && typeof parsed.auctionConfigs === 'object' ? parsed.auctionConfigs : {},
          auctionBids: Array.isArray(parsed.auctionBids) ? parsed.auctionBids : [],
          sponsors: Array.isArray(parsed.sponsors) ? parsed.sponsors : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
          foodOrders: Array.isArray(parsed.foodOrders) ? parsed.foodOrders : [],
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
          registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
          mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : [],
          importJobs: Array.isArray(parsed.importJobs) ? parsed.importJobs : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
          users: initialUsers,
          settings: { ...initialSettings, ...(parsed.settings || {}) }
        };
      }
    } catch {
      // storage unavailable or corrupted
    }

    // Default to clean empty schema
    return this.getCleanSchema();
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schema));
    } catch {
      // storage quota
    }
  }

  resetToCleanEmptyState() {
    this.schema = this.getCleanSchema();
    this.saveToStorage();
  }

  // Server & Supabase Background Sync
  async initSupabaseSync() {
    try {
      const [remoteTournaments, remoteAnnouncements] = await Promise.all([
        supabaseDb.getTournaments().catch(() => null),
        supabaseDb.getAnnouncements().catch(() => null)
      ]);
      if (remoteTournaments !== null && remoteTournaments.length > 0) {
        this.schema.tournaments = remoteTournaments;
      }
      if (remoteAnnouncements !== null) {
        this.schema.announcements = remoteAnnouncements;
      }
      this.saveToStorage();
    } catch (err) {
      console.warn('Backend initial fetch notice:', err.message);
    }
  }

  async syncTournamentData(tournamentId) {
    if (!tournamentId) return;
    try {
      const [remoteTournaments, remoteTeams, remotePlayers, remoteMatches, remoteSponsors, remoteRegistrations, remoteExpenses, remoteRules, remoteAuctionConfig, remoteAuctionBids, remoteAnnouncements] = await Promise.all([
        supabaseDb.getTournaments().catch(() => null),
        supabaseDb.getTeams(tournamentId).catch(() => null),
        supabaseDb.getPlayers(tournamentId).catch(() => null),
        supabaseDb.getMatches(tournamentId).catch(() => null),
        supabaseDb.getSponsors(tournamentId).catch(() => null),
        supabaseDb.getRegistrations(tournamentId).catch(() => null),
        supabaseDb.getExpenses(tournamentId).catch(() => null),
        supabaseDb.getRules(tournamentId).catch(() => null),
        supabaseDb.getAuctionConfig(tournamentId).catch(() => null),
        supabaseDb.getAuctionBids(tournamentId).catch(() => null),
        supabaseDb.getAnnouncements(tournamentId).catch(() => null)
      ]);

      if (remoteTournaments !== null) this.schema.tournaments = remoteTournaments;
      if (remoteTeams !== null) {
        const others = this.schema.teams.filter(t => t.tournamentId !== tournamentId);
        this.schema.teams = [...others, ...remoteTeams];
      }
      if (remotePlayers !== null) {
        const others = this.schema.players.filter(p => p.tournamentId !== tournamentId);
        this.schema.players = [...others, ...remotePlayers];
      }
      if (remoteMatches !== null) {
        const others = (this.schema.matches || []).filter(m => m.tournamentId && m.tournamentId !== tournamentId);
        const cleanMatches = (remoteMatches || []).map(m => ({
          ...m,
          tournamentId: m.tournamentId || tournamentId
        }));
        this.schema.matches = [...others, ...cleanMatches];
      }
      if (remoteSponsors !== null) {
        const others = this.schema.sponsors.filter(s => s.tournamentId !== tournamentId);
        this.schema.sponsors = [...others, ...remoteSponsors];
      }
      if (remoteRegistrations !== null) {
        const others = this.schema.registrations.filter(r => r.tournamentId !== tournamentId);
        this.schema.registrations = [...others, ...remoteRegistrations];
      }
      if (remoteExpenses !== null) {
        const others = this.schema.expenses.filter(e => e.tournamentId !== tournamentId);
        this.schema.expenses = [...others, ...remoteExpenses];
      }
      if (remoteRules !== null) {
        const others = this.schema.rules.filter(r => r.tournamentId !== tournamentId);
        this.schema.rules = [...others, ...remoteRules];
      }
      if (remoteAuctionConfig !== null) {
        this.schema.auctionConfigs[tournamentId] = remoteAuctionConfig;
      }
      if (remoteAuctionBids !== null) {
        const others = this.schema.auctionBids.filter(b => b.tournamentId !== tournamentId);
        this.schema.auctionBids = [...others, ...remoteAuctionBids];
      }
      if (remoteAnnouncements !== null) {
        const map = new Map();
        for (const a of (this.schema.announcements || [])) {
          if (a && a.id) map.set(a.id, a);
        }
        for (const a of remoteAnnouncements) {
          if (a && a.id) map.set(a.id, a);
        }
        this.schema.announcements = Array.from(map.values());
      }

      this.saveToStorage();
    } catch (err) {
      console.warn('Supabase sync warning:', err.message);
    }
  }

  // ==========================================
  // TOURNAMENT CRUD
  // ==========================================
  getTournaments() {
    return [...(this.schema.tournaments || [])];
  }

  getTournament(id) {
    if (!id) return null;
    return (this.schema.tournaments || []).find(t => t.id === id) || null;
  }

  getOrganizers() {
    return [
      {
        id: 'warhawks',
        name: DEFAULT_ORGANIZER_NAME,
        role: 'Official Tournament Organizer & Host',
        branch: ORGANIZER_DETAILS.branch,
        contactEmail: ORGANIZER_DETAILS.contactEmail,
        isDefault: true
      }
    ];
  }

  createTournament(data) {
    const existingList = this.schema.tournaments || [];
    const nextEditionNum = Math.max(...existingList.map(t => t.editionNumber || 0), 0) + 1;
    const newTournament = {
      ...data,
      id: data.id || `tour-ed${data.editionNumber || nextEditionNum}-${Date.now().toString(36)}`,
      name: data.name || `Championship Edition ${data.editionNumber || nextEditionNum}`,
      editionNumber: data.editionNumber || nextEditionNum,
      year: data.year || new Date().getFullYear(),
      format: data.format || 'T20',
      status: data.status || 'upcoming',
      organizer: DEFAULT_ORGANIZER_NAME,
      organizerRole: 'Official Tournament Organizer & Host',
      organizerBranch: ORGANIZER_DETAILS.branch,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      venue: data.venue || 'Sports Complex Stadium',
      city: data.city || 'Mumbai',
      registrationOpen: Boolean(data.registrationOpen),
      registrationStartDate: data.registrationStartDate || null,
      registrationEndDate: data.registrationEndDate || null,
      totalBudgetPointsPerTeam: Number(data.totalBudgetPointsPerTeam) || 10000000,
      pointsPerWin: data.pointsPerWin ?? 2,
      pointsPerTie: data.pointsPerTie ?? 1,
      maxSquadSize: data.maxSquadSize || 18,
      minSquadSize: data.minSquadSize || 14,
      maxOverseasPlayers: data.maxOverseasPlayers || 4,
      description: data.description || '',
      upiQrCodeUrl: data.upiQrCodeUrl || '',
      upiId: data.upiId || 'warhawks.sports@icici',
      registrationFee: Number(data.registrationFee) || 1500,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Seed official tournament rules for this edition
    const defaultRules = getDefaultEditionRules(newTournament.id);
    this.schema.rules = [...(this.schema.rules || []), ...defaultRules];

    this.schema.tournaments.unshift(newTournament);
    this.saveToStorage();
    this.logAction(
      newTournament.id,
      'Warhawks Operations',
      'organizer',
      'CREATE_TOURNAMENT',
      'Tournament',
      newTournament.id,
      `Initialized Edition #${newTournament.editionNumber}: ${newTournament.name}`
    );

    if (isSupabaseConfigured()) {
      supabaseDb.createTournament(newTournament).catch(err => {
        console.warn('Supabase createTournament async notification:', err.message);
      });
    }

    return newTournament;
  }

  updateTournament(id, updates) {
    const idx = (this.schema.tournaments || []).findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Tournament not found');

    this.schema.tournaments[idx] = {
      ...this.schema.tournaments[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveToStorage();
    this.logAction(
      id,
      'Warhawks Operations',
      'organizer',
      'UPDATE_TOURNAMENT',
      'Tournament',
      id,
      `Updated parameters for tournament edition`
    );

    if (isSupabaseConfigured()) {
      supabaseDb.updateTournament(id, updates).catch(err => {
        console.warn('Supabase updateTournament async notification:', err.message);
      });
    }

    return this.schema.tournaments[idx];
  }

  deleteTournament(id) {
    this.schema.tournaments = (this.schema.tournaments || []).filter(t => t.id !== id);
    this.schema.teams = (this.schema.teams || []).filter(t => t.tournamentId !== id);
    this.schema.players = (this.schema.players || []).filter(p => p.tournamentId !== id);
    this.schema.matches = (this.schema.matches || []).filter(m => m.tournamentId !== id);
    this.schema.standings = (this.schema.standings || []).filter(s => s.tournamentId !== id);
    this.schema.sponsors = (this.schema.sponsors || []).filter(s => s.tournamentId !== id);
    this.schema.expenses = (this.schema.expenses || []).filter(e => e.tournamentId !== id);
    this.schema.registrations = (this.schema.registrations || []).filter(r => r.tournamentId !== id);
    this.schema.rules = (this.schema.rules || []).filter(r => r.tournamentId !== id);
    delete this.schema.auctionConfigs[id];
    this.schema.auctionBids = (this.schema.auctionBids || []).filter(b => b.tournamentId !== id);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deleteTournament(id).catch(err => console.warn('Supabase deleteTournament notice:', err.message));
    }
  }

  // ==========================================
  // TEAMS CRUD
  // ==========================================
  getTeams(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.teams || []).filter(t => t.tournamentId === tournamentId);
  }

  createTeam(data) {
    const newTeam = {
      ...data,
      id: data.id || `team-${Date.now().toString(36)}`,
      budgetSpent: 0,
      budgetRemaining: data.budgetTotal || 10000000,
      totalPlayersAssigned: 0,
      createdAt: new Date().toISOString()
    };
    this.schema.teams.push(newTeam);
    this.saveToStorage();
    this.logAction(data.tournamentId, 'Warhawks Operations', 'organizer', 'CREATE_TEAM', 'Team', newTeam.id, `Created franchise team: ${newTeam.name}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createTeam(newTeam).catch(err => console.warn('Supabase createTeam notice:', err.message));
    }
    return newTeam;
  }

  updateTeam(id, updates) {
    const idx = (this.schema.teams || []).findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Team not found');
    this.schema.teams[idx] = { ...this.schema.teams[idx], ...updates };
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateTeam(id, updates).catch(err => console.warn('Supabase updateTeam notice:', err.message));
    }
    return this.schema.teams[idx];
  }

  deleteTeam(id) {
    const team = (this.schema.teams || []).find(t => t.id === id);
    if (!team) return;
    this.schema.teams = this.schema.teams.filter(t => t.id !== id);
    // Unassign players
    this.schema.players.forEach(p => {
      if (p.teamId === id) {
        p.teamId = null;
        p.auctionStatus = 'available';
        p.soldPrice = null;
      }
    });
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deleteTeam(id).catch(err => console.warn('Supabase deleteTeam notice:', err.message));
    }
  }

  // ==========================================
  // PLAYERS CRUD
  // ==========================================
  getPlayers(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.players || []).filter(p => p.tournamentId === tournamentId);
  }

  createPlayer(data) {
    const newPlayer = {
      ...data,
      id: data.id || `ply-${Date.now().toString(36)}`,
      phone: data.phone ? formatPhoneNumber(data.phone) : '+919800000000',
      auctionStatus: data.teamId ? 'sold' : (data.auctionStatus || 'available'),
      foodPreference: data.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      matchesPlayed: data.matchesPlayed || 0,
      runsScored: data.runsScored || 0,
      highestScore: data.highestScore || 0,
      wicketsTaken: data.wicketsTaken || 0,
      bestBowling: data.bestBowling || '-',
      strikeRate: data.strikeRate || 0,
      economyRate: data.economyRate || 0,
      createdAt: new Date().toISOString()
    };
    this.schema.players.push(newPlayer);
    if (newPlayer.teamId) {
      this.syncTeamSquadCount(data.tournamentId);
    }
    this.saveToStorage();
    this.logAction(data.tournamentId, 'Warhawks Operations', 'organizer', 'CREATE_PLAYER', 'Player', newPlayer.id, `Enrolled player: ${newPlayer.name}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createPlayer(newPlayer).catch(err => console.warn('Supabase createPlayer notice:', err.message));
    }
    return newPlayer;
  }

  updatePlayer(id, updates) {
    const idx = (this.schema.players || []).findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Player not found');
    this.schema.players[idx] = { ...this.schema.players[idx], ...updates };
    this.syncTeamSquadCount(this.schema.players[idx].tournamentId);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updatePlayer(id, updates).catch(err => console.warn('Supabase updatePlayer notice:', err.message));
    }
    return this.schema.players[idx];
  }

  deletePlayer(id) {
    const p = (this.schema.players || []).find(pl => pl.id === id);
    if (!p) return;
    const tId = p.tournamentId;
    this.schema.players = this.schema.players.filter(pl => pl.id !== id);
    this.syncTeamSquadCount(tId);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deletePlayer(id).catch(err => console.warn('Supabase deletePlayer notice:', err.message));
    }
  }

  syncTeamSquadCount(tournamentId) {
    if (!tournamentId) return;
    const teams = this.getTeams(tournamentId);
    const players = this.getPlayers(tournamentId);

    teams.forEach(team => {
      const assigned = players.filter(p => p.teamId === team.id);
      team.totalPlayersAssigned = assigned.length;
      const spent = assigned.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
      team.budgetSpent = spent;
      team.budgetRemaining = Math.max(0, (team.budgetTotal || 10000000) - spent);
    });
  }

  // ==========================================
  // MATCHES & STANDINGS CRUD
  // ==========================================
  getMatches(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.matches || []).filter(m => m.tournamentId === tournamentId);
  }

  createMatch(data) {
    const existing = this.getMatches(data.tournamentId);
    const matchNumber = data.matchNumber || (existing.length + 1);
    const newMatch = {
      ...data,
      id: data.id || `mat-${Date.now().toString(36)}`,
      matchNumber,
      status: data.status || 'scheduled',
      isImported: Boolean(data.isImported),
      createdAt: new Date().toISOString()
    };
    this.schema.matches.push(newMatch);
    if (newMatch.status === 'completed') {
      this.recalculateStandings(data.tournamentId);
    }
    this.saveToStorage();
    this.logAction(data.tournamentId, 'Warhawks Operations', 'organizer', 'CREATE_MATCH', 'Match', newMatch.id, `Scheduled Match #${matchNumber}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createMatch(newMatch).catch(err => console.warn('Supabase createMatch notice:', err.message));
    }
    return newMatch;
  }

  updateMatch(id, updates) {
    const idx = (this.schema.matches || []).findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Match not found');
    this.schema.matches[idx] = { ...this.schema.matches[idx], ...updates };
    const tId = this.schema.matches[idx].tournamentId;
    this.recalculateStandings(tId);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateMatch(id, updates).catch(err => console.warn('Supabase updateMatch notice:', err.message));
    }
    return this.schema.matches[idx];
  }

  deleteMatch(id) {
    const match = (this.schema.matches || []).find(m => m.id === id);
    if (!match) return;
    const tId = match.tournamentId;
    this.schema.matches = this.schema.matches.filter(m => m.id !== id);
    this.recalculateStandings(tId);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deleteMatch(id).catch(err => console.warn('Supabase deleteMatch notice:', err.message));
    }
  }

  getStandings(tournamentId) {
    if (!tournamentId) return [];
    const direct = (this.schema.standings || []).filter(s => s.tournamentId === tournamentId);
    if (direct.length > 0) return direct;
    return this.recalculateStandings(tournamentId);
  }

  recalculateStandings(tournamentId) {
    if (!tournamentId) return [];
    const teams = this.getTeams(tournamentId);
    if (teams.length === 0) {
      this.schema.standings = (this.schema.standings || []).filter(s => s.tournamentId !== tournamentId);
      return [];
    }

    const matches = this.getMatches(tournamentId).filter(m => m.status === 'completed');

    const table = teams.map(team => {
      let played = 0, won = 0, lost = 0, tied = 0, noResult = 0, points = 0;
      let runsScored = 0, oversFaced = 0.0, runsConceded = 0, oversBowled = 0.0;

      matches.forEach(m => {
        const isTeamA = m.teamAId === team.id;
        const isTeamB = m.teamBId === team.id;
        if (!isTeamA && !isTeamB) return;

        played++;
        if (m.winnerId === team.id) {
          won++;
          points += 2;
        } else if (m.winnerId && m.winnerId !== 'tie' && m.winnerId !== 'no_result') {
          lost++;
        } else if (m.winnerId === 'tie') {
          tied++;
          points += 1;
        } else {
          noResult++;
          points += 1;
        }

        const myScore = isTeamA ? m.teamAScore : m.teamBScore;
        const myOvers = isTeamA ? m.teamAOvers : m.teamBOvers;
        const oppScore = isTeamA ? m.teamBScore : m.teamAScore;
        const oppOvers = isTeamA ? m.teamBOvers : m.teamAOvers;

        if (myScore && myScore.includes('/')) {
          const runs = parseInt(myScore.split('/')[0], 10) || 0;
          runsScored += runs;
          oversFaced += (Number(myOvers) || 20);
        }
        if (oppScore && oppScore.includes('/')) {
          const runs = parseInt(oppScore.split('/')[0], 10) || 0;
          runsConceded += runs;
          oversBowled += (Number(oppOvers) || 20);
        }
      });

      const forRate = oversFaced > 0 ? (runsScored / oversFaced) : 0;
      const againstRate = oversBowled > 0 ? (runsConceded / oversBowled) : 0;
      const netRunRate = Number((forRate - againstRate).toFixed(3));

      return {
        id: `std-${team.id}`,
        tournamentId,
        teamId: team.id,
        matchesPlayed: played,
        won,
        lost,
        tied,
        noResult,
        points,
        runsScored,
        oversFaced: Number(oversFaced.toFixed(1)),
        runsConceded,
        oversBowled: Number(oversBowled.toFixed(1)),
        netRunRate
      };
    });

    table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    const otherStandings = (this.schema.standings || []).filter(s => s.tournamentId !== tournamentId);
    this.schema.standings = [...otherStandings, ...table];
    return table;
  }

  // ==========================================
  // SPONSORS CRUD (Streamlined Modal & Cards)
  // ==========================================
  getSponsors(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.sponsors || []).filter(s => s.tournamentId === tournamentId);
  }

  createSponsor(data) {
    const newSponsor = {
      ...data,
      id: data.id || `sp-${Date.now().toString(36)}`,
      contactNumber: data.contactNumber ? formatPhoneNumber(data.contactNumber) : '',
      contributionAmount: Number(data.contributionAmount) || 0,
      tier: data.tier || 'Official Partner',
      isActive: data.isActive ?? true,
      displayOnPublicWeb: data.displayOnPublicWeb ?? true,
      createdAt: new Date().toISOString()
    };
    this.schema.sponsors.push(newSponsor);
    this.saveToStorage();
    this.logAction(data.tournamentId, 'Warhawks Operations', 'organizer', 'CREATE_SPONSOR', 'Sponsor', newSponsor.id, `Added sponsor: ${newSponsor.name}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createSponsor(newSponsor).catch(err => console.warn('Supabase createSponsor notice:', err.message));
    }
    return newSponsor;
  }

  updateSponsor(id, updates) {
    const idx = (this.schema.sponsors || []).findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Sponsor not found');
    const cleanUpdates = {
      ...updates,
      ...(updates.contactNumber !== undefined ? { contactNumber: formatPhoneNumber(updates.contactNumber) } : {})
    };
    this.schema.sponsors[idx] = { ...this.schema.sponsors[idx], ...cleanUpdates };
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateSponsor(id, cleanUpdates).catch(err => console.warn('Supabase updateSponsor notice:', err.message));
    }
    return this.schema.sponsors[idx];
  }

  deleteSponsor(id) {
    this.schema.sponsors = (this.schema.sponsors || []).filter(s => s.id !== id);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deleteSponsor(id).catch(err => console.warn('Supabase deleteSponsor notice:', err.message));
    }
  }

  // ==========================================
  // TOURNAMENT ANNOUNCEMENTS CRUD & REORDERING
  // ==========================================
  getAnnouncements(tournamentId, activeOnly = false) {
    const map = new Map();
    for (const a of (this.schema.announcements || [])) {
      if (a && a.id) map.set(a.id, a);
    }
    let list = Array.from(map.values());
    if (tournamentId) {
      list = list.filter(a => !a.tournamentId || a.tournamentId === tournamentId);
    }
    if (activeOnly) {
      list = list.filter(a => a.isActive !== false);
    }
    return list.sort((a, b) => (Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)) || (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
  }

  async createAnnouncement(data) {
    const cleanMsg = (data.message || '').trim();
    if (!cleanMsg) return null;

    // Check if an announcement with identical message already exists in local schema to avoid accidental duplicates
    const duplicate = (this.schema.announcements || []).find(
      a => (!data.tournamentId || !a.tournamentId || a.tournamentId === data.tournamentId) &&
           a.message?.trim().toLowerCase() === cleanMsg.toLowerCase()
    );
    if (duplicate) {
      return duplicate;
    }

    const list = this.getAnnouncements(data.tournamentId);
    const maxOrder = list.length > 0 ? Math.max(...list.map(a => Number(a.displayOrder ?? 0))) + 1 : 0;
    const newAnn = {
      id: data.id || `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tournamentId: data.tournamentId || null,
      message: cleanMsg,
      displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : maxOrder,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdBy: 'Warhawks Operations',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let persisted = newAnn;
    try {
      const res = await supabaseDb.createAnnouncement(newAnn);
      if (res) persisted = res;
    } catch (err) {
      console.warn('createAnnouncement notice:', err.message);
    }

    const map = new Map();
    for (const a of (this.schema.announcements || [])) {
      if (a && a.id) map.set(a.id, a);
    }
    map.set(persisted.id, persisted);
    this.schema.announcements = Array.from(map.values());
    this.saveToStorage();
    return persisted;
  }

  async updateAnnouncement(id, updates) {
    let persisted = null;
    try {
      persisted = await supabaseDb.updateAnnouncement(id, updates);
    } catch (err) {
      console.warn('updateAnnouncement notice:', err.message);
    }

    const idx = (this.schema.announcements || []).findIndex(a => a.id === id);
    if (idx !== -1) {
      this.schema.announcements[idx] = persisted || {
        ...this.schema.announcements[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveToStorage();
      return this.schema.announcements[idx];
    }
    return persisted;
  }

  async deleteAnnouncement(id) {
    try {
      await supabaseDb.deleteAnnouncement(id);
    } catch (err) {
      console.warn('deleteAnnouncement notice:', err.message);
    }
    this.schema.announcements = (this.schema.announcements || []).filter(a => a.id !== id);
    this.saveToStorage();
    return { success: true, id };
  }

  async swapAnnouncements(id1, id2) {
    try {
      const res = await supabaseDb.swapAnnouncements(id1, id2);
      if (res?.items) {
        this.schema.announcements = res.items;
        this.saveToStorage();
        return res.items;
      }
    } catch (err) {
      console.warn('swapAnnouncements notice:', err.message);
    }

    const item1 = (this.schema.announcements || []).find(a => a.id === id1);
    const item2 = (this.schema.announcements || []).find(a => a.id === id2);
    if (item1 && item2) {
      const tempOrder = item1.displayOrder;
      item1.displayOrder = item2.displayOrder;
      item2.displayOrder = tempOrder;
      this.saveToStorage();
    }
    return this.getAnnouncements();
  }

  async reorderAnnouncements(items) {
    try {
      const res = await supabaseDb.reorderAnnouncements(items);
      if (res?.items) {
        this.schema.announcements = res.items;
        this.saveToStorage();
        return res.items;
      }
    } catch (err) {
      console.warn('reorderAnnouncements notice:', err.message);
    }

    items.forEach(({ id, displayOrder }) => {
      const match = (this.schema.announcements || []).find(a => a.id === id);
      if (match) match.displayOrder = Number(displayOrder);
    });
    this.saveToStorage();
    return this.getAnnouncements();
  }

  // ==========================================
  // EXPENSES CRUD
  // ==========================================
  getExpenses(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.expenses || []).filter(e => e.tournamentId === tournamentId);
  }

  async createExpense(data) {
    const newExpense = {
      ...data,
      id: data.id || `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      amount: Number(data.amount) || 0,
      advanceAmount: Number(data.advanceAmount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      vendorName: data.vendorName || '',
      paymentMode: data.paymentMode || 'Bank Transfer',
      paymentStatus: data.paymentStatus || 'paid',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };

    let persisted = newExpense;
    if (isSupabaseConfigured()) {
      try {
        const res = await supabaseDb.createExpense(newExpense);
        if (res) persisted = res;
      } catch (err) {
        console.warn('Supabase createExpense notice:', err.message);
      }
    }

    const idx = (this.schema.expenses || []).findIndex(e => e.id === persisted.id);
    if (idx !== -1) {
      this.schema.expenses[idx] = persisted;
    } else {
      this.schema.expenses.push(persisted);
    }
    this.saveToStorage();
    this.logAction(data.tournamentId, 'Warhawks Operations', 'organizer', 'CREATE_EXPENSE', 'Expense', persisted.id, `Recorded voucher: ${persisted.title}`);
    return persisted;
  }

  async deleteExpense(id) {
    this.schema.expenses = (this.schema.expenses || []).filter(e => e.id !== id);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      try {
        await supabaseDb.deleteExpense(id);
      } catch (err) {
        console.warn('Supabase deleteExpense notice:', err.message);
      }
    }
    return { success: true, id };
  }

  // ==========================================
  // REGISTRATIONS & DIETARY REQUISITIONS
  // ==========================================
  getRegistrations(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.registrations || []).filter(r => r.tournamentId === tournamentId);
  }

  createRegistration(data) {
    const tournament = this.getTournament(data.tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (!tournament.registrationOpen) throw new Error('Tournament registration is closed for this edition.');

    const existing = (this.schema.registrations || []).find(
      r => r.tournamentId === data.tournamentId && r.email?.toLowerCase() === data.email?.toLowerCase()
    );
    if (existing) {
      throw new Error('A registration application with this email already exists for this edition.');
    }

    const guestCount = Math.max(0, parseInt(data.guestCount ?? data.guestNumber, 10) || 0);

    // Validate and sanitize independent guest dietary preferences and meal selections
    let guests = [];
    if (guestCount > 0) {
      if (Array.isArray(data.guests) && data.guests.length > 0) {
        guests = data.guests.slice(0, guestCount).map((g, idx) => ({
          guestNumber: idx + 1,
          dietaryPreference: (g?.dietaryPreference === 'Non-Veg' || g?.dietaryPreference === 'Non-Vegetarian') ? 'Non-Veg' : 'Veg',
          hasBreakfast: Boolean(g?.hasBreakfast),
          hasLunch: Boolean(g?.hasLunch)
        }));
        while (guests.length < guestCount) {
          guests.push({
            guestNumber: guests.length + 1,
            dietaryPreference: 'Veg',
            hasBreakfast: false,
            hasLunch: false
          });
        }
      } else {
        const fallbackDiet = (data.guestFoodPreference === 'Non-Veg' || data.guestFoodPreference === 'Non-Vegetarian') ? 'Non-Veg' : 'Veg';
        for (let i = 1; i <= guestCount; i++) {
          guests.push({
            guestNumber: i,
            dietaryPreference: fallbackDiet,
            hasBreakfast: Boolean(data.hasGuestBreakfast),
            hasLunch: Boolean(data.hasGuestLunch)
          });
        }
      }
    }

    const newReg = {
      id: data.id || `reg-${Date.now().toString(36)}`,
      tournamentId: data.tournamentId,
      fullName: data.fullName,
      email: data.email,
      phone: formatPhoneNumber(data.phone || '+919800000000'),
      age: parseInt(data.age, 10) || 24,
      city: data.city || tournament.city,
      primaryRole: data.primaryRole || 'All-Rounder',
      battingStyle: data.battingStyle || 'Right-hand bat',
      bowlingStyle: data.bowlingStyle || 'Right-arm medium',
      preferredJerseyNo: parseInt(data.preferredJerseyNo, 10) || 18,
      shirtSize: data.shirtSize || 'L',
      foodPreference: data.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      hasBreakfast: Boolean(data.hasBreakfast),
      hasLunch: Boolean(data.hasLunch),
      guestCount,
      guests, // Array of { guestNumber: number, dietaryPreference: 'Veg'|'Non-Veg', hasBreakfast: boolean, hasLunch: boolean }
      guestFoodPreference: guests[0]?.dietaryPreference || 'Veg',
      hasGuestBreakfast: guests.some(g => g.hasBreakfast),
      hasGuestLunch: guests.some(g => g.hasLunch),
      paymentReference: data.paymentReference || '',
      cateringStatus: 'requested',
      approvalStatus: 'pending',
      paymentStatus: data.paymentReference ? 'submitted' : 'pending',
      applicationDate: new Date().toISOString(),
      reviewNotes: 'Application pending review by Warhawks Tournament Operations'
    };

    this.schema.registrations.unshift(newReg);
    this.saveToStorage();
    this.logAction(data.tournamentId, newReg.fullName, 'player', 'PLAYER_REGISTERED', 'Registration', newReg.id, `Application submitted by ${newReg.fullName}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createRegistration(newReg).catch(err => console.warn('Supabase createRegistration notice:', err.message));
    }
    return newReg;
  }

  updateRegistration(id, updates) {
    const idx = (this.schema.registrations || []).findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Registration record not found');

    const currentReg = this.schema.registrations[idx];
    const updated = { ...currentReg, ...updates };

    // Synchronize guests array if guestCount or guests was provided
    if (updates.guestCount !== undefined || updates.guests !== undefined) {
      const gCount = Math.max(0, parseInt(updated.guestCount, 10) || 0);
      updated.guestCount = gCount;
      if (gCount === 0) {
        updated.guests = [];
      } else if (Array.isArray(updated.guests)) {
        updated.guests = updated.guests.slice(0, gCount).map((g, i) => ({
          guestNumber: i + 1,
          dietaryPreference: (g?.dietaryPreference === 'Non-Veg' || g?.dietaryPreference === 'Non-Vegetarian') ? 'Non-Veg' : 'Veg',
          hasBreakfast: Boolean(g?.hasBreakfast),
          hasLunch: Boolean(g?.hasLunch)
        }));
        while (updated.guests.length < gCount) {
          updated.guests.push({
            guestNumber: updated.guests.length + 1,
            dietaryPreference: 'Veg',
            hasBreakfast: false,
            hasLunch: false
          });
        }
      } else {
        updated.guests = Array.from({ length: gCount }, (_, i) => ({
          guestNumber: i + 1,
          dietaryPreference: updated.guestFoodPreference || 'Veg',
          hasBreakfast: Boolean(updated.hasGuestBreakfast),
          hasLunch: Boolean(updated.hasGuestLunch)
        }));
      }
      updated.guestFoodPreference = updated.guests[0]?.dietaryPreference || 'Veg';
      updated.hasGuestBreakfast = updated.guests.some(g => g.hasBreakfast);
      updated.hasGuestLunch = updated.guests.some(g => g.hasLunch);
    }

    this.schema.registrations[idx] = updated;
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateRegistration(id, updated).catch(err => console.warn('Supabase updateRegistration notice:', err.message));
    }
    return this.schema.registrations[idx];
  }

  updateRegistrationStatus(id, approvalStatus, reviewNotes) {
    const reg = (this.schema.registrations || []).find(r => r.id === id);
    if (!reg) return;
    reg.approvalStatus = approvalStatus;
    if (reviewNotes) reg.reviewNotes = reviewNotes;
    reg.reviewedBy = 'Warhawks Organizer';

    if (approvalStatus === 'approved') {
      const exists = (this.schema.players || []).find(p => p.email === reg.email && p.tournamentId === reg.tournamentId);
      if (!exists) {
        this.createPlayer({
          tournamentId: reg.tournamentId,
          name: reg.fullName,
          jerseyNumber: reg.preferredJerseyNo,
          role: reg.primaryRole,
          battingStyle: reg.battingStyle,
          bowlingStyle: reg.bowlingStyle,
          basePrice: 500000,
          auctionStatus: 'available',
          isCaptain: false,
          isOverseas: false,
          email: reg.email,
          phone: reg.phone,
          city: reg.city,
          shirtSize: reg.shirtSize,
          foodPreference: reg.foodPreference,
          registrationStatus: 'approved',
          paymentStatus: reg.paymentStatus
        });
      }
    }
    this.saveToStorage();
    this.logAction(reg.tournamentId, 'Warhawks Operations', 'organizer', 'REGISTRATION_STATUS_UPDATE', 'Registration', id, `Updated ${reg.fullName} status to ${approvalStatus}`);

    if (isSupabaseConfigured()) {
      supabaseDb.updateRegistration(id, { approvalStatus, reviewNotes, reviewedBy: 'Warhawks Organizer' }).catch(err => console.warn('Supabase updateRegistration status notice:', err.message));
    }
  }

  updateRegistrationCateringStatus(id, cateringStatus) {
    return this.updateRegistration(id, { cateringStatus });
  }

  cancelRegistration(id, userEmail) {
    const reg = (this.schema.registrations || []).find(r => r.id === id);
    if (!reg) throw new Error('Registration record not found');
    if (userEmail && reg.email?.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Unauthorized to cancel this registration.');
    }
    this.schema.registrations = this.schema.registrations.filter(r => r.id !== id);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.cancelRegistration(id).catch(err => console.warn('Supabase cancelRegistration notice:', err.message));
    }
    return { success: true, message: 'Application cancelled.' };
  }

  // ==========================================
  // AUCTION SYSTEM
  // ==========================================
  getAuctionConfig(tournamentId) {
    if (!tournamentId) return { baseBudget: 10000000, currentHighestBid: 0, isAuctionLive: false };
    if (!this.schema.auctionConfigs[tournamentId]) {
      this.schema.auctionConfigs[tournamentId] = {
        tournamentId,
        baseBudget: 10000000,
        bidIncrements: [
          { upTo: 1000000, increment: 50000 },
          { upTo: 5000000, increment: 100000 },
          { upTo: 10000000, increment: 250000 }
        ],
        isAuctionLive: false,
        activePlayerId: undefined,
        currentHighestBid: 0,
        currentLeadingTeamId: undefined
      };
    }
    return { ...this.schema.auctionConfigs[tournamentId] };
  }

  updateAuctionConfig(tournamentId, updates) {
    if (!tournamentId) return;
    const current = this.getAuctionConfig(tournamentId);
    this.schema.auctionConfigs[tournamentId] = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateAuctionConfig(tournamentId, updates).catch(err => console.warn('Supabase updateAuctionConfig notice:', err.message));
    }
    return this.schema.auctionConfigs[tournamentId];
  }

  getAuctionBids(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.auctionBids || []).filter(b => b.tournamentId === tournamentId);
  }

  placeAuctionBid(tournamentId, playerId, teamId, amount) {
    const team = (this.schema.teams || []).find(t => t.id === teamId);
    const player = (this.schema.players || []).find(p => p.id === playerId);
    if (!team || !player) return { success: false, message: 'Team or player not found' };

    if (amount > (team.budgetRemaining || 0)) {
      return { success: false, message: `${team.name} has insufficient remaining budget.` };
    }

    const newBid = {
      id: `bid-${Date.now().toString(36)}`,
      tournamentId,
      playerId,
      teamId,
      amount,
      timestamp: new Date().toISOString()
    };
    this.schema.auctionBids.unshift(newBid);

    const config = this.getAuctionConfig(tournamentId);
    config.currentHighestBid = amount;
    config.currentLeadingTeamId = teamId;
    config.activePlayerId = playerId;
    this.schema.auctionConfigs[tournamentId] = config;

    this.saveToStorage();
    this.logAction(tournamentId, 'Warhawks Auctioneer', 'organizer', 'AUCTION_BID', 'Player', playerId, `${team.name} placed bid of ₹${amount.toLocaleString()}`);

    if (isSupabaseConfigured()) {
      supabaseDb.createAuctionBid(newBid).catch(err => console.warn('Supabase createAuctionBid notice:', err.message));
      supabaseDb.updateAuctionConfig(tournamentId, config).catch(() => {});
    }

    return { success: true, message: `Bid of ₹${amount.toLocaleString()} registered for ${team.name}!` };
  }

  finalizePlayerSale(tournamentId, playerId, teamId, finalAmount) {
    const player = (this.schema.players || []).find(p => p.id === playerId);
    const team = (this.schema.teams || []).find(t => t.id === teamId);
    if (!player || !team) return;

    player.teamId = teamId;
    player.soldPrice = finalAmount;
    player.auctionStatus = 'sold';

    this.syncTeamSquadCount(tournamentId);

    const config = this.getAuctionConfig(tournamentId);
    config.activePlayerId = undefined;
    config.currentLeadingTeamId = undefined;
    config.currentHighestBid = 0;
    this.schema.auctionConfigs[tournamentId] = config;

    this.saveToStorage();
    this.logAction(tournamentId, 'Warhawks Organizer', 'organizer', 'PLAYER_SOLD', 'Player', playerId, `SOLD: ${player.name} to ${team.name} for ₹${finalAmount.toLocaleString()}`);

    if (isSupabaseConfigured()) {
      supabaseDb.updatePlayer(playerId, { teamId, soldPrice: finalAmount, auctionStatus: 'sold' }).catch(() => {});
      supabaseDb.updateAuctionConfig(tournamentId, config).catch(() => {});
    }
  }

  markPlayerUnsold(tournamentId, playerId) {
    const player = (this.schema.players || []).find(p => p.id === playerId);
    if (!player) return;
    player.auctionStatus = 'unsold';
    player.teamId = null;

    const config = this.getAuctionConfig(tournamentId);
    config.activePlayerId = undefined;
    config.currentLeadingTeamId = undefined;
    config.currentHighestBid = 0;
    this.schema.auctionConfigs[tournamentId] = config;

    this.saveToStorage();
    this.logAction(tournamentId, 'Warhawks Organizer', 'organizer', 'PLAYER_UNSOLD', 'Player', playerId, `${player.name} passed unsold.`);

    if (isSupabaseConfigured()) {
      supabaseDb.updatePlayer(playerId, { teamId: null, auctionStatus: 'unsold' }).catch(() => {});
      supabaseDb.updateAuctionConfig(tournamentId, config).catch(() => {});
    }
  }

  // ==========================================
  // RULES & DEMO VIDEOS
  // ==========================================
  getRules(tournamentId) {
    if (!tournamentId) return [];
    const list = (this.schema.rules || []).filter(r => r.tournamentId === tournamentId);
    if (list.length === 0) {
      const defaultRules = getDefaultEditionRules(tournamentId);
      this.schema.rules = [...(this.schema.rules || []), ...defaultRules];
      return defaultRules;
    }
    return list;
  }

  createRule(data) {
    const newRule = {
      ...data,
      id: data.id || `rule-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString()
    };
    this.schema.rules.push(newRule);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.createRule(newRule).catch(err => console.warn('Supabase createRule notice:', err.message));
    }
    return newRule;
  }

  updateRule(id, updates) {
    const idx = (this.schema.rules || []).findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Rule not found');
    this.schema.rules[idx] = { ...this.schema.rules[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.updateRule(id, updates).catch(err => console.warn('Supabase updateRule notice:', err.message));
    }
    return this.schema.rules[idx];
  }

  deleteRule(id) {
    this.schema.rules = (this.schema.rules || []).filter(r => r.id !== id);
    this.saveToStorage();

    if (isSupabaseConfigured()) {
      supabaseDb.deleteRule(id).catch(err => console.warn('Supabase deleteRule notice:', err.message));
    }
  }

  // ==========================================
  // MEDIA, IMPORTS, AUDIT, USERS, SETTINGS
  // ==========================================
  getMediaAssets(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.mediaAssets || []).filter(m => m.tournamentId === tournamentId);
  }

  addMediaAsset(data) {
    const asset = {
      ...data,
      id: data.id || `med-${Date.now().toString(36)}`,
      uploadedAt: new Date().toISOString()
    };
    this.schema.mediaAssets.unshift(asset);
    this.saveToStorage();
    return asset;
  }

  deleteMediaAsset(id) {
    this.schema.mediaAssets = (this.schema.mediaAssets || []).filter(m => m.id !== id);
    this.saveToStorage();
  }

  getImportJobs(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.importJobs || []).filter(j => j.tournamentId === tournamentId);
  }

  recordImportJob(job) {
    const newJob = {
      ...job,
      id: `imp-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString()
    };
    this.schema.importJobs.unshift(newJob);
    this.saveToStorage();
    return newJob;
  }

  getAuditLogs(tournamentId) {
    if (!tournamentId) return [];
    return (this.schema.auditLogs || []).filter(l => l.tournamentId === tournamentId);
  }

  logAction(tournamentId, userName, userRole, action, entityType, entityId, details) {
    const log = {
      id: `log-${Date.now().toString(36)}`,
      tournamentId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    };
    this.schema.auditLogs.unshift(log);
    if (this.schema.auditLogs.length > 200) {
      this.schema.auditLogs.pop();
    }
    this.saveToStorage();
  }

  getUsers() {
    return initialUsers;
  }

  getSettings() {
    return { ...this.schema.settings };
  }

  updateSettings(updates) {
    this.schema.settings = { ...this.schema.settings, ...updates };
    this.saveToStorage();
    return this.schema.settings;
  }

  // Legacy food orders placeholder for backwards compatibility
  getFoodOrders() {
    return [];
  }
}

export const db = new TournamentDatabase();
