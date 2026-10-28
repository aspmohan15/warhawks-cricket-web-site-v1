const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('[Security Audit] Starting transaction...');
    await client.query('BEGIN;');

    // 1. Enable RLS on announcements
    console.log('[Security Audit] Enabling RLS on public.announcements...');
    await client.query('ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;');

    // 2. Drop any legacy/duplicate policies on announcements
    await client.query('DROP POLICY IF EXISTS "Organizers can manage announcements" ON public.announcements;');
    await client.query('DROP POLICY IF EXISTS "Public & Players can view active announcements" ON public.announcements;');

    // 3. Create Organizer full management policy
    await client.query(`
      CREATE POLICY "Organizers can manage announcements"
      ON public.announcements
      FOR ALL
      TO public
      USING (is_organizer())
      WITH CHECK (is_organizer());
    `);

    // 4. Create Public/Player read policy for active announcements
    await client.query(`
      CREATE POLICY "Public & Players can view active announcements"
      ON public.announcements
      FOR SELECT
      TO public
      USING (is_active = true OR is_organizer());
    `);

    // 5. Harden admin_otp_codes: revoke public unrestricted access and restrict to organizers
    console.log('[Security Audit] Hardening public.admin_otp_codes RLS...');
    await client.query('DROP POLICY IF EXISTS "Public access admin_otp_codes" ON public.admin_otp_codes;');
    await client.query('DROP POLICY IF EXISTS "Organizers manage admin_otp_codes" ON public.admin_otp_codes;');
    await client.query(`
      CREATE POLICY "Organizers manage admin_otp_codes"
      ON public.admin_otp_codes
      FOR ALL
      TO public
      USING (is_organizer())
      WITH CHECK (is_organizer());
    `);

    // 6. Harden organizer_sessions: drop unrestricted public read
    console.log('[Security Audit] Hardening public.organizer_sessions RLS...');
    await client.query('DROP POLICY IF EXISTS "Public read organizer_sessions" ON public.organizer_sessions;');
    await client.query('DROP POLICY IF EXISTS "Organizers can view and manage organizer_sessions" ON public.organizer_sessions;');
    await client.query(`
      CREATE POLICY "Organizers can view and manage organizer_sessions"
      ON public.organizer_sessions
      FOR ALL
      TO public
      USING (is_organizer())
      WITH CHECK (is_organizer());
    `);

    // 7. Harden administrators: drop unrestricted public read of password_hashes
    console.log('[Security Audit] Hardening public.administrators RLS...');
    await client.query('DROP POLICY IF EXISTS "Public read administrators" ON public.administrators;');
    await client.query('DROP POLICY IF EXISTS "Organizers manage administrators" ON public.administrators;');
    await client.query(`
      CREATE POLICY "Organizers manage administrators"
      ON public.administrators
      FOR ALL
      TO public
      USING (is_organizer())
      WITH CHECK (is_organizer());
    `);

    await client.query('COMMIT;');
    console.log('[Security Audit] All RLS migrations applied successfully!');

    // Verification
    const res = await client.query(`
      SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);
    const disabled = res.rows.filter(r => !r.rls_enabled);
    console.log(`[Verification] Tables in public: ${res.rows.length}, RLS Disabled: ${disabled.length}`);
    if (disabled.length > 0) {
      console.error('Tables still missing RLS:', disabled);
    } else {
      console.log('ALL TABLES IN PUBLIC HAVE ROW LEVEL SECURITY ENABLED!');
    }
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Security Audit] Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
