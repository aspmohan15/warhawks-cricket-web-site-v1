// Supabase PostgreSQL Data Layer for Warhawks Tournament Management
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { getOrganizerSession } from './auth';

/**
 * Normalizes a tournament record from database row to frontend model
 */
const mapTournamentFromDb = (row) => ({
  id: row.id,
  name: row.name,
  editionNumber: row.edition_number,
  year: row.year,
  format: row.format,
  status: row.status,
  organizer: row.organizer || 'Warhawks',
  organizerRole: row.organizer_role,
  organizerBranch: row.organizer_branch,
  startDate: row.start_date,
  endDate: row.end_date,
  venue: row.venue,
  city: row.city,
  registrationOpen: Boolean(row.registration_open),
  registrationStartDate: row.registration_start_date,
  registrationEndDate: row.registration_end_date,
  totalBudgetPointsPerTeam: Number(row.total_budget_points_per_team),
  pointsPerWin: row.points_per_win,
  pointsPerTie: row.points_per_tie,
  maxSquadSize: row.max_squad_size,
  minSquadSize: row.min_squad_size,
  maxOverseasPlayers: row.max_overseas_players,
  description: row.description,
  upiQrCodeUrl: row.upi_qr_code_url || '',
  upiId: row.upi_id || '',
  registrationFee: row.registration_fee ? Number(row.registration_fee) : 1500,
  isArchived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Normalizes a team record from database row
 */
const mapTeamFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  name: row.name,
  shortCode: row.short_code,
  city: row.city,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  logoUrl: row.logo_url,
  ownerName: row.owner_name,
  captainPlayerId: row.captain_player_id,
  budgetTotal: Number(row.budget_total),
  budgetSpent: Number(row.budget_spent),
  budgetRemaining: Number(row.budget_remaining),
  totalPlayersAssigned: row.total_players_assigned,
  createdAt: row.created_at
});

/**
 * Normalizes a player record from database row
 */
const mapPlayerFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  teamId: row.team_id,
  name: row.name,
  jerseyNumber: row.jersey_number,
  role: row.role,
  battingStyle: row.batting_style,
  bowlingStyle: row.bowling_style,
  basePrice: Number(row.base_price),
  soldPrice: row.sold_price ? Number(row.sold_price) : null,
  auctionStatus: row.auction_status,
  isCaptain: Boolean(row.is_captain),
  isViceCaptain: Boolean(row.is_vice_captain),
  isWicketKeeper: Boolean(row.is_wicket_keeper),
  isOverseas: Boolean(row.is_overseas),
  email: row.email,
  phone: row.phone,
  city: row.city,
  shirtSize: row.shirt_size,
  foodPreference: row.food_preference,
  registrationStatus: row.registration_status,
  paymentStatus: row.payment_status,
  matchesPlayed: row.matches_played,
  runsScored: row.runs_scored,
  highestScore: row.highest_score,
  wicketsTaken: row.wickets_taken,
  bestBowling: row.best_bowling,
  strikeRate: Number(row.strike_rate),
  economyRate: Number(row.economy_rate),
  createdAt: row.created_at
});

/**
 * Normalizes a match record from database row
 */
const mapMatchFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  matchNumber: row.match_number,
  round: row.round,
  teamAId: row.team_a_id,
  teamBId: row.team_b_id,
  date: row.date,
  time: row.time,
  venue: row.venue,
  status: row.status,
  tossWinnerId: row.toss_winner_id,
  tossDecision: row.toss_decision,
  teamAScore: row.team_a_score,
  teamAOvers: row.team_a_overs ? Number(row.team_a_overs) : null,
  teamBScore: row.team_b_score,
  teamBOvers: row.team_b_overs ? Number(row.team_b_overs) : null,
  winnerId: row.winner_id,
  resultSummary: row.result_summary,
  manOfTheMatchPlayerId: row.man_of_the_match_player_id,
  isImported: Boolean(row.is_imported),
  importSource: row.import_source,
  cricheroesMatchId: row.cricheroes_match_id,
  createdAt: row.created_at
});

