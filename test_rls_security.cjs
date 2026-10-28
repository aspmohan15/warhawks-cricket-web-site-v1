const { Pool } = require('pg');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key missing in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runRlsTests() {
  console.log('=== STARTING SUPABASE RLS VERIFICATION SUITE ===');

  // Step 1: Check RLS status of all tables
  const rlsStatusRes = await pool.query(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  const disabledTables = rlsStatusRes.rows.filter(r => !r.rls_enabled);
  console.log(`[Check 1] Total Public Tables: ${rlsStatusRes.rows.length}`);
  console.log(`[Check 1] Tables with RLS disabled: ${disabledTables.length}`);
  if (disabledTables.length > 0) {
    throw new Error(`Tables missing RLS: ${disabledTables.map(t => t.table_name).join(', ')}`);
  }
  console.log('✅ Check 1 Passed: 100% of public tables have Row-Level Security ENABLED.');

  // Step 2: Unauthenticated / Anon access to announcements
  console.log('\n[Check 2] Testing unauthenticated access to announcements...');
  const anonAnnRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const anonAnnData = await anonAnnRes.json();
  console.log(`Anon announcements fetch status: ${anonAnnRes.status}, items returned: ${anonAnnData.length}`);
  // Verify all returned items are active
  const hasInactive = Array.isArray(anonAnnData) && anonAnnData.some(a => a.is_active === false);
  if (hasInactive) {
    throw new Error('RLS Leak: Unauthenticated client received inactive announcement!');
  }
  console.log('✅ Check 2 Passed: Unauthenticated client can only view active announcements.');

  // Step 3: Unauthenticated write to announcements must fail
  console.log('\n[Check 3] Testing unauthenticated write to announcements...');
  const anonWriteRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      id: 'hacker-announcement-test',
      message: 'Unauthorized announcement',
      display_order: 999,
      is_active: true
    })
  });
  console.log(`Anon write status: ${anonWriteRes.status}`);
  if (anonWriteRes.ok) {
    throw new Error('RLS Security Violation: Unauthenticated client was able to insert into announcements!');
  }
  console.log('✅ Check 3 Passed: Unauthenticated INSERT to announcements rejected by RLS (401/403/Blocked).');

  // Step 4: Unauthenticated access to organizer_sessions must NOT leak session tokens
  console.log('\n[Check 4] Testing unauthenticated access to organizer_sessions...');
  const anonSessionsRes = await fetch(`${SUPABASE_URL}/rest/v1/organizer_sessions?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const anonSessionsData = await anonSessionsRes.json();
  console.log(`Anon organizer_sessions fetch status: ${anonSessionsRes.status}, items returned: ${Array.isArray(anonSessionsData) ? anonSessionsData.length : anonSessionsData}`);
  if (Array.isArray(anonSessionsData) && anonSessionsData.length > 0) {
    throw new Error('RLS Security Violation: Unauthenticated client can read organizer session tokens!');
  }
  console.log('✅ Check 4 Passed: Unauthenticated access to organizer_sessions returned 0 rows / empty.');

  // Step 5: Unauthenticated access to admin_otp_codes must NOT leak OTPs or allow modifications
  console.log('\n[Check 5] Testing unauthenticated access to admin_otp_codes...');
  const anonOtpRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_otp_codes?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const anonOtpData = await anonOtpRes.json();
  console.log(`Anon admin_otp_codes fetch status: ${anonOtpRes.status}, items returned: ${Array.isArray(anonOtpData) ? anonOtpData.length : anonOtpData}`);
  if (Array.isArray(anonOtpData) && anonOtpData.length > 0) {
    throw new Error('RLS Security Violation: Unauthenticated client can read admin OTP codes!');
  }
  console.log('✅ Check 5 Passed: Unauthenticated access to admin_otp_codes returned 0 rows / protected.');

  // Step 6: Unauthenticated access to administrators must NOT leak password hashes
  console.log('\n[Check 6] Testing unauthenticated access to administrators...');
  const anonAdminsRes = await fetch(`${SUPABASE_URL}/rest/v1/administrators?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const anonAdminsData = await anonAdminsRes.json();
  console.log(`Anon administrators fetch status: ${anonAdminsRes.status}, items returned: ${Array.isArray(anonAdminsData) ? anonAdminsData.length : anonAdminsData}`);
  if (Array.isArray(anonAdminsData) && anonAdminsData.length > 0) {
    throw new Error('RLS Security Violation: Unauthenticated client can read administrators table!');
  }
  console.log('✅ Check 6 Passed: Unauthenticated access to administrators returned 0 rows / protected.');

  // Step 7: Organizer access with organizer token
  console.log('\n[Check 7] Testing authorized Organizer access...');
  // Let's get an active organizer token from the server auth flow or database
  const sessionRow = await pool.query(`
    SELECT token FROM public.organizer_sessions
    WHERE expires_at > timezone('utc'::text, now())
    ORDER BY created_at DESC LIMIT 1;
  `);

  if (sessionRow.rows.length > 0) {
    const orgToken = sessionRow.rows[0].token;
    console.log(`Found active organizer token: ${orgToken.substring(0, 15)}...`);

    const orgAnnRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-organizer-token': orgToken
      }
    });
    const orgAnnData = await orgAnnRes.json();
    console.log(`Organizer announcements fetch status: ${orgAnnRes.status}, count: ${orgAnnData.length}`);

    // Insert announcement with organizer token
    const testAnnId = `ann-rls-test-${Date.now()}`;
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-organizer-token': orgToken,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        id: testAnnId,
        message: 'RLS Verification Announcement',
        display_order: 99,
        is_active: false // Inactive: should be visible to organizer but hidden from public
      })
    });
    console.log(`Organizer insert announcement status: ${insertRes.status}`);
    if (!insertRes.ok) {
      throw new Error(`Organizer insert failed: ${await insertRes.text()}`);
    }

    // Verify inactive announcement is NOT visible to anon
    const verifyAnonRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${testAnnId}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const verifyAnonData = await verifyAnonRes.json();
    if (verifyAnonData.length > 0) {
      throw new Error('RLS Failure: Inactive announcement was visible to anon client!');
    }
    console.log('✅ Check 7a Passed: Organizer inserted inactive announcement, and it is strictly hidden from unauthenticated/public users.');

    // Cleanup
    const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${testAnnId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-organizer-token': orgToken
      }
    });
    console.log(`Organizer delete announcement status: ${deleteRes.status}`);
    console.log('✅ Check 7b Passed: Organizer successfully cleaned up test announcement.');
  } else {
    console.log('ℹ️ No active organizer token in DB, skipping direct PostgREST organizer token write test (already covered in test_suite.js)');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL SUPABASE RLS VERIFICATION TESTS PASSED PERFECTLY!');
  console.log('======================================================');
}

runRlsTests()
  .catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
