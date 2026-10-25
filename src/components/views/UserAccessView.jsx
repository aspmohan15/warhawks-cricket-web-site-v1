import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Key,
  Lock,
  Check,
  X,
  AlertCircle,
  Users,
  Trophy,
  Calendar,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
  Power,
  RefreshCw,
  Loader2,
  Shield,
  ShieldAlert,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  getAdministrators,
  createAdministrator,
  toggleAdministratorStatus,
  deleteAdministrator,
  resetAdminPasswordByPrimary,
  normalizeMobile
} from '../../services/auth';
import { formatPhoneNumber } from '../../utils/phone';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const UserAccessView = ({
  tournament,
  users = [],
  currentUser,
  onSwitchRole,
  onOpenChangePassword,
  onShowToast
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const isPrimaryAdmin = Boolean(
    currentUser?.isPrimaryAdmin ||
    currentUser?.adminRole === 'primary_admin' ||
    currentUser?.role === 'primary_admin'
  );

  // Administrator Management State (Exclusively for Primary Admin)
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: ''
  });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Emergency Password Reset State (Primary Admin Exclusive)
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetAdminForReset, setTargetAdminForReset] = useState(null);
  const [emergencyNewPassword, setEmergencyNewPassword] = useState('');
  const [showEmergencyPassword, setShowEmergencyPassword] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState('');

  // Delete Administrator Confirmation State (Primary Admin Exclusive)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetAdminForDelete, setTargetAdminForDelete] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Mobile Permissions Matrix Filter Tab State
  const [matrixFilter, setMatrixFilter] = useState('all'); // 'all' | 'organizer_only' | 'player_shared'

  // Load administrator directory when organizer is active
  const loadAdmins = async () => {
    if (!isOrganizer) return;
    setLoadingAdmins(true);
    try {
      const data = await getAdministrators();
      if (Array.isArray(data) && data.length > 0) {
        setAdmins(data);
      } else {
        // Fallback seed display if API is offline
        setAdmins([
          {
            id: 'adm-primary-01',
            name: 'Warhawks Primary Operations Chief',
            mobile: currentUser?.mobile || '',
            email: 'operations@warhawks.org',
            role: 'primary_admin',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (isOrganizer) {
      loadAdmins();
    }
  }, [isOrganizer]);

  // Create Administrator
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError('');

    const cleanMobile = normalizeMobile(adminForm.mobile);
    if (!/^\+91[6-9]\d{9}$/.test(cleanMobile)) {
      setAdminError('Please enter a valid 10-digit Indian mobile number (e.g. 9820012345).');
      return;
    }

    if (!adminForm.password || adminForm.password.trim().length < 6) {
      setAdminError('Initial password must be at least 6 characters long.');
      return;
    }

    setSubmittingAdmin(true);

    try {
      const created = await createAdministrator({
        name: adminForm.name.trim(),
        mobile: cleanMobile,
        email: adminForm.email.trim(),
        password: adminForm.password.trim()
      });

      onShowToast?.(`Administrator ${created.name} provisioned successfully!`, 'success');
      setAddAdminModalOpen(false);
      setAdminForm({ name: '', mobile: '', email: '', password: '' });
      await loadAdmins();
    } catch (err) {
      setAdminError(err.message || 'Failed to create administrator account.');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  // Toggle Admin Status
  const handleToggleAdminStatus = async (admin) => {
    if (admin.role === 'primary_admin' || admin.id === 'adm-primary-01') {
      alert('The Primary Administrator account cannot be deactivated.');
      return;
    }

    const nextState = !admin.isActive;
    try {
      await toggleAdministratorStatus(admin.id, nextState);
      onShowToast?.(
        `Administrator ${admin.name} is now ${nextState ? 'Active' : 'Suspended'}.`,
        nextState ? 'success' : 'info'
      );
      setAdmins(prev =>
        prev.map(a => (a.id === admin.id ? { ...a, isActive: nextState } : a))
      );
    } catch (err) {
      alert(err.message || 'Failed to update administrator status.');
    }
  };

  // Open Emergency Reset Password Modal
  const handleOpenResetModal = (admin) => {
    setTargetAdminForReset(admin);
    setEmergencyNewPassword('');
    setResetError('');
    setShowEmergencyPassword(false);
    setResetModalOpen(true);
  };

  // Submit Emergency Password Reset
  const handleEmergencyResetSubmit = async (e) => {
    e.preventDefault();
    if (!targetAdminForReset) return;
    setResetError('');

    if (!emergencyNewPassword || emergencyNewPassword.trim().length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await resetAdminPasswordByPrimary(targetAdminForReset.id, emergencyNewPassword.trim());
      onShowToast?.(res?.message || `Password for ${targetAdminForReset.name} has been reset!`, 'success');
      setResetModalOpen(false);
      setTargetAdminForReset(null);
    } catch (err) {
      setResetError(err.message || 'Failed to reset administrator password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (admin) => {
    if (admin.role === 'primary_admin' || admin.id === 'adm-primary-01') {
      alert('The Primary Administrator account cannot be deleted.');
      return;
    }
    setTargetAdminForDelete(admin);
    setDeleteModalOpen(true);
  };

  // Confirm Delete Administrator
  const handleConfirmDelete = async () => {
    if (!targetAdminForDelete) return;
    setSubmittingDelete(true);

    try {
      await deleteAdministrator(targetAdminForDelete.id);
      onShowToast?.(`Administrator account for ${targetAdminForDelete.name} revoked and deleted.`, 'info');
      setAdmins(prev => prev.filter(a => a.id !== targetAdminForDelete.id));
      setDeleteModalOpen(false);
      setTargetAdminForDelete(null);
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete administrator account.', 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const permissionsMatrix = [
    { capability: 'Tournament Editions (Create, Edit, Archive & Delete)', organizer: true, player: false, description: 'Full tournament lifecycle control' },
    { capability: 'Primary Admin: Manage Additional Administrator Credentials', organizer: true, player: false, description: 'Provisioning admin accounts, password hashes, access control' },
    { capability: 'Emergency Password Override & Admin Removal', organizer: true, player: false, description: 'Primary Admin emergency credential reset & user revocation' },
    { capability: 'Franchise Teams & Squad Composition', organizer: true, player: false, description: 'Team creation, short codes, purse cap allocation' },
    { capability: 'Athlete Roster & Admission Queue Approval', organizer: true, player: false, description: 'Reviewing and approving player registration applications' },
    { capability: 'Fixtures Scheduling & Venue Pitch Allocations', organizer: true, player: false, description: 'Setting match timing, rounds, and ground conditions' },
    { capability: 'Live Scorecard Entry & Result Sign-Off', organizer: true, player: false, description: 'Real-time ball-by-ball score entry and outcome publication' },
    { capability: 'Live Auctioneer Podium Hammer & Bidding', organizer: true, player: false, description: 'Managing auction ring, bidding increments, and hammer drops' },
    { capability: 'Expense Voucher Creation & Record Deletion', organizer: true, player: false, description: 'Disbursing tournament payouts, entering receipts, and modifying ledger records' },
    { capability: 'Tournament Expense Ledger (View-Only Transparency)', organizer: true, player: true, description: 'View financial disbursements, advance payments, category allocation, and export CSV' },
    { capability: 'Catering Logistics & Dietary Orders Distribution', organizer: true, player: false, description: 'Managing nutritional rosters and buffet vouchers' },
    { capability: 'Rules Articles & Playing Conditions Publishing', organizer: true, player: false, description: 'Codifying tournament policies and video walkthroughs' },
    { capability: 'Browse Published Tournaments, Schedules & Venues', organizer: true, player: true, description: 'View current and upcoming championship details' },
    { capability: 'View Live Scores, Match Outcomes & Points Table (NRR)', organizer: true, player: true, description: 'Spectate matches and review ICC-formula standings' },
    { capability: 'View Live Player Auction Stage (Spectator Mode)', organizer: true, player: true, description: 'Real-time observation of player bidding proceedings' },
    { capability: 'Self-Service Player Registration for Open Tournaments', organizer: true, player: true, description: 'Apply for tournament slots when the registration portal is open' },
    { capability: 'Independent Guest Dietary & Meal Requisition', organizer: true, player: true, description: 'Select independent Breakfast and Lunch for each accompanying guest' },
    { capability: 'View Personal Registration Status & Ticket', organizer: true, player: true, description: 'Track approval state and review admission notes' },
    { capability: 'Cancel Own Pending Registration Application', organizer: true, player: true, description: 'Self-service withdrawal while application is pending' },
    { capability: 'View Athlete Profile, Role & Dietary Preferences', organizer: true, player: true, description: 'Personal player specifications and kit sizing' }
  ];

  const filteredMatrix = useMemo(() => {
    if (matrixFilter === 'organizer_only') {
      return permissionsMatrix.filter(p => p.organizer && !p.player);
    }
    if (matrixFilter === 'player_shared') {
      return permissionsMatrix.filter(p => p.player);
    }
    return permissionsMatrix;
  }, [matrixFilter, permissionsMatrix]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* ============================================================== */}
      {/* 1. HEADER SECTION (Mobile-Optimized & Crisp)                  */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-bold text-emerald-700 flex items-center gap-1.5">
              <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-4 h-4 object-contain rounded bg-white p-0.2 border border-slate-200" />
              <span>Warhawks Security</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Role-Based Access Control</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            User Access & Role-Based Permissions (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Administrative hierarchy: <strong>Primary Administrator</strong> (command authority), <strong>Tournament Administrator</strong> (operations), and <strong>Player</strong> (browse & register).
          </p>
        </div>

        {/* Current Active Session Badge */}
        <div className="w-full sm:w-auto p-2.5 sm:p-2 bg-slate-50 sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-slate-200 flex items-center justify-between sm:justify-end gap-2.5 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
              {isPrimaryAdmin ? (
                <span title="Primary Administrator">👑</span>
              ) : currentUser?.role === 'organizer' ? (
                <img src={WARHAWKS_LOGO_URL} alt="Warhawks Organizer" className="w-full h-full object-contain bg-white p-0.5" />
              ) : (
                <span>👤</span>
              )}
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                {currentUser?.name || 'Active Session'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {currentUser?.mobile ? formatPhoneNumber(currentUser.mobile) : 'Player Guest'}
              </div>
            </div>
          </div>
          <span
            className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border shrink-0 ${
              currentUser?.role === 'organizer'
                ? isPrimaryAdmin
                  ? 'text-amber-900 bg-amber-100 border-amber-300'
                  : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                : 'text-blue-800 bg-blue-100 border-blue-300'
            }`}
          >
            {isPrimaryAdmin ? 'Primary Admin' : currentUser?.role}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. PRIMARY ADMINISTRATOR CREDENTIAL MANAGEMENT SECTION          */}
      {/* ============================================================== */}
      {isOrganizer && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Administrator Accounts & Credentials
                </h2>
                {isPrimaryAdmin ? (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                    Primary Authority
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-700">
                    Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                {isPrimaryAdmin
                  ? 'As Primary Administrator, you can provision new administrators, edit credentials in emergency situations, and remove admins when no longer needed.'
                  : 'Only the Primary Administrator has permission to provision administrators, override passwords, or revoke access.'}
              </p>
            </div>

            {/* Header Actions */}
            {isPrimaryAdmin && (
              <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={loadAdmins}
                  disabled={loadingAdmins}
                  className="p-2.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
                  title="Refresh administrator directory"
                  aria-label="Refresh administrator directory"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingAdmins ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setAddAdminModalOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[42px] rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Administrator</span>
                </button>
              </div>
            )}
          </div>

          {/* Self Password Management Banner */}
          <div className="p-3.5 sm:p-4 bg-amber-50/70 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                  <span>Your Personal Password ({currentUser?.name})</span>
                  <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                    {formatPhoneNumber(currentUser?.mobile)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Manage your personal administrator password securely. You can update your credentials at any time.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenChangePassword}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change My Password</span>
            </button>
          </div>

          {/* ========================================================== */}
          {/* A. MOBILE VIEW: Responsive Cards (block md:hidden)        */}
          {/* ========================================================== */}
          <div className="block md:hidden divide-y divide-slate-100">
            {admins.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {loadingAdmins ? 'Loading administrator records...' : 'No administrators found.'}
              </div>
            ) : (
              admins.map(admin => {
                const isSelf = admin.id === currentUser?.id || admin.mobile?.endsWith(currentUser?.mobile?.replace(/^\+91/, '') || 'xxx');
                const isPrimary = admin.role === 'primary_admin' || admin.id === 'adm-primary-01';

                return (
                  <div key={admin.id} className="p-4 space-y-3 bg-white">
                    {/* Top Row: Avatar + Name + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden ${
                            isPrimary ? 'bg-amber-600' : 'bg-slate-900 border border-slate-200'
                          }`}
                        >
                          {isPrimary ? (
                            <span>👑</span>
                          ) : (
                            <img src={WARHAWKS_LOGO_URL} alt="Admin" className="w-full h-full object-contain bg-white p-0.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                            <span>{admin.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-semibold shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {admin.email || 'No email registered'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-block font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                            isPrimary
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isPrimary ? 'Primary Admin' : 'Admin'}
                        </span>
                        <span
                          className={`inline-block font-bold text-[9px] px-2 py-0.2 rounded ${
                            admin.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {admin.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Phone & Info Grid */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Phone / Login:</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono">{formatPhoneNumber(admin.mobile)}</span>
                    </div>

                    {/* Actions Row (Thumb-Friendly for Mobile) */}
                    <div className="pt-1 flex flex-col gap-2">
                      {isSelf && (
                        <button
                          type="button"
                          onClick={onOpenChangePassword}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4 text-amber-700" />
                          <span>Change My Password</span>
                        </button>
                      )}

                      {isPrimaryAdmin && !isPrimary && (
                        <div className="space-y-2">
                          {/* Emergency Password Override Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(admin)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>Emergency Reset Password</span>
                          </button>

                          {/* Secondary Row: Suspend/Activate and Delete */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAdminStatus(admin)}
                              className={`flex items-center justify-center gap-1 py-2 min-h-[40px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                admin.isActive
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{admin.isActive ? 'Suspend' : 'Activate'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(admin)}
                              className="flex items-center justify-center gap-1 py-2 min-h-[40px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {!isPrimaryAdmin && !isSelf && (
                        <div className="text-[11px] text-slate-400 italic text-center py-1">
                          Private to administrator · Read-only
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================== */}
          {/* B. DESKTOP VIEW: High-Density Table (hidden md:block)       */}
          {/* ========================================================== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Mobile & Login</th>
                  <th className="py-3 px-4">Role & Scope</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Password</th>
                  {isPrimaryAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={isPrimaryAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                      {loadingAdmins ? 'Loading administrator records...' : 'No administrators found.'}
                    </td>
                  </tr>
                ) : (
                  admins.map(admin => {
                    const isSelf = admin.id === currentUser?.id || admin.mobile?.endsWith(currentUser?.mobile?.replace(/^\+91/, '') || 'xxx');
                    const isPrimary = admin.role === 'primary_admin' || admin.id === 'adm-primary-01';

                    return (
                      <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden ${
                                isPrimary ? 'bg-amber-600' : 'bg-slate-900 border border-slate-200'
                              }`}
                            >
                              {isPrimary ? (
                                <span>👑</span>
                              ) : (
                                <img src={WARHAWKS_LOGO_URL} alt="Admin" className="w-full h-full object-contain bg-white p-0.5" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{admin.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{admin.email || 'No email registered'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {formatPhoneNumber(admin.mobile)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                              isPrimary
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPrimary ? 'Primary Administrator' : 'Administrator'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                              admin.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {admin.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        {/* Password Management Column */}
                        <td className="py-3 px-4 text-center">
                          {isSelf ? (
                            <button
                              type="button"
                              onClick={onOpenChangePassword}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] transition-colors cursor-pointer border border-amber-300"
                              title="Change your personal password"
                            >
                              <KeyRound className="w-3 h-3 text-amber-700" />
                              <span>Change Mine</span>
                            </button>
                          ) : isPrimaryAdmin && !isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleOpenResetModal(admin)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[10px] transition-colors cursor-pointer border border-amber-200"
                              title="Emergency password reset for this administrator"
                            >
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              <span>Emergency Reset</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Private to admin
                            </span>
                          )}
                        </td>

                        {/* Actions Column (Primary Admin Exclusive) */}
                        {isPrimaryAdmin && (
                          <td className="py-3 px-4 text-right">
                            {isPrimary ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Permanent Primary Admin
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAdminStatus(admin)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                    admin.isActive
                                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                  title={admin.isActive ? 'Suspend access' : 'Activate access'}
                                >
                                  {admin.isActive ? 'Suspend' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(admin)}
                                  className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Revoke and delete administrator account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ACTIVE ROLE SWITCHER (Simulate RBAC Enforcement)            */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Active Role Switcher (Simulate RBAC Enforcement)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Switch roles to test how permissions adapt in real time. In <strong>Player</strong> mode, tournament creation and administrative modules are restricted.
          </p>
        </div>

        {/* Buttons: 2-column on mobile, inline on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => onSwitchRole('organizer')}
            className={`px-4 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentUser.role === 'organizer'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <img src={WARHAWKS_LOGO_URL} alt="Organizer" className="w-4 h-4 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Organizer</span>
            {currentUser.role === 'organizer' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onSwitchRole('player')}
            className={`px-4 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentUser.role === 'player'
                ? 'bg-blue-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🏏</span>
            <span>Player</span>
            {currentUser.role === 'player' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. CAPABILITIES & RBAC AUTHORIZATION MATRIX                    */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Capabilities & RBAC Authorization Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear authorization boundaries between Tournament Organizer and Player
            </p>
          </div>

          {/* Mobile Filter Segments */}
          <div className="flex md:hidden items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMatrixFilter('all')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-[11px] transition-colors ${
                matrixFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({permissionsMatrix.length})
            </button>
            <button
              type="button"
              onClick={() => setMatrixFilter('organizer_only')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-[11px] transition-colors ${
                matrixFilter === 'organizer_only' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Organizer Only
            </button>
            <button
              type="button"
              onClick={() => setMatrixFilter('player_shared')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-[11px] transition-colors ${
                matrixFilter === 'player_shared' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Player Shared
            </button>
          </div>
        </div>

        {/* Mobile View: Capability Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredMatrix.map(row => (
            <div key={row.capability} className="p-3.5 space-y-2">
              <div>
                <div className="font-semibold text-slate-900 text-xs leading-snug">{row.capability}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{row.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <img src={WARHAWKS_LOGO_URL} alt="Organizer" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                    <span>Organizer:</span>
                  </span>
                  {row.organizer ? (
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      <span>Denied</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                  <span className="text-slate-600 font-medium">🏏 Player:</span>
                  {row.player ? (
                    <span className="font-bold text-blue-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <span className="font-bold text-rose-600 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      <span>Denied</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Capability & Scope</th>
                <th className="py-3 px-4 text-center w-36">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                    <img src={WARHAWKS_LOGO_URL} alt="Organizer" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                    <span>Organizer</span>
                  </span>
                </th>
                <th className="py-3 px-4 text-center w-36">
                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                    <span>🏏 Player</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map(row => (
                <tr key={row.capability} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{row.capability}</div>
                    <div className="text-[11px] text-slate-400">{row.description}</div>
                  </td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20">
                    {row.organizer ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Allowed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                        <X className="w-4 h-4 text-slate-300" />
                        <span>Denied</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center bg-blue-50/20">
                    {row.player ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs">
                        <Check className="w-4 h-4 text-blue-600" />
                        <span>Allowed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-medium text-xs">
                        <X className="w-4 h-4 text-rose-400" />
                        <span>Denied</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: PROVISION NEW ADMINISTRATOR                           */}
      {/* ============================================================== */}
      {addAdminModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAddAdminModalOpen(false)}
          title="Provision New Administrator"
          subtitle="Add an authorized administrator account to Warhawks Tournament Operations"
          maxWidth="md"
        >
          <form onSubmit={handleCreateAdminSubmit} className="space-y-4 text-xs">
            {adminError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed font-medium">{adminError}</div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Administrator Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Anand Sharma (Operations Desk)"
                value={adminForm.name}
                onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number (Sign-in identifier) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="+919820012345"
                  value={adminForm.mobile}
                  onChange={e => setAdminForm({ ...adminForm, mobile: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Indian 10-digit mobile number used for sign-in verification.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="e.g. operations@warhawks.org"
                  value={adminForm.email}
                  onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={adminForm.password}
                  onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Set a secure password of at least 6 characters.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAddAdminModalOpen(false)}
                className="px-4 py-2.5 min-h-[40px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdmin}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submittingAdmin ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Administrator</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EMERGENCY PASSWORD RESET (Primary Admin Exclusive)    */}
      {/* ============================================================== */}
      {resetModalOpen && targetAdminForReset && (
        <Modal
          isOpen={true}
          onClose={() => setResetModalOpen(false)}
          title="Emergency Password Override"
          subtitle={`Primary Admin Authority: Reset password for ${targetAdminForReset.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleEmergencyResetSubmit} className="space-y-4 text-xs">
            {resetError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed font-medium">{resetError}</div>
              </div>
            )}

            {/* Target Account Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs">{targetAdminForReset.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{formatPhoneNumber(targetAdminForReset.mobile)}</div>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                Emergency Override
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                As the <strong>Primary Administrator</strong>, you have exclusive emergency authority to reset this administrator&apos;s password so they can recover their account.
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showEmergencyPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Minimum 6 characters"
                  value={emergencyNewPassword}
                  onChange={e => setEmergencyNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowEmergencyPassword(!showEmergencyPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  aria-label={showEmergencyPassword ? 'Hide password' : 'Show password'}
                >
                  {showEmergencyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                This administrator will use this new password immediately for all sign-ins.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2.5 min-h-[40px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReset || !emergencyNewPassword || emergencyNewPassword.trim().length < 6}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submittingReset ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Administrator Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE ADMINISTRATOR CONFIRMATION                      */}
      {/* ============================================================== */}
      {deleteModalOpen && targetAdminForDelete && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteModalOpen(false)}
          title="Revoke & Remove Administrator"
          subtitle="Permanently remove administrative access for this user"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-rose-900">Are you sure you want to delete this administrator?</div>
                <div className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  This user will immediately lose all administrative rights and will no longer be able to log in to Warhawks Tournament Operations.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Administrator:</span>
                <span className="font-bold text-slate-900">{targetAdminForDelete.name}</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-500 font-medium">Mobile:</span>
                <span className="text-slate-800 font-mono">{formatPhoneNumber(targetAdminForDelete.mobile)}</span>
              </div>
              {targetAdminForDelete.email && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="text-slate-800 truncate max-w-[200px]">{targetAdminForDelete.email}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submittingDelete}
                className="px-4 py-2.5 min-h-[40px] rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Revoke & Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