/**
 * Normalizes a sponsor record from database row
 */
const mapSponsorFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  name: row.name,
  contactNumber: row.contact_number,
  contributionAmount: Number(row.contribution_amount),
  contactEmail: row.contact_email,
  tier: row.tier || 'Official Partner',
  benefitsDescription: row.benefits_description,
  websiteUrl: row.website_url,
  isActive: Boolean(row.is_active),
  displayOnPublicWeb: Boolean(row.display_on_public_web),
  createdAt: row.created_at
});

/**
 * Normalizes a registration record from database row
 */
const mapRegistrationFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  age: row.age,
  city: row.city,
  primaryRole: row.primary_role,
  battingStyle: row.batting_style,
  bowlingStyle: row.bowling_style,
  preferredJerseyNo: row.preferred_jersey_no,
  shirtSize: row.shirt_size,
  foodPreference: row.food_preference,
  hasBreakfast: Boolean(row.has_breakfast),
  hasLunch: Boolean(row.has_lunch),
  guestCount: Number(row.guest_count) || 0,
  guests: Array.isArray(row.guests)
    ? row.guests
    : typeof row.guests === 'string'
    ? (() => {
        try {
          return JSON.parse(row.guests);
        } catch {
          return [];
        }
      })()
    : [],
  guestFoodPreference: row.guest_food_preference || 'Veg',
  hasGuestBreakfast: Boolean(row.has_guest_breakfast),
  hasGuestLunch: Boolean(row.has_guest_lunch),
  paymentReference: row.payment_reference || '',
  cateringStatus: row.catering_status || 'requested',
  approvalStatus: row.approval_status,
  paymentStatus: row.payment_status,
  cricHeroesProfileUrl: row.cric_heroes_profile_url,
  applicationDate: row.application_date,
  reviewedBy: row.reviewed_by,
  reviewNotes: row.review_notes
});

const mapStandingFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  teamId: row.team_id,
  matchesPlayed: row.matches_played,
  won: row.won,
  lost: row.lost,
  tied: row.tied,
  noResult: row.no_result,
  points: row.points,
  runsScored: row.runs_scored,
  oversFaced: Number(row.overs_faced),
  runsConceded: row.runs_conceded,
  oversBowled: Number(row.overs_bowled),
  netRunRate: Number(row.net_run_rate)
});

const mapExpenseFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id || row.tournamentId,
  title: row.title,
  category: row.category,
  amount: Number(row.amount) || 0,
  advanceAmount: Number(row.advance_amount ?? row.advanceAmount ?? 0),
  date: row.date ? (row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0]) : new Date().toISOString().split('T')[0],
  vendorName: row.vendor_name || row.vendorName || '',
  receiptUrl: row.receipt_url || row.receiptUrl || '',
  paymentMode: row.payment_mode || row.paymentMode || 'Bank Transfer',
  paymentStatus: row.payment_status || row.paymentStatus || 'paid',
  notes: row.notes || '',
  createdAt: row.created_at || row.createdAt
});

const mapRuleFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  title: row.title,
  category: row.category,
  content: row.content,
  videoUrl: row.video_url,
  isPublished: Boolean(row.is_published),
  updatedAt: row.updated_at
});

const mapMediaAssetFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  title: row.title,
  category: row.category,
  fileUrl: row.file_url,
  fileType: row.file_type,
  fileSizeKb: row.file_size_kb,
  tags: row.tags || [],
  uploadedAt: row.uploaded_at
});

const mapImportJobFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  jobType: row.job_type,
  fileName: row.file_name,
  totalRows: row.total_rows,
  importedRows: row.imported_rows,
  skippedRows: row.skipped_rows,
  status: row.status,
  importSummary: row.import_summary,
  errors: row.errors || [],
  importedBy: row.imported_by,
  createdAt: row.created_at
});

const mapAuditLogFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  userName: row.user_name,
  userRole: row.user_role,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details,
  timestamp: row.timestamp
});

const mapAuctionConfigFromDb = (row) => ({
  tournamentId: row.tournament_id,
  baseBudget: Number(row.base_budget),
  bidIncrements: row.bid_increments || [
    { upTo: 1000000, increment: 50000 },
    { upTo: 5000000, increment: 100000 },
    { upTo: 10000000, increment: 250000 }
  ],
  isAuctionLive: Boolean(row.is_auction_live),
  activePlayerId: row.active_player_id || undefined,
  currentHighestBid: Number(row.current_highest_bid || 0),
  currentLeadingTeamId: row.current_leading_team_id || undefined,
  auctionDemoVideoUrl: row.auction_demo_video_url || undefined,
  updatedAt: row.updated_at
});

const mapAuctionBidFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  playerId: row.player_id,
  teamId: row.team_id,
  amount: Number(row.amount),
  timestamp: row.timestamp
});

const mapAnnouncementFromDb = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  message: row.message,
  displayOrder: Number(row.display_order ?? 0),
  isActive: Boolean(row.is_active),
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const supabaseDb = {
  // Tournaments
  async getTournaments() {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('tournaments')
      .select('*')
      .order('edition_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTournamentFromDb);
  },

  async createTournament(t) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    // Attempt server-side authorized route first
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(t)
      });
      if (res.ok) {
        const data = await res.json();
        return mapTournamentFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to create tournaments.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
      // Fallback for Netlify / client-direct mode using Supabase client with organizer token header
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: t.id,
      name: t.name,
      edition_number: t.editionNumber,
      year: t.year,
      format: t.format || 'T20',
      status: t.status || 'upcoming',
      organizer: t.organizer || 'Warhawks',
      organizer_role: t.organizerRole || 'Official Tournament Organizer & Host',
      organizer_branch: t.organizerBranch || 'Warhawks Tournament Operations',
      start_date: t.startDate,
      end_date: t.endDate,
      venue: t.venue,
      city: t.city,
      registration_open: Boolean(t.registrationOpen),
      registration_start_date: t.registrationStartDate,
      registration_end_date: t.registrationEndDate,
      total_budget_points_per_team: t.totalBudgetPointsPerTeam || 10000000,
      points_per_win: t.pointsPerWin ?? 2,
      points_per_tie: t.pointsPerTie ?? 1,
      max_squad_size: t.maxSquadSize || 18,
      min_squad_size: t.minSquadSize || 14,
      max_overseas_players: t.maxOverseasPlayers || 4,
      description: t.description || '',
      upi_qr_code_url: t.upiQrCodeUrl || '',
      upi_id: t.upiId || 'warhawks.sports@icici',
      registration_fee: Number(t.registrationFee) || 1500,
      is_archived: Boolean(t.isArchived)
    };

    const { data, error } = await client.from('tournaments').insert([row]).select().single();
    if (error) throw error;
    return mapTournamentFromDb(data);
  },

  async updateTournament(id, updates) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        return mapTournamentFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to update tournaments.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.editionNumber !== undefined) row.edition_number = updates.editionNumber;
    if (updates.year !== undefined) row.year = updates.year;
    if (updates.format !== undefined) row.format = updates.format;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.startDate !== undefined) row.start_date = updates.startDate;
    if (updates.endDate !== undefined) row.end_date = updates.endDate;
    if (updates.venue !== undefined) row.venue = updates.venue;
    if (updates.city !== undefined) row.city = updates.city;
    if (updates.registrationOpen !== undefined) row.registration_open = updates.registrationOpen;
    if (updates.registrationStartDate !== undefined) row.registration_start_date = updates.registrationStartDate;
    if (updates.registrationEndDate !== undefined) row.registration_end_date = updates.registrationEndDate;
    if (updates.totalBudgetPointsPerTeam !== undefined) row.total_budget_points_per_team = updates.totalBudgetPointsPerTeam;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.upiQrCodeUrl !== undefined) row.upi_qr_code_url = updates.upiQrCodeUrl;
    if (updates.upiId !== undefined) row.upi_id = updates.upiId;
    if (updates.registrationFee !== undefined) row.registration_fee = updates.registrationFee;
    if (updates.isArchived !== undefined) row.is_archived = updates.isArchived;

    const { data, error } = await client.from('tournaments').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapTournamentFromDb(data);
  },

  async deleteTournament(id) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) return;
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to delete tournaments.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('tournaments').delete().eq('id', id);
    if (error) throw error;
  },

  // Teams
  async getTeams(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name');

    if (error) throw error;
    return (data || []).map(mapTeamFromDb);
  },

  async createTeam(tm) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tm)
      });
      if (res.ok) {
        const data = await res.json();
        return mapTeamFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to manage teams.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: tm.id,
      tournament_id: tm.tournamentId,
      name: tm.name,
      short_code: tm.shortCode,
      city: tm.city,
      primary_color: tm.primaryColor || '#0284c7',
      secondary_color: tm.secondaryColor || '#0f172a',
      owner_name: tm.ownerName,
      budget_total: tm.budgetTotal || 10000000,
      budget_spent: tm.budgetSpent || 0,
      budget_remaining: tm.budgetRemaining ?? tm.budgetTotal ?? 10000000,
      total_players_assigned: tm.totalPlayersAssigned || 0
    };

    const { data, error } = await client.from('teams').insert([row]).select().single();
    if (error) throw error;
    return mapTeamFromDb(data);
  },

  async updateTeam(id, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.shortCode !== undefined) row.short_code = updates.shortCode;
    if (updates.city !== undefined) row.city = updates.city;
    if (updates.primaryColor !== undefined) row.primary_color = updates.primaryColor;
    if (updates.secondaryColor !== undefined) row.secondary_color = updates.secondaryColor;
    if (updates.ownerName !== undefined) row.owner_name = updates.ownerName;
    if (updates.captainPlayerId !== undefined) row.captain_player_id = updates.captainPlayerId;
    if (updates.budgetTotal !== undefined) row.budget_total = updates.budgetTotal;
    if (updates.budgetSpent !== undefined) row.budget_spent = updates.budgetSpent;
    if (updates.budgetRemaining !== undefined) row.budget_remaining = updates.budgetRemaining;
    if (updates.totalPlayersAssigned !== undefined) row.total_players_assigned = updates.totalPlayersAssigned;

    const { data, error } = await client.from('teams').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapTeamFromDb(data);
  },

  async deleteTeam(id) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('teams').delete().eq('id', id);
    if (error) throw error;
  },

  // Players
  async getPlayers(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name');

    if (error) throw error;
    return (data || []).map(mapPlayerFromDb);
  },

  async createPlayer(p) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        const data = await res.json();
        return mapPlayerFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to enroll players.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
      // Fallback for Netlify / client-direct mode using Supabase client with organizer token header
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: p.id,
      tournament_id: p.tournamentId,
      team_id: p.teamId || null,
      name: p.name,
      jersey_number: p.jerseyNumber,
      role: p.role || 'All-Rounder',
      batting_style: p.battingStyle || 'Right-hand bat',
      bowling_style: p.bowlingStyle || 'Right-arm medium',
      base_price: p.basePrice || 500000,
      sold_price: p.soldPrice || null,
      auction_status: p.auctionStatus || 'available',
      is_captain: Boolean(p.isCaptain),
      is_vice_captain: Boolean(p.isViceCaptain),
      is_wicket_keeper: Boolean(p.isWicketKeeper),
      is_overseas: Boolean(p.isOverseas),
      email: p.email,
      phone: p.phone,
      city: p.city,
      shirt_size: p.shirtSize || 'L',
      food_preference: p.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      registration_status: p.registrationStatus || 'approved',
      payment_status: p.paymentStatus || 'paid',
      matches_played: p.matchesPlayed || 0,
      runs_scored: p.runsScored || 0,
      highest_score: p.highestScore || 0,
      wickets_taken: p.wicketsTaken || 0,
      best_bowling: p.bestBowling || '-',
      strike_rate: p.strikeRate || 0,
      economy_rate: p.economyRate || 0
    };

    const { data, error } = await client.from('players').insert([row]).select().single();
    if (error) throw error;
    return mapPlayerFromDb(data);
  },

  async updatePlayer(id, updates) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        return mapPlayerFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to update player profiles.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.teamId !== undefined) row.team_id = updates.teamId || null;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.jerseyNumber !== undefined) row.jersey_number = updates.jerseyNumber;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.battingStyle !== undefined) row.batting_style = updates.battingStyle;
    if (updates.bowlingStyle !== undefined) row.bowling_style = updates.bowlingStyle;
    if (updates.basePrice !== undefined) row.base_price = updates.basePrice;
    if (updates.soldPrice !== undefined) row.sold_price = updates.soldPrice;
    if (updates.auctionStatus !== undefined) row.auction_status = updates.auctionStatus;
    if (updates.isCaptain !== undefined) row.is_captain = updates.isCaptain;
    if (updates.isViceCaptain !== undefined) row.is_vice_captain = updates.isViceCaptain;
    if (updates.isWicketKeeper !== undefined) row.is_wicket_keeper = updates.isWicketKeeper;
    if (updates.isOverseas !== undefined) row.is_overseas = updates.isOverseas;
    if (updates.city !== undefined) row.city = updates.city;
    if (updates.foodPreference !== undefined) row.food_preference = updates.foodPreference;

    const { data, error } = await client.from('players').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapPlayerFromDb(data);
  },

  async deletePlayer(id) {
    const session = getOrganizerSession();
    const token = session?.token || '';

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) return;
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to delete players.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('players').delete().eq('id', id);
    if (error) throw error;
  },

  // Matches
  async getMatches(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('match_number');

    if (error) throw error;
    return (data || []).map(mapMatchFromDb);
  },

  async createMatch(m) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: m.id,
      tournament_id: m.tournamentId,
      match_number: m.matchNumber,
      round: m.round || 'Group Stage',
      team_a_id: m.teamAId,
      team_b_id: m.teamBId,
      date: m.date,
      time: m.time,
      venue: m.venue,
      status: m.status || 'scheduled',
      is_imported: Boolean(m.isImported),
      import_source: m.importSource || 'manual'
    };

    const { data, error } = await client.from('matches').insert([row]).select().single();
    if (error) throw error;
    return mapMatchFromDb(data);
  },

  async updateMatch(id, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.tossWinnerId !== undefined) row.toss_winner_id = updates.tossWinnerId;
    if (updates.tossDecision !== undefined) row.toss_decision = updates.tossDecision;
    if (updates.teamAScore !== undefined) row.team_a_score = updates.teamAScore;
    if (updates.teamAOvers !== undefined) row.team_a_overs = updates.teamAOvers;
    if (updates.teamBScore !== undefined) row.team_b_score = updates.teamBScore;
    if (updates.teamBOvers !== undefined) row.team_b_overs = updates.teamBOvers;
    if (updates.winnerId !== undefined) row.winner_id = updates.winnerId;
    if (updates.resultSummary !== undefined) row.result_summary = updates.resultSummary;
    if (updates.manOfTheMatchPlayerId !== undefined) row.man_of_the_match_player_id = updates.manOfTheMatchPlayerId;

    const { data, error } = await client.from('matches').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapMatchFromDb(data);
  },

  async deleteMatch(id) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('matches').delete().eq('id', id);
    if (error) throw error;
  },

  // Standings
  async getStandings(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('standings')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false })
      .order('net_run_rate', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapStandingFromDb);
  },

  // Sponsors
  async getSponsors(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('sponsors')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapSponsorFromDb);
  },

  async createSponsor(s) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: s.id,
      tournament_id: s.tournamentId,
      name: s.name,
      contact_number: s.contactNumber,
      contribution_amount: s.contributionAmount || 0,
      contact_email: s.contactEmail || null,
      tier: s.tier || 'Official Partner',
      benefits_description: s.benefitsDescription || null,
      website_url: s.websiteUrl || null,
      is_active: s.isActive ?? true,
      display_on_public_web: s.displayOnPublicWeb ?? true
    };

    const { data, error } = await client.from('sponsors').insert([row]).select().single();
    if (error) throw error;
    return mapSponsorFromDb(data);
  },

  async updateSponsor(id, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.contactNumber !== undefined) row.contact_number = updates.contactNumber;
    if (updates.contributionAmount !== undefined) row.contribution_amount = updates.contributionAmount;
    if (updates.contactEmail !== undefined) row.contact_email = updates.contactEmail;
    if (updates.displayOnPublicWeb !== undefined) row.display_on_public_web = updates.displayOnPublicWeb;

    const { data, error } = await client.from('sponsors').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapSponsorFromDb(data);
  },

  async deleteSponsor(id) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('sponsors').delete().eq('id', id);
    if (error) throw error;
  },

  // Registrations (Player and Guest Meal Logistics)
  async getRegistrations(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('application_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRegistrationFromDb);
  },

  async createRegistration(reg) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: reg.id,
      tournament_id: reg.tournamentId,
      full_name: reg.fullName,
      email: reg.email,
      phone: reg.phone,
      age: reg.age,
      city: reg.city,
      primary_role: reg.primaryRole,
      batting_style: reg.battingStyle,
      bowling_style: reg.bowlingStyle,
      preferred_jersey_no: reg.preferredJerseyNo,
      shirt_size: reg.shirtSize,
      food_preference: reg.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      has_breakfast: Boolean(reg.hasBreakfast),
      has_lunch: Boolean(reg.hasLunch),
      guest_count: Number(reg.guestCount) || 0,
      guests: Array.isArray(reg.guests) ? reg.guests : [],
      guest_food_preference: reg.guestFoodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      has_guest_breakfast: Boolean(reg.hasGuestBreakfast ?? reg.has_guest_breakfast),
      has_guest_lunch: Boolean(reg.hasGuestLunch ?? reg.has_guest_lunch),
      payment_reference: reg.paymentReference || '',
      catering_status: reg.cateringStatus || 'requested',
      approval_status: reg.approvalStatus || 'pending',
      payment_status: reg.paymentStatus || 'pending'
    };

    const { data, error } = await client.from('registrations').insert([row]).select().single();
    if (error) throw error;
    return mapRegistrationFromDb(data);
  },

  async updateRegistration(id, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.approvalStatus !== undefined) row.approval_status = updates.approvalStatus;
    if (updates.reviewNotes !== undefined) row.review_notes = updates.reviewNotes;
    if (updates.reviewedBy !== undefined) row.reviewed_by = updates.reviewedBy;
    if (updates.foodPreference !== undefined) row.food_preference = updates.foodPreference;
    if (updates.hasBreakfast !== undefined) row.has_breakfast = updates.hasBreakfast;
    if (updates.hasLunch !== undefined) row.has_lunch = updates.hasLunch;
    if (updates.guestCount !== undefined) row.guest_count = updates.guestCount;
    if (updates.guests !== undefined) row.guests = updates.guests;
    if (updates.guestFoodPreference !== undefined) row.guest_food_preference = updates.guestFoodPreference;
    if (updates.hasGuestBreakfast !== undefined || updates.has_guest_breakfast !== undefined) {
      row.has_guest_breakfast = updates.hasGuestBreakfast !== undefined ? updates.hasGuestBreakfast : updates.has_guest_breakfast;
    }
    if (updates.hasGuestLunch !== undefined || updates.has_guest_lunch !== undefined) {
      row.has_guest_lunch = updates.hasGuestLunch !== undefined ? updates.hasGuestLunch : updates.has_guest_lunch;
    }
    if (updates.paymentReference !== undefined) row.payment_reference = updates.paymentReference;
    if (updates.cateringStatus !== undefined) row.catering_status = updates.cateringStatus;

    const { data, error } = await client.from('registrations').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapRegistrationFromDb(data);
  },

  async cancelRegistration(id) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('registrations').delete().eq('id', id);
    if (error) throw error;
  },

  // Expenses
  async getExpenses(tournamentId) {
    try {
      const url = tournamentId ? `/api/expenses?tournamentId=${encodeURIComponent(tournamentId)}` : '/api/expenses';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data || []).map(mapExpenseFromDb);
      }
    } catch {
      // Fallback to direct client
    }

    const client = getSupabaseClient();
    if (!client) return null;

    let query = client.from('expenses').select('*');
    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }
    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapExpenseFromDb);
  },

  async createExpense(exp) {
    const session = getOrganizerSession();
    const token = session?.token;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(exp)
      });
      if (res.ok) {
        const data = await res.json();
        return mapExpenseFromDb(data);
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to record tournament expenses.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: exp.id,
      tournament_id: exp.tournamentId,
      title: exp.title,
      category: exp.category,
      amount: Number(exp.amount) || 0,
      advance_amount: Number(exp.advanceAmount) || 0,
      date: exp.date,
      vendor_name: exp.vendorName,
      receipt_url: exp.receiptUrl || null,
      payment_mode: exp.paymentMode || 'Bank Transfer',
      payment_status: exp.paymentStatus || 'paid',
      notes: exp.notes || null
    };

    const { data, error } = await client.from('expenses').upsert([row]).select().single();
    if (error) throw error;
    return mapExpenseFromDb(data);
  },

  async deleteExpense(id) {
    const session = getOrganizerSession();
    const token = session?.token;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        return { success: true, id };
      }
      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Organizer authorization required to delete expenses.');
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('Organizer authorization required')) throw apiErr;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return { success: true, id };
  },

  // Rules
  async getRules(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('rules')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('category');

    if (error) throw error;
    return (data || []).map(mapRuleFromDb);
  },

  async createRule(r) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: r.id,
      tournament_id: r.tournamentId,
      title: r.title,
      category: r.category,
      content: r.content,
      video_url: r.videoUrl || null,
      is_published: r.isPublished ?? true
    };

    const { data, error } = await client.from('rules').insert([row]).select().single();
    if (error) throw error;
    return mapRuleFromDb(data);
  },

  async updateRule(id, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.content !== undefined) row.content = updates.content;
    if (updates.videoUrl !== undefined) row.video_url = updates.videoUrl;
    if (updates.isPublished !== undefined) row.is_published = updates.isPublished;

    const { data, error } = await client.from('rules').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapRuleFromDb(data);
  },

  async deleteRule(id) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { error } = await client.from('rules').delete().eq('id', id);
    if (error) throw error;
  },

  // Auction Config & Bids
  async getAuctionConfig(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('auction_configs')
      .select('*')
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapAuctionConfigFromDb(data);
  },

  async updateAuctionConfig(tournamentId, updates) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      tournament_id: tournamentId,
      updated_at: new Date().toISOString()
    };
    if (updates.baseBudget !== undefined) row.base_budget = updates.baseBudget;
    if (updates.bidIncrements !== undefined) row.bid_increments = updates.bidIncrements;
    if (updates.isAuctionLive !== undefined) row.is_auction_live = updates.isAuctionLive;
    if (updates.activePlayerId !== undefined) row.active_player_id = updates.activePlayerId;
    if (updates.currentHighestBid !== undefined) row.current_highest_bid = updates.currentHighestBid;
    if (updates.currentLeadingTeamId !== undefined) row.current_leading_team_id = updates.currentLeadingTeamId;
    if (updates.auctionDemoVideoUrl !== undefined) row.auction_demo_video_url = updates.auctionDemoVideoUrl;

    const { data, error } = await client.from('auction_configs').upsert(row, { onConflict: 'tournament_id' }).select().single();
    if (error) throw error;
    return mapAuctionConfigFromDb(data);
  },

  async getAuctionBids(tournamentId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('auction_bids')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAuctionBidFromDb);
  },

  async createAuctionBid(b) {
    const client = getSupabaseClient();
    if (!client) return null;

    const row = {
      id: b.id,
      tournament_id: b.tournamentId,
      player_id: b.playerId,
      team_id: b.teamId,
      amount: b.amount,
      timestamp: b.timestamp || new Date().toISOString()
    };

    const { data, error } = await client.from('auction_bids').insert([row]).select().single();
    if (error) throw error;
    return mapAuctionBidFromDb(data);
  },

  // Announcements
  async getAnnouncements(tournamentId = null, activeOnly = false) {
    try {
      const params = new URLSearchParams();
      if (tournamentId) params.append('tournamentId', tournamentId);
      if (activeOnly) params.append('activeOnly', 'true');
      const res = await fetch(`/api/announcements?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API getAnnouncements notice:', err.message);
    }

    const client = getSupabaseClient();
    if (!client) return [];
    try {
      let query = client.from('announcements').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
      if (tournamentId) query = query.eq('tournament_id', tournamentId);
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase client getAnnouncements error:', error.message);
        return [];
      }
      return (data || []).map(mapAnnouncementFromDb);
    } catch {
      return [];
    }
  },

  async createAnnouncement(ann) {
    const session = getOrganizerSession();
    const token = session?.token;
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(ann)
      });
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create announcement');
    } catch (err) {
      const client = getSupabaseClient();
      if (client) {
        const row = {
          id: ann.id || `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tournament_id: ann.tournamentId || null,
          message: ann.message.trim(),
          display_order: ann.displayOrder ?? 0,
          is_active: ann.isActive ?? true,
          created_by: 'Warhawks Operations'
        };
        const { data, error } = await client.from('announcements').insert([row]).select().single();
        if (error) throw error;
        return mapAnnouncementFromDb(data);
      }
      throw err;
    }
  },

  async updateAnnouncement(id, updates) {
    const session = getOrganizerSession();
    const token = session?.token;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update announcement');
    } catch (err) {
      const client = getSupabaseClient();
      if (client) {
        const row = { updated_at: new Date().toISOString() };
        if (updates.message !== undefined) row.message = updates.message.trim();
        if (updates.isActive !== undefined) row.is_active = updates.isActive;
        if (updates.displayOrder !== undefined) row.display_order = updates.displayOrder;
        const { data, error } = await client.from('announcements').update(row).eq('id', id).select().single();
        if (error) throw error;
        return mapAnnouncementFromDb(data);
      }
      throw err;
    }
  },

  async deleteAnnouncement(id) {
    const session = getOrganizerSession();
    const token = session?.token;
    const res = await fetch(`/api/announcements/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.from('announcements').delete().eq('id', id);
        if (error) throw error;
        return { success: true, id };
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to delete announcement');
    }
    return await res.json();
  },

  async swapAnnouncements(id1, id2) {
    const session = getOrganizerSession();
    const token = session?.token;
    const res = await fetch('/api/announcements/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ id1, id2 })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to swap announcements');
    }
    return await res.json();
  },

  async reorderAnnouncements(items) {
    const session = getOrganizerSession();
    const token = session?.token;
    const res = await fetch('/api/announcements/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ items })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to reorder announcements');
    }
    return await res.json();
  }
};
