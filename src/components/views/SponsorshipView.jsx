import React, { useState } from 'react';
import {
  BadgePercent,
  Plus,
  Globe,
  Mail,
  User,
  Phone,
  Edit,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const SponsorshipView = ({
  tournament,
  sponsors = [],
  currentUser,
  onCreateSponsor,
  onUpdateSponsor,
  onDeleteSponsor
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);

  const [form, setForm] = useState({
    name: '',
    contactNumber: '',
    contactEmail: '',
    contributionAmount: '',
    isActive: true,
    displayOnPublicWeb: true
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!isOrganizer) return;
    if (!tournament?.id) {
      setCreateModalOpen(false);
      return;
    }

    const rawAmount = String(form.contributionAmount ?? '').trim();
    if (rawAmount !== '' && (isNaN(Number(rawAmount)) || Number(rawAmount) < 0)) {
      alert('Please enter a valid non-negative financial commitment amount (₹).');
      return;
    }
    const cleanAmount = rawAmount === '' ? 0 : Math.max(0, Number(rawAmount) || 0);

    onCreateSponsor({
      tournamentId: tournament?.id || '',
      name: form.name.trim(),
      contactNumber: form.contactNumber.trim(),
      contactEmail: form.contactEmail?.trim() || '',
      contributionAmount: cleanAmount,
      isActive: form.isActive,
      displayOnPublicWeb: form.displayOnPublicWeb
    });
    setForm({
      name: '',
      contactNumber: '',
      contactEmail: '',
      contributionAmount: '',
      isActive: true,
      displayOnPublicWeb: true
    });
    setCreateModalOpen(false);
  };

  const totalCommitted = sponsors.reduce((acc, s) => acc + (s.contributionAmount || 0), 0);

  // For players: show all public sponsors (or all sponsors if flags were not explicitly set)
  const visibleSponsors = isOrganizer
    ? sponsors
    : (sponsors.filter(s => s.displayOnPublicWeb !== false).length > 0
        ? sponsors.filter(s => s.displayOnPublicWeb !== false)
        : sponsors);

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          🤝
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Sponsorship packages and partner rosters belong to an active tournament edition. Select or initialize a tournament edition to view sponsors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>{isOrganizer ? 'Warhawks Corporate Partnerships' : 'Public Directory'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isOrganizer ? 'Sponsorship Management' : 'Official Tournament Sponsors & Partners'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOrganizer
              ? `Manage sponsor partners, contact records, financial commitments, and website visibility for ${tournament?.name} (Organized by Warhawks).`
              : `Proud commercial partners and supporters backing ${tournament?.name} (Organized by Warhawks).`}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-col xs:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {isOrganizer ? (
            <>
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-center">
                <span className="text-emerald-700 font-medium">Committed: </span>
                <span className="font-bold font-mono text-emerald-900">₹{totalCommitted.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setForm({
                    name: '',
                    contactNumber: '',
                    contactEmail: '',
                    contributionAmount: '',
                    isActive: true,
                    displayOnPublicWeb: true
                  });
                  setCreateModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Sponsor</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-center">
              <span className="text-emerald-700 font-medium">Official Partners: </span>
              <span className="font-bold font-mono text-emerald-900">{visibleSponsors.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sponsors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {visibleSponsors.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-200 p-8 sm:p-12 text-center text-xs text-slate-500">
            <BadgePercent className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">
              {isOrganizer ? 'No sponsors added yet.' : 'No sponsors published yet.'}
            </p>
            <p className="text-slate-400 mt-1">
              {isOrganizer
                ? 'Add tournament partners and commercial sponsors to manage contributions.'
                : 'Official tournament sponsors and partners will appear here once announced by the organizers.'}
            </p>
          </div>
        ) : (
          visibleSponsors.map(sponsor => (
            <div
              key={sponsor.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono inline-block">
                      {sponsor.tier || 'Tournament Sponsor'}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1.5 truncate">{sponsor.name}</h3>
                  </div>

                  {/* Organizer: Edit & Delete controls | Player: Verified Badge */}
                  {isOrganizer ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingSponsor(sponsor)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit sponsor"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove sponsor "${sponsor.name}"?`)) {
                            onDeleteSponsor(sponsor.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete sponsor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>

                {/* Benefits / Deliverables description if available */}
                {sponsor.benefitsDescription && (
                  <div className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">Benefits & Deliverables:</span>
                    {sponsor.benefitsDescription}
                  </div>
                )}

                {/* Sponsor Contact Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  {sponsor.contactNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {isOrganizer ? (
                        <span className="font-mono font-medium text-slate-800">{sponsor.contactNumber}</span>
                      ) : (
                        <a
                          href={`tel:${sponsor.contactNumber}`}
                          className="font-mono font-medium text-slate-800 hover:text-emerald-700 transition-colors"
                        >
                          {sponsor.contactNumber}
                        </a>
                      )}
                    </div>
                  )}
                  {sponsor.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${sponsor.contactEmail}`}
                        className="font-mono text-slate-600 truncate hover:text-emerald-700 transition-colors"
                      >
                        {sponsor.contactEmail}
                      </a>
                    </div>
                  )}
                  {sponsor.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{sponsor.contactPerson}</span>
                    </div>
                  )}
                  {sponsor.websiteUrl && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={sponsor.websiteUrl.startsWith('http') ? sponsor.websiteUrl : `https://${sponsor.websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline truncate inline-flex items-center gap-1"
                      >
                        <span>{sponsor.websiteUrl.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Organizer has controls; Player has read-only status */}
              {isOrganizer ? (
                <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Commitment</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{(sponsor.contributionAmount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateSponsor(sponsor.id, { displayOnPublicWeb: !sponsor.displayOnPublicWeb })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        sponsor.displayOnPublicWeb
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {sponsor.displayOnPublicWeb ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{sponsor.displayOnPublicWeb ? 'Public Live' : 'Hidden'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sponsorship Level</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {sponsor.contributionAmount > 0
                        ? `₹${(sponsor.contributionAmount || 0).toLocaleString()}`
                        : (sponsor.tier || 'Official Partner')}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Active Partner</span>
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Tournament Sponsor Modal (Only for Organizer) */}
      {isOrganizer && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Add Tournament Sponsor"
          subtitle={`Associate partnership with ${tournament?.name || 'Tournament'} (Organized by Warhawks)`}
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Sponsor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Sports Technologies"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 12345"
                  value={form.contactNumber}
                  onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Financial Commitment (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.contributionAmount ?? ''}
                  onChange={e => setForm({ ...form, contributionAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Accepts ₹0 or any non-negative amount</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="sponsor@company.com"
                  value={form.contactEmail}
                  onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="displayWeb"
                  checked={form.displayOnPublicWeb}
                  onChange={e => setForm({ ...form, displayOnPublicWeb: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="displayWeb" className="font-semibold text-slate-700 cursor-pointer">
                  Display on Public Tournament Website
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3.5 py-2 min-h-[38px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Save Sponsor
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Sponsor Modal (Only for Organizer) */}
      {isOrganizer && editingSponsor && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSponsor(null)}
          title={`Edit ${editingSponsor.name}`}
          subtitle="Update sponsor details and commitments"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              const rawAmount = String(editingSponsor.contributionAmount).trim();
              const cleanAmount = rawAmount === '' ? 0 : Math.max(0, Number(rawAmount) || 0);
              onUpdateSponsor(editingSponsor.id, {
                ...editingSponsor,
                contributionAmount: cleanAmount
              });
              setEditingSponsor(null);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Sponsor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingSponsor.name}
                  onChange={e => setEditingSponsor({ ...editingSponsor, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editingSponsor.contactNumber || ''}
                  onChange={e => setEditingSponsor({ ...editingSponsor, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Financial Commitment (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={editingSponsor.contributionAmount ?? ''}
                  onChange={e => setEditingSponsor({ ...editingSponsor, contributionAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editingSponsor.contactEmail || ''}
                  onChange={e => setEditingSponsor({ ...editingSponsor, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editDisplayWeb"
                  checked={Boolean(editingSponsor.displayOnPublicWeb)}
                  onChange={e => setEditingSponsor({ ...editingSponsor, displayOnPublicWeb: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="editDisplayWeb" className="font-semibold text-slate-700 cursor-pointer">
                  Display on Public Tournament Website
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingSponsor(null)}
                className="px-3.5 py-2 min-h-[38px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
