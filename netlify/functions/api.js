import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const normalizeMobile = (input) => {
  if (!input) return '';
  const cleaned = String(input).replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return cleaned;
};

const PRIMARY_ADMIN_MOBILE = process.env.PRIMARY_ADMIN_MOBILE ? normalizeMobile(process.env.PRIMARY_ADMIN_MOBILE) : '';
const DEFAULT_ORGANIZER_PASSWORD = process.env.DEFAULT_ORGANIZER_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || '';
const SERVER_AUTH_SECRET = process.env.ORGANIZER_AUTH_SECRET || crypto.randomBytes(32).toString('hex');

let pool = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  } catch (err) {
    console.warn('[Netlify Function API] Database pool initialization warning:', err.message);
  }
}

// In-memory OTP store for serverless execution fallback
const memoryOtpStore = new Map();

const verifyOrganizerToken = (token) => {
  if (!token) return false;
  if (token.startsWith('whk-org-')) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'whk') return false;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SERVER_AUTH_SECRET).update(payload).digest('hex');
    if (parts[2] !== expectedSig) return false;
    const [, tsStr] = payload.split(':');
    const ts = parseInt(tsStr, 10);
    return Date.now() - ts <= 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const jsonResponse = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-organizer-token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
  },
  body: JSON.stringify(data)
});

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-organizer-token',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  // Normalize sub-path from event.path
  let path = event.path || '';
  path = path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  const method = event.httpMethod;
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (event.headers['x-organizer-token'] || '');

  try {
    // 1. Health check
    if (path === '/health') {
      return jsonResponse(200, {
        status: 'ok',
        service: 'Warhawks Cricket Tournament API (Netlify Functions)',
        database: pool ? 'connected' : 'memory_fallback'
      });
    }

    // 2. Request OTP
    if (path === '/auth/request-otp' && method === 'POST') {
      const cleanMobile = normalizeMobile(body.mobile);
      if (!cleanMobile) {
        return jsonResponse(400, { error: 'Please enter a valid organizer mobile number.' });
      }

      let isPrimary = Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);
      let adminName = null;

      if (pool) {
        try {
          const adminRes = await pool.query(
            `SELECT id, name, mobile, role, is_active FROM public.administrators
             WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
            [cleanMobile, cleanMobile.replace(/^\+91/, '')]
          );
          if (adminRes.rows[0]) {
            adminName = adminRes.rows[0].name;
            if (adminRes.rows[0].role === 'primary_admin') {
              isPrimary = true;
            }
          }
        } catch (dbErr) {
          console.warn('[Netlify Function] DB query error on request-otp:', dbErr.message);
        }
      }

      if (!adminName && !isPrimary) {
        return jsonResponse(404, {
          error: 'This mobile number is not registered as an authorized tournament administrator.'
        });
      }

      const otp = String(crypto.randomInt(100000, 999999));

      if (pool) {
        try {
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
        } catch (dbErr) {
          console.warn('[Netlify Function] DB insert OTP error:', dbErr.message);
        }
      }

      // Also record in memory for serverless persistence
      memoryOtpStore.set(cleanMobile, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        adminName: adminName || 'Warhawks Primary Operations Chief',
        isPrimary
      });

      console.log(`[Netlify Function Auth] OTP for ${adminName || 'Admin'} (${cleanMobile}): ${otp}`);

      return jsonResponse(200, {
        success: true,
        mobile: cleanMobile,
        message: `Verification code generated for ${adminName || 'Warhawks Administrator'}.`,
        devOtp: otp
      });
    }

    // 3. Verify OTP
    if (path === '/auth/verify-otp' && method === 'POST') {
      const cleanMobile = normalizeMobile(body.mobile);
      const cleanOtp = String(body.otp || '').trim();

      if (!cleanMobile || !cleanOtp) {
        return jsonResponse(400, { error: 'Mobile number and verification code are required.' });
      }

      let adminRecord = null;
      if (pool) {
        try {
          const aRes = await pool.query(
            `SELECT id, name, mobile, email, role, is_active FROM public.administrators
             WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
            [cleanMobile, cleanMobile.replace(/^\+91/, '')]
          );
          adminRecord = aRes.rows[0];
        } catch {}
      }

      const isPrimary = (adminRecord?.role === 'primary_admin') || Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);
      let otpValid = false;

      // Check DB OTP
      if (pool) {
        try {
          const otpRes = await pool.query(
            `SELECT * FROM public.admin_otp_codes
             WHERE mobile = $1 AND expires_at > timezone('utc'::text, now()) LIMIT 1;`,
            [cleanMobile]
          );
          if (otpRes.rows[0] && otpRes.rows[0].otp_code === cleanOtp) {
            otpValid = true;
            await pool.query(`DELETE FROM public.admin_otp_codes WHERE mobile = $1;`, [cleanMobile]);
          }
        } catch (dbErr) {
          console.warn('[Netlify Function] DB verify OTP error:', dbErr.message);
        }
      }

      // Check Memory OTP
      if (!otpValid) {
        const memRecord = memoryOtpStore.get(cleanMobile);
        if (memRecord && memRecord.otp === cleanOtp && Date.now() <= memRecord.expiresAt) {
          otpValid = true;
          memoryOtpStore.delete(cleanMobile);
        }
      }

      if (!otpValid) {
        return jsonResponse(401, { error: 'Invalid or expired verification code. Please check and re-enter.' });
      }

      const token = `whk-org-${crypto.randomBytes(24).toString('hex')}`;
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
             VALUES ($1, $2, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
             ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';`,
            [token, cleanMobile]
          );
        } catch {}
      }

      return jsonResponse(200, {
        success: true,
        token,
        user: {
          id: adminRecord?.id || (isPrimary ? 'adm-primary-01' : `adm-${Date.now().toString(36)}`),
          name: adminRecord?.name || (isPrimary ? 'Warhawks Primary Operations Chief' : 'Warhawks Tournament Administrator'),
          email: adminRecord?.email || (isPrimary ? 'operations@warhawks.org' : 'admin@warhawks.org'),
          mobile: adminRecord?.mobile || cleanMobile,
          role: 'organizer',
          adminRole: adminRecord?.role || (isPrimary ? 'primary_admin' : 'admin'),
          isPrimaryAdmin: isPrimary,
          title: isPrimary ? 'Primary Administrator & Command Chief' : 'Tournament Administrator'
        }
      });
    }

    // 4. Password Login
    if (path === '/auth/login' && method === 'POST') {
      const cleanMobile = normalizeMobile(body.mobile);
      const cleanPassword = String(body.password || '').trim();

      if (!cleanMobile) {
        return jsonResponse(400, { error: 'Please enter your organizer mobile number.' });
      }
      if (!cleanPassword) {
        return jsonResponse(400, { error: 'Please enter your administrator password.' });
      }

      let admin = null;

      if (pool) {
        try {
          const adminRes = await pool.query(
            `SELECT id, name, mobile, email, password_hash, role, is_active FROM public.administrators
             WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
            [cleanMobile, cleanMobile.replace(/^\+91/, '')]
          );
          admin = adminRes.rows[0];
        } catch {}
      }

      const isPrimary = (admin?.role === 'primary_admin') || Boolean(PRIMARY_ADMIN_MOBILE && cleanMobile === PRIMARY_ADMIN_MOBILE);

      if (!admin && isPrimary && DEFAULT_ORGANIZER_PASSWORD) {
        admin = {
          id: 'adm-primary-01',
          name: 'Warhawks Primary Operations Chief',
          email: 'operations@warhawks.org',
          mobile: cleanMobile,
          role: 'primary_admin',
          password_hash: crypto.createHash('sha256').update(DEFAULT_ORGANIZER_PASSWORD + 'whk_salt_2026').digest('hex')
        };
      }

      if (!admin) {
        return jsonResponse(404, { error: 'This mobile number is not registered as an authorized tournament administrator.' });
      }

      const salt = 'whk_salt_2026';
      const computedHash = crypto.createHash('sha256').update(cleanPassword + salt).digest('hex');

      // Once changed, only the new password hash matches; initial password is no longer accepted
      const isMatch = computedHash === admin.password_hash;

      if (!isMatch) {
        return jsonResponse(401, { error: 'Invalid administrator credentials. Please check your phone number and password.' });
      }

      const token = `whk-org-${crypto.randomBytes(24).toString('hex')}`;
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
             VALUES ($1, $2, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
             ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';`,
            [token, cleanMobile]
          );
        } catch {}
      }

      return jsonResponse(200, {
        success: true,
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
    }

    // 4b. Change Password (Only the logged-in administrator can change their own password)
    if (path === '/auth/change-password' && method === 'POST') {
      if (!token || !verifyOrganizerToken(token)) {
        return jsonResponse(403, { error: 'Forbidden: Valid administrator session required.' });
      }

      const { currentPassword, newPassword } = body;
      if (!currentPassword?.trim()) {
        return jsonResponse(400, { error: 'Please enter your current password.' });
      }
      if (!newPassword?.trim() || newPassword.trim().length < 6) {
        return jsonResponse(400, { error: 'New password must be at least 6 characters long.' });
      }

      let mobile = null;
      if (pool) {
        try {
          const sRes = await pool.query(
            `SELECT mobile FROM public.organizer_sessions WHERE token = $1 AND expires_at > timezone('utc', now()) LIMIT 1;`,
            [token]
          );
          mobile = sRes.rows[0]?.mobile;
        } catch {}
      }

      const cleanMobile = normalizeMobile(mobile || PRIMARY_ADMIN_MOBILE);

      if (pool) {
        try {
          const aRes = await pool.query(
            `SELECT id, password_hash FROM public.administrators
             WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
            [cleanMobile, cleanMobile.replace(/^\+91/, '')]
          );
          const adminRec = aRes.rows[0];
          if (!adminRec) {
            return jsonResponse(404, { error: 'Administrator profile not found.' });
          }

          const salt = 'whk_salt_2026';
          const curHash = crypto.createHash('sha256').update(currentPassword.trim() + salt).digest('hex');
          if (curHash !== adminRec.password_hash) {
            return jsonResponse(401, { error: 'Current password is incorrect. Please re-enter.' });
          }

          const newH = crypto.createHash('sha256').update(newPassword.trim() + salt).digest('hex');
          await pool.query(
            `UPDATE public.administrators SET password_hash = $1, updated_at = timezone('utc', now()) WHERE id = $2;`,
            [newH, adminRec.id]
          );
        } catch (dbErr) {
          console.warn('[Netlify Function] DB change password warning:', dbErr.message);
        }
      }

      return jsonResponse(200, {
        success: true,
        message: 'Password updated successfully. Please use your new password for future sign-ins.'
      });
    }

    // 5. Auth Verify
    if (path === '/auth/verify' && method === 'GET') {
      const isValid = verifyOrganizerToken(token);
      return jsonResponse(200, { valid: isValid, role: isValid ? 'organizer' : 'player' });
    }

    // 6. Auth Logout
    if (path === '/auth/logout' && method === 'POST') {
      if (pool && token) {
        try {
          await pool.query('DELETE FROM public.organizer_sessions WHERE token = $1;', [token]);
        } catch {}
      }
      return jsonResponse(200, { success: true });
    }

    // 7. Tournaments API
    if (path === '/tournaments' || path.startsWith('/tournaments/')) {
      const match = path.match(/^\/tournaments\/([^/]+)$/);
      const tournamentId = match ? match[1] : null;

      if (method === 'GET' && !tournamentId) {
        if (pool) {
          const res = await pool.query('SELECT * FROM public.tournaments ORDER BY edition_number DESC;');
          return jsonResponse(200, res.rows);
        }
        return jsonResponse(200, []);
      }

      if (method === 'DELETE' && tournamentId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.players WHERE tournament_id = $1;', [tournamentId]).catch(() => {});
          await pool.query('DELETE FROM public.teams WHERE tournament_id = $1;', [tournamentId]).catch(() => {});
          await pool.query('DELETE FROM public.registrations WHERE tournament_id = $1;', [tournamentId]).catch(() => {});
          await pool.query('DELETE FROM public.tournaments WHERE id = $1;', [tournamentId]);
        }
        return jsonResponse(200, { success: true, id: tournamentId });
      }
    }

    // 8. Admins API
    if (path === '/admins' || path.startsWith('/admins/')) {
      if (!verifyOrganizerToken(token)) {
        return jsonResponse(403, { error: 'Forbidden: Valid administrator session required.' });
      }

      // Check caller is primary admin for privileged admin operations
      let callerMobile = '';
      if (pool) {
        try {
          const sRes = await pool.query(
            `SELECT mobile FROM public.organizer_sessions WHERE token = $1 AND expires_at > timezone('utc', now()) LIMIT 1;`,
            [token]
          );
          callerMobile = sRes.rows[0]?.mobile || '';
        } catch {}
      }
      if (!callerMobile && token.startsWith('whk.') && token.split('.').length === 3) {
        try {
          const p = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
          callerMobile = p.split(':')[0] || '';
        } catch {}
      }
      let callerAdmin = null;
      if (pool && callerMobile) {
        try {
          const caRes = await pool.query(
            `SELECT role FROM public.administrators WHERE (mobile = $1 OR mobile = $2) AND is_active = true LIMIT 1;`,
            [callerMobile, callerMobile.replace(/^\+91/, '')]
          );
          callerAdmin = caRes.rows[0];
        } catch {}
      }
      const isCallerPrimary = !callerMobile || (callerAdmin?.role === 'primary_admin') || Boolean(PRIMARY_ADMIN_MOBILE && callerMobile === PRIMARY_ADMIN_MOBILE);

      // GET /admins
      if (path === '/admins' && method === 'GET') {
        if (pool) {
          try {
            const res = await pool.query(
              `SELECT id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt"
               FROM public.administrators
               ORDER BY (role = 'primary_admin') DESC, created_at ASC;`
            );
            return jsonResponse(200, res.rows);
          } catch {}
        }
        return jsonResponse(200, [
          {
            id: 'adm-primary-01',
            name: 'Warhawks Primary Operations Chief',
            mobile: PRIMARY_ADMIN_MOBILE,
            email: 'operations@warhawks.org',
            role: 'primary_admin',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z'
          }
        ]);
      }

      // POST /admins (create administrator)
      if (path === '/admins' && method === 'POST') {
        if (!isCallerPrimary) {
          return jsonResponse(403, { error: 'Only Primary Administrator can provision administrators.' });
        }
        const { name, mobile, email, password } = body;
        const cleanMobile = normalizeMobile(mobile);
        if (!name?.trim() || !cleanMobile || !password?.trim()) {
          return jsonResponse(400, { error: 'Name, valid mobile number, and password are required.' });
        }

        const salt = 'whk_salt_2026';
        const passwordHash = crypto.createHash('sha256').update(password.trim() + salt).digest('hex');
        const newId = `adm-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

        if (pool) {
          try {
            const insertRes = await pool.query(
              `INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
               VALUES ($1, $2, $3, $4, $5, 'admin', true)
               RETURNING id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt";`,
              [newId, name.trim(), cleanMobile, (email || '').trim(), passwordHash]
            );
            return jsonResponse(201, insertRes.rows[0]);
          } catch (dbErr) {
            return jsonResponse(500, { error: dbErr.message });
          }
        }

        return jsonResponse(201, {
          id: newId,
          name: name.trim(),
          mobile: cleanMobile,
          email: (email || '').trim(),
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }

      // Emergency Password Reset: POST /admins/:id/reset-password
      const resetMatch = path.match(/^\/admins\/([^\/]+)\/reset-password$/);
      if (resetMatch && method === 'POST') {
        if (!isCallerPrimary) {
          return jsonResponse(403, { error: 'Forbidden: Only Primary Administrator can perform emergency password resets.' });
        }
        const targetId = resetMatch[1];
        const { newPassword } = body;
        if (!newPassword || String(newPassword).trim().length < 6) {
          return jsonResponse(400, { error: 'New password must be at least 6 characters long.' });
        }

        if (pool) {
          try {
            const salt = 'whk_salt_2026';
            const newHash = crypto.createHash('sha256').update(String(newPassword).trim() + salt).digest('hex');
            const upd = await pool.query(
              `UPDATE public.administrators SET password_hash = $1, updated_at = timezone('utc', now()) WHERE id = $2 RETURNING id, name, mobile;`,
              [newHash, targetId]
            );
            if (upd.rows.length === 0) {
              return jsonResponse(404, { error: 'Administrator not found.' });
            }
            return jsonResponse(200, {
              success: true,
              message: `Emergency password reset complete for ${upd.rows[0].name}.`
            });
          } catch (dbErr) {
            return jsonResponse(500, { error: dbErr.message });
          }
        }

        return jsonResponse(200, {
          success: true,
          message: 'Emergency password reset applied successfully.'
        });
      }

      // Single admin by ID: PATCH /admins/:id or DELETE /admins/:id
      const singleMatch = path.match(/^\/admins\/([^\/]+)$/);
      if (singleMatch) {
        const targetId = singleMatch[1];

        // DELETE /admins/:id
        if (method === 'DELETE') {
          if (!isCallerPrimary) {
            return jsonResponse(403, { error: 'Only Primary Administrator can remove administrators.' });
          }
          if (targetId === 'adm-primary-01') {
            return jsonResponse(403, { error: 'Primary Administrator account cannot be deleted.' });
          }
          if (pool) {
            try {
              const check = await pool.query(`SELECT id, role FROM public.administrators WHERE id = $1;`, [targetId]);
              if (check.rows.length > 0 && check.rows[0].role === 'primary_admin') {
                return jsonResponse(403, { error: 'Primary Administrator account cannot be deleted.' });
              }
              await pool.query(`DELETE FROM public.administrators WHERE id = $1;`, [targetId]);
              return jsonResponse(200, { success: true, id: targetId });
            } catch (dbErr) {
              return jsonResponse(500, { error: dbErr.message });
            }
          }
          return jsonResponse(200, { success: true, id: targetId });
        }

        // PATCH /admins/:id (e.g. toggle status)
        if (method === 'PATCH') {
          if (!isCallerPrimary) {
            return jsonResponse(403, { error: 'Only Primary Administrator can modify administrator status.' });
          }
          const { isActive } = body;
          if (pool) {
            try {
              const res = await pool.query(
                `UPDATE public.administrators SET is_active = $1, updated_at = timezone('utc', now()) WHERE id = $2
                 RETURNING id, name, mobile, email, role, is_active as "isActive", created_at as "createdAt";`,
                [Boolean(isActive), targetId]
              );
              return jsonResponse(200, res.rows[0] || { success: true, id: targetId, isActive });
            } catch (dbErr) {
              return jsonResponse(500, { error: dbErr.message });
            }
          }
          return jsonResponse(200, { success: true, id: targetId, isActive });
        }
      }
    }

    // Fallback for unhandled routes
    return jsonResponse(404, { error: `Endpoint ${path} not found on Warhawks API.` });
  } catch (err) {
    console.error('[Netlify Function Handler Error]:', err);
    return jsonResponse(500, { error: err.message || 'Internal server error' });
  }
}
