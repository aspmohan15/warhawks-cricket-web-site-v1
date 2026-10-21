import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  console.log('--- Starting Warhawks Automated Verification ---');

  // Test 1: Verify Initial Primary Administrator in Database
  const adminRes = await pool.query("SELECT id, name, mobile, role, is_active FROM public.administrators WHERE role = 'primary_admin' LIMIT 1;");
  if (adminRes.rows.length === 0 || adminRes.rows[0].role !== 'primary_admin') {
    throw new Error('Primary Admin not found or not primary_admin');
  }
  const primaryAdmin = adminRes.rows[0];
  console.log('✅ Test 1 Passed: Primary Admin verified:', primaryAdmin.name, primaryAdmin.role);

  // Test 2: Request OTP for Primary Admin via /api/auth/request-otp
  const reqRes = await fetch('http://localhost:3000/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: primaryAdmin.mobile })
  });
  const reqData = await reqRes.json();
  if (!reqRes.ok || !reqData.success || !reqData.devOtp) {
    throw new Error('Failed to request OTP: ' + JSON.stringify(reqData));
  }
  console.log('✅ Test 2 Passed: OTP generated for Primary Admin');

  // Test 3: Verify OTP and Obtain Token
  const verRes = await fetch('http://localhost:3000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: primaryAdmin.mobile, otp: reqData.devOtp })
  });
  const verData = await verRes.json();
  if (!verRes.ok || !verData.token || !verData.user?.isPrimaryAdmin) {
    throw new Error('Failed to verify OTP: ' + JSON.stringify(verData));
  }
  const primaryToken = verData.token;
  console.log('✅ Test 3 Passed: Primary Admin authenticated successfully. Token:', primaryToken.slice(0, 15) + '...');

  // Test 4: Primary Admin Creates Additional Administrator
  const testNewMobile = '+919988776655';
  await pool.query('DELETE FROM public.administrators WHERE mobile = $1;', [testNewMobile]);
  const createAdminRes = await fetch('http://localhost:3000/api/admins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + primaryToken
    },
    body: JSON.stringify({
      name: 'Test Associate Admin',
      mobile: testNewMobile,
      email: 'test.admin@warhawks.org',
      password: 'DynamicSecret_' + Date.now()
    })
  });
  const createAdminData = await createAdminRes.json();
  if (!createAdminRes.ok || createAdminData.role !== 'admin') {
    throw new Error('Failed to create additional admin: ' + JSON.stringify(createAdminData));
  }
  console.log('✅ Test 4 Passed: Additional admin created:', createAdminData.name, createAdminData.mobile);

  // Test 5: Newly Created Administrator Can Request OTP and Sign In
  const newAdminReq = await fetch('http://localhost:3000/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testNewMobile })
  });
  const newAdminOtpData = await newAdminReq.json();
  const newAdminVer = await fetch('http://localhost:3000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testNewMobile, otp: newAdminOtpData.devOtp })
  });
  const newAdminSession = await newAdminVer.json();
  if (!newAdminVer.ok || !newAdminSession.token || newAdminSession.user.isPrimaryAdmin) {
    throw new Error('New admin failed to login or wrongly granted primary admin: ' + JSON.stringify(newAdminSession));
  }
  console.log('✅ Test 5 Passed: Newly created admin signed in securely as ordinary admin (isPrimaryAdmin = false)');

  // Test 6: Ordinary Admin CANNOT Create Another Admin (Permission Boundary Check)
  const forbiddenCreate = await fetch('http://localhost:3000/api/admins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + newAdminSession.token
    },
    body: JSON.stringify({
      name: 'Unauthorized Admin',
      mobile: '+919999900000',
      password: 'DynamicSecret_' + (Date.now() + 1)
    })
  });
  if (forbiddenCreate.status !== 403) {
    throw new Error('Expected 403 Forbidden for non-primary admin creating accounts, got: ' + forbiddenCreate.status);
  }
  console.log('✅ Test 6 Passed: Non-primary admin correctly forbidden (403) from creating administrators.');

  // Test 7: Team Creation Without Home City and Owner Name
  const teamRes = await fetch('http://localhost:3000/api/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + primaryToken
    },
    body: JSON.stringify({
      tournamentId: 'tour-ed2-mvfakkwf',
      name: 'Auto Test Phoenix',
      shortCode: 'ATP',
      primaryColor: '#e11d48',
      secondaryColor: '#1e293b',
      budgetTotal: 10000000
    })
  });
  const teamData = await teamRes.json();
  if (!teamRes.ok || !teamData.id) {
    throw new Error('Failed to create team without city/owner: ' + JSON.stringify(teamData));
  }
  console.log('✅ Test 7 Passed: Team created without Home City or Owner Name:', teamData.id, teamData.name);
  await pool.query('DELETE FROM public.teams WHERE id = $1;', [teamData.id]);

  // Test 8: Public Registration with Independent Guest Breakfast & Lunch
  const testRegId = 'reg-test-' + Date.now();
  const testGuests = [
    { guestNumber: 1, dietaryPreference: 'Veg', hasBreakfast: true, hasLunch: false },
    { guestNumber: 2, dietaryPreference: 'Non-Veg', hasBreakfast: false, hasLunch: true },
    { guestNumber: 3, dietaryPreference: 'Veg', hasBreakfast: true, hasLunch: true }
  ];
  const regRes = await fetch('http://localhost:3000/api/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testRegId,
      tournamentId: 'tour-ed2-mvfakkwf',
      fullName: 'Test Athlete MultiGuest',
      email: 'athlete.guest.test@gmail.com',
      phone: '+91 98765 11111',
      age: 25,
      city: 'Bengaluru',
      primaryRole: 'All-Rounder',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      preferredJerseyNo: 7,
      shirtSize: 'M',
      foodPreference: 'Veg',
      hasBreakfast: true,
      hasLunch: false,
      guestCount: 3,
      guests: testGuests,
      paymentReference: 'UPI-TEST-9988'
    })
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.id) {
    throw new Error('Failed to insert registration with guests: ' + JSON.stringify(regData));
  }
  console.log('✅ Test 8 Passed: Registration created with 3 independent guests and meal choices:', regData.id);

  // Test 9: Verify Stored Guest Meal Selections in Database
  const checkReg = await pool.query('SELECT id, guests, has_breakfast, has_lunch, has_guest_breakfast, has_guest_lunch FROM public.registrations WHERE id = $1;', [testRegId]);
  const fetchedGuests = checkReg.rows[0].guests;
  if (!Array.isArray(fetchedGuests) || fetchedGuests.length !== 3) {
    throw new Error('Guests array was not persisted properly in DB');
  }
  if (!fetchedGuests[0].hasBreakfast || fetchedGuests[0].hasLunch) {
    throw new Error('Guest 1 meal selection altered');
  }
  if (fetchedGuests[1].hasBreakfast || !fetchedGuests[1].hasLunch) {
    throw new Error('Guest 2 meal selection altered');
  }
  if (!fetchedGuests[2].hasBreakfast || !fetchedGuests[2].hasLunch) {
    throw new Error('Guest 3 meal selection altered');
  }
  console.log('✅ Test 9 Passed: Guest meal selections persisted independently:');
  console.log('   Guest 1:', fetchedGuests[0]);
  console.log('   Guest 2:', fetchedGuests[1]);
  console.log('   Guest 3:', fetchedGuests[2]);
  await pool.query('DELETE FROM public.registrations WHERE id = $1;', [testRegId]);

  // Clean up test admin
  await pool.query('DELETE FROM public.administrators WHERE mobile = $1;', [testNewMobile]);

  // Test 10: Tournament Edition Creation and Deletion Lifecycle
  const testTournId = `tourn-test-${Date.now()}`;
  const tournCreateRes = await fetch('http://localhost:3000/api/tournaments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + primaryToken
    },
    body: JSON.stringify({
      id: testTournId,
      name: 'Automated Test Tournament Edition 99',
      editionNumber: 99,
      year: 2029,
      format: 'T20',
      status: 'upcoming',
      startDate: '2029-01-01',
      endDate: '2029-01-10',
      venue: 'Test Grounds',
      city: 'Chennai',
      organizer: 'Warhawks Test Unit',
      registrationOpen: false,
      totalBudgetPointsPerTeam: 10000000
    })
  });
  const tournCreated = await tournCreateRes.json();
  if (!tournCreateRes.ok || tournCreated.id !== testTournId) {
    throw new Error('Failed to create test tournament edition: ' + JSON.stringify(tournCreated));
  }
  console.log('✅ Test 10a Passed: Tournament Edition created:', tournCreated.id, tournCreated.name);

  // Now delete the tournament edition via DELETE /api/tournaments/:id
  const tournDeleteRes = await fetch(`http://localhost:3000/api/tournaments/${testTournId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + primaryToken
    }
  });
  const tournDeleteData = await tournDeleteRes.json();
  if (!tournDeleteRes.ok || !tournDeleteData.success) {
    throw new Error('Failed to delete tournament edition: ' + JSON.stringify(tournDeleteData));
  }
  const checkDeleted = await pool.query('SELECT id FROM public.tournaments WHERE id = $1;', [testTournId]);
  if (checkDeleted.rows.length !== 0) {
    throw new Error('Tournament edition still exists in database after deletion!');
  }
  console.log('✅ Test 10b Passed: Tournament Edition deleted successfully via API.');

  console.log('--- ALL 10 INTEGRATION & SECURITY TESTS PASSED PERFECTLY! ---');
  await pool.end();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('❌ Test Failed:', err);
  await pool.end();
  process.exit(1);
});
