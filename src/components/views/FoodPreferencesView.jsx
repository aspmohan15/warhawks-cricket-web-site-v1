import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Download,
  CheckCircle,
  Clock,
  CheckCheck,
  Filter,
  User,
  Users,
  Coffee,
  Search,
  Edit,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { exportToCsv } from '../../utils/csv';
import { FOOD_PREFERENCES, MEAL_TYPES, WARHAWKS_LOGO_URL } from '../../constants';

export const FoodPreferencesView = ({
  tournament,
  registrations = [],
  onUpdateRegistrationCatering,
  onUpdateRegistrationDetails
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mealFilter, setMealFilter] = useState('all');
  const [dietFilter, setDietFilter] = useState('all');
  const [guestFilter, setGuestFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingRegistration, setEditingRegistration] = useState(null);

  // Helper to extract clean meal and guest requirements for any registration record
  const getRegistrationMealData = (r) => {
    const playerDiet = r.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg';
    const playerHasBreakfast = Boolean(r.hasBreakfast);
    const playerHasLunch = Boolean(r.hasLunch);
    const guestCount = Math.max(0, parseInt(r.guestCount, 10) || 0);

    let guestVegCount = 0;
    let guestNonVegCount = 0;
    let guestVegBreakfasts = 0;
    let guestNonVegBreakfasts = 0;
    let guestVegLunches = 0;
    let guestNonVegLunches = 0;
    let guestTotalBreakfasts = 0;
    let guestTotalLunches = 0;
    let normalizedGuests = [];

    if (guestCount > 0) {
      if (Array.isArray(r.guests) && r.guests.length > 0) {
        normalizedGuests = r.guests.slice(0, guestCount).map((g, idx) => ({
          guestNumber: idx + 1,
          dietaryPreference: (g?.dietaryPreference === 'Non-Veg' || g?.dietaryPreference === 'Non-Vegetarian') ? 'Non-Veg' : 'Veg',
          hasBreakfast: g?.hasBreakfast !== undefined ? Boolean(g.hasBreakfast) : Boolean(r.hasGuestBreakfast),
          hasLunch: g?.hasLunch !== undefined ? Boolean(g.hasLunch) : Boolean(r.hasGuestLunch)
        }));
        while (normalizedGuests.length < guestCount) {
          normalizedGuests.push({
            guestNumber: normalizedGuests.length + 1,
            dietaryPreference: 'Veg',
            hasBreakfast: false,
            hasLunch: false
          });
        }
      } else {
        const defaultDiet = (r.guestFoodPreference === 'Non-Veg' || r.guestFoodPreference === 'Non-Vegetarian') ? 'Non-Veg' : 'Veg';
        normalizedGuests = Array.from({ length: guestCount }, (_, i) => ({
          guestNumber: i + 1,
          dietaryPreference: defaultDiet,
          hasBreakfast: Boolean(r.hasGuestBreakfast),
          hasLunch: Boolean(r.hasGuestLunch)
        }));
      }

      normalizedGuests.forEach(g => {
        if (g.dietaryPreference === 'Non-Veg') guestNonVegCount += 1;
        else guestVegCount += 1;

        if (g.hasBreakfast) {
          guestTotalBreakfasts += 1;
          if (g.dietaryPreference === 'Non-Veg') guestNonVegBreakfasts += 1;
          else guestVegBreakfasts += 1;
        }

        if (g.hasLunch) {
          guestTotalLunches += 1;
          if (g.dietaryPreference === 'Non-Veg') guestNonVegLunches += 1;
          else guestVegLunches += 1;
        }
      });
    }

    const totalBreakfasts = (playerHasBreakfast ? 1 : 0) + guestTotalBreakfasts;
    const totalLunches = (playerHasLunch ? 1 : 0) + guestTotalLunches;

    const vegBreakfasts =
      (playerHasBreakfast && playerDiet === 'Veg' ? 1 : 0) + guestVegBreakfasts;
    const nonVegBreakfasts =
      (playerHasBreakfast && playerDiet === 'Non-Veg' ? 1 : 0) + guestNonVegBreakfasts;

    const vegLunches =
      (playerHasLunch && playerDiet === 'Veg' ? 1 : 0) + guestVegLunches;
    const nonVegLunches =
      (playerHasLunch && playerDiet === 'Non-Veg' ? 1 : 0) + guestNonVegLunches;

    const totalHeadcount = 1 + guestCount;
    const cateringStatus = r.cateringStatus || 'confirmed';

    return {
      registrationId: r.id,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      city: r.city,
      primaryRole: r.primaryRole,
      approvalStatus: r.approvalStatus,
      cateringStatus,
      playerDiet,
      playerHasBreakfast,
      playerHasLunch,
      guestCount,
      guests: normalizedGuests,
      guestVegCount,
      guestNonVegCount,
      guestDiet: guestNonVegCount > 0 ? (guestVegCount > 0 ? 'Mixed' : 'Non-Veg') : 'Veg',
      guestHasBreakfast: guestTotalBreakfasts > 0,
      guestHasLunch: guestTotalLunches > 0,
      guestTotalBreakfasts,
      guestTotalLunches,
      totalBreakfasts,
      totalLunches,
      totalMeals: totalBreakfasts + totalLunches,
      vegBreakfasts,
      nonVegBreakfasts,
      vegLunches,
      nonVegLunches,
      totalHeadcount
    };
  };

  const parsedRegistrations = registrations.map(getRegistrationMealData);

  // High-Level Aggregate Metrics for Warhawks Catering Command
  const aggregateMetrics = parsedRegistrations.reduce(
    (acc, item) => {
      acc.totalAthletes += 1;
      acc.totalGuests += item.guestCount;
      acc.totalHeadcount += item.totalHeadcount;

      acc.totalBreakfasts += item.totalBreakfasts;
      acc.vegBreakfasts += item.vegBreakfasts;
      acc.nonVegBreakfasts += item.nonVegBreakfasts;

      acc.totalLunches += item.totalLunches;
      acc.vegLunches += item.vegLunches;
      acc.nonVegLunches += item.nonVegLunches;

      if (item.playerDiet === 'Veg') acc.vegAttendees += 1;
      else acc.nonVegAttendees += 1;

      acc.vegAttendees += item.guestVegCount;
      acc.nonVegAttendees += item.guestNonVegCount;

      return acc;
    },
    {
      totalAthletes: 0,
      totalGuests: 0,
      totalHeadcount: 0,
      totalBreakfasts: 0,
      vegBreakfasts: 0,
      nonVegBreakfasts: 0,
      totalLunches: 0,
      vegLunches: 0,
      nonVegLunches: 0,
      vegAttendees: 0,
      nonVegAttendees: 0
    }
  );

  // Filtered registrations
  const filteredList = parsedRegistrations.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.fullName?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (mealFilter === 'breakfast' && item.totalBreakfasts === 0) return false;
    if (mealFilter === 'lunch' && item.totalLunches === 0) return false;
    if (mealFilter === 'both' && (item.totalBreakfasts === 0 || item.totalLunches === 0)) return false;

    if (dietFilter === 'veg' && item.playerDiet !== 'Veg' && item.guestDiet !== 'Veg') return false;
    if (dietFilter === 'non-veg' && item.playerDiet !== 'Non-Veg' && item.guestDiet !== 'Non-Veg') return false;

    if (guestFilter === 'with_guests' && item.guestCount === 0) return false;
    if (guestFilter === 'solo' && item.guestCount > 0) return false;

    if (statusFilter !== 'all' && item.cateringStatus !== statusFilter) return false;

    return true;
  });

  const handleExportCateringSheet = () => {
    const rows = parsedRegistrations.map(r => ({
      Tournament: tournament?.name || 'Tournament',
      'Athlete Name': r.fullName,
      Email: r.email,
      Phone: r.phone,
      'Registration Status': r.approvalStatus,
      'Athlete Diet': r.playerDiet,
      'Athlete Breakfast': r.playerHasBreakfast ? 'Yes' : 'No',
      'Athlete Lunch': r.playerHasLunch ? 'Yes' : 'No',
      'Guest Count': r.guestCount,
      'Guest Diet': r.guestCount > 0 ? r.guestDiet : 'N/A',
      'Guest Breakfasts': r.guestCount > 0 ? r.guestTotalBreakfasts : 0,
      'Guest Lunches': r.guestCount > 0 ? r.guestTotalLunches : 0,
      'Guest Details': r.guestCount > 0 && Array.isArray(r.guests)
        ? r.guests.map(g => `Guest #${g.guestNumber}: ${g.dietaryPreference} [${[g.hasBreakfast ? 'Breakfast' : null, g.hasLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'}]`).join('; ')
        : 'None',
      'Total Breakfasts': r.totalBreakfasts,
      'Total Lunches': r.totalLunches,
      'Total Combined Meals': r.totalMeals,
      'Total Headcount': r.totalHeadcount,
      'Catering Status': r.cateringStatus
    }));

    exportToCsv(
      `${(tournament?.name || 'Warhawks').replace(/\s+/g, '_')}_Player_Guest_Catering_Requirements`,
      rows
    );
  };

  const handleSaveEditModal = (e) => {
    e.preventDefault();
    if (!editingRegistration) return;
    const rawCount = String(editingRegistration.guestCount ?? '').trim();
    if (rawCount !== '' && (isNaN(Number(rawCount)) || Number(rawCount) < 0 || Number(rawCount) > 20)) {
      alert('Please enter a valid guest number between 0 and 20.');
      return;
    }
    const cleanGuestCount = rawCount === '' ? 0 : Math.max(0, parseInt(rawCount, 10) || 0);
    const guests = (editingRegistration.guests || []).slice(0, cleanGuestCount);
    const hasAnyBreakfast = guests.some(g => g.hasBreakfast);
    const hasAnyLunch = guests.some(g => g.hasLunch);

    onUpdateRegistrationDetails?.(editingRegistration.registrationId, {
      foodPreference: editingRegistration.playerDiet,
      hasBreakfast: editingRegistration.playerHasBreakfast,
      hasLunch: editingRegistration.playerHasLunch,
      guestCount: cleanGuestCount,
      guests,
      guestFoodPreference: guests[0]?.dietaryPreference || 'Veg',
      hasGuestBreakfast: hasAnyBreakfast,
      hasGuestLunch: hasAnyLunch,
      cateringStatus: editingRegistration.cateringStatus
    });
    setEditingRegistration(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Warhawks Catering Command</span>
            <span>·</span>
            <span>Registration-Derived Logistics</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Food & Dietary Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated match-day nutritional requisitions for players and accompanying guests collected from official registration applications for {tournament?.name || 'Tournament'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCateringSheet}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Catering Requisition Sheet</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Canvas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Headcount */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Headcount
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {aggregateMetrics.totalHeadcount}
            </span>
            <span className="text-xs text-slate-500">persons</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2 border-t border-slate-100 pt-2">
            <span>{aggregateMetrics.totalAthletes} Athletes</span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold">{aggregateMetrics.totalGuests} Guests</span>
          </div>
        </div>

        {/* Total Breakfast Demand */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Breakfast Requisition
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {aggregateMetrics.totalBreakfasts}
            </span>
            <span className="text-xs text-slate-500">portions</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-semibold">{aggregateMetrics.vegBreakfasts} Veg</span>
            <span>·</span>
            <span className="text-amber-800 font-semibold">{aggregateMetrics.nonVegBreakfasts} Non-Veg</span>
          </div>
        </div>

        {/* Total Lunch Demand */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lunch Requisition
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {aggregateMetrics.totalLunches}
            </span>
            <span className="text-xs text-slate-500">portions</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-semibold">{aggregateMetrics.vegLunches} Veg</span>
            <span>·</span>
            <span className="text-amber-800 font-semibold">{aggregateMetrics.nonVegLunches} Non-Veg</span>
          </div>
        </div>

        {/* Overall Dietary Split */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dietary Census
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-emerald-50 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="block text-[10px] uppercase font-bold text-emerald-800">Veg</span>
              <span className="text-lg font-bold font-mono text-emerald-950">{aggregateMetrics.vegAttendees}</span>
            </div>
            <div className="flex-1 bg-amber-50 p-2 rounded-lg border border-amber-100 text-center">
              <span className="block text-[10px] uppercase font-bold text-amber-800">Non-Veg</span>
              <span className="text-lg font-bold font-mono text-amber-950">{aggregateMetrics.nonVegAttendees}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 text-center">
            Standardized two-diet model (Veg / Non-Veg)
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search athlete, email, city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          {/* Meal Filter */}
          <select
            value={mealFilter}
            onChange={e => setMealFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="all">All Meals</option>
            <option value="breakfast">Breakfast Requested</option>
            <option value="lunch">Lunch Requested</option>
            <option value="both">Both Breakfast & Lunch</option>
          </select>

          {/* Diet Filter */}
          <select
            value={dietFilter}
            onChange={e => setDietFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="all">All Diets</option>
            <option value="veg">Veg Only</option>
            <option value="non-veg">Non-Veg Only</option>
          </select>

          {/* Guests Filter */}
          <select
            value={guestFilter}
            onChange={e => setGuestFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="all">All Registrations</option>
            <option value="with_guests">With Guests</option>
            <option value="solo">Solo Athletes</option>
          </select>

          {/* Catering Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="served">Served</option>
            <option value="requested">Requested</option>
          </select>
        </div>
      </div>

      {/* Mobile Card List (visible on mobile < 768px) */}
      <div className="md:hidden space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {registrations.length === 0 ? 'No player meal requisitions or registrations yet.' : 'No player registration records match the current filter criteria.'}
          </div>
        ) : (
          filteredList.map(item => (
            <div
              key={item.registrationId}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{item.fullName}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.email} · {item.city}</div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${
                    item.cateringStatus === 'served'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.cateringStatus === 'confirmed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.cateringStatus}
                </span>
              </div>

              {/* Player and Guest Requirements Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Athlete Requisition
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.playerDiet === 'Veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.playerDiet}
                    </span>
                    <span className="text-slate-700 text-[11px]">
                      {[item.playerHasBreakfast ? 'Breakfast' : null, item.playerHasLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Accompanying Guests
                  </span>
                  <div className="mt-1">
                    {item.guestCount > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.guestDiet === 'Veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.guestCount} {item.guestDiet}
                        </span>
                        <span className="text-slate-700 text-[11px]">
                          {[item.guestHasBreakfast ? 'Breakfast' : null, item.guestHasLunch ? 'Lunch' : null].filter(Boolean).join(', ') || 'No Meals'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0 Guests</span>
                    )}
                  </div>
                </div>

                <div className="col-span-2 bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">Party Portions:</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {item.totalBreakfasts} Breakfast(s) · {item.totalLunches} Lunch(es)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <button
                  onClick={() => setEditingRegistration(item)}
                  className="px-2.5 py-1.5 min-h-[34px] rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Needs</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {item.cateringStatus !== 'served' && (
                    <button
                      onClick={() => onUpdateRegistrationCatering?.(item.registrationId, 'served')}
                      className="px-3 py-1.5 min-h-[34px] rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Mark Served
                    </button>
                  )}
                  {item.cateringStatus === 'requested' && (
                    <button
                      onClick={() => onUpdateRegistrationCatering?.(item.registrationId, 'confirmed')}
                      className="px-3 py-1.5 min-h-[34px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Roster Table (md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Beneficiary Athlete</th>
                <th className="py-3 px-4">Player Requisition</th>
                <th className="py-3 px-4">Accompanying Guests</th>
                <th className="py-3 px-4">Combined Meal Demand</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Catering Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {registrations.length === 0 ? 'No player meal requisitions or registrations yet.' : 'No player registration records match the current filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.registrationId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.email}</div>
                      <div className="text-[10px] text-slate-400">{item.phone} · {item.city}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.playerDiet === 'Veg'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.playerDiet}
                        </span>
                        <span className="font-medium text-slate-700">
                          {[item.playerHasBreakfast ? 'Breakfast' : null, item.playerHasLunch ? 'Lunch' : null]
                            .filter(Boolean)
                            .join(', ') || 'No Meals'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.guestCount > 0 ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.guestDiet === 'Veg'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.guestCount} {item.guestDiet}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {[item.guestHasBreakfast ? 'Breakfast' : null, item.guestHasLunch ? 'Lunch' : null]
                              .filter(Boolean)
                              .join(', ') || 'No Meals'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0 Guests (Solo)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900">{item.totalBreakfasts} Breakfast(s)</div>
                      <div className="text-slate-600 text-[11px]">{item.totalLunches} Lunch(es)</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {item.totalHeadcount} person(s)
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          item.cateringStatus === 'served'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.cateringStatus === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.cateringStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingRegistration(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit meal requirements"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {item.cateringStatus !== 'served' && (
                          <button
                            onClick={() => onUpdateRegistrationCatering?.(item.registrationId, 'served')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Mark Served
                          </button>
                        )}
                        {item.cateringStatus === 'requested' && (
                          <button
                            onClick={() => onUpdateRegistrationCatering?.(item.registrationId, 'confirmed')}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Registration Meal Requirements Modal */}
      {editingRegistration && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRegistration(null)}
          title={`Edit Meal Requisition: ${editingRegistration.fullName}`}
          subtitle="Update food preference and breakfast/lunch selections for player and guests"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEditModal} className="space-y-4 text-xs">
            {/* Player Meal Options */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                <span>Player Dietary & Meal Options</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dietary Preference</label>
                  <select
                    value={editingRegistration.playerDiet}
                    onChange={e => setEditingRegistration({ ...editingRegistration, playerDiet: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
                  >
                    <option value="Veg">Veg (Vegetarian)</option>
                    <option value="Non-Veg">Non-Veg (Non-Vegetarian)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Player Meals</label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingRegistration.playerHasBreakfast}
                        onChange={e => setEditingRegistration({ ...editingRegistration, playerHasBreakfast: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Breakfast</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingRegistration.playerHasLunch}
                        onChange={e => setEditingRegistration({ ...editingRegistration, playerHasLunch: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Lunch</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Meal Options */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accompanying Guests & Dietary Options</span>
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guest Number</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={editingRegistration.guestCount ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditingRegistration({
                        ...editingRegistration,
                        guestCount: '',
                        guests: [],
                        hasGuestBreakfast: false,
                        hasGuestLunch: false
                      });
                      return;
                    }
                    const count = Math.max(0, parseInt(val, 10) || 0);
                    let updatedGuests = [...(editingRegistration.guests || [])];
                    if (count > updatedGuests.length) {
                      for (let i = updatedGuests.length; i < count; i++) {
                        updatedGuests.push({
                          guestNumber: i + 1,
                          dietaryPreference: 'Veg',
                          hasBreakfast: false,
                          hasLunch: false
                        });
                      }
                    } else if (count < updatedGuests.length) {
                      updatedGuests = updatedGuests.slice(0, count);
                    }
                    setEditingRegistration({
                      ...editingRegistration,
                      guestCount: val,
                      guests: updatedGuests,
                      hasGuestBreakfast: updatedGuests.some(g => g.hasBreakfast),
                      hasGuestLunch: updatedGuests.some(g => g.hasLunch)
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                />
              </div>

              {/* Independent Dietary & Meal Selection for Each Guest */}
              {Number(editingRegistration.guestCount) > 0 && Array.isArray(editingRegistration.guests) && editingRegistration.guests.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Individual Guest Dietary & Meal Preferences ({editingRegistration.guestCount} Guests):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                    {editingRegistration.guests.map((g, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-[11px]">
                            Guest #{g.guestNumber || idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Independent</span>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-0.5 text-[10px]">
                            Dietary Preference
                          </label>
                          <select
                            value={g.dietaryPreference}
                            onChange={e => {
                              const newGuests = [...editingRegistration.guests];
                              newGuests[idx] = { ...newGuests[idx], dietaryPreference: e.target.value };
                              setEditingRegistration({ ...editingRegistration, guests: newGuests });
                            }}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                          >
                            <option value="Veg">Veg (Vegetarian)</option>
                            <option value="Non-Veg">Non-Veg (Non-Vegetarian)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1 text-[10px]">
                            Meal Requisition
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(g.hasBreakfast)}
                                onChange={e => {
                                  const newGuests = [...editingRegistration.guests];
                                  newGuests[idx] = { ...newGuests[idx], hasBreakfast: e.target.checked };
                                  setEditingRegistration({
                                    ...editingRegistration,
                                    guests: newGuests,
                                    hasGuestBreakfast: newGuests.some(item => item.hasBreakfast)
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Breakfast</span>
                            </label>

                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(g.hasLunch)}
                                onChange={e => {
                                  const newGuests = [...editingRegistration.guests];
                                  newGuests[idx] = { ...newGuests[idx], hasLunch: e.target.checked };
                                  setEditingRegistration({
                                    ...editingRegistration,
                                    guests: newGuests,
                                    hasGuestLunch: newGuests.some(item => item.hasLunch)
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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

            {/* Catering Status Option */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catering Fulfillment Status</label>
              <select
                value={editingRegistration.cateringStatus}
                onChange={e => setEditingRegistration({ ...editingRegistration, cateringStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="served">Served</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingRegistration(null)}
                className="px-3.5 py-2 min-h-[38px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Save Requirements
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
