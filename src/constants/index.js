// Tournament Admin Constants & Options

// Official Tournament Host & Organizer Identity
export const DEFAULT_ORGANIZER_NAME = 'Warhawks';

export const WARHAWKS_LOGO_URL = '/assets/aistudio/warhawks.logo_359e9cdf.JPG';

export const ORGANIZER_DETAILS = {
  name: 'Warhawks',
  shortName: 'Warhawks',
  title: 'Official Tournament Organizer & Host',
  branch: 'Warhawks Tournament Operations',
  description: 'Warhawks is the official tournament organizing branch responsible for creating, hosting, and sanctioning tournaments on this platform.',
  contactEmail: 'tournaments@warhawks.org',
  headquarters: 'Warhawks Sports Command & Tournament Operations',
  logoUrl: WARHAWKS_LOGO_URL
};

export const TOURNAMENT_STATUSES = ['upcoming', 'current', 'completed', 'archived'];

export const MATCH_STATUSES = ['scheduled', 'live', 'completed', 'abandoned'];

export const PLAYER_ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

export const BATTING_STYLES = ['Right-hand bat', 'Left-hand bat'];

export const BOWLING_STYLES = [
  'Right-arm fast',
  'Right-arm medium',
  'Left-arm fast',
  'Right-arm offbreak',
  'Right-arm legbreak',
  'Slow left-arm orthodox'
];

export const FOOD_PREFERENCES = ['Veg', 'Non-Veg'];

export const MEAL_TYPES = ['Breakfast', 'Lunch'];

export const MEAL_STATUSES = ['requested', 'confirmed', 'served'];

export const SPONSOR_TIERS = [
  'Title Sponsor',
  'Powered By',
  'Associate Sponsor',
  'Official Partner',
  'Beverage Partner'
];

export const EXPENSE_CATEGORIES = [
  'Ground & Pitch',
  'Umpiring & Match Officials',
  'Catering & Food',
  'Live Streaming & Digital Scoring',
  'Trophies, Medals & Awards',
  'Team Kits & Match Balls',
  'Marketing & Media',
  'Medical & Physiotherapy',
  'Miscellaneous'
];

// User Access Roles: Exactly Two Roles (Organizer & Player)
export const USER_ROLES = ['organizer', 'player'];
