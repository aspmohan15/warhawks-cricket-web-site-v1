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

const mapAnnouncementRow = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  message: row.message,
  displayOrder: Number(row.display_order ?? 0),
  isActive: Boolean(row.is_active),
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapExpenseRow = (row) => ({
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

const mapRuleRow = (row) => ({
  id: row.id,
  tournamentId: row.tournament_id,
  title: row.title,
  category: row.category,
  content: row.content,
  videoUrl: row.video_url || '',
  isPublished: Boolean(row.is_published),
  updatedAt: row.updated_at
});

const mapMatchRow = (row) => ({
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
  const queryParams = event.queryStringParameters || {};
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

      if (method === 'POST' && !tournamentId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const t = body;
        if (pool) {
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
              $15, $16, $17, $18, $19, $20, $21,
              $22, $23, $24, $25, $26, $27
            ) RETURNING *;
          `;
          const values = [
            t.id, t.name, t.editionNumber, t.year, t.format || 'T20', t.status || 'upcoming',
            t.organizer || 'Warhawks', t.organizerRole || 'Official Tournament Organizer & Host',
            t.organizerBranch || 'Warhawks Tournament Operations', t.startDate, t.endDate,
            t.venue, t.city, Boolean(t.registrationOpen), t.registrationStartDate || null,
            t.registrationEndDate || null, t.totalBudgetPointsPerTeam || 10000000,
            t.pointsPerWin ?? 2, t.pointsPerTie ?? 1, t.maxSquadSize || 18, t.minSquadSize || 14,
            t.maxOverseasPlayers || 4, t.description || '', t.upiQrCodeUrl || '',
            t.upiId || 'warhawks.sports@icici', Number(t.registrationFee) || 1500,
            Boolean(t.isArchived)
          ];
          const res = await pool.query(query, values);
          return jsonResponse(201, res.rows[0]);
        }
        return jsonResponse(201, t);
      }

      if (method === 'PATCH' && tournamentId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const updates = body;
          const fieldMap = {
            name: 'name', editionNumber: 'edition_number', year: 'year', format: 'format',
            status: 'status', startDate: 'start_date', endDate: 'end_date', venue: 'venue',
            city: 'city', registrationOpen: 'registration_open', registrationStartDate: 'registration_start_date',
            registrationEndDate: 'registration_end_date', totalBudgetPointsPerTeam: 'total_budget_points_per_team',
            pointsPerWin: 'points_per_win', pointsPerTie: 'points_per_tie', maxSquadSize: 'max_squad_size',
            minSquadSize: 'min_squad_size', maxOverseasPlayers: 'max_overseas_players', description: 'description',
            upiQrCodeUrl: 'upi_qr_code_url', upiId: 'upi_id', registrationFee: 'registration_fee', isArchived: 'is_archived'
          };
          const setClauses = ['updated_at = timezone(\'utc\', now())'];
          const values = [tournamentId];
          Object.keys(updates).forEach(key => {
            const col = fieldMap[key];
            if (col) {
              values.push(updates[key]);
              setClauses.push(`${col} = $${values.length}`);
            }
          });
          const res = await pool.query(
            `UPDATE public.tournaments SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`,
            values
          );
          if (res.rows.length === 0) return jsonResponse(404, { error: 'Tournament not found.' });
          return jsonResponse(200, res.rows[0]);
        }
        return jsonResponse(200, { id: tournamentId, ...body });
      }
    }

    // Teams API
    if (path === '/teams' || path.startsWith('/teams/')) {
      const match = path.match(/^\/teams\/([^/]+)$/);
      const teamId = match ? match[1] : null;

      if (method === 'POST' && !teamId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const t = body;
        const newId = t.id || `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        if (pool) {
          const res = await pool.query(
            `INSERT INTO public.teams (
              id, tournament_id, name, short_code, city, primary_color, secondary_color,
              logo_url, owner_name, budget_total, budget_spent, budget_remaining, total_players_assigned
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;`,
            [
              newId, t.tournamentId, t.name, (t.shortCode || 'TEAM').toUpperCase(), t.city || '',
              t.primaryColor || '#0284c7', t.secondaryColor || '#0f172a', t.logoUrl || null,
              t.ownerName || '', t.budgetTotal || 10000000, t.budgetSpent || 0,
              t.budgetRemaining || t.budgetTotal || 10000000, t.totalPlayersAssigned || 0
            ]
          );
          return jsonResponse(201, res.rows[0]);
        }
        return jsonResponse(201, { id: newId, ...t });
      }

      if (method === 'PATCH' && teamId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const updates = body;
          const fieldMap = {
            name: 'name', shortCode: 'short_code', city: 'city', primaryColor: 'primary_color',
            secondaryColor: 'secondary_color', logoUrl: 'logo_url', ownerName: 'owner_name',
            budgetTotal: 'budget_total', budgetSpent: 'budget_spent', budgetRemaining: 'budget_remaining',
            totalPlayersAssigned: 'total_players_assigned', captainPlayerId: 'captain_player_id'
          };
          const setClauses = [];
          const values = [teamId];
          Object.keys(updates).forEach(key => {
            const col = fieldMap[key];
            if (col) {
              values.push(updates[key]);
              setClauses.push(`${col} = $${values.length}`);
            }
          });
          if (setClauses.length > 0) {
            const res = await pool.query(`UPDATE public.teams SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`, values);
            if (res.rows.length === 0) return jsonResponse(404, { error: 'Team not found.' });
            return jsonResponse(200, res.rows[0]);
          }
        }
        return jsonResponse(200, { id: teamId, ...body });
      }

      if (method === 'DELETE' && teamId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.teams WHERE id = $1;', [teamId]);
        }
        return jsonResponse(200, { success: true, id: teamId });
      }
    }

    // Players API
    if (path === '/players' || path.startsWith('/players/')) {
      const match = path.match(/^\/players\/([^/]+)$/);
      const playerId = match ? match[1] : null;

      if (method === 'POST' && !playerId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const p = body;
        const newId = p.id || `ply-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        if (pool) {
          const res = await pool.query(
            `INSERT INTO public.players (
              id, tournament_id, name, jersey_number, role, batting_style, bowling_style,
              is_overseas, photo_url, base_price, is_captain, is_vice_captain, auction_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;`,
            [
              newId, p.tournamentId, p.name, p.jerseyNumber || null, p.role || 'All-Rounder',
              p.battingStyle || 'Right-hand bat', p.bowlingStyle || 'Right-arm medium',
              Boolean(p.isOverseas), p.photoUrl || null, p.basePrice || 100000,
              Boolean(p.isCaptain), Boolean(p.isViceCaptain), p.auctionStatus || 'available'
            ]
          );
          return jsonResponse(201, res.rows[0]);
        }
        return jsonResponse(201, { id: newId, ...p });
      }

      if (method === 'PATCH' && playerId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const updates = body;
          const fieldMap = {
            name: 'name', jerseyNumber: 'jersey_number', role: 'role', battingStyle: 'batting_style',
            bowlingStyle: 'bowling_style', isOverseas: 'is_overseas', photoUrl: 'photo_url',
            basePrice: 'base_price', isCaptain: 'is_captain', isViceCaptain: 'is_vice_captain',
            auctionStatus: 'auction_status', teamId: 'team_id', soldPrice: 'sold_price'
          };
          const setClauses = [];
          const values = [playerId];
          Object.keys(updates).forEach(key => {
            const col = fieldMap[key];
            if (col) {
              values.push(updates[key]);
              setClauses.push(`${col} = $${values.length}`);
            }
          });
          if (setClauses.length > 0) {
            const res = await pool.query(`UPDATE public.players SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`, values);
            if (res.rows.length === 0) return jsonResponse(404, { error: 'Player not found.' });
            return jsonResponse(200, res.rows[0]);
          }
        }
        return jsonResponse(200, { id: playerId, ...body });
      }

      if (method === 'DELETE' && playerId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.players WHERE id = $1;', [playerId]);
        }
        return jsonResponse(200, { success: true, id: playerId });
      }
    }

    // Matches API
    if (path === '/matches' || path.startsWith('/matches/')) {
      const match = path.match(/^\/matches\/([^/]+)$/);
      const matchId = match ? match[1] : null;

      if (method === 'GET' && !matchId) {
        if (pool) {
          const tId = queryParams.tournamentId;
          const query = tId
            ? 'SELECT * FROM public.matches WHERE tournament_id = $1 ORDER BY match_number ASC;'
            : 'SELECT * FROM public.matches ORDER BY match_number ASC;';
          const params = tId ? [tId] : [];
          const res = await pool.query(query, params);
          return jsonResponse(200, res.rows.map(mapMatchRow));
        }
        return jsonResponse(200, []);
      }

      if (method === 'POST' && !matchId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const m = body;
        if (!m.tournamentId) {
          return jsonResponse(400, { error: 'Target tournament ID is required to schedule a match.' });
        }
        if (!m.teamAId || !m.teamBId) {
          return jsonResponse(400, { error: 'Please select both Team A and Team B from registered tournament teams.' });
        }
        if (m.teamAId === m.teamBId) {
          return jsonResponse(400, { error: 'Team A and Team B cannot be the same franchise.' });
        }

        const newId = m.id || `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        if (pool) {
          try {
            // Auto-calculate next available match number to prevent unique constraint conflict (tournament_id, match_number)
            const maxRes = await pool.query(
              'SELECT COALESCE(MAX(match_number), 0) + 1 AS next_num FROM public.matches WHERE tournament_id = $1;',
              [m.tournamentId]
            );
            const nextMatchNum = Number(maxRes.rows[0]?.next_num) || 1;

            let targetMatchNumber = Number(m.matchNumber);
            if (!targetMatchNumber || targetMatchNumber < 1) {
              targetMatchNumber = nextMatchNum;
            } else {
              const exists = await pool.query(
                'SELECT 1 FROM public.matches WHERE tournament_id = $1 AND match_number = $2 LIMIT 1;',
                [m.tournamentId, targetMatchNumber]
              );
              if (exists.rows.length > 0) {
                targetMatchNumber = nextMatchNum;
              }
            }

            const res = await pool.query(
              `INSERT INTO public.matches (
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
              RETURNING *;`,
              [
                newId, m.tournamentId, targetMatchNumber, m.round || 'Group Stage',
                m.teamAId, m.teamBId, m.date || new Date().toISOString().split('T')[0],
                m.time || '19:30', m.venue || 'Stadium Ground', m.status || 'scheduled',
                Boolean(m.isImported), m.importSource || 'manual'
              ]
            );
            return jsonResponse(201, mapMatchRow(res.rows[0]));
          } catch (dbErr) {
            console.error('Netlify Function POST /matches DB error:', dbErr.message);
            return jsonResponse(400, { error: dbErr.message || 'Failed to schedule fixture in database.' });
          }
        }
        return jsonResponse(201, { id: newId, ...m });
      }

      if (method === 'PATCH' && matchId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          try {
            const updates = body;
            if (updates.teamAId && updates.teamBId && updates.teamAId === updates.teamBId) {
              return jsonResponse(400, { error: 'Team A and Team B cannot be the same franchise.' });
            }

            if (updates.teamAId || updates.teamBId) {
              const curRes = await pool.query('SELECT team_a_id, team_b_id FROM public.matches WHERE id = $1;', [matchId]);
              if (curRes.rows.length > 0) {
                const curA = updates.teamAId || curRes.rows[0].team_a_id;
                const curB = updates.teamBId || curRes.rows[0].team_b_id;
                if (curA === curB) {
                  return jsonResponse(400, { error: 'Team A and Team B cannot be the same franchise.' });
                }
              }
            }

            const fieldMap = {
              teamAId: 'team_a_id', teamBId: 'team_b_id', matchNumber: 'match_number',
              round: 'round', date: 'date', time: 'time', venue: 'venue', status: 'status',
              tossWinnerId: 'toss_winner_id', tossDecision: 'toss_decision',
              teamAScore: 'team_a_score', teamAOvers: 'team_a_overs',
              teamBScore: 'team_b_score', teamBOvers: 'team_b_overs',
              winnerId: 'winner_id', resultSummary: 'result_summary',
              manOfTheMatchPlayerId: 'man_of_the_match_player_id',
              cricheroesMatchId: 'cricheroes_match_id'
            };
            const setClauses = [];
            const values = [matchId];
            Object.keys(updates).forEach(key => {
              const col = fieldMap[key];
              if (col) {
                values.push(updates[key]);
                setClauses.push(`${col} = $${values.length}`);
              }
            });
            if (setClauses.length > 0) {
              const res = await pool.query(`UPDATE public.matches SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`, values);
              if (res.rows.length === 0) return jsonResponse(404, { error: 'Match not found.' });
              return jsonResponse(200, mapMatchRow(res.rows[0]));
            }
          } catch (dbErr) {
            console.error('Netlify Function PATCH /matches DB error:', dbErr.message);
            return jsonResponse(400, { error: dbErr.message || 'Failed to update fixture.' });
          }
        }
        return jsonResponse(200, { id: matchId, ...body });
      }

      if (method === 'DELETE' && matchId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.matches WHERE id = $1;', [matchId]);
        }
        return jsonResponse(200, { success: true, id: matchId });
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

    // 9. Announcements API
    if (path === '/announcements' || path.startsWith('/announcements/')) {
      const match = path.match(/^\/announcements\/([^/]+)$/);
      const annId = match ? match[1] : null;

      if (path === '/announcements/swap' && method === 'POST') {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const { id1, id2 } = body;
        if (!id1 || !id2) {
          return jsonResponse(400, { error: 'Both id1 and id2 are required.' });
        }
        if (pool) {
          const res1 = await pool.query('SELECT id, display_order FROM public.announcements WHERE id = $1 LIMIT 1;', [String(id1)]);
          const res2 = await pool.query('SELECT id, display_order FROM public.announcements WHERE id = $1 LIMIT 1;', [String(id2)]);
          if (res1.rows.length === 0 || res2.rows.length === 0) {
            return jsonResponse(404, { error: 'One or both announcements not found.' });
          }
          const order1 = Number(res1.rows[0].display_order);
          const order2 = Number(res2.rows[0].display_order);
          await pool.query('UPDATE public.announcements SET display_order = $1, updated_at = timezone(\'utc\', now()) WHERE id = $2;', [order2, String(id1)]);
          await pool.query('UPDATE public.announcements SET display_order = $1, updated_at = timezone(\'utc\', now()) WHERE id = $2;', [order1, String(id2)]);
          const updated = await pool.query('SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;');
          return jsonResponse(200, { success: true, items: updated.rows.map(mapAnnouncementRow) });
        }
        return jsonResponse(200, { success: true, items: [] });
      }

      if (path === '/announcements/reorder' && method === 'POST') {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const { items } = body;
        if (!Array.isArray(items) || items.length === 0) {
          return jsonResponse(400, { error: 'items array is required.' });
        }
        if (pool) {
          for (const it of items) {
            await pool.query('UPDATE public.announcements SET display_order = $1, updated_at = timezone(\'utc\', now()) WHERE id = $2;', [Number(it.displayOrder), String(it.id)]);
          }
          const updated = await pool.query('SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;');
          return jsonResponse(200, { success: true, items: updated.rows.map(mapAnnouncementRow) });
        }
        return jsonResponse(200, { success: true, items: [] });
      }

      if (method === 'GET' && !annId) {
        if (pool) {
          const res = await pool.query('SELECT * FROM public.announcements ORDER BY display_order ASC, created_at ASC;');
          return jsonResponse(200, res.rows.map(mapAnnouncementRow));
        }
        return jsonResponse(200, []);
      }

      if (method === 'POST' && !annId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const { message, tournamentId } = body;
        if (!message?.trim()) {
          return jsonResponse(400, { error: 'Message cannot be empty.' });
        }
        const newId = body.id || `ann-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        if (pool) {
          const countRes = await pool.query('SELECT COALESCE(MAX(display_order), -1) as max_order FROM public.announcements;');
          const nextOrder = Number(countRes.rows[0].max_order) + 1;
          const insertRes = await pool.query(
            `INSERT INTO public.announcements (id, tournament_id, message, display_order, is_active, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, true, $5, timezone('utc', now()), timezone('utc', now()))
             RETURNING *;`,
            [newId, tournamentId || null, message.trim(), nextOrder, body.createdBy || 'Organizer']
          );
          return jsonResponse(201, mapAnnouncementRow(insertRes.rows[0]));
        }
        return jsonResponse(201, { id: newId, message, displayOrder: 0, isActive: true });
      }

      if (method === 'PATCH' && annId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const { message, isActive } = body;
          const updates = [];
          const values = [annId];
          if (message !== undefined) {
            values.push(message.trim());
            updates.push(`message = $${values.length}`);
          }
          if (isActive !== undefined) {
            values.push(Boolean(isActive));
            updates.push(`is_active = $${values.length}`);
          }
          updates.push('updated_at = timezone(\'utc\', now())');
          const res = await pool.query(
            `UPDATE public.announcements SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`,
            values
          );
          if (res.rows.length === 0) return jsonResponse(404, { error: 'Announcement not found.' });
          return jsonResponse(200, mapAnnouncementRow(res.rows[0]));
        }
        return jsonResponse(200, { id: annId, ...body });
      }

      if (method === 'DELETE' && annId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.announcements WHERE id = $1;', [annId]);
        }
        return jsonResponse(200, { success: true, id: annId });
      }
    }

    // 10. Expenses API
    if (path === '/expenses' || path.startsWith('/expenses/')) {
      const match = path.match(/^\/expenses\/([^/]+)$/);
      const expId = match ? match[1] : null;
      const tId = queryParams.tournamentId;

      if (method === 'GET' && !expId) {
        if (pool) {
          const query = tId
            ? 'SELECT * FROM public.expenses WHERE tournament_id = $1 ORDER BY date DESC, created_at DESC;'
            : 'SELECT * FROM public.expenses ORDER BY date DESC, created_at DESC;';
          const params = tId ? [tId] : [];
          const res = await pool.query(query, params);
          return jsonResponse(200, res.rows.map(mapExpenseRow));
        }
        return jsonResponse(200, []);
      }

      if (method === 'POST' && !expId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const exp = body;
        if (!exp.title?.trim()) {
          return jsonResponse(400, { error: 'Expense title is required.' });
        }
        const newId = exp.id || `exp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        if (pool) {
          const res = await pool.query(
            `INSERT INTO public.expenses (id, tournament_id, title, category, amount, advance_amount, date, vendor_name, receipt_url, payment_mode, payment_status, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, timezone('utc', now()))
             ON CONFLICT (id) DO UPDATE SET
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
             RETURNING *;`,
            [
              newId,
              exp.tournamentId,
              exp.title.trim(),
              exp.category || 'Miscellaneous',
              Number(exp.amount) || 0,
              Number(exp.advanceAmount) || 0,
              exp.date || new Date().toISOString().split('T')[0],
              exp.vendorName || '',
              exp.receiptUrl || '',
              exp.paymentMode || 'Bank Transfer',
              exp.paymentStatus || 'paid',
              exp.notes || ''
            ]
          );
          return jsonResponse(201, mapExpenseRow(res.rows[0]));
        }
        return jsonResponse(201, { id: newId, ...exp });
      }

      if (method === 'PATCH' && expId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const updates = body;
          const fieldMap = {
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
          const setClauses = [];
          const values = [expId];
          Object.keys(updates).forEach(key => {
            const col = fieldMap[key];
            if (col) {
              values.push(updates[key]);
              setClauses.push(`${col} = $${values.length}`);
            }
          });
          if (setClauses.length === 0) return jsonResponse(400, { error: 'No valid update fields.' });
          const res = await pool.query(
            `UPDATE public.expenses SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`,
            values
          );
          if (res.rows.length === 0) return jsonResponse(404, { error: 'Expense not found.' });
          return jsonResponse(200, mapExpenseRow(res.rows[0]));
        }
        return jsonResponse(200, { id: expId, ...body });
      }

      if (method === 'DELETE' && expId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.expenses WHERE id = $1;', [expId]);
        }
        return jsonResponse(200, { success: true, id: expId });
      }
    }

    // 11. Rules API
    if (path === '/rules' || path.startsWith('/rules/')) {
      const match = path.match(/^\/rules\/([^/]+)$/);
      const ruleId = match ? match[1] : null;
      const tId = queryParams.tournamentId;

      if (method === 'GET' && !ruleId) {
        if (pool) {
          const query = tId
            ? 'SELECT * FROM public.rules WHERE tournament_id = $1 ORDER BY id ASC;'
            : 'SELECT * FROM public.rules ORDER BY id ASC;';
          const params = tId ? [tId] : [];
          const res = await pool.query(query, params);
          return jsonResponse(200, res.rows.map(mapRuleRow));
        }
        return jsonResponse(200, []);
      }

      if (method === 'POST' && !ruleId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        const r = body;
        if (!r.title?.trim() || !r.tournamentId) {
          return jsonResponse(400, { error: 'Title and tournamentId are required.' });
        }
        const newId = r.id || `rule-${Date.now().toString(36)}`;
        if (pool) {
          const res = await pool.query(
            `INSERT INTO public.rules (id, tournament_id, title, category, content, video_url, is_published, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, timezone('utc', now()))
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               category = EXCLUDED.category,
               content = EXCLUDED.content,
               video_url = EXCLUDED.video_url,
               is_published = EXCLUDED.is_published,
               updated_at = timezone('utc', now())
             RETURNING *;`,
            [
              newId,
              r.tournamentId,
              r.title.trim(),
              r.category || 'Tournament general',
              r.content || '',
              r.videoUrl || '',
              r.isPublished ?? true
            ]
          );
          return jsonResponse(201, mapRuleRow(res.rows[0]));
        }
        return jsonResponse(201, { id: newId, ...r });
      }

      if (method === 'PATCH' && ruleId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          const updates = body;
          const fieldMap = {
            title: 'title',
            category: 'category',
            content: 'content',
            videoUrl: 'video_url',
            isPublished: 'is_published'
          };
          const setClauses = ['updated_at = timezone(\'utc\', now())'];
          const values = [ruleId];
          Object.keys(updates).forEach(key => {
            const col = fieldMap[key];
            if (col) {
              values.push(updates[key]);
              setClauses.push(`${col} = $${values.length}`);
            }
          });
          const res = await pool.query(
            `UPDATE public.rules SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`,
            values
          );
          if (res.rows.length === 0) return jsonResponse(404, { error: 'Rule not found.' });
          return jsonResponse(200, mapRuleRow(res.rows[0]));
        }
        return jsonResponse(200, { id: ruleId, ...body });
      }

      if (method === 'DELETE' && ruleId) {
        if (!verifyOrganizerToken(token)) {
          return jsonResponse(403, { error: 'Forbidden: Organizer session required.' });
        }
        if (pool) {
          await pool.query('DELETE FROM public.rules WHERE id = $1;', [ruleId]);
        }
        return jsonResponse(200, { success: true, id: ruleId });
      }
    }

    // Fallback for unhandled routes
    return jsonResponse(404, { error: `Endpoint ${path} not found on Warhawks API.` });
  } catch (err) {
    console.error('[Netlify Function Handler Error]:', err);
    return jsonResponse(500, { error: err.message || 'Internal server error' });
  }
}
