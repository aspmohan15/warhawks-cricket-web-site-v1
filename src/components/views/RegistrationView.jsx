import React, { useState } from 'react';
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  UserCheck,
  Search,
  Filter,
  Check,
  X,
  CreditCard,
  Send,
  Ticket,
  ShieldCheck,
  Sparkles,
  Lock,
  Utensils,
  Users,
  Coffee,
  QrCode,
  Copy
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { DEFAULT_WARHAWKS_UPI } from '../../services/supabaseStorage';
import {
  FOOD_PREFERENCES,
  PLAYER_ROLES,
  BATTING_STYLES,
  BOWLING_STYLES,
  WARHAWKS_LOGO_URL
} from '../../constants';

export const RegistrationView = ({
  tournament,
  registrations,
  currentUser,
  onToggleRegistration,
  onUpdateRegistrationDates,
  onUpdateStatus,
  onPlayerRegister,
  onCancelRegistration,
  onNavigateToEditions
}) => {
  const isOrganizer = currentUser?.role === 'organizer';

  // Organizer Queue Filters & Modals
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewModalApp, setReviewModalApp] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(tournament?.registrationStartDate || '');
  const [endDate, setEndDate] = useState(tournament?.registrationEndDate || '');

  // Player Form State
  const [playerForm, setPlayerForm] = useState({
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '+91 98200 12345',
    age: 24,
    city: tournament?.city || 'Mumbai',
    primaryRole: 'All-Rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    preferredJerseyNo: 18,
    shirtSize: 'L',
    // Dietary and meal selections for Player (Only 'Veg' and 'Non-Veg')
    foodPreference: 'Veg',
    hasBreakfast: true,
    hasLunch: true,
    // Accompanying guests with independent dietary preferences
    guestCount: 0,
    guests: [],
    guestFoodPreference: 'Veg',
    hasGuestBreakfast: false,
    hasGuestLunch: false,
    // Organizer UPI payment confirmation
    paymentReference: ''
  });

  const [copiedUpi, setCopiedUpi] = useState(false);

  // Dynamic guest count handler ensuring exact matching array of independent preferences and meals
  const handleGuestCountChange = (count) => {
    const newCount = Math.max(0, Math.min(20, parseInt(count, 10) || 0));
    setPlayerForm(prev => {
      let updatedGuests = [...(prev.guests || [])];
      if (newCount > updatedGuests.length) {
        // Add new guests with default dietary and meal selections
        for (let i = updatedGuests.length; i < newCount; i++) {
          updatedGuests.push({
            guestNumber: i + 1,
            dietaryPreference: 'Veg',
            hasBreakfast: false,
            hasLunch: false
          });
        }
      } else if (newCount < updatedGuests.length) {
        // Truncate to prevent stale guest data from being submitted
        updatedGuests = updatedGuests.slice(0, newCount);
      }

      return {
        ...prev,
        guestCount: newCount,
        guests: updatedGuests,
        hasGuestBreakfast: updatedGuests.some(g => g.hasBreakfast),
        hasGuestLunch: updatedGuests.some(g => g.hasLunch)
      };
    });
  };

  // Handler for individual guest dietary preference selection
  const handleGuestDietChange = (index, value) => {
    setPlayerForm(prev => {
      const updatedGuests = [...(prev.guests || [])];
      if (updatedGuests[index]) {
        updatedGuests[index] = {
          ...updatedGuests[index],
          dietaryPreference: value
        };
      }
      return {
        ...prev,
        guests: updatedGuests,
        guestFoodPreference: updatedGuests[0]?.dietaryPreference || 'Veg'
      };
    });
  };

  // Handler for individual guest meal selection (independent Breakfast & Lunch)
  const handleGuestMealChange = (index, mealKey, checked) => {
    setPlayerForm(prev => {
      const updatedGuests = [...(prev.guests || [])];
      if (updatedGuests[index]) {
        updatedGuests[index] = {
          ...updatedGuests[index],
          [mealKey]: Boolean(checked)
        };
      }
      return {
        ...prev,
        guests: updatedGuests,
        hasGuestBreakfast: updatedGuests.some(g => g.hasBreakfast),
        hasGuestLunch: updatedGuests.some(g => g.hasLunch)
      };
    });
  };

  const handleCopyUpiId = (upiId) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // Find player's existing registration for this tournament
  const myRegistration = registrations.find(
    r => r.tournamentId === tournament?.id && r.email?.toLowerCase() === (currentUser?.email || playerForm.email)?.toLowerCase()
  );

  const filteredRegistrations = registrations.filter(r => {
    if (filterStatus !== 'all' && r.approvalStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.primaryRole.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveDates = (e) => {
    e.preventDefault();
    onUpdateRegistrationDates(startDate, endDate);
    setDateModalOpen(false);
  };

  const handleReviewAction = (status) => {
    if (!reviewModalApp) return;
    onUpdateStatus(reviewModalApp.id, status, reviewNotes);
    setReviewModalApp(null);
    setReviewNotes('');
  };

  const handlePlayerFormSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.registrationOpen) {
      alert('Registration window is currently closed for this tournament.');
      return;
    }

    const gCount = Math.max(0, parseInt(playerForm.guestCount, 10) || 0);
    // Ensure guests array exactly matches guest count with independent dietary and meal selections
    const sanitizedGuests = (playerForm.guests || []).slice(0, gCount).map((g, idx) => ({
      guestNumber: idx + 1,
      dietaryPreference: g.dietaryPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg',
      hasBreakfast: Boolean(g.hasBreakfast),
      hasLunch: Boolean(g.hasLunch)
    }));

    while (sanitizedGuests.length < gCount) {
      sanitizedGuests.push({
        guestNumber: sanitizedGuests.length + 1,
        dietaryPreference: 'Veg',
        hasBreakfast: false,
        hasLunch: false
      });
    }

    if (!tournament?.id) {
      return;
    }

    onPlayerRegister({
      tournamentId: tournament?.id || '',
      ...playerForm,
      guestCount: gCount,
      guests: sanitizedGuests,
      hasGuestBreakfast: sanitizedGuests.some(g => g.hasBreakfast),
      hasGuestLunch: sanitizedGuests.some(g => g.hasLunch)
    });
  };

  // Helper to compute party meal totals with independent guest meal selections
  const getPartyMealStats = (reg) => {
    if (!reg) return { totalBreakfasts: 0, totalLunches: 0, totalMeals: 0, guestCount: 0 };
    const pBreakfast = reg.hasBreakfast ? 1 : 0;
    const pLunch = reg.hasLunch ? 1 : 0;
    const gCount = Math.max(0, parseInt(reg.guestCount, 10) || 0);

    let gBreakfast = 0;
    let gLunch = 0;

    if (gCount > 0) {
      if (Array.isArray(reg.guests) && reg.guests.length > 0) {
        reg.guests.slice(0, gCount).forEach(g => {
          if (g.hasBreakfast) gBreakfast += 1;
          if (g.hasLunch) gLunch += 1;
        });
      } else {
        // Fallback for legacy records
        gBreakfast = reg.hasGuestBreakfast ? gCount : 0;
        gLunch = reg.hasGuestLunch ? gCount : 0;
      }
    }

    return {
      totalBreakfasts: pBreakfast + gBreakfast,
      totalLunches: pLunch + gLunch,
      totalMeals: (pBreakfast + gBreakfast) + (pLunch + gLunch),
      guestCount: gCount,
      guestBreakfastCount: gBreakfast,
      guestLunchCount: gLunch
    };
  };

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          📋
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Tournament Open for Registration</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          {isOrganizer
            ? "There are currently no tournament editions created in the database. Please create a tournament edition in the 'Tournament Editions' module to configure and open player registrations."
            : "There are currently no active tournament editions open for player registration. Please check back soon or contact Warhawks tournament administration."}
        </p>
        {isOrganizer && (
          <button
            type="button"
            onClick={onNavigateToEditions}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Create Tournament Edition
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Warhawks Tournament Admissions</span>
            <span>·</span>
            <span className="capitalize">{isOrganizer ? 'Organizer Queue' : 'Player Portal'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isOrganizer ? 'Player Registration Management' : 'Tournament Registration Portal'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOrganizer
              ? 'Official athlete admission review queue, applicant approval pipeline, and roster verification.'
              : `Apply to participate in ${tournament?.name || 'the championship'} organized and hosted by Warhawks.`}
          </p>
        </div>

        {/* Organizer-only window control buttons */}
        {isOrganizer && (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setStartDate(tournament?.registrationStartDate || '');
                setEndDate(tournament?.registrationEndDate || '');
                setDateModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Window Dates</span>
            </button>

            <button
              onClick={() => onToggleRegistration(!tournament?.registrationOpen)}
              className={`flex items-center justify-center gap-2 px-4 py-2 min-h-[38px] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                tournament?.registrationOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <span>{tournament?.registrationOpen ? 'Close Portal' : 'Open Portal'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Registration Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
              tournament?.registrationOpen
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {tournament?.registrationOpen ? '🟢' : '🔒'}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {tournament?.registrationOpen
                ? 'Public Registration Portal is Currently OPEN'
                : 'Registration Portal Closed to New Applicants'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active Application Window: {tournament?.registrationStartDate} to {tournament?.registrationEndDate}
            </p>
          </div>
        </div>

        {isOrganizer && (
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg text-center">
              <span className="block text-slate-400 text-[10px] uppercase font-semibold">Total</span>
              <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">{registrations.length}</span>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-lg text-center">
              <span className="block text-emerald-700 text-[10px] uppercase font-semibold">Approved</span>
              <span className="font-mono font-bold text-emerald-900 text-sm sm:text-base">
                {registrations.filter(r => r.approvalStatus === 'approved').length}
              </span>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-50 rounded-lg text-center">
              <span className="block text-amber-700 text-[10px] uppercase font-semibold">Pending</span>
              <span className="font-mono font-bold text-amber-900 text-sm sm:text-base">
                {registrations.filter(r => r.approvalStatus === 'pending').length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* PLAYER ROLE VIEW: Personal Pass or Registration Form     */}
      {/* ======================================================== */}
      {!isOrganizer && (
        <div className="space-y-6">
          {myRegistration ? (
            /* Existing Registration Card for Current Player */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    🎟️
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Official Athlete Pass
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      {myRegistration.fullName}
                    </h2>
                    <span className="text-xs text-slate-500 font-mono">
                      Ref #{myRegistration.id} · {tournament?.name}
                    </span>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                      myRegistration.approvalStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : myRegistration.approvalStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        : myRegistration.approvalStatus === 'waitlisted'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {myRegistration.approvalStatus === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                    {myRegistration.approvalStatus === 'pending' && <Clock className="w-3.5 h-3.5" />}
                    <span>Status: {myRegistration.approvalStatus}</span>
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed ${
                  myRegistration.approvalStatus === 'approved'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : myRegistration.approvalStatus === 'pending'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                }`}
              >
                <div className="font-bold mb-0.5">
                  {myRegistration.approvalStatus === 'approved'
                    ? '🎉 Application Approved & Certified!'
                    : myRegistration.approvalStatus === 'pending'
                    ? '⏳ Application Under Active Review'
                    : 'Status: ' + myRegistration.approvalStatus}
                </div>
                <div>
                  {myRegistration.reviewNotes || (myRegistration.approvalStatus === 'approved'
                    ? 'Your athlete registration has been accepted by Warhawks Tournament Operations. You have been placed into the franchise auction pool.'
                    : 'Warhawks Tournament Operations is verifying your playing credentials and fitness records.')}
                </div>
              </div>

              {/* Registered athlete & meal details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Playing Discipline</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{myRegistration.primaryRole}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {myRegistration.battingStyle} · {myRegistration.bowlingStyle}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Jersey & City</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">#{myRegistration.preferredJerseyNo} (Size {myRegistration.shirtSize})</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{myRegistration.city}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Player Meal Requisition</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      myRegistration.foodPreference === 'Veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {myRegistration.foodPreference}
                    </span>
                    <span className="text-[11px] font-medium text-slate-700">
                      {[myRegistration.hasBreakfast ? 'Breakfast' : null, myRegistration.hasLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals Selected'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Accompanying Guests</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {myRegistration.guestCount || 0} Guest(s)
                  </div>
                  {myRegistration.guestCount > 0 ? (
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      {myRegistration.guestFoodPreference} · {[myRegistration.hasGuestBreakfast ? 'Breakfast' : null, myRegistration.hasGuestLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 block mt-0.5">Solo Athlete</span>
                  )}
                </div>
              </div>

              {/* Combined Party Meal Requisition Banner */}
              {(() => {
                const stats = getPartyMealStats(myRegistration);
                return (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-semibold text-emerald-950">Party Catering Allocation:</span>
                      <span className="text-emerald-800">
                        {stats.totalBreakfasts} Breakfast(s) · {stats.totalLunches} Lunch(es) (Total {stats.totalMeals} meals for {1 + stats.guestCount} persons)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Catering: {myRegistration.cateringStatus || 'Confirmed'}
                    </span>
                  </div>
                );
              })()}

              {/* Cancel Button (if pending) */}
              {myRegistration.approvalStatus === 'pending' && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Need to withdraw? You may cancel while the application is pending review.
                  </span>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel your tournament registration application?')) {
                        onCancelRegistration(myRegistration.id);
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel Application
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Registration Form for Unregistered Player */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Player Tournament Entry Application
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit your athlete profile, guest details, and meal selections to enter the player pool for <strong>{tournament?.name}</strong> (Organized by Warhawks).
                </p>
              </div>

              {tournament?.registrationOpen ? (
                <form onSubmit={handlePlayerFormSubmit} className="space-y-5 text-xs">
                  {/* Athlete Personal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Full Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={playerForm.fullName}
                        onChange={e => setPlayerForm({ ...playerForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={playerForm.email}
                        onChange={e => setPlayerForm({ ...playerForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={playerForm.phone}
                        onChange={e => setPlayerForm({ ...playerForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        City / Origin <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={playerForm.city}
                        onChange={e => setPlayerForm({ ...playerForm, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={16}
                        max={50}
                        value={playerForm.age}
                        onChange={e => setPlayerForm({ ...playerForm, age: parseInt(e.target.value, 10) || 24 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Primary Playing Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={playerForm.primaryRole}
                        onChange={e => setPlayerForm({ ...playerForm, primaryRole: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                      >
                        {PLAYER_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Batting Style</label>
                      <select
                        value={playerForm.battingStyle}
                        onChange={e => setPlayerForm({ ...playerForm, battingStyle: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {BATTING_STYLES.map(style => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bowling Style</label>
                      <select
                        value={playerForm.bowlingStyle}
                        onChange={e => setPlayerForm({ ...playerForm, bowlingStyle: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {BOWLING_STYLES.map(style => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Preferred Jersey Number</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={playerForm.preferredJerseyNo}
                        onChange={e => setPlayerForm({ ...playerForm, preferredJerseyNo: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Team Jersey Shirt Size</label>
                      <select
                        value={playerForm.shirtSize}
                        onChange={e => setPlayerForm({ ...playerForm, shirtSize: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                      >
                        <option value="S">Small (S)</option>
                        <option value="M">Medium (M)</option>
                        <option value="L">Large (L)</option>
                        <option value="XL">Extra Large (XL)</option>
                        <option value="XXL">Double XL (XXL)</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 1: Player Food and Dietary Requirements */}
                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2">
                      <Utensils className="w-4 h-4 text-emerald-600" />
                      <span>Player Food & Dietary Management</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Specify your personal dietary preference and select which match-day meals are required.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Player Dietary Preference <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={playerForm.foodPreference}
                          onChange={e => setPlayerForm({ ...playerForm, foodPreference: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white cursor-pointer"
                        >
                          <option value="Veg">Veg (Vegetarian)</option>
                          <option value="Non-Veg">Non-Veg (Non-Vegetarian)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Player Meal Selection <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={playerForm.hasBreakfast}
                              onChange={e => setPlayerForm({ ...playerForm, hasBreakfast: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Breakfast</span>
                          </label>

                          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={playerForm.hasLunch}
                              onChange={e => setPlayerForm({ ...playerForm, hasLunch: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Lunch</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Accompanying Guests & Dietary Requirements */}
                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Accompanying Guests & Independent Dietary Preferences</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Register accompanying guests. Every registered guest must have their independent dietary preference selected below.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200 space-y-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Guest Number (Accompanying Guests)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={playerForm.guestCount}
                            onChange={e => handleGuestCountChange(e.target.value)}
                            className="w-32 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold bg-white"
                          />
                          <span className="text-slate-500 text-xs">
                            {playerForm.guestCount === 0
                              ? 'Enter 0 if attending solo (no guests)'
                              : `${playerForm.guestCount} guest(s) registered with independent dietary selections`}
                          </span>
                        </div>
                      </div>

                      {/* Independent Dietary & Meal Selection for EACH Guest */}
                      {playerForm.guestCount > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Individual Dietary & Meal Selection for Each Guest</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {playerForm.guests.length} guest section{playerForm.guests.length === 1 ? '' : 's'} active
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {playerForm.guests.map((g, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3"
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                                      {idx + 1}
                                    </div>
                                    <span className="font-bold text-slate-900 text-xs">
                                      Guest #{idx + 1}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Independent Guest
                                  </span>
                                </div>

                                {/* Dietary Preference */}
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                                    Dietary Preference <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    value={g.dietaryPreference}
                                    onChange={e => handleGuestDietChange(idx, e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white cursor-pointer text-xs"
                                  >
                                    <option value="Veg">Veg (Vegetarian)</option>
                                    <option value="Non-Veg">Non-Veg (Non-Vegetarian)</option>
                                  </select>
                                </div>

                                {/* Independent Meal Selection for This Guest */}
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1.5 text-[11px]">
                                    Meal Requisition for Guest #{idx + 1}
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <label
                                      className={`inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                        g.hasBreakfast
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(g.hasBreakfast)}
                                        onChange={e => handleGuestMealChange(idx, 'hasBreakfast', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <span>Breakfast</span>
                                    </label>

                                    <label
                                      className={`inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                        g.hasLunch
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(g.hasLunch)}
                                        onChange={e => handleGuestMealChange(idx, 'hasLunch', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <span>Lunch</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Official Organizer UPI Payment & QR Code */}
                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>Organizer UPI Payment & QR Code</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Scan the official Warhawks organizer UPI QR code using Google Pay, PhonePe, Paytm, or BHIM to pay tournament fees.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                        {/* QR Code Card */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center shrink-0 w-48 text-center">
                          <div className="w-40 h-40 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 relative group">
                            <img
                              src={tournament?.upiQrCodeUrl || DEFAULT_WARHAWKS_UPI.defaultQrCodeUrl}
                              alt="Warhawks Organizer Official UPI QR Code"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                                Official UPI QR
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-2">
                            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-4 h-4 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-900">
                              Warhawks Tournament UPI
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded mt-0.5 border border-emerald-200">
                            Verified Host Merchant
                          </span>
                        </div>

                        {/* Payment Information & Reference Entry */}
                        <div className="flex-1 space-y-3 min-w-0 w-full text-xs">
                          {/* Fee Calculation Summary */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Player Registration Fee:</span>
                              <span className="font-mono font-bold text-slate-900">
                                ₹{tournament?.registrationFee || 1500}
                              </span>
                            </div>
                            {playerForm.guestCount > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Guest Accompaniment ({playerForm.guestCount} × ₹500):</span>
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{playerForm.guestCount * 500}
                                </span>
                              </div>
                            )}
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold text-sm text-slate-900">
                              <span>Total Payable Amount:</span>
                              <span className="font-mono text-emerald-700">
                                ₹{(tournament?.registrationFee || 1500) + (playerForm.guestCount * 500)}
                              </span>
                            </div>
                          </div>

                          {/* UPI ID & Payee */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                Payee Name
                              </span>
                              <span className="font-bold text-slate-900 truncate flex items-center gap-1.5 mt-0.5">
                                <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                                <span>Warhawks Tournament Operations</span>
                              </span>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                UPI VPA / ID
                              </span>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="font-mono font-bold text-slate-900 truncate text-[11px]">
                                  {tournament?.upiId || DEFAULT_WARHAWKS_UPI.upiId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUpiId(tournament?.upiId || DEFAULT_WARHAWKS_UPI.upiId)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                                  title="Copy UPI ID"
                                >
                                  {copiedUpi ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Transaction Reference / UTR Number Input */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              UPI Transaction Reference / UTR Number
                            </label>
                            <input
                              type="text"
                              value={playerForm.paymentReference}
                              onChange={e => setPlayerForm({ ...playerForm, paymentReference: e.target.value })}
                              placeholder="e.g. 429182749102 (12-digit UTR from your UPI app receipt)"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white text-slate-900"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              Optional upon registration; enter your UPI reference to expedite admission approval.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Tournament Registration</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                  <Lock className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-700">The registration window is currently closed for this edition.</p>
                  <p>Warhawks Tournament Operations will announce upcoming tournament registration schedules.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ORGANIZER ROLE VIEW: Applicant Review Queue & Management */}
      {/* ======================================================== */}
      {isOrganizer && (
        <div className="space-y-4 sm:space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search applicants by name, role, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'pending', 'approved', 'waitlisted', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 min-h-[34px] rounded-lg font-semibold capitalize transition-colors cursor-pointer text-xs ${
                    filterStatus === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Applicants Cards (Mobile < 768px) */}
          <div className="md:hidden space-y-3">
            {filteredRegistrations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                {registrations.length === 0 ? 'No registrations yet.' : 'No applicants matching current filter.'}
              </div>
            ) : (
              filteredRegistrations.map(app => {
                const stats = getPartyMealStats(app);
                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-slate-900 text-sm truncate">{app.fullName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{app.email} · {app.phone}</div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${
                          app.approvalStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.approvalStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : app.approvalStatus === 'waitlisted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {app.approvalStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Discipline</span>
                        <span className="font-semibold text-slate-800 truncate block">{app.primaryRole}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Location & Age</span>
                        <span className="text-slate-700 block">{app.city} · {app.age} yrs</span>
                      </div>
                      <div className="col-span-2 bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Diet & Meals Requisition</span>
                        <div className="font-semibold text-slate-800 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            app.foodPreference === 'Veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Player: {app.foodPreference}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            ({[app.hasBreakfast ? 'B' : null, app.hasLunch ? 'L' : null].filter(Boolean).join('+') || 'None'})
                          </span>
                          {stats.guestCount > 0 && (
                            <span className="text-slate-600 text-[11px]">
                              · {stats.guestCount} Guest(s) ({app.guestFoodPreference}, {[app.hasGuestBreakfast ? 'B' : null, app.hasGuestLunch ? 'L' : null].filter(Boolean).join('+') || 'None'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setReviewModalApp(app);
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="w-full px-4 py-2 min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
                      >
                        Review Application
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Applicants Queue Table (md+) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Role & Specs</th>
                    <th className="py-3 px-4">City & Age</th>
                    <th className="py-3 px-4">Player & Guest Diet</th>
                    <th className="py-3 px-4">Party Meals Req.</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {registrations.length === 0 ? 'No registrations yet.' : 'No registrations matching current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map(app => {
                      const stats = getPartyMealStats(app);
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{app.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{app.email}</div>
                            <div className="text-[10px] text-slate-400">{app.phone}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{app.primaryRole}</span>
                            <div className="text-[11px] text-slate-400">
                              {app.battingStyle} · {app.bowlingStyle}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-700">
                            <div>{app.city}</div>
                            <div className="text-[11px] text-slate-400">{app.age} years</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                app.foodPreference === 'Veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {app.foodPreference}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({[app.hasBreakfast ? 'B' : null, app.hasLunch ? 'L' : null].filter(Boolean).join('+') || 'None'})
                              </span>
                            </div>
                            {stats.guestCount > 0 ? (
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>{stats.guestCount} Guest(s): {app.guestFoodPreference}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 mt-0.5">Solo Athlete</div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900">
                              {stats.totalBreakfasts} Breakfast(s)
                            </div>
                            <div className="font-mono text-slate-600 text-[11px]">
                              {stats.totalLunches} Lunch(es)
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                app.approvalStatus === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.approvalStatus === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : app.approvalStatus === 'waitlisted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {app.approvalStatus}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setReviewModalApp(app);
                                setReviewNotes(app.reviewNotes || '');
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] cursor-pointer"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Organizer Review Modal */}
      {reviewModalApp && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModalApp(null)}
          title={`Review Application: ${reviewModalApp.fullName}`}
          subtitle={`Applicant for ${tournament?.name || 'Tournament'} (Warhawks Tournament Operations)`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
              <div className="font-semibold text-slate-900 text-sm">{reviewModalApp.fullName} · {reviewModalApp.primaryRole}</div>
              <div className="text-slate-500">{reviewModalApp.email} · {reviewModalApp.phone} · {reviewModalApp.city}</div>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                Playing specs: {reviewModalApp.battingStyle} · {reviewModalApp.bowlingStyle} · #{reviewModalApp.preferredJerseyNo} (Size {reviewModalApp.shirtSize})
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 mt-2 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">Meal & Catering Requisition:</span>
                <div className="text-slate-700">
                  <strong>Player Diet:</strong> {reviewModalApp.foodPreference} ({[reviewModalApp.hasBreakfast ? 'Breakfast' : null, reviewModalApp.hasLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'})
                </div>
                <div className="text-slate-700">
                  <strong>Accompanying Guests:</strong> {reviewModalApp.guestCount || 0} Guest(s)
                  {reviewModalApp.guestCount > 0 && (
                    <span> ({[reviewModalApp.hasGuestBreakfast ? 'Breakfast' : null, reviewModalApp.hasGuestLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'})</span>
                  )}
                </div>

                {/* Individual Guest Dietary and Meal Breakdown */}
                {reviewModalApp.guestCount > 0 && Array.isArray(reviewModalApp.guests) && reviewModalApp.guests.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">
                      Individual Guest Dietary & Meal Breakdown:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewModalApp.guests.map((g, i) => {
                        const guestMeals = [
                          g.hasBreakfast ? 'Breakfast' : null,
                          g.hasLunch ? 'Lunch' : null
                        ].filter(Boolean).join(', ') || 'No Meals Selected';
                        return (
                          <span
                            key={i}
                            className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200 flex items-center gap-1.5"
                          >
                            <span className="font-semibold text-slate-900">Guest #{g.guestNumber || i + 1}:</span>
                            <span className={`font-bold ${g.dietaryPreference === 'Veg' ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {g.dietaryPreference}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-700 font-medium">{guestMeals}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {reviewModalApp.paymentReference && (
                  <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-slate-700">UPI Payment Ref:</span>
                    <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {reviewModalApp.paymentReference}
                    </span>
                  </div>
                )}

                {(() => {
                  const s = getPartyMealStats(reviewModalApp);
                  return (
                    <div className="font-semibold text-emerald-800 text-[11px] pt-1">
                      Party Total: {s.totalBreakfasts} Breakfast(s) and {s.totalLunches} Lunch(es) for {1 + s.guestCount} persons.
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Administrative Review Notes</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="State reason for admission, squad allocation, or waitlist condition..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReviewModalApp(null)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('rejected')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('waitlisted')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer"
              >
                Waitlist
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('approved')}
                className="min-h-[38px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Approve & Add to Roster
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Window Dates Modal */}
      {dateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setDateModalOpen(false)}
          title="Registration Window Dates"
          subtitle={`Schedule admission dates for ${tournament?.name}`}
        >
          <form onSubmit={handleSaveDates} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Window Opening Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Window Closing Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDateModalOpen(false)}
                className="px-3.5 py-2 min-h-[38px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Update Schedule
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
