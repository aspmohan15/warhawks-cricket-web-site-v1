import React, { useState } from 'react';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Check,
  Archive,
  Edit,
  Trash2,
  AlertTriangle,
  Coins,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { DEFAULT_ORGANIZER_NAME, ORGANIZER_DETAILS, WARHAWKS_LOGO_URL } from '../../constants';
import { isOrganizerAuthenticated } from '../../services/auth';

export const EditionsView = ({
  tournaments,
  activeTournamentId,
  teams,
  currentUser,
  onSelectEdition,
  onCreateEdition,
  onUpdateEdition,
  onDeleteEdition
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEdition, setEditingEdition] = useState(null);
  const [deletingEdition, setDeletingEdition] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOrganizer = currentUser?.role === 'organizer' || isOrganizerAuthenticated();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    organizer: DEFAULT_ORGANIZER_NAME,
    organizerRole: 'Official Tournament Organizer & Host',
    organizerBranch: ORGANIZER_DETAILS.branch,
    editionNumber: 7,
    year: 2028,
    format: 'T20',
    status: 'upcoming',
    startDate: '2028-10-10',
    endDate: '2028-11-08',
    venue: 'National Cricket Arena',
    city: 'Mumbai',
    registrationOpen: false,
    registrationStartDate: '2028-07-01',
    registrationEndDate: '2028-08-30',
    totalBudgetPointsPerTeam: 10000000,
    pointsPerWin: 2,
    pointsPerTie: 1,
    maxSquadSize: 18,
    minSquadSize: 14,
    maxOverseasPlayers: 4,
    description: '',
    isArchived: false
  });

  const handleOpenCreate = () => {
    const nextEditionNum = Math.max(...tournaments.map(t => t.editionNumber), 0) + 1;
    const nextYear = new Date().getFullYear() + 1;
    setFormData({
      name: `Premier Cricket Super League - Edition ${nextEditionNum}`,
      organizer: DEFAULT_ORGANIZER_NAME,
      organizerRole: 'Official Tournament Organizer & Host',
      organizerBranch: ORGANIZER_DETAILS.branch,
      editionNumber: nextEditionNum,
      year: nextYear,
      format: 'T20',
      status: 'upcoming',
      startDate: `${nextYear}-10-10`,
      endDate: `${nextYear}-11-05`,
      venue: 'Metropolitan Stadium Complex',
      city: 'Mumbai',
      registrationOpen: true,
      registrationStartDate: `${nextYear}-06-01`,
      registrationEndDate: `${nextYear}-08-15`,
      totalBudgetPointsPerTeam: 10000000,
      pointsPerWin: 2,
      pointsPerTie: 1,
      maxSquadSize: 18,
      minSquadSize: 14,
      maxOverseasPlayers: 4,
      description: 'Championship edition organized and hosted by Warhawks, featuring multi-team round robin and knockout finals.',
      isArchived: false
    });
    setCreateModalOpen(true);
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    const rawEdNum = String(formData.editionNumber ?? '').trim();
    if (rawEdNum === '' || isNaN(Number(rawEdNum)) || Number(rawEdNum) < 1) {
      alert('Please enter a valid edition number (1 or greater).');
      return;
    }

    const rawYear = String(formData.year ?? '').trim();
    if (rawYear === '' || isNaN(Number(rawYear)) || Number(rawYear) < 1900 || Number(rawYear) > 2100) {
      alert('Please enter a valid 4-digit tournament year.');
      return;
    }

    const rawBudget = String(formData.totalBudgetPointsPerTeam ?? '').trim();
    if (rawBudget === '' || isNaN(Number(rawBudget)) || Number(rawBudget) < 0) {
      alert('Please enter a valid team auction budget purse (points) >= 0.');
      return;
    }

    const cleanData = {
      ...formData,
      editionNumber: Number(rawEdNum),
      year: Number(rawYear),
      totalBudgetPointsPerTeam: Number(rawBudget)
    };
    onCreateEdition(cleanData);
    setCreateModalOpen(false);
  };

  const handleOpenEdit = (edition) => {
    setEditingEdition(edition);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editingEdition) return;
    const rawBudget = String(editingEdition.totalBudgetPointsPerTeam ?? '').trim();
    if (rawBudget !== '' && (isNaN(Number(rawBudget)) || Number(rawBudget) < 0)) {
      alert('Team auction budget purse must be a valid non-negative number.');
      return;
    }
    const cleanEdition = {
      ...editingEdition,
      totalBudgetPointsPerTeam: rawBudget === '' ? 10000000 : Number(rawBudget)
    };
    onUpdateEdition(editingEdition.id, cleanEdition);
    setEditingEdition(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEdition) return;
    setIsDeleting(true);
    try {
      if (onDeleteEdition) {
        await onDeleteEdition(deletingEdition.id);
      }
      setDeletingEdition(null);
    } catch (err) {
      console.error('Failed to delete tournament edition:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tournament Editions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multi-year tournaments with strict database isolation between editions.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Tournament Edition</span>
        </button>
      </div>

      {/* Database Isolation Guarantee Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <span className="font-bold">Strict Edition Scoping:</span> Every team, squad roster, fixture, standing, auction bid, sponsor, and expense ledger is strictly keyed to its respective Tournament ID. Switching editions re-scopes all 15 administrative modules.
        </div>
      </div>

      {/* Mobile Card List (visible on mobile < 768px) */}
      <div className="md:hidden space-y-3">
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">No tournaments available yet.</p>
            <p className="text-slate-400 mt-1">Create your first tournament edition to establish franchise rosters and fixtures.</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Tournament
            </button>
          </div>
        ) : tournaments.map(edition => {
            const isSelected = edition.id === activeTournamentId;
            const editionTeams = teams.filter(t => t.tournamentId === edition.id);

            return (
              <div
                key={edition.id}
                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-colors ${
                  isSelected ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/30' : 'border-slate-200'
                }`}
              >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 font-mono">
                    #{edition.editionNumber}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{edition.name}</h3>
                    <div className="text-[11px] text-slate-400 font-mono">{edition.year} · {edition.format}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${
                    edition.status === 'current'
                      ? 'bg-emerald-100 text-emerald-800'
                      : edition.status === 'upcoming'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {edition.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Venue & City</span>
                  <span className="text-slate-700 font-medium truncate block">{edition.city}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Team Purse Cap</span>
                  <span className="text-slate-800 font-mono font-medium block">
                    {(edition.totalBudgetPointsPerTeam / 100000).toFixed(0)} Lakh Pts
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Franchise Count</span>
                  <span className="text-slate-800 font-medium block">{editionTeams.length} Teams</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Registration Portal</span>
                  <span className={`font-semibold block ${edition.registrationOpen ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {edition.registrationOpen ? 'Accepting Players' : 'Closed'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Tournament Host:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                    <span>{edition.organizer || DEFAULT_ORGANIZER_NAME}</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans">Organizer</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                {!isSelected ? (
                  <button
                    onClick={() => onSelectEdition(edition.id)}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Set Active Edition
                  </button>
                ) : (
                  <span className="flex-1 flex items-center justify-center gap-1 text-xs text-emerald-700 font-semibold py-2 px-3 bg-emerald-50 rounded-lg">
                    <Check className="w-4 h-4" /> Working Partition
                  </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(edition)}
                    className="min-w-[42px] min-h-[42px] p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Edit Edition"
                    title="Edit Tournament Edition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {isOrganizer && (
                    <button
                      onClick={() => setDeletingEdition(edition)}
                      className="min-w-[42px] min-h-[42px] p-2 rounded-lg border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
                      aria-label="Delete Edition"
                      title="Delete Tournament Edition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Editions Table (visible on md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Edition & Host</th>
                <th className="py-3 px-4">Year & Format</th>
                <th className="py-3 px-4">Venue & City</th>
                <th className="py-3 px-4">Teams</th>
                <th className="py-3 px-4">Budget Cap / Team</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tournaments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No tournaments available yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first tournament edition to establish franchise rosters and schedule matches.</p>
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="mt-3.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create First Tournament Edition
                    </button>
                  </td>
                </tr>
              ) : tournaments.map(edition => {
                const isSelected = edition.id === activeTournamentId;
                const editionTeams = teams.filter(t => t.tournamentId === edition.id);

                return (
                  <tr
                    key={edition.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 font-mono">
                          {edition.editionNumber}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {edition.name}
                            {isSelected && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-400">Host:</span>
                            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                            <span className="font-semibold text-slate-700">{edition.organizer || DEFAULT_ORGANIZER_NAME}</span>
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans">Organizer</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{edition.year}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="font-mono text-slate-600">{edition.format}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="truncate max-w-[180px] font-medium text-slate-800">{edition.venue}</div>
                      <div className="text-[11px] text-slate-400">{edition.city}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {editionTeams.length} Teams
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {(edition.totalBudgetPointsPerTeam / 100000).toFixed(0)} Lakh Pts
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          edition.status === 'current'
                            ? 'bg-emerald-100 text-emerald-800'
                            : edition.status === 'upcoming'
                            ? 'bg-amber-100 text-amber-800'
                            : edition.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {edition.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-medium ${
                          edition.registrationOpen ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {edition.registrationOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSelected ? (
                          <button
                            onClick={() => onSelectEdition(edition.id)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Set Active
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold px-2">
                            <Check className="w-3.5 h-3.5" /> Working In
                          </span>
                        )}

                        <button
                          onClick={() => handleOpenEdit(edition)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit edition parameters"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {isOrganizer && (
                          <button
                            onClick={() => setDeletingEdition(edition)}
                            className="p-1.5 rounded text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete tournament edition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Tournament Edition Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Tournament Edition"
        subtitle="Initialize a new cricket championship season with independent database partition."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Tournament Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Official Tournament Host / Organizer</span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Warhawks Official Branch
                </span>
              </label>
              <input
                type="text"
                required
                value={formData.organizer || DEFAULT_ORGANIZER_NAME}
                onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Warhawks is the official tournament organizer and host responsible for scheduling, rules, and operations.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Edition Number</label>
              <input
                type="number"
                required
                min={1}
                value={formData.editionNumber ?? ''}
                onChange={e => setFormData({ ...formData, editionNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                required
                min={2000}
                max={2040}
                value={formData.year ?? ''}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Format</label>
              <input
                type="text"
                required
                placeholder="e.g. T20, ODI, 10-Over, Box Cricket"
                value={formData.format}
                onChange={e => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Edition Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="current">Current Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Venue</label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Host City</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Auction Budget / Team (Points)</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.totalBudgetPointsPerTeam ?? ''}
                onChange={e => setFormData({ ...formData, totalBudgetPointsPerTeam: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="regOpen"
                checked={formData.registrationOpen}
                onChange={e => setFormData({ ...formData, registrationOpen: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="regOpen" className="font-semibold text-slate-700 cursor-pointer">
                Open Registration Immediately
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
            >
              Create Edition
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Edition Modal */}
      {editingEdition && (
        <Modal
          isOpen={true}
          onClose={() => setEditingEdition(null)}
          title={`Edit ${editingEdition.name}`}
          subtitle="Update tournament dates, venue, budget parameters, and state."
          maxWidth="xl"
        >
          <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingEdition.name}
                  onChange={e => setEditingEdition({ ...editingEdition, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Official Tournament Organizer / Host</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Warhawks Official Branch
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEdition.organizer || DEFAULT_ORGANIZER_NAME}
                  onChange={e => setEditingEdition({ ...editingEdition, organizer: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingEdition.status}
                  onChange={e => setEditingEdition({ ...editingEdition, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="current">Current</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Format</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T20, ODI, 10-Over, Box Cricket"
                  value={editingEdition.format || ''}
                  onChange={e => setEditingEdition({ ...editingEdition, format: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team Budget Purse (Points)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editingEdition.totalBudgetPointsPerTeam ?? ''}
                  onChange={e => setEditingEdition({ ...editingEdition, totalBudgetPointsPerTeam: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={editingEdition.venue}
                  onChange={e => setEditingEdition({ ...editingEdition, venue: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={editingEdition.city}
                  onChange={e => setEditingEdition({ ...editingEdition, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="regOpenEdit"
                    checked={editingEdition.registrationOpen}
                    onChange={e => setEditingEdition({ ...editingEdition, registrationOpen: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="regOpenEdit" className="font-semibold text-slate-700 cursor-pointer">
                    Registration Portal Active
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isArchivedEdit"
                    checked={editingEdition.isArchived}
                    onChange={e => setEditingEdition({ ...editingEdition, isArchived: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isArchivedEdit" className="font-semibold text-slate-700 cursor-pointer">
                    Archive this Edition (preserve historical data)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-200">
              {isOrganizer ? (
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingEdition;
                    setEditingEdition(null);
                    setDeletingEdition(toDelete);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete This Edition</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEdition(null)}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Tournament Edition Confirmation Modal */}
      {deletingEdition && (
        <Modal
          isOpen={Boolean(deletingEdition)}
          onClose={() => !isDeleting && setDeletingEdition(null)}
          title="Delete Tournament Edition"
          subtitle="Permanent partition removal confirmation"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-rose-900 leading-relaxed">
                <span className="font-bold block text-sm mb-0.5 text-rose-950">
                  Are you sure you want to delete this edition?
                </span>
                This action is permanent and cannot be undone. All data partitioned under this tournament will be permanently removed.
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Tournament Name:</span>
                <span className="font-bold text-slate-900 text-right">{deletingEdition.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Edition & Format:</span>
                <span className="font-mono font-semibold text-slate-800">
                  Edition #{deletingEdition.editionNumber} · {deletingEdition.year} ({deletingEdition.format})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Venue & City:</span>
                <span className="text-slate-800 font-medium">
                  {deletingEdition.venue}, {deletingEdition.city}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Franchise Teams in Partition:</span>
                <span className="font-semibold text-slate-800">
                  {teams.filter(t => t.tournamentId === deletingEdition.id).length} Teams
                </span>
              </div>

              {deletingEdition.id === activeTournamentId && (
                <div className="pt-2 border-t border-slate-200 text-amber-800 font-medium text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This is currently the active edition. The system will automatically switch to another edition.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingEdition(null)}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel / Keep Edition
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete Edition'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
