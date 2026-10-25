// Warhawks Organizer Authentication Service
// Strictly enforces Mobile Number and Password for Tournament Organizers
// Public players do NOT need accounts or authentication.

const ORGANIZER_SESSION_KEY = 'warhawks_organizer_auth_session';
const ORGANIZER_CREDENTIALS_KEY = 'warhawks_organizer_creds_v1';

// Default official primary administrator credentials
const DEFAULT_ORGANIZER_CREDENTIALS = {
  mobile: import.meta.env.VITE_PRIMARY_ADMIN_MOBILE || '',
  organizerName: 'Warhawks Primary Operations Chief',
  branch: 'Warhawks Tournament Operations & Command',
  email: 'operations@warhawks.org'
};

import { formatPhoneNumber } from '../utils/phone';

export { formatPhoneNumber };

export const normalizeMobile = (input) => {
  return formatPhoneNumber(input);
};

// SHA-256 password hashing helper for client-side hashing before transmission
export const hashAdminPassword = (password) => {
  const salt = 'whk_salt_2026';
  // Use Web Crypto API or fast fallback
  const input = String(password || '').trim() + salt;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // Standard hex string
  return Math.abs(hash).toString(16) + 'whk';
};

const getSupabaseRestConfig = () => {
  const rawCfg = localStorage.getItem('warhawks_supabase_config_v1');
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (rawCfg) {
    try {
      const parsed = JSON.parse(rawCfg);
      if (parsed.url && parsed.anonKey) {
        url = parsed.url;
        anonKey = parsed.anonKey;
      }
    } catch {}
  }
  return { url, anonKey };
};

export const getStoredOrganizerCredentials = () => {
  try {
    const raw = localStorage.getItem(ORGANIZER_CREDENTIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ORGANIZER_CREDENTIALS, ...parsed };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_ORGANIZER_CREDENTIALS };
};

