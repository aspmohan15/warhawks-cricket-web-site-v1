import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';
import { OFFICIAL_TOURNAMENT_RULES } from './src/constants/officialRules.js';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Dedicated server-side PostgreSQL connection pool (Direct & Secure)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Helper to normalize Indian mobile numbers
const normalizeMobile = (input: string | undefined): string => {
  if (!input) return '';
  const cleaned = String(input).replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^0[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return cleaned;
};

// Official Primary Administrator Configuration (Read from secure environment)
const PRIMARY_ADMIN_MOBILE = process.env.PRIMARY_ADMIN_MOBILE ? normalizeMobile(process.env.PRIMARY_ADMIN_MOBILE) : '';
const DEFAULT_ORGANIZER_PASSWORD = process.env.DEFAULT_ORGANIZER_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || '';
const SERVER_AUTH_SECRET = process.env.ORGANIZER_AUTH_SECRET || crypto.randomBytes(32).toString('hex');

// Generate HMAC signed token for organizer session
const signOrganizerToken = (mobile: string): string => {
  const timestamp = Date.now();
  const payload = `${mobile}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SERVER_AUTH_SECRET).update(payload).digest('hex');
  return `whk.${Buffer.from(payload).toString('base64url')}.${signature}`;
};

// Verify HMAC signed token or accepted organizer session token
const verifyOrganizerToken = (token: string | undefined): boolean => {
  if (!token) return false;
  
  // Also accept valid application session tokens issued by organizer login
  if (token.startsWith('whk-org-')) {
    return true;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'whk') return false;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SERVER_AUTH_SECRET).update(payload).digest('hex');
    if (parts[2] !== expectedSig) return false;

    const [mobile, tsStr] = payload.split(':');
    const ts = parseInt(tsStr, 10);
    // Token valid for 7 days
    if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
};

// Middleware: Require Organizer Role
const requireOrganizer = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);

  if (!token || !verifyOrganizerToken(token)) {
    return res.status(403).json({
      error: 'Forbidden: Valid Warhawks Tournament Organizer session required to execute privileged database operations.'
    });
  }
  next();
};

// Middleware: Require Primary Administrator Role (exclusively for Managing Admin Accounts)
const requirePrimaryAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);

  if (!token || !verifyOrganizerToken(token)) {
    return res.status(403).json({ error: 'Forbidden: Valid administrator session required.' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT mobile FROM public.organizer_sessions WHERE token = $1 AND expires_at > timezone('utc', now()) LIMIT 1;`,
      [token]
    );
    let mobile = sessionRes.rows[0]?.mobile;
    if (!mobile && token.startsWith('whk.') && token.split('.').length === 3) {
      try {
        const payload = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
        mobile = payload.split(':')[0];
      } catch {}
    }
    const cleanMobile = normalizeMobile(mobile || PRIMARY_ADMIN_MOBILE);

    // Check if matching primary admin in database or default primary admin
    const adminRes = await pool.query(
      `SELECT id, name, mobile, role, is_active FROM public.administrators
       WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
      [cleanMobile, cleanMobile.replace(/^\+91/, '')]
    );

    const admin = adminRes.rows[0];
    const isPrimary = admin?.role === 'primary_admin' || Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);

    if (!isPrimary) {
      return res.status(403).json({
        error: 'Access Denied: Only the Primary Administrator has authority to manage administrator credentials.'
      });
    }

    (req as any).adminUser = admin;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==============================================================================
// 1. ORGANIZER AUTHENTICATION ENDPOINTS
// ==============================================================================

// Request 6-digit OTP for registered administrator (Passwordless / OTP Verification flow)
app.post('/api/auth/request-otp', async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;
    const cleanMobile = normalizeMobile(mobile);
    if (!cleanMobile) {
      return res.status(400).json({ error: 'Please enter a valid organizer mobile number.' });
    }

    // Check if mobile matches an active administrator
    const adminRes = await pool.query(
      `SELECT id, name, mobile, role, is_active FROM public.administrators
       WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
      [cleanMobile, cleanMobile.replace(/^\+91/, '')]
    );

    let admin = adminRes.rows[0];

    // Auto-seed primary admin if requested mobile matches configured PRIMARY_ADMIN_MOBILE or database has no primary admin
    const hasPrimaryRes = await pool.query(`SELECT 1 FROM public.administrators WHERE role = 'primary_admin' LIMIT 1;`);
    const hasPrimaryAdmin = (hasPrimaryRes.rows.length > 0);

    if (!admin && (!hasPrimaryAdmin || (PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE))) {
      const salt = 'whk_salt_2026';
      const initialSeed = DEFAULT_ORGANIZER_PASSWORD || crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(initialSeed + salt).digest('hex');
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
         RETURNING id, name, mobile, role, is_active;`,
        [cleanMobile, hash]
      );
      admin = ins.rows[0];
    }

    if (!admin) {
      return res.status(404).json({
        error: 'This mobile number is not registered as an authorized tournament administrator.'
      });
    }

    // Cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    await pool.query(
      `INSERT INTO public.admin_otp_codes (mobile, otp_code, expires_at, attempts, created_at)
       VALUES ($1, $2, timezone('utc'::text, now()) + interval '5 minutes', 0, timezone('utc'::text, now()))
       ON CONFLICT (mobile) DO UPDATE SET
         otp_code = $2,
         expires_at = timezone('utc'::text, now()) + interval '5 minutes',
         attempts = 0,
         created_at = timezone('utc'::text, now());`,
      [cleanMobile, otp]
    );

    console.log(`[Warhawks Admin Auth] OTP for ${admin.name} (${cleanMobile}): ${otp}`);

    return res.json({
      success: true,
      mobile: cleanMobile,
      message: `Verification code generated for ${admin.name}.`,
      devOtp: otp // Returned so that the development/preview environment can authenticate immediately
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Verify 6-digit OTP code and issue organizer session
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;
    const cleanMobile = normalizeMobile(mobile);
    const cleanOtp = String(otp || '').trim();

    if (!cleanMobile || !cleanOtp) {
      return res.status(400).json({ error: 'Mobile number and verification code are required.' });
    }

    // Check code in database
    const otpRes = await pool.query(
      `SELECT * FROM public.admin_otp_codes
       WHERE mobile = $1 AND expires_at > timezone('utc'::text, now()) LIMIT 1;`,
      [cleanMobile]
    );

    const record = otpRes.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (record.otp_code !== cleanOtp) {
      await pool.query(`UPDATE public.admin_otp_codes SET attempts = attempts + 1 WHERE mobile = $1;`, [cleanMobile]);
      return res.status(401).json({ error: 'Invalid verification code. Please check and re-enter.' });
    }

    // Fetch administrator record
    const adminRes = await pool.query(
      `SELECT id, name, mobile, email, role, is_active FROM public.administrators
       WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
      [cleanMobile, cleanMobile.replace(/^\+91/, '')]
    );
    const admin = adminRes.rows[0];
    if (!admin) {
      return res.status(403).json({ error: 'Administrator account suspended or inactive.' });
    }

    const token = `whk-org-${crypto.randomBytes(24).toString('hex')}`;
    await pool.query(
      `INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
       VALUES ($1, $2, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
       ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';`,
      [token, cleanMobile]
    );

    // Clear used code
    await pool.query(`DELETE FROM public.admin_otp_codes WHERE mobile = $1;`, [cleanMobile]);

    const isPrimary = admin.role === 'primary_admin' || Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);

    return res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email || 'operations@warhawks.org',
        mobile: admin.mobile,
        role: 'organizer',
        adminRole: admin.role,
        isPrimaryAdmin: isPrimary,
        title: isPrimary ? 'Primary Administrator & Command Chief' : 'Tournament Administrator'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manage Administrators API (Exclusively for Primary Admin)
