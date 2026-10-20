// Centralized Two-Role RBAC Authorization Architecture: Organizer & Player
import { DEFAULT_ORGANIZER_NAME } from '../constants';

export const ROLES = {
  ORGANIZER: 'organizer',
  PLAYER: 'player'
};

export const USER_ROLES = [ROLES.ORGANIZER, ROLES.PLAYER];

export const ROLE_METADATA = {
  [ROLES.ORGANIZER]: {
    id: ROLES.ORGANIZER,
    label: 'Organizer',
    badge: 'Warhawks Host',
    description: 'Full operational control, tournament creation, roster governance, live auctioneer & scoring',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  [ROLES.PLAYER]: {
    id: ROLES.PLAYER,
    label: 'Player',
    badge: 'Registered Athlete',
    description: 'Browse tournaments, view live scorecards & standings, and submit registration applications',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  }
};

/**
 * Checks if user has the Organizer role
 */
export const isOrganizer = (user) => {
  return Boolean(user && user.role === ROLES.ORGANIZER);
};

/**
 * Checks if user has the Player role
 */
export const isPlayer = (user) => {
  return Boolean(user && user.role === ROLES.PLAYER);
};

/**
 * Fine-grained capability evaluation
 */
export const hasPermission = (user, capability) => {
  if (!user) return false;
  // Organizers have universal read and write capabilities
  if (user.role === ROLES.ORGANIZER) return true;

  // Explicit player whitelist
  const playerCapabilities = {
    browse_tournaments: true,
    view_details: true,
    view_fixtures: true,
    view_standings: true,
    view_rules_videos: true,
    view_auction_room: true,
    view_teams_squads: true,
    register_tournament: true,
    cancel_own_registration: true,
    view_own_profile: true,
    // Explicitly denied to players
    manage_tournaments: false,
    manage_teams: false,
    manage_players: false,
    manage_fixtures: false,
    enter_scores: false,
    publish_results: false,
    operate_auction_gavel: false,
    manage_sponsorships: false,
    manage_expenses: false,
    manage_dietary_catering: false,
    manage_rules: false,
    review_registrations: false,
    upload_media: false,
    import_cricheroes: false,
    manage_settings: false,
    manage_user_access: false
  };

  return Boolean(playerCapabilities[capability]);
};

/**
 * Navigation Sections restricted to Organizers
 */
export const ORGANIZER_ONLY_SECTIONS = [
  'dashboard',
  'editions',
  'sponsorships',
  'expenses',
  'food_preferences',
  'media_library',
  'import_history',
  'settings'
];

/**
 * Tests if a section is restricted to organizers
 */
export const isRestrictedSection = (sectionId, user) => {
  if (!user || user.role === ROLES.ORGANIZER) return false;
  return ORGANIZER_ONLY_SECTIONS.includes(sectionId);
};