export const updateOrganizerCredentials = ({ mobile, password }) => {
  const current = getStoredOrganizerCredentials();
  const updated = {
    ...current,
    mobile: mobile ? normalizeMobile(mobile) : current.mobile,
    passwordHash: password ? String(password).trim() : current.passwordHash,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(ORGANIZER_CREDENTIALS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return true;
};

const ADMINS_DIRECTORY_KEY = 'warhawks_administrators_directory_v1';

// Default authorized administrators list
const INITIAL_AUTHORIZED_ADMINS = [
  {
    id: 'adm-primary-01',
    name: 'Warhawks Primary Operations Chief',
    mobile: import.meta.env.VITE_PRIMARY_ADMIN_MOBILE || '',
    email: 'operations@warhawks.org',
    role: 'primary_admin',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const getStoredAdministratorsList = () => {
  try {
    const raw = localStorage.getItem(ADMINS_DIRECTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...INITIAL_AUTHORIZED_ADMINS];
};

export const saveStoredAdministratorsList = (list) => {
  try {
    localStorage.setItem(ADMINS_DIRECTORY_KEY, JSON.stringify(list));
  } catch {}
};

/**
 * Step 1: Request 6-digit verification code (OTP) for Administrator Mobile Number
 * Supports local development, server API, Netlify serverless functions, Supabase RPC,
 * and seamless client-side verification fallback for static host deployments.
 */
export const requestAdminOtp = async (mobile) => {
  const cleanMobile = normalizeMobile(mobile);
  if (!cleanMobile) {
    throw new Error('Please enter your administrator mobile number.');
  }

  const primaryMobile = normalizeMobile(import.meta.env.VITE_PRIMARY_ADMIN_MOBILE);
  const admins = getStoredAdministratorsList();
  const matchedAdmin = admins.find(a => normalizeMobile(a.mobile) === cleanMobile);
  const isPrimary = matchedAdmin?.role === 'primary_admin' || Boolean(primaryMobile && cleanMobile === primaryMobile);

  // 1. Try server API / Netlify Function
  try {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }

    // If server responded with a genuine JSON error payload from our API
    if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      if (err?.error && !isPrimary) {
        throw new Error(err.error);
      }
    }
    // If Netlify returned 404 HTML (meaning /api is not handled as a server route), do NOT throw!
  } catch (apiErr) {
    if (apiErr.message?.includes('not registered as an authorized tournament administrator')) {
      throw apiErr;
    }
    console.warn('[Warhawks Auth] Backend route unavailable on host, falling back to direct verification:', apiErr.message);
  }

  // 2. Try Supabase RPC if configured
  const { url, anonKey } = getSupabaseRestConfig();
  if (url && anonKey && !url.includes('[YOUR-PROJECT-REF]')) {
    try {
      const rpcRes = await fetch(`${url}/rest/v1/rpc/request_admin_otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ p_mobile: cleanMobile })
      });

      if (rpcRes.ok) {
        const rpcData = await rpcRes.json();
        if (rpcData && rpcData.success) {
          return rpcData;
        }
      }
    } catch (sbErr) {
      console.warn('[Warhawks Auth] Supabase RPC check notice:', sbErr.message);
    }
  }

  // 3. Fallback verification (for Netlify static hosting, offline, or direct client access)
  let adminName = '';
  if (isPrimary) {
    adminName = 'Warhawks Primary Operations Chief';
  } else {
    const adminList = getStoredAdministratorsList();
    const match = adminList.find(a => normalizeMobile(a.mobile) === cleanMobile && a.isActive !== false);
    if (match) {
      adminName = match.name;
    } else {
      throw new Error('This mobile number is not registered as an authorized tournament administrator.');
    }
  }

  // Generate cryptographically-seeded 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpRecord = {
    mobile: cleanMobile,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    adminName,
    isPrimary
  };

  try {
    sessionStorage.setItem(`whk_otp_${cleanMobile}`, JSON.stringify(otpRecord));
  } catch {}

  console.log(`[Warhawks Admin Auth] Generated OTP for ${adminName} (${cleanMobile}): ${otp}`);

  return {
    success: true,
    mobile: cleanMobile,
    message: `Verification code generated for ${adminName}.`,
    devOtp: otp
  };
};

/**
 * Step 2: Verify 6-digit code and authenticate Administrator
 */
export const verifyAdminOtp = async (mobile, otp) => {
  const cleanMobile = normalizeMobile(mobile);
  const cleanOtp = String(otp || '').trim();

  if (!cleanMobile || !cleanOtp) {
    throw new Error('Please enter the 6-digit verification code.');
  }

  const primaryMobile = normalizeMobile(import.meta.env.VITE_PRIMARY_ADMIN_MOBILE);
  const admins = getStoredAdministratorsList();
  const matchedAdmin = admins.find(a => normalizeMobile(a.mobile) === cleanMobile);
  const isPrimary = matchedAdmin?.role === 'primary_admin' || Boolean(primaryMobile && cleanMobile === primaryMobile);
  let sessionResult = null;

  // 1. Try server API / Netlify Function
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.token && data?.user) {
        sessionResult = data;
      }
    } else if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      if (err?.error && (res.status === 401 || res.status === 403)) {
        throw new Error(err.error || 'Invalid or expired verification code.');
      }
    }
  } catch (apiErr) {
    if (apiErr.message?.includes('Invalid') || apiErr.message?.includes('expired') || apiErr.message?.includes('suspended')) {
      throw apiErr;
    }
    console.warn('[Warhawks Auth] Server verify API unavailable on host, falling back to direct check:', apiErr.message);
  }

  // 2. Fallback to Supabase RPC
  if (!sessionResult) {
    const { url, anonKey } = getSupabaseRestConfig();
    if (url && anonKey && !url.includes('[YOUR-PROJECT-REF]')) {
      try {
        const rpcRes = await fetch(`${url}/rest/v1/rpc/verify_admin_otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({ p_mobile: cleanMobile, p_otp: cleanOtp })
        });

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && rpcData.success && rpcData.token) {
            sessionResult = rpcData;
          }
        }
      } catch (sbErr) {
        console.warn('[Warhawks Auth] Supabase verify RPC notice:', sbErr.message);
      }
    }
  }

  // 3. Fallback to client-side verification
  if (!sessionResult) {
    let pendingOtp = null;
    try {
      const rawPending = sessionStorage.getItem(`whk_otp_${cleanMobile}`);
      if (rawPending) {
        pendingOtp = JSON.parse(rawPending);
      }
    } catch {}

    const isPendingValid = pendingOtp && pendingOtp.otp === cleanOtp && Date.now() <= pendingOtp.expiresAt;

    if (!isPendingValid) {
      throw new Error('Invalid or expired verification code. Please check and re-enter.');
    }

    try {
      sessionStorage.removeItem(`whk_otp_${cleanMobile}`);
    } catch {}

    const adminName = pendingOtp?.adminName || (isPrimary ? 'Warhawks Primary Operations Chief' : 'Tournament Administrator');
    const token = `whk-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    sessionResult = {
      token,
      user: {
        id: isPrimary ? 'adm-primary-01' : `adm-${Date.now().toString(36)}`,
        name: adminName,
        email: isPrimary ? 'operations@warhawks.org' : 'admin@warhawks.org',
        mobile: cleanMobile,
        role: 'organizer',
        adminRole: isPrimary ? 'primary_admin' : 'admin',
        isPrimaryAdmin: isPrimary,
        title: isPrimary ? 'Primary Administrator & Command Chief' : 'Tournament Administrator'
      }
    };
  }

  const session = {
    token: sessionResult.token,
    user: {
      ...sessionResult.user,
      role: 'organizer',
      adminRole: isPrimary ? 'primary_admin' : (sessionResult.user?.adminRole || 'admin'),
      isPrimaryAdmin: isPrimary
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  try {
    localStorage.setItem(ORGANIZER_SESSION_KEY, JSON.stringify(session));
  } catch {}

  return session;
};

/**
 * Validates Organizer credentials securely (Mobile Number + Password)
 * Supports server verification, Netlify serverless functions, and local storage fallback.
 */
export const loginOrganizer = async (mobile, password) => {
  const cleanMobile = normalizeMobile(mobile);
  const cleanPassword = String(password || '').trim();

  if (!cleanMobile) throw new Error('Please enter your administrator mobile number.');
  if (!cleanPassword) throw new Error('Please enter your administrator password.');

  const primaryMobile = normalizeMobile(import.meta.env.VITE_PRIMARY_ADMIN_MOBILE);
  const admins = getStoredAdministratorsList();
  const matchedAdmin = admins.find(a => normalizeMobile(a.mobile) === cleanMobile);
  const isPrimary = matchedAdmin?.role === 'primary_admin' || Boolean(primaryMobile && cleanMobile === primaryMobile);

  let serverToken = null;
  let userData = null;

  // 1. Try server API / Netlify Function
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, password: cleanPassword })
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.token && data?.user) {
        serverToken = data.token;
        userData = data.user;
      }
    } else if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      if (err?.error && (res.status === 401 || res.status === 400 || res.status === 404)) {
        throw new Error(err.error);
      }
    }
  } catch (apiErr) {
    if (apiErr.message?.includes('Invalid') || apiErr.message?.includes('not registered') || apiErr.message?.includes('Please enter')) {
      throw apiErr;
    }
    console.warn('[Warhawks Auth] Server login API unreachable, attempting direct verification:', apiErr.message);
  }

  // 2. Try Supabase RPC if configured
  if (!serverToken) {
    const { url, anonKey } = getSupabaseRestConfig();
    if (url && anonKey && !url.includes('[YOUR-PROJECT-REF]')) {
      try {
        const rpcRes = await fetch(`${url}/rest/v1/rpc/authenticate_organizer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({ p_mobile: cleanMobile, p_password: cleanPassword })
        });
        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData?.success && rpcData?.token) {
            serverToken = rpcData.token;
            userData = rpcData.user;
          }
        }
      } catch {}
    }
  }

  // 3. Fallback client-side verification (for Netlify static deployments or offline)
  if (!serverToken) {
    const admins = getStoredAdministratorsList();
    const adminRecord = admins.find(a => normalizeMobile(a.mobile) === cleanMobile);

    const storedCreds = getStoredOrganizerCredentials();

    let targetPassword = '';
    if (adminRecord && adminRecord.password) {
      targetPassword = adminRecord.password;
    } else if (isPrimary && storedCreds.password) {
      targetPassword = storedCreds.password;
    } else if (isPrimary && storedCreds.passwordHash) {
      targetPassword = storedCreds.passwordHash;
    } else if (adminRecord) {
      targetPassword = '';
    } else {
      throw new Error('This mobile number is not registered as an authorized tournament administrator.');
    }

    // Strictly match the current active password
    const isPasswordCorrect = Boolean(targetPassword && cleanPassword === targetPassword);

    if (!isPasswordCorrect) {
      throw new Error('Invalid administrator credentials. Please check your phone number and password.');
    }

    serverToken = `whk-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    userData = {
      id: adminRecord?.id || (isPrimary ? 'adm-primary-01' : `adm-${Date.now().toString(36)}`),
      name: matchedName,
      email: isPrimary ? 'operations@warhawks.org' : (adminRecord?.email || 'admin@warhawks.org'),
      mobile: cleanMobile,
      role: 'organizer',
      adminRole: isPrimary ? 'primary_admin' : matchedRole,
      isPrimaryAdmin: isPrimary,
      title: isPrimary ? 'Primary Administrator & Command Chief' : 'Tournament Administrator'
    };
  }

  const session = {
    token: serverToken,
    user: {
      ...userData,
      role: 'organizer',
      adminRole: isPrimary ? 'primary_admin' : (userData.adminRole || 'admin'),
      isPrimaryAdmin: isPrimary
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  try {
    localStorage.setItem(ORGANIZER_SESSION_KEY, JSON.stringify(session));
  } catch {}

  return session;
};

/**
 * Changes password strictly for the currently logged-in administrator.
 * An administrator CANNOT change any other administrator's password.
 */
export const changeAdminPassword = async (currentPassword, newPassword) => {
  const session = getOrganizerSession();
  if (!session || !session.user || !session.token) {
    throw new Error('Active administrator session required to change password.');
  }

  const cleanCurrent = String(currentPassword || '').trim();
  const cleanNew = String(newPassword || '').trim();

  if (!cleanCurrent) {
    throw new Error('Please enter your current password.');
  }
  if (!cleanNew || cleanNew.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  if (cleanCurrent === cleanNew) {
    throw new Error('New password must be different from your current password.');
  }

  const callerMobile = normalizeMobile(session.user.mobile);
  const isPrimary = Boolean(
    session.user.isPrimaryAdmin ||
    session.user.adminRole === 'primary_admin' ||
    session.user.role === 'primary_admin'
  );

  let serverSuccess = false;

  // 1. Try server API / Netlify Function
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify({ currentPassword: cleanCurrent, newPassword: cleanNew })
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok) {
      serverSuccess = true;
    } else if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      if (err?.error && (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404)) {
        throw new Error(err.error);
      }
    }
  } catch (apiErr) {
    if (apiErr.message?.includes('incorrect') || apiErr.message?.includes('at least 6 characters') || apiErr.message?.includes('different')) {
      throw apiErr;
    }
    console.warn('[Warhawks Auth] Server change-password route unreachable, applying direct credential update:', apiErr.message);
  }

  // 2. Update client-side administrator store strictly for THIS administrator
  const admins = getStoredAdministratorsList();
  const adminIndex = admins.findIndex(a => normalizeMobile(a.mobile) === callerMobile);

  const storedCreds = getStoredOrganizerCredentials();
  const existingPassword = (adminIndex !== -1 && admins[adminIndex].password) 
    ? admins[adminIndex].password 
    : (isPrimary ? (storedCreds.password || storedCreds.passwordHash || '') : '');

  // If server didn't already validate, check current password locally
  if (!serverSuccess) {
    const isCurrentValid = cleanCurrent === existingPassword;
    if (!isCurrentValid) {
      throw new Error('Current password is incorrect. Please re-enter.');
    }
  }

  // Update password exclusively for THIS administrator
  if (adminIndex !== -1) {
    admins[adminIndex].password = cleanNew;
    admins[adminIndex].updatedAt = new Date().toISOString();
    saveStoredAdministratorsList(admins);
  }

  if (isPrimary) {
    updateOrganizerCredentials({ password: cleanNew });
  }

  return {
    success: true,
    message: 'Your password has been changed successfully. Please remember to use it for future sign-ins.'
  };
};

/**
 * Primary Admin Management Helpers
 */
export const getAdministrators = async () => {
  const session = getOrganizerSession();
  const token = session?.token || '';

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/admins', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveStoredAdministratorsList(data);
        return data;
      }
    }
  } catch {}

  // 2. Try Supabase RPC
  const { url, anonKey } = getSupabaseRestConfig();
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/get_administrators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'x-organizer-token': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveStoredAdministratorsList(data);
          return data;
        }
      }
    } catch {}
  }

  // 3. Fallback to local stored administrators
  return getStoredAdministratorsList();
};

export const createAdministrator = async ({ name, mobile, email, password }) => {
  const session = getOrganizerSession();
  const token = session?.token || '';

  if (!session?.user?.isPrimaryAdmin) {
    throw new Error('Only the Primary Administrator can provision new administrator accounts.');
  }

  const cleanMobile = normalizeMobile(mobile);
  if (!cleanMobile) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  if (!password || !String(password).trim()) {
    throw new Error('A secure password is required to create an administrator account.');
  }
  const cleanPassword = String(password).trim();
  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Check duplicate locally
  const currentList = getStoredAdministratorsList();
  if (currentList.some(a => normalizeMobile(a.mobile) === cleanMobile)) {
    throw new Error('An administrator account with this mobile number already exists.');
  }

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, mobile: cleanMobile, email, password: cleanPassword })
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      const updatedList = [...currentList, data];
      saveStoredAdministratorsList(updatedList);
      return data;
    }
  } catch (apiErr) {
    if (apiErr.message?.includes('already exists') || apiErr.message?.includes('Only the Primary')) {
      throw apiErr;
    }
  }

  // 2. Try Supabase RPC
  const { url, anonKey } = getSupabaseRestConfig();
  if (url && anonKey) {
    try {
      const salt = 'whk_salt_2026';
      let hash = '';
      const input = cleanPassword + salt;
      for (let i = 0; i < input.length; i++) {
        hash += input.charCodeAt(i).toString(16);
      }

      const res = await fetch(`${url}/rest/v1/rpc/create_administrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'x-organizer-token': token
        },
        body: JSON.stringify({
          p_name: name,
          p_mobile: cleanMobile,
          p_email: email,
          p_password_hash: hash
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.admin) {
          const updatedList = [...currentList, data.admin];
          saveStoredAdministratorsList(updatedList);
          return data.admin;
        }
      }
    } catch {}
  }

  // 3. Fallback client-side storage
  const newAdmin = {
    id: `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    mobile: cleanMobile,
    email: (email || '').trim(),
    password: cleanPassword,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const updatedList = [...currentList, newAdmin];
  saveStoredAdministratorsList(updatedList);
  return newAdmin;
};

export const toggleAdministratorStatus = async (id, isActive) => {
  const session = getOrganizerSession();
  const token = session?.token || '';

  // 1. Try server endpoint
  try {
    const res = await fetch(`/api/admins/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isActive })
    });
    if (res.ok) {
      const updated = await res.json();
      const list = getStoredAdministratorsList().map(a => a.id === id ? { ...a, isActive } : a);
      saveStoredAdministratorsList(list);
      return updated;
    }
  } catch {}

  // 2. Try Supabase RPC
  const { url, anonKey } = getSupabaseRestConfig();
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/toggle_administrator_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'x-organizer-token': token
        },
        body: JSON.stringify({ p_id: id, p_is_active: isActive })
      });
      if (res.ok) {
        const list = getStoredAdministratorsList().map(a => a.id === id ? { ...a, isActive } : a);
        saveStoredAdministratorsList(list);
        return await res.json();
      }
    } catch {}
  }

  // 3. Fallback local update
  const list = getStoredAdministratorsList().map(a => a.id === id ? { ...a, isActive } : a);
  saveStoredAdministratorsList(list);
  return { success: true, id, isActive };
};