app.get('/api/admins', requirePrimaryAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt"
       FROM public.administrators
       ORDER BY (role = 'primary_admin') DESC, created_at ASC;`
    );
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admins', requirePrimaryAdmin, async (req: Request, res: Response) => {
  try {
    const { name, mobile, email, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Administrator name is required.' });
    if (!mobile?.trim()) return res.status(400).json({ error: 'Mobile number is required.' });
    if (!password?.trim()) return res.status(400).json({ error: 'Initial password is required.' });

    const cleanMobile = normalizeMobile(mobile);
    if (!/^\+91[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Check duplicate
    const exists = await pool.query(
      `SELECT id FROM public.administrators WHERE mobile = $1 OR mobile = $2 LIMIT 1;`,
      [cleanMobile, cleanMobile.replace(/^\+91/, '')]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'An administrator account with this mobile number already exists.' });
    }

    // Hash password with salt
    const salt = 'whk_salt_2026';
    const passwordHash = crypto.createHash('sha256').update(password.trim() + salt).digest('hex');
    const newId = `adm-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

    const insertRes = await pool.query(
      `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)
       RETURNING id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt";`,
      [newId, name.trim(), cleanMobile, (email || '').trim(), passwordHash]
    );

    return res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admins/:id', requirePrimaryAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, name, email } = req.body;

    const check = await pool.query(`SELECT id, role FROM public.administrators WHERE id = $1;`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Administrator not found.' });
    if (check.rows[0].role === 'primary_admin' && isActive === false) {
      return res.status(403).json({ error: 'The Primary Administrator account cannot be deactivated.' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (isActive !== undefined) {
      updates.push(`is_active = $${idx}`);
      values.push(Boolean(isActive));
      idx++;
    }
    if (name) {
      updates.push(`name = $${idx}`);
      values.push(name.trim());
      idx++;
    }
    if (email !== undefined) {
      updates.push(`email = $${idx}`);
      values.push(email.trim());
      idx++;
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    updates.push(`updated_at = timezone('utc', now())`);
    values.push(id);

    const result = await pool.query(
      `UPDATE public.administrators SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt";`,
      values
    );

    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admins/:id', requirePrimaryAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const check = await pool.query(`SELECT id, role, mobile FROM public.administrators WHERE id = $1;`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Administrator not found.' });
    if (check.rows[0].role === 'primary_admin') {
      return res.status(403).json({ error: 'The Primary Administrator account cannot be deleted.' });
    }

    await pool.query(`DELETE FROM public.administrators WHERE id = $1;`, [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Emergency Password Reset API (Exclusively for Primary Admin to reset other admins' passwords)
app.post('/api/admins/:id/reset-password', requirePrimaryAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const check = await pool.query(`SELECT id, name, mobile, role FROM public.administrators WHERE id = $1;`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Administrator not found.' });

    const targetAdmin = check.rows[0];
    const salt = 'whk_salt_2026';
    const newHash = crypto.createHash('sha256').update(String(newPassword).trim() + salt).digest('hex');

    await pool.query(
      `UPDATE public.administrators SET password_hash = $1, updated_at = timezone('utc', now()) WHERE id = $2;`,
      [newHash, id]
    );

    return res.json({
      success: true,
      message: `Emergency password reset complete for ${targetAdmin.name} (${targetAdmin.mobile}).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { mobile, password } = req.body;
  const cleanMobile = normalizeMobile(mobile);
  const cleanPassword = String(password || '').trim();

  if (!cleanMobile) {
    return res.status(400).json({ error: 'Please enter your organizer mobile number.' });
  }
  if (!cleanPassword) {
    return res.status(400).json({ error: 'Please enter your administrator password.' });
  }

  // Check administrators table
  let adminRes = await pool.query(
    `SELECT id, name, mobile, email, password_hash, role, is_active FROM public.administrators
     WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
    [cleanMobile, cleanMobile.replace(/^\+91/, '')]
  );

  let admin = adminRes.rows[0];

  // Auto-seed primary admin if needed and initial password configured in env
  if (!admin && PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE && DEFAULT_ORGANIZER_PASSWORD) {
    const salt = 'whk_salt_2026';
    const initialHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');
    try {
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
         RETURNING id, name, mobile, email, password_hash, role, is_active;`,
        [cleanMobile, initialHash]
      );
      admin = ins.rows[0];
    } catch {}
  }

  if (!admin) {
    return res.status(404).json({ error: 'This mobile number is not registered as an authorized tournament administrator.' });
  }

  const salt = 'whk_salt_2026';
  const computedHash = crypto.createHash('sha256').update(cleanPassword + salt).digest('hex');

  // Verify password: only the current password hash matches; once changed, initial password is not accepted
  const isPasswordMatch = computedHash === admin.password_hash;

  if (!isPasswordMatch) {
    return res.status(401).json({ error: 'Invalid administrator credentials. Please check your phone number and password.' });
  }

  const token = signOrganizerToken(cleanMobile);
  const isPrimary = admin.role === 'primary_admin' || Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);

  try {
    await pool.query(
      `INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
       VALUES ($1, $2, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
       ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';`,
      [token, cleanMobile]
    );
  } catch (err: any) {
    console.warn('[Warhawks Server] Warning registering session in organizer_sessions:', err.message);
  }

  return res.json({
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email || 'operations@warhawks.org',
      mobile: cleanMobile,
      role: 'organizer',
      adminRole: isPrimary ? 'primary_admin' : (admin.role || 'admin'),
      isPrimaryAdmin: isPrimary,
      title: isPrimary ? 'Primary Administrator & Command Chief' : 'Tournament Administrator'
    }
  });
});

// Change Password API: strictly allows the currently logged-in administrator to change their own password only
app.post('/api/auth/change-password', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword?.trim()) {
      return res.status(400).json({ error: 'Please enter your current password.' });
    }
    if (!newPassword?.trim() || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Resolve caller's mobile strictly from their verified session token
    let mobile: string | null = null;
    const sessionRes = await pool.query(
      `SELECT mobile FROM public.organizer_sessions WHERE token = $1 AND expires_at > timezone('utc', now()) LIMIT 1;`,
      [token]
    );
    mobile = sessionRes.rows[0]?.mobile;

    if (!mobile && token.startsWith('whk.') && token.split('.').length === 3) {
      try {
        const payload = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
        mobile = payload.split(':')[0];
      } catch {}
    }

    const cleanMobile = normalizeMobile(mobile || PRIMARY_ADMIN_MOBILE);

    // Fetch this administrator's record ONLY
    const adminRes = await pool.query(
      `SELECT id, name, mobile, password_hash FROM public.administrators
       WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
      [cleanMobile, cleanMobile.replace(/^\+91/, '')]
    );

    let admin = adminRes.rows[0];
    if (!admin && PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE && DEFAULT_ORGANIZER_PASSWORD) {
      const salt = 'whk_salt_2026';
      const initialHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
         RETURNING id, name, mobile, password_hash;`,
        [cleanMobile, initialHash]
      );
      admin = ins.rows[0];
    }

    if (!admin) {
      return res.status(404).json({ error: 'Administrator profile not found.' });
    }

    // Verify current password
    const salt = 'whk_salt_2026';
    const currentHash = crypto.createHash('sha256').update(currentPassword.trim() + salt).digest('hex');

    const isCurrentValid = currentHash === admin.password_hash;

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password is incorrect. Please re-enter.' });
    }

    // Hash and update the new password for this administrator ONLY
    const newHash = crypto.createHash('sha256').update(newPassword.trim() + salt).digest('hex');
    await pool.query(
      `UPDATE public.administrators SET password_hash = $1, updated_at = timezone('utc', now()) WHERE id = $2;`,
      [newHash, admin.id]
    );

    return res.json({
      success: true,
      message: 'Password updated successfully. Please use your new password for all subsequent sign-ins.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);
  if (token) {
    try {
      await pool.query('DELETE FROM public.organizer_sessions WHERE token = $1;', [token]);
    } catch {}
  }
  return res.json({ success: true });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);
  const isValid = verifyOrganizerToken(token);
  return res.json({ valid: isValid, role: isValid ? 'organizer' : 'player' });
});

// ==============================================================================
// 2. TOURNAMENTS API (Privileged operations protected by requireOrganizer)
// ==============================================================================
const mapTournamentRow = (row: any) => ({
  ...row,
  id: row.id,
  name: row.name,
  editionNumber: row.edition_number ?? row.editionNumber,
  edition_number: row.edition_number ?? row.editionNumber,
  year: row.year,
  format: row.format,
  status: row.status,
  organizer: row.organizer,
  organizerRole: row.organizer_role ?? row.organizerRole,
  organizer_role: row.organizer_role ?? row.organizerRole,
  organizerBranch: row.organizer_branch ?? row.organizerBranch,
  organizer_branch: row.organizer_branch ?? row.organizerBranch,
  startDate: row.start_date ?? row.startDate,
  start_date: row.start_date ?? row.startDate,
  endDate: row.end_date ?? row.endDate,
  end_date: row.end_date ?? row.endDate,
  venue: row.venue,
  city: row.city,
  registrationOpen: Boolean(row.registration_open ?? row.registrationOpen),
  registration_open: Boolean(row.registration_open ?? row.registrationOpen),
  registrationStartDate: row.registration_start_date ?? row.registrationStartDate,
  registrationEndDate: row.registration_end_date ?? row.registrationEndDate,
  totalBudgetPointsPerTeam: Number(row.total_budget_points_per_team ?? row.totalBudgetPointsPerTeam),
  pointsPerWin: row.points_per_win ?? row.pointsPerWin,
  pointsPerTie: row.points_per_tie ?? row.pointsPerTie,
  maxSquadSize: row.max_squad_size ?? row.maxSquadSize,
  minSquadSize: row.min_squad_size ?? row.minSquadSize,
  maxOverseasPlayers: row.max_overseas_players ?? row.maxOverseasPlayers,
  description: row.description || '',
  upiQrCodeUrl: row.upi_qr_code_url || row.upiQrCodeUrl || '',
  upi_qr_code_url: row.upi_qr_code_url || row.upiQrCodeUrl || '',
  upiId: row.upi_id || row.upiId || '',
  upi_id: row.upi_id || row.upiId || '',
  upiMobileNumber: row.upi_mobile_number || row.upiMobileNumber || '',
  upi_mobile_number: row.upi_mobile_number || row.upiMobileNumber || '',
  payeeName: row.payee_name || row.payeeName || 'Warhawks Tournament Operations',
  payee_name: row.payee_name || row.payeeName || 'Warhawks Tournament Operations',
  registrationFee: row.registration_fee !== undefined ? Number(row.registration_fee) : (row.registrationFee !== undefined ? Number(row.registrationFee) : 1500),
  registration_fee: row.registration_fee !== undefined ? Number(row.registration_fee) : (row.registrationFee !== undefined ? Number(row.registrationFee) : 1500),
  isArchived: Boolean(row.is_archived ?? row.isArchived),
  is_archived: Boolean(row.is_archived ?? row.isArchived),
  createdAt: row.created_at ?? row.createdAt,
  updatedAt: row.updated_at ?? row.updatedAt
});

app.get('/api/tournaments', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const isOrganizer = verifyOrganizerToken(token);

    // Public only sees non-archived; organizers see all
    const query = isOrganizer
      ? 'SELECT * FROM public.tournaments ORDER BY edition_number DESC;'
      : 'SELECT * FROM public.tournaments WHERE is_archived = false ORDER BY edition_number DESC;';

    const result = await pool.query(query);
    return res.json(result.rows.map(mapTournamentRow));
  } catch (err: any) {
    console.error('API /api/tournaments GET error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournaments', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO public.tournaments (
        id, name, edition_number, year, format, status, organizer, organizer_role,
        organizer_branch, start_date, end_date, venue, city, registration_open,
        registration_start_date, registration_end_date, total_budget_points_per_team,
        points_per_win, points_per_tie, max_squad_size, min_squad_size,
        max_overseas_players, description, upi_qr_code_url, upi_id, registration_fee,
        upi_mobile_number, payee_name, is_archived
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29
      )
      RETURNING *;
    `;
    const values = [
      t.id,
      t.name,
      t.editionNumber,
      t.year,
      t.format || 'T20',
      t.status || 'upcoming',
      t.organizer || 'Warhawks',
      t.organizerRole || 'Official Tournament Organizer & Host',
      t.organizerBranch || 'Warhawks Tournament Operations',
      t.startDate,
      t.endDate,
      t.venue,
      t.city,
      Boolean(t.registrationOpen),
      t.registrationStartDate || null,
      t.registrationEndDate || null,
      t.totalBudgetPointsPerTeam || 10000000,
      t.pointsPerWin ?? 2,
      t.pointsPerTie ?? 1,
      t.maxSquadSize || 18,
      t.minSquadSize || 14,
      t.maxOverseasPlayers || 4,
      t.description || '',
      t.upiQrCodeUrl || t.upi_qr_code_url || '',
      t.upiId || t.upi_id || 'warhawks.sports@icici',
      Number(t.registrationFee ?? t.registration_fee) || 1500,
      t.upiMobileNumber || t.upi_mobile_number || '',
      t.payeeName || t.payee_name || 'Warhawks Tournament Operations',
      Boolean(t.isArchived)
    ];

    const result = await pool.query(query, values);
    
    // Auto-seed official tournament rules for the new tournament edition
    for (let i = 0; i < OFFICIAL_TOURNAMENT_RULES.length; i++) {
      const rule = OFFICIAL_TOURNAMENT_RULES[i];
      const ruleId = `rule-${t.id}-${i + 1}`;
      await pool.query(
        `INSERT INTO public.rules (id, tournament_id, title, category, content, video_url, is_published, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (id) DO NOTHING;`,
        [ruleId, t.id, rule.title, rule.category, rule.content, '', true]
      ).catch(() => null);
    }

    return res.status(201).json(mapTournamentRow(result.rows[0]));
  } catch (err: any) {
    console.error('API /api/tournaments POST error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tournaments/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Map camelCase and snake_case column updates
    const fieldMap: Record<string, string> = {
      name: 'name',
      editionNumber: 'edition_number',
      edition_number: 'edition_number',
      year: 'year',
      format: 'format',
      status: 'status',
      startDate: 'start_date',
      start_date: 'start_date',
      endDate: 'end_date',
      end_date: 'end_date',
      venue: 'venue',
      city: 'city',
      registrationOpen: 'registration_open',
      registration_open: 'registration_open',
      registrationStartDate: 'registration_start_date',
      registration_start_date: 'registration_start_date',
      registrationEndDate: 'registration_end_date',
      registration_end_date: 'registration_end_date',
      totalBudgetPointsPerTeam: 'total_budget_points_per_team',
      total_budget_points_per_team: 'total_budget_points_per_team',
      pointsPerWin: 'points_per_win',
      points_per_win: 'points_per_win',
      pointsPerTie: 'points_per_tie',
      points_per_tie: 'points_per_tie',
      maxSquadSize: 'max_squad_size',
      max_squad_size: 'max_squad_size',
      minSquadSize: 'min_squad_size',
      min_squad_size: 'min_squad_size',
      maxOverseasPlayers: 'max_overseas_players',
      max_overseas_players: 'max_overseas_players',
      description: 'description',
      upiQrCodeUrl: 'upi_qr_code_url',
      upi_qr_code_url: 'upi_qr_code_url',
      upiId: 'upi_id',
      upi_id: 'upi_id',
      upiMobileNumber: 'upi_mobile_number',
      upi_mobile_number: 'upi_mobile_number',
      payeeName: 'payee_name',
      payee_name: 'payee_name',
      registrationFee: 'registration_fee',
      registration_fee: 'registration_fee',
      isArchived: 'is_archived',
      is_archived: 'is_archived'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided.' });
    }

    setClauses.push(`updated_at = timezone('utc'::text, now())`);
    values.push(id);
    const query = `UPDATE public.tournaments SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }
    return res.json(mapTournamentRow(result.rows[0]));
  } catch (err: any) {
    console.error('API /api/tournaments PATCH error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tournaments/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Clean up dependent records across tournament partitions
    await pool.query('DELETE FROM public.players WHERE tournament_id = $1;', [id]).catch(() => {});
    await pool.query('DELETE FROM public.teams WHERE tournament_id = $1;', [id]).catch(() => {});
    await pool.query('DELETE FROM public.registrations WHERE tournament_id = $1;', [id]).catch(() => {});
    await pool.query('DELETE FROM public.tournaments WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    console.error('API /api/tournaments DELETE error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 3. TEAMS API (Organizer Protected Mutations)
// ==============================================================================
app.get('/api/teams', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? 'SELECT * FROM public.teams WHERE tournament_id = $1 ORDER BY name ASC;'
      : 'SELECT * FROM public.teams ORDER BY name ASC;';
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO public.teams (
        id, tournament_id, name, short_code, city, primary_color, secondary_color,
        logo_url, owner_name, budget_total, budget_spent, budget_remaining, total_players_assigned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const newId = t.id || `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const values = [
      newId, t.tournamentId, t.name, (t.shortCode || 'TEAM').toUpperCase(), t.city || '',
      t.primaryColor || '#0284c7', t.secondaryColor || '#0f172a', t.logoUrl || null,
      t.ownerName || '', t.budgetTotal || 10000000, t.budgetSpent || 0,
      t.budgetRemaining || t.budgetTotal || 10000000, t.totalPlayersAssigned || 0
    ];
    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/teams/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      name: 'name',
      shortCode: 'short_code',
      city: 'city',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      logoUrl: 'logo_url',
      ownerName: 'owner_name',
      budgetTotal: 'budget_total',
      budgetSpent: 'budget_spent',
      budgetRemaining: 'budget_remaining',
      totalPlayersAssigned: 'total_players_assigned'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const query = `UPDATE public.teams SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.teams WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 4. PLAYERS API (Organizer Protected Mutations)
// ==============================================================================
app.get('/api/players', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? "SELECT * FROM public.players WHERE tournament_id = $1 AND (registration_status IS NULL OR registration_status != 'rejected') ORDER BY name ASC;"
      : "SELECT * FROM public.players WHERE (registration_status IS NULL OR registration_status != 'rejected') ORDER BY name ASC;";
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const p = req.body;
    const query = `
      INSERT INTO public.players (
        id, tournament_id, name, jersey_number, role, batting_style, bowling_style,
        base_price, sold_price, team_id, is_captain, is_vice_captain, is_wicket_keeper, is_overseas, email, phone, city,
        shirt_size, food_preference, registration_status, payment_status, matches_played,
        runs_scored, highest_score, wickets_taken, best_bowling, strike_rate, economy_rate,
        auction_status, photo_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28,
        $29, $30
      ) RETURNING *;
    `;
    const values = [
      p.id, p.tournamentId, p.name, p.jerseyNumber || 10, p.role || 'All-Rounder',
      p.battingStyle || 'Right-hand bat', p.bowlingStyle || 'Right-arm medium',
      p.basePrice || 500000, p.soldPrice || null, p.teamId || null,
      Boolean(p.isCaptain), Boolean(p.isViceCaptain), Boolean(p.isWicketKeeper), Boolean(p.isOverseas), p.email, p.phone, p.city || 'Mumbai',
      p.shirtSize || 'L', p.foodPreference || 'Veg', p.registrationStatus || 'approved',
      p.paymentStatus || 'paid', p.matchesPlayed || 0, p.runsScored || 0, p.highestScore || 0,
      p.wicketsTaken || 0, p.bestBowling || '-', p.strikeRate || 0, p.economyRate || 0,
      p.auctionStatus || (p.teamId ? 'sold' : 'available'), p.photoUrl || null
    ];
    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/players/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      name: 'name',
      jerseyNumber: 'jersey_number',
      role: 'role',
      battingStyle: 'batting_style',
      bowlingStyle: 'bowling_style',
      basePrice: 'base_price',
      soldPrice: 'sold_price',
      teamId: 'team_id',
      isCaptain: 'is_captain',
      isViceCaptain: 'is_vice_captain',
      isWicketKeeper: 'is_wicket_keeper',
      isOverseas: 'is_overseas',
      email: 'email',
      phone: 'phone',
      city: 'city',
      shirtSize: 'shirt_size',
      foodPreference: 'food_preference',
      registrationStatus: 'registration_status',
      paymentStatus: 'payment_status',
      matchesPlayed: 'matches_played',
      runsScored: 'runs_scored',
      highestScore: 'highest_score',
      wicketsTaken: 'wickets_taken',
      bestBowling: 'best_bowling',
      strikeRate: 'strike_rate',
      economyRate: 'economy_rate',
      auctionStatus: 'auction_status',
      photoUrl: 'photo_url'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const query = `UPDATE public.players SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/players/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.players WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 4b. MATCHES API (Public Reader + Organizer Protected Mutations)
// ==============================================================================
const mapMatchRow = (row: any) => ({
  id: row.id,
  tournamentId: row.tournament_id || row.tournamentId,
  tournament_id: row.tournament_id || row.tournamentId,
  matchNumber: Number(row.match_number ?? row.matchNumber),
  match_number: Number(row.match_number ?? row.matchNumber),
  round: row.round || 'Group Stage',
  teamAId: row.team_a_id || row.teamAId,
  team_a_id: row.team_a_id || row.teamAId,
  teamBId: row.team_b_id || row.teamBId,
  team_b_id: row.team_b_id || row.teamBId,
  date: row.date ? (row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0]) : new Date().toISOString().split('T')[0],
  time: row.time || '19:30',
  venue: row.venue || 'Stadium Ground',
  status: row.status || 'scheduled',
  tossWinnerId: row.toss_winner_id || row.tossWinnerId || undefined,
  toss_winner_id: row.toss_winner_id || row.tossWinnerId || undefined,
  tossDecision: row.toss_decision || row.tossDecision || undefined,
  toss_decision: row.toss_decision || row.tossDecision || undefined,
  teamAScore: row.team_a_score || row.teamAScore || '',
  team_a_score: row.team_a_score || row.teamAScore || '',
  teamAOvers: row.team_a_overs !== null && row.team_a_overs !== undefined ? Number(row.team_a_overs) : (row.teamAOvers !== undefined ? Number(row.teamAOvers) : undefined),
  team_a_overs: row.team_a_overs !== null && row.team_a_overs !== undefined ? Number(row.team_a_overs) : (row.teamAOvers !== undefined ? Number(row.teamAOvers) : undefined),
  teamBScore: row.team_b_score || row.teamBScore || '',
  team_b_score: row.team_b_score || row.teamBScore || '',
  teamBOvers: row.team_b_overs !== null && row.team_b_overs !== undefined ? Number(row.team_b_overs) : (row.teamBOvers !== undefined ? Number(row.teamBOvers) : undefined),
  team_b_overs: row.team_b_overs !== null && row.team_b_overs !== undefined ? Number(row.team_b_overs) : (row.teamBOvers !== undefined ? Number(row.teamBOvers) : undefined),
  winnerId: row.winner_id || row.winnerId || undefined,
  winner_id: row.winner_id || row.winnerId || undefined,
  resultSummary: row.result_summary || row.resultSummary || '',
  result_summary: row.result_summary || row.resultSummary || '',
  manOfTheMatchPlayerId: row.man_of_the_match_player_id || row.manOfTheMatchPlayerId || undefined,
  man_of_the_match_player_id: row.man_of_the_match_player_id || row.manOfTheMatchPlayerId || undefined,
  isImported: Boolean(row.is_imported ?? row.isImported),
  is_imported: Boolean(row.is_imported ?? row.isImported),
  importSource: row.import_source || row.importSource || 'manual',
  import_source: row.import_source || row.importSource || 'manual',
  cricheroesMatchId: row.cricheroes_match_id || row.cricheroesMatchId || undefined,
  cricheroes_match_id: row.cricheroes_match_id || row.cricheroesMatchId || undefined,
  createdAt: row.created_at || row.createdAt,
  created_at: row.created_at || row.createdAt
});

app.get('/api/matches', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? 'SELECT * FROM public.matches WHERE tournament_id = $1 ORDER BY match_number ASC;'
      : 'SELECT * FROM public.matches ORDER BY match_number ASC;';
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapMatchRow));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const m = req.body;
    if (!m.tournamentId) {
      return res.status(400).json({ error: 'Target tournament ID is required to schedule a match.' });
    }
    if (!m.teamAId || !m.teamBId) {
      return res.status(400).json({ error: 'Please select both Team A and Team B from registered tournament teams.' });
    }
    if (m.teamAId === m.teamBId) {
      return res.status(400).json({ error: 'Team A and Team B cannot be the same franchise.' });
    }

    // Auto-calculate next available match number in this tournament to prevent unique constraint conflicts
    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(match_number), 0) + 1 AS next_num FROM public.matches WHERE tournament_id = $1;',
      [m.tournamentId]
    );
    const nextMatchNum = Number(maxRes.rows[0]?.next_num) || 1;

    let targetMatchNumber = Number(m.matchNumber);
    if (!targetMatchNumber || targetMatchNumber < 1) {
      targetMatchNumber = nextMatchNum;
    } else {
      // If the requested match number is already in use by another fixture in this tournament, auto-assign next number
      const exists = await pool.query(
        'SELECT 1 FROM public.matches WHERE tournament_id = $1 AND match_number = $2 LIMIT 1;',
        [m.tournamentId, targetMatchNumber]
      );
      if (exists.rows.length > 0) {
        targetMatchNumber = nextMatchNum;
      }
    }

    const newId = m.id || `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const query = `
      INSERT INTO public.matches (
        id, tournament_id, match_number, round, team_a_id, team_b_id,
        date, time, venue, status, is_imported, import_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        tournament_id = EXCLUDED.tournament_id,
        match_number = EXCLUDED.match_number,
        round = EXCLUDED.round,
        team_a_id = EXCLUDED.team_a_id,
        team_b_id = EXCLUDED.team_b_id,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        venue = EXCLUDED.venue,
        status = EXCLUDED.status
      RETURNING *;
    `;
    const values = [
      newId,
      m.tournamentId,
      targetMatchNumber,
      m.round || 'Group Stage',
      m.teamAId,
      m.teamBId,
      m.date || new Date().toISOString().split('T')[0],
      m.time || '19:30',
      m.venue || 'Stadium Ground',
      m.status || 'scheduled',
      Boolean(m.isImported),
      m.importSource || 'manual'
    ];
    const result = await pool.query(query, values);
    return res.status(201).json(mapMatchRow(result.rows[0]));
  } catch (err: any) {
    console.error('POST /api/matches error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to schedule match fixture.' });
  }
});

app.patch('/api/matches/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.teamAId && updates.teamBId && updates.teamAId === updates.teamBId) {
      return res.status(400).json({ error: 'Team A and Team B cannot be the same franchise.' });
    }

    // If only one team updated, ensure it does not match the opposing team in db
    if (updates.teamAId || updates.teamBId) {
      const curRes = await pool.query('SELECT team_a_id, team_b_id FROM public.matches WHERE id = $1;', [id]);
      if (curRes.rows.length > 0) {
        const curA = updates.teamAId || curRes.rows[0].team_a_id;
        const curB = updates.teamBId || curRes.rows[0].team_b_id;
        if (curA === curB) {
          return res.status(400).json({ error: 'Team A and Team B cannot be the same franchise.' });
        }
      }
    }

    const fieldMap: Record<string, string> = {
      teamAId: 'team_a_id',
      teamBId: 'team_b_id',
      matchNumber: 'match_number',
      round: 'round',
      date: 'date',
      time: 'time',
      venue: 'venue',
      status: 'status',
      tossWinnerId: 'toss_winner_id',
      tossDecision: 'toss_decision',
      teamAScore: 'team_a_score',
      teamAOvers: 'team_a_overs',
      teamBScore: 'team_b_score',
      teamBOvers: 'team_b_overs',
      winnerId: 'winner_id',
      resultSummary: 'result_summary',
      manOfTheMatchPlayerId: 'man_of_the_match_player_id',
      cricheroesMatchId: 'cricheroes_match_id'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const query = `UPDATE public.matches SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found.' });
    }
    return res.json(mapMatchRow(result.rows[0]));
  } catch (err: any) {
    console.error('PATCH /api/matches/:id error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to update fixture.' });
  }
});

app.delete('/api/matches/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.matches WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 5. REGISTRATIONS API (Public Registration + Organizer Status Updates)
// ==============================================================================
app.get('/api/registrations', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? 'SELECT * FROM public.registrations WHERE tournament_id = $1 ORDER BY created_at DESC;'
      : 'SELECT * FROM public.registrations ORDER BY created_at DESC;';
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Public player self-service registration (No organizer auth required)
app.post('/api/registrations', async (req: Request, res: Response) => {
  try {
    const r = req.body;
    const query = `
      INSERT INTO public.registrations (
        id, tournament_id, full_name, email, phone, age, city, primary_role, batting_style,
        bowling_style, shirt_size, food_preference, has_breakfast, has_lunch,
        guest_count, guests, guest_food_preference, has_guest_breakfast, has_guest_lunch,
        payment_reference, payment_status, approval_status, catering_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23
      ) RETURNING *;
    `;
    const values = [
      r.id || `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      r.tournamentId,
      r.playerName || r.fullName || r.name,
      r.email,
      r.phone,
      parseInt(r.age, 10) || 24,
      r.city || 'Mumbai',
      r.primaryRole || r.role || 'Batsman',
      r.battingStyle || 'Right-hand bat',
      r.bowlingStyle || 'Right-arm medium',
      r.shirtSize || 'L',
      r.foodPreference || 'Veg',
      r.hasBreakfast ?? true,
      r.hasLunch ?? true,
      r.guestCount || 0,
      JSON.stringify(r.guests || []),
      r.guestFoodPreference || 'Veg',
      Boolean(r.hasGuestBreakfast),
      Boolean(r.hasGuestLunch),
      r.paymentReference || null,
      r.paymentStatus || 'pending',
      r.status || r.approvalStatus || 'pending',
      r.cateringStatus || 'pending'
    ];
    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Organizer approval & updates
app.patch('/api/registrations/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.approvalStatus !== undefined) {
      setClauses.push(`approval_status = $${idx}`);
      values.push(updates.approvalStatus);
      idx++;
    } else if (updates.status !== undefined) {
      setClauses.push(`approval_status = $${idx}`);
      values.push(updates.status);
      idx++;
    }
    if (updates.paymentStatus !== undefined) {
      setClauses.push(`payment_status = $${idx}`);
      values.push(updates.paymentStatus);
      idx++;
    }
    if (updates.cateringStatus !== undefined) {
      setClauses.push(`catering_status = $${idx}`);
      values.push(updates.cateringStatus);
      idx++;
    }
    if (updates.foodPreference !== undefined) {
      setClauses.push(`food_preference = $${idx}`);
      values.push(updates.foodPreference);
      idx++;
    }
    if (updates.hasBreakfast !== undefined) {
      setClauses.push(`has_breakfast = $${idx}`);
      values.push(updates.hasBreakfast);
      idx++;
    }
    if (updates.hasLunch !== undefined) {
      setClauses.push(`has_lunch = $${idx}`);
      values.push(updates.hasLunch);
      idx++;
    }
    if (updates.reviewNotes !== undefined) {
      setClauses.push(`review_notes = $${idx}`);
      values.push(updates.reviewNotes);
      idx++;
    }
    if (updates.reviewedBy !== undefined) {
      setClauses.push(`reviewed_by = $${idx}`);
      values.push(updates.reviewedBy);
      idx++;
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    // If registration is marked as rejected, purge any matching player from the tournament squad pool
    const newStatus = updates.approvalStatus || updates.status;
    if (newStatus === 'rejected') {
      const regRes = await pool.query('SELECT email, tournament_id FROM public.registrations WHERE id = $1;', [id]);
      if (regRes.rows.length > 0 && regRes.rows[0].email) {
        await pool.query('DELETE FROM public.players WHERE LOWER(email) = LOWER($1) AND tournament_id = $2;', [regRes.rows[0].email, regRes.rows[0].tournament_id]).catch(err => console.warn('Purge player notice:', err.message));
      }
    }

    setClauses.push(`updated_at = timezone('utc'::text, now())`);
    values.push(id);
    const query = `UPDATE public.registrations SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 6. TOURNAMENT ANNOUNCEMENTS API (Public Reader + Organizer CRUD & Reorder)
// ==============================================================================
const mapAnnouncementRow = (row: any) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  message: row.message,
  displayOrder: Number(row.display_order) || 0,
  isActive: Boolean(row.is_active),
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

app.get('/api/announcements', async (req: Request, res: Response) => {
  try {
    const { tournamentId, all } = req.query;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-organizer-token'] as string);
    const isOrganizer = verifyOrganizerToken(token);

    let query = '';
    const params: any[] = [];

    if (isOrganizer || all === 'true') {
      if (tournamentId) {
        query = 'SELECT * FROM public.announcements WHERE tournament_id = $1 OR tournament_id IS NULL ORDER BY display_order ASC, created_at ASC;';
        params.push(tournamentId);
      } else {
        query = 'SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;';
      }
    } else {
      if (tournamentId) {
        query = 'SELECT * FROM public.announcements WHERE is_active = true AND (tournament_id = $1 OR tournament_id IS NULL) ORDER BY display_order ASC, created_at ASC;';
        params.push(tournamentId);
      } else {
        query = 'SELECT * FROM public.announcements WHERE is_active = true ORDER BY display_order ASC, created_at ASC;';
      }
    }

    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapAnnouncementRow));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { tournamentId, message, displayOrder, isActive } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Announcement message cannot be empty.' });
    }

    const cleanMsg = message.trim();

    // Prevent duplicate announcement insertion with identical message
    const existingCheck = await pool.query(
      `SELECT * FROM public.announcements 
       WHERE (tournament_id = $1 OR ($1 IS NULL AND tournament_id IS NULL))
         AND TRIM(LOWER(message)) = TRIM(LOWER($2))
       LIMIT 1;`,
      [tournamentId || null, cleanMsg]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(200).json(mapAnnouncementRow(existingCheck.rows[0]));
    }

    let order = displayOrder;
    if (order === undefined || order === null) {
      const maxRes = await pool.query('SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM public.announcements;');
      order = maxRes.rows[0]?.next_order ?? 0;
    }

    const id = req.body.id || `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const query = `
      INSERT INTO public.announcements (id, tournament_id, message, display_order, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      id,
      tournamentId || null,
      cleanMsg,
      order,
      isActive !== undefined ? Boolean(isActive) : true,
      'Warhawks Operations'
    ];

    const result = await pool.query(query, values);
    return res.status(201).json(mapAnnouncementRow(result.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/announcements/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, isActive, displayOrder, tournamentId } = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (message !== undefined) {
      if (!message.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });
      setClauses.push(`message = $${idx}`);
      values.push(message.trim());
      idx++;
    }
    if (isActive !== undefined) {
      setClauses.push(`is_active = $${idx}`);
      values.push(Boolean(isActive));
      idx++;
    }
    if (displayOrder !== undefined) {
      setClauses.push(`display_order = $${idx}`);
      values.push(Number(displayOrder));
      idx++;
    }
    if (tournamentId !== undefined) {
      setClauses.push(`tournament_id = $${idx}`);
      values.push(tournamentId || null);
      idx++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    setClauses.push(`updated_at = timezone('utc'::text, now())`);
    values.push(id);
    const query = `UPDATE public.announcements SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    return res.json(mapAnnouncementRow(result.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.announcements WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements/swap', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id1, id2 } = req.body;
    if (!id1 || !id2) {
      return res.status(400).json({ error: 'Both id1 and id2 are required to swap announcements.' });
    }

    const res1 = await pool.query('SELECT id, display_order FROM public.announcements WHERE id = $1::text LIMIT 1;', [String(id1)]);
    const res2 = await pool.query('SELECT id, display_order FROM public.announcements WHERE id = $1::text LIMIT 1;', [String(id2)]);

    if (res1.rows.length === 0 || res2.rows.length === 0) {
      return res.status(404).json({ error: 'One or both announcements not found.' });
    }

    const order1 = Number(res1.rows[0].display_order);
    const order2 = Number(res2.rows[0].display_order);

    await pool.query('UPDATE public.announcements SET display_order = $1::int, updated_at = timezone(\'utc\'::text, now()) WHERE id = $2::text;', [order2, String(id1)]);
    await pool.query('UPDATE public.announcements SET display_order = $1::int, updated_at = timezone(\'utc\'::text, now()) WHERE id = $2::text;', [order1, String(id2)]);

    const updatedRes = await pool.query('SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;');
    return res.json({ success: true, items: updatedRes.rows.map(mapAnnouncementRow) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements/reorder', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required for reordering.' });
    }

    for (const item of items) {
      await pool.query(
        'UPDATE public.announcements SET display_order = $1::int, updated_at = timezone(\'utc\'::text, now()) WHERE id = $2::text;',
        [Number(item.displayOrder), String(item.id)]
      );
    }

    const updatedRes = await pool.query('SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;');
    return res.json({ success: true, items: updatedRes.rows.map(mapAnnouncementRow) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 7. TOURNAMENT EXPENSES API (Public/Participant Read + Organizer CRUD)
// ==============================================================================
const mapExpenseRow = (row: any) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  title: row.title,
  category: row.category,
  amount: Number(row.amount) || 0,
  advanceAmount: Number(row.advance_amount || 0),
  date: row.date ? (row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0]) : new Date().toISOString().split('T')[0],
  vendorName: row.vendor_name || '',
  receiptUrl: row.receipt_url || '',
  paymentMode: row.payment_mode || 'Bank Transfer',
  paymentStatus: row.payment_status || 'paid',
  notes: row.notes || '',
  createdAt: row.created_at
});

app.get('/api/expenses', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? 'SELECT * FROM public.expenses WHERE tournament_id = $1 ORDER BY date DESC, created_at DESC;'
      : 'SELECT * FROM public.expenses ORDER BY date DESC, created_at DESC;';
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapExpenseRow));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const exp = req.body;
    if (!exp.title?.trim()) {
      return res.status(400).json({ error: 'Expense title is required.' });
    }
    if (!exp.tournamentId) {
      return res.status(400).json({ error: 'Target tournament ID is required.' });
    }

    const id = exp.id || `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const query = `
      INSERT INTO public.expenses (
        id, tournament_id, title, category, amount, advance_amount,
        date, vendor_name, receipt_url, payment_mode, payment_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        tournament_id = EXCLUDED.tournament_id,
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        amount = EXCLUDED.amount,
        advance_amount = EXCLUDED.advance_amount,
        date = EXCLUDED.date,
        vendor_name = EXCLUDED.vendor_name,
        receipt_url = EXCLUDED.receipt_url,
        payment_mode = EXCLUDED.payment_mode,
        payment_status = EXCLUDED.payment_status,
        notes = EXCLUDED.notes
      RETURNING *;
    `;
    const values = [
      id,
      exp.tournamentId,
      exp.title.trim(),
      exp.category || 'Ground & Pitch',
      Number(exp.amount) || 0,
      Number(exp.advanceAmount) || 0,
      exp.date || new Date().toISOString().split('T')[0],
      exp.vendorName ? exp.vendorName.trim() : '',
      exp.receiptUrl || '',
      exp.paymentMode || 'Bank Transfer',
      exp.paymentStatus || 'paid',
      exp.notes ? exp.notes.trim() : ''
    ];

    const result = await pool.query(query, values);
    return res.status(201).json(mapExpenseRow(result.rows[0]));
  } catch (err: any) {
    console.error('API /api/expenses POST error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/expenses/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      title: 'title',
      category: 'category',
      amount: 'amount',
      advanceAmount: 'advance_amount',
      date: 'date',
      vendorName: 'vendor_name',
      receiptUrl: 'receipt_url',
      paymentMode: 'payment_mode',
      paymentStatus: 'payment_status',
      notes: 'notes'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const query = `UPDATE public.expenses SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense voucher not found.' });
    }
    return res.json(mapExpenseRow(result.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.expenses WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 7c. TOURNAMENT RULES & DEMO VIDEOS ENDPOINTS
// ==============================================================================
const mapRuleRow = (row: any) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  title: row.title,
  category: row.category,
  content: row.content,
  videoUrl: row.video_url || '',
  isPublished: Boolean(row.is_published),
  updatedAt: row.updated_at
});

app.get('/api/rules', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.query;
    const query = tournamentId
      ? 'SELECT * FROM public.rules WHERE tournament_id = $1 ORDER BY id ASC;'
      : 'SELECT * FROM public.rules ORDER BY id ASC;';
    const params = tournamentId ? [tournamentId] : [];
    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapRuleRow));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const r = req.body;
    if (!r.title?.trim() || !r.tournamentId) {
      return res.status(400).json({ error: 'Title and tournamentId are required.' });
    }
    const newId = r.id || `rule-${Date.now().toString(36)}`;
    const query = `
      INSERT INTO public.rules (id, tournament_id, title, category, content, video_url, is_published, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        video_url = EXCLUDED.video_url,
        is_published = EXCLUDED.is_published,
        updated_at = now()
      RETURNING *;
    `;
    const result = await pool.query(query, [
      newId,
      r.tournamentId,
      r.title.trim(),
      r.category || 'Tournament general',
      r.content || '',
      r.videoUrl || '',
      r.isPublished ?? true
    ]);
    return res.status(201).json(mapRuleRow(result.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/rules/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      title: 'title',
      category: 'category',
      content: 'content',
      videoUrl: 'video_url',
      isPublished: 'is_published'
    };
    const setClauses: string[] = ['updated_at = now()'];
    const values: any[] = [id];

    Object.keys(updates).forEach(key => {
      const col = fieldMap[key];
      if (col) {
        values.push(updates[key]);
        setClauses.push(`${col} = $${values.length}`);
      }
    });

    const query = `UPDATE public.rules SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    return res.json(mapRuleRow(result.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rules/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.rules WHERE id = $1;', [id]);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 8. HEALTH & STATUS ENDPOINT
// ==============================================================================
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT 1 as healthy;');
    return res.json({
      status: 'ok',
      service: 'Warhawks Cricket Tournament API',
      database: dbRes.rows.length > 0 ? 'connected' : 'unhealthy'
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// ==============================================================================
// 9. VITE DEV MIDDLEWARE / STATIC PRODUCTION SERVING
// ==============================================================================
async function startServer() {
  // Ensure announcements and expenses tables exist in PostgreSQL
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.announcements (
        id TEXT PRIMARY KEY,
        tournament_id TEXT,
        message TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
      CREATE INDEX IF NOT EXISTS idx_announcements_order ON public.announcements(display_order ASC, created_at ASC);

      CREATE TABLE IF NOT EXISTS public.expenses (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        advance_amount NUMERIC NOT NULL DEFAULT 0,
        date DATE NOT NULL,
        vendor_name TEXT,
        receipt_url TEXT,
        payment_mode TEXT DEFAULT 'Bank Transfer',
        payment_status TEXT DEFAULT 'paid',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
      ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS advance_amount NUMERIC NOT NULL DEFAULT 0;
      ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS upi_mobile_number TEXT;
      CREATE INDEX IF NOT EXISTS idx_expenses_tour_date ON public.expenses(tournament_id, date DESC);

      CREATE TABLE IF NOT EXISTS public.rules (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Tournament general',
        content TEXT NOT NULL,
        video_url TEXT,
        is_published BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
      CREATE INDEX IF NOT EXISTS idx_rules_tournament ON public.rules(tournament_id);
    `);

    // Ensure all tournament editions have official rules seeded
    const tournamentsRes = await pool.query('SELECT id, name FROM public.tournaments;');
    for (const tour of tournamentsRes.rows) {
      const existingRules = await pool.query('SELECT id FROM public.rules WHERE tournament_id = $1 LIMIT 1;', [tour.id]);
      if (existingRules.rows.length === 0) {
        for (let i = 0; i < OFFICIAL_TOURNAMENT_RULES.length; i++) {
          const rule = OFFICIAL_TOURNAMENT_RULES[i];
          const id = `rule-${tour.id}-${i + 1}`;
          await pool.query(
            `INSERT INTO public.rules (id, tournament_id, title, category, content, video_url, is_published, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, now())
             ON CONFLICT (id) DO UPDATE SET title = $3, category = $4, content = $5;`,
            [id, tour.id, rule.title, rule.category, rule.content, '', true]
          );
        }
      }
    }
  } catch (err: any) {
    console.warn('[Table Init Warning]:', err.message);
  }

  if (!isProd) {
    // Mount Vite dev middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static build in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Warhawks Server] Running on http://0.0.0.0:${PORT} (Mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('[Warhawks Server Startup Fatal]:', err);
});
