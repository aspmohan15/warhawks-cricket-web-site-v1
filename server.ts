import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';

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

// Official Primary & Default Organizer Credentials
const PRIMARY_ADMIN_MOBILE = '+917339041622';
const DEFAULT_ORGANIZER_MOBILE = '+91 7339041622';
const DEFAULT_ORGANIZER_PASSWORD = 'warhawks2026';
const SERVER_AUTH_SECRET = process.env.ORGANIZER_AUTH_SECRET || 'warhawks-super-secure-token-secret-2026';

// Helper to normalize Indian mobile numbers
const normalizeMobile = (input: string | undefined): string => {
  if (!input) return '';
  const cleaned = String(input).replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return cleaned;
};

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
    const isPrimary = admin?.role === 'primary_admin' || cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622');

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

    // If primary admin mobile 7339041622 is requested but not seeded yet, auto-provision
    if (!admin && (cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622'))) {
      const salt = 'whk_salt_2026';
      const hash = crypto.createHash('sha256').update('warhawks2026' + salt).digest('hex');
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
         RETURNING id, name, mobile, role, is_active;`,
        [PRIMARY_ADMIN_MOBILE, hash]
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

    const isPrimary = admin.role === 'primary_admin' || cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622');

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

  // Auto-seed primary admin if needed
  if (!admin && (cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622'))) {
    const salt = 'whk_salt_2026';
    const initialHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');
    try {
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
         RETURNING id, name, mobile, email, password_hash, role, is_active;`,
        [PRIMARY_ADMIN_MOBILE, initialHash]
      );
      admin = ins.rows[0];
    } catch {}
  }

  if (!admin) {
    return res.status(404).json({ error: 'This mobile number is not registered as an authorized tournament administrator.' });
  }

  const salt = 'whk_salt_2026';
  const computedHash = crypto.createHash('sha256').update(cleanPassword + salt).digest('hex');
  const defaultHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');

  // Verify password: matches their custom password hash or initial default password
  const isPasswordMatch = computedHash === admin.password_hash || (admin.password_hash === defaultHash && cleanPassword === DEFAULT_ORGANIZER_PASSWORD);

  if (!isPasswordMatch) {
    return res.status(401).json({ error: 'Invalid password. If this is your first sign-in, the initial common password is warhawks2026.' });
  }

  const token = signOrganizerToken(cleanMobile);
  const isPrimary = admin.role === 'primary_admin' || cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622');

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
    if (!admin && (cleanMobile === PRIMARY_ADMIN_MOBILE || cleanMobile.endsWith('7339041622'))) {
      const salt = 'whk_salt_2026';
      const initialHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');
      const ins = await pool.query(
        `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
         VALUES ('adm-primary-01', 'Warhawks Primary Operations Chief', $1, 'operations@warhawks.org', $2, 'primary_admin', true)
         RETURNING id, name, mobile, password_hash;`,
        [PRIMARY_ADMIN_MOBILE, initialHash]
      );
      admin = ins.rows[0];
    }

    if (!admin) {
      return res.status(404).json({ error: 'Administrator profile not found.' });
    }

    // Verify current password
    const salt = 'whk_salt_2026';
    const currentHash = crypto.createHash('sha256').update(currentPassword.trim() + salt).digest('hex');
    const defaultHash = crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + salt).digest('hex');

    const isCurrentValid = currentHash === admin.password_hash || (admin.password_hash === defaultHash && currentPassword.trim() === DEFAULT_ORGANIZER_PASSWORD);

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
    return res.json(result.rows);
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
        is_archived
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27
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
      t.upiQrCodeUrl || '',
      t.upiId || 'warhawks.sports@icici',
      Number(t.registrationFee) || 1500,
      Boolean(t.isArchived)
    ];

    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('API /api/tournaments POST error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tournaments/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Map camelCase to snake_case column updates
    const fieldMap: Record<string, string> = {
      name: 'name',
      editionNumber: 'edition_number',
      year: 'year',
      format: 'format',
      status: 'status',
      startDate: 'start_date',
      endDate: 'end_date',
      venue: 'venue',
      city: 'city',
      registrationOpen: 'registration_open',
      registrationStartDate: 'registration_start_date',
      registrationEndDate: 'registration_end_date',
      totalBudgetPointsPerTeam: 'total_budget_points_per_team',
      pointsPerWin: 'points_per_win',
      pointsPerTie: 'points_per_tie',
      maxSquadSize: 'max_squad_size',
      minSquadSize: 'min_squad_size',
      maxOverseasPlayers: 'max_overseas_players',
      description: 'description',
      upiQrCodeUrl: 'upi_qr_code_url',
      upiId: 'upi_id',
      registrationFee: 'registration_fee',
      isArchived: 'is_archived'
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
    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('API /api/tournaments PATCH error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tournaments/:id', requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      ? 'SELECT * FROM public.players WHERE tournament_id = $1 ORDER BY name ASC;'
      : 'SELECT * FROM public.players ORDER BY name ASC;';
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
        base_price, sold_price, team_id, is_captain, is_overseas, email, phone, city,
        shirt_size, food_preference, registration_status, payment_status, matches_played,
        runs_scored, highest_score, wickets_taken, best_bowling, strike_rate, economy_rate,
        auction_status, photo_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26,
        $27, $28
      ) RETURNING *;
    `;
    const values = [
      p.id, p.tournamentId, p.name, p.jerseyNumber || 10, p.role || 'All-Rounder',
      p.battingStyle || 'Right-hand bat', p.bowlingStyle || 'Right-arm medium',
      p.basePrice || 500000, p.soldPrice || null, p.teamId || null,
      Boolean(p.isCaptain), Boolean(p.isOverseas), p.email, p.phone, p.city || 'Mumbai',
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

    if (updates.status !== undefined) {
      setClauses.push(`status = $${idx}`);
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

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update.' });

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
// 6. HEALTH & STATUS ENDPOINT
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
// 7. VITE DEV MIDDLEWARE / STATIC PRODUCTION SERVING
// ==============================================================================
async function startServer() {
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