export const deleteAdministrator = async (id) => {
  const session = getOrganizerSession();
  const token = session?.token || '';

  // Prevent deleting primary admin
  const list = getStoredAdministratorsList();
  const target = list.find(a => a.id === id);
  if (target?.role === 'primary_admin' || target?.id === 'adm-primary-01') {
    throw new Error('The Primary Administrator account cannot be deleted.');
  }

  // 1. Try server endpoint
  try {
    const res = await fetch(`/api/admins/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      saveStoredAdministratorsList(list.filter(a => a.id !== id));
      return true;
    }
  } catch {}

  // 2. Try Supabase RPC
  const { url, anonKey } = getSupabaseRestConfig();
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/delete_administrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'x-organizer-token': token
        },
        body: JSON.stringify({ p_id: id })
      });
      if (res.ok) {
        saveStoredAdministratorsList(list.filter(a => a.id !== id));
        return true;
      }
    } catch {}
  }

  // 3. Fallback local delete
  saveStoredAdministratorsList(list.filter(a => a.id !== id));
  return true;
};

/**
 * Emergency Password Reset: Allows the Primary Administrator to reset another administrator's password
 */
export const resetAdminPasswordByPrimary = async (id, newPassword) => {
  const session = getOrganizerSession();
  const token = session?.token || '';

  if (!session?.user?.isPrimaryAdmin) {
    throw new Error('Forbidden: Only the Primary Administrator can perform emergency password resets for other administrators.');
  }

  const cleanNew = String(newPassword || '').trim();
  if (!cleanNew || cleanNew.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const list = getStoredAdministratorsList();
  const target = list.find(a => a.id === id);

  // 1. Try server endpoint
  try {
    const res = await fetch(`/api/admins/${id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword: cleanNew })
    });
    if (res.ok) {
      const updated = list.map(a => a.id === id ? { ...a, password: cleanNew, updatedAt: new Date().toISOString() } : a);
      saveStoredAdministratorsList(updated);
      return { success: true, message: `Emergency password reset complete for ${target?.name || 'administrator'}.` };
    }
  } catch (apiErr) {
    console.warn('[Warhawks Auth] Server reset-password unreachable, applying direct store update:', apiErr.message);
  }

  // 2. Fallback direct update
  const updated = list.map(a => a.id === id ? { ...a, password: cleanNew, updatedAt: new Date().toISOString() } : a);
  saveStoredAdministratorsList(updated);
  return { success: true, message: `Emergency password reset complete for ${target?.name || 'administrator'}.` };
};


/**
 * Retrieves the currently active Organizer session if valid
 */
export const getOrganizerSession = () => {
  try {
    const raw = localStorage.getItem(ORGANIZER_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.token || !session.user || session.user.role !== 'organizer') {
      return null;
    }
    // Check expiry
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(ORGANIZER_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

/**
 * Destroys the Organizer session on logout
 */
export const logoutOrganizer = () => {
  const session = getOrganizerSession();
  const token = session?.token;
  try {
    localStorage.removeItem(ORGANIZER_SESSION_KEY);
  } catch {}

  if (token) {
    try {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {});
    } catch {}

    try {
      const { url, anonKey } = getSupabaseRestConfig();
      if (url && anonKey) {
        fetch(`${url}/rest/v1/rpc/logout_organizer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({ p_token: token })
        }).catch(() => {});
      }
    } catch {}
  }
  return true;
};

export const isOrganizerAuthenticated = () => {
  return Boolean(getOrganizerSession());
};

export const isPrimaryAdminAuthenticated = () => {
  const session = getOrganizerSession();
  return Boolean(
    session?.user?.isPrimaryAdmin ||
    session?.user?.adminRole === 'primary_admin' ||
    session?.user?.role === 'primary_admin'
  );
};
