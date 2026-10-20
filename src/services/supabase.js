import { createClient } from '@supabase/supabase-js';
import { isOrganizerAuthenticated, getOrganizerSession } from './auth';

const STORAGE_SETTINGS_KEY = 'warhawks_supabase_config_v1';

// Read environment defaults or runtime storage overrides
const getInitialConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url, anonKey: parsed.anonKey };
      }
    }
  } catch {
    // Ignore storage errors
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
};

let activeConfig = getInitialConfig();
let supabaseInstance = null;

export const isSupabaseConfigured = () => {
  const { url, anonKey } = activeConfig;
  return Boolean(
    url &&
    anonKey &&
    !url.includes('[YOUR-PROJECT-REF]') &&
    !anonKey.includes('your-supabase-anon-key') &&
    url.startsWith('https://')
  );
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const session = typeof getOrganizerSession === 'function' ? getOrganizerSession() : null;
  const currentToken = session?.token || '';

  // Ensure client instance uses active organizer session token header
  if (!supabaseInstance || supabaseInstance._whkToken !== currentToken) {
    try {
      const headers = currentToken ? { 'x-organizer-token': currentToken } : {};
      supabaseInstance = createClient(activeConfig.url, activeConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers
        }
      });
      supabaseInstance._whkToken = currentToken;
    } catch (err) {
      console.warn('Supabase client initialization warning:', err.message);
      return null;
    }
  }

  return supabaseInstance;
};

/**
 * Updates the Supabase configuration at runtime (Strictly restricted to Admin / Organizer)
 */
export const updateSupabaseConfig = (url, anonKey) => {
  if (!isOrganizerAuthenticated()) {
    throw new Error('Access Denied: Only tournament administrators can modify database connection credentials.');
  }

  activeConfig = { url: (url || '').trim(), anonKey: (anonKey || '').trim() };
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(activeConfig));
  } catch {
    // ignore
  }
  supabaseInstance = null; // force re-instantiation
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed', { detail: activeConfig }));
  }
  return getSupabaseClient();
};

/**
 * Clears runtime configuration and reverts to local store (Strictly restricted to Admin)
 */
export const clearSupabaseConfig = () => {
  if (!isOrganizerAuthenticated()) {
    throw new Error('Access Denied: Only tournament administrators can reset database connection credentials.');
  }

  activeConfig = {
    url: '',
    anonKey: ''
  };
  try {
    localStorage.removeItem(STORAGE_SETTINGS_KEY);
  } catch {
    // ignore
  }
  supabaseInstance = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed', { detail: activeConfig }));
  }
  return true;
};

/**
 * Returns current configuration.
 * Sensitive API keys are masked unless the active user is an authorized Organizer/Admin.
 */
export const getSupabaseConfig = (allowUnauthenticated = false) => {
  const isAdmin = isOrganizerAuthenticated();
  if (isAdmin || allowUnauthenticated) {
    return { ...activeConfig };
  }
  // Mask sensitive database parameters from regular players
  return {
    url: activeConfig.url ? `${activeConfig.url.slice(0, 15)}...[Admin Only]` : '',
    anonKey: activeConfig.anonKey ? '••••••••••••••••[Admin Protected]' : ''
  };
};

/**
 * Live test to verify Supabase connectivity and credential validity
 * Restricted to Admin / Organizer session
 */
export const testSupabaseConnection = async (testUrl, testAnonKey) => {
  if (!isOrganizerAuthenticated()) {
    return {
      connected: false,
      message: 'Access Denied: Database diagnostics and credential tests are restricted to Administrators.'
    };
  }

  const url = (testUrl || activeConfig.url || '').trim();
  const anonKey = (testAnonKey || activeConfig.anonKey || '').trim();

  if (!url || !anonKey) {
    return {
      connected: false,
      message: 'Supabase Project URL and Anon Key are required.'
    };
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    return {
      connected: false,
      message: 'Invalid Supabase URL format. Must start with https:// and end with .supabase.co'
    };
  }

  const startTime = Date.now();
  try {
    // Create a temporary client for testing
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    // Test a basic API ping via the auth health endpoint or public table probe
    const { data, error } = await testClient.from('tournaments').select('count', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      // If table doesn't exist yet, it's still a valid connected Supabase project!
      if (error.code === '42P01' || error.message?.includes('relation "public.tournaments" does not exist')) {
        return {
          connected: true,
          latency,
          needsMigration: true,
          message: `Connected to Supabase project in ${latency}ms! Database schema needs to be initialized.`
        };
      }

      // If invalid API key
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('key')) {
        return {
          connected: false,
          latency,
          message: 'Invalid Supabase Anon Key. Check Project Settings -> API in your Supabase dashboard.'
        };
      }

      return {
        connected: false,
        latency,
        message: `Supabase returned error: ${error.message}`
      };
    }

    return {
      connected: true,
      latency,
      needsMigration: false,
      message: `Successfully connected to Supabase PostgreSQL cluster! Latency: ${latency}ms.`
    };
  } catch (err) {
    return {
      connected: false,
      message: `Connection failed: ${err.message || 'Network error or CORS block'}`
    };
  }
};
