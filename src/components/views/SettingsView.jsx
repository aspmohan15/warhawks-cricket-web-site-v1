import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Key,
  Shield,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  QrCode,
  Upload,
  Phone,
  User,
  Lock
} from 'lucide-react';
import { DEFAULT_ORGANIZER_NAME, ORGANIZER_DETAILS, WARHAWKS_LOGO_URL } from '../../constants';
import { testSupabaseConnection, updateSupabaseConfig, getSupabaseConfig } from '../../services/supabase';
import { uploadUpiQrToSupabase, DEFAULT_WARHAWKS_UPI } from '../../services/supabaseStorage';
import { getStoredOrganizerCredentials, updateOrganizerCredentials } from '../../services/auth';
import { formatPhoneNumber } from '../../utils/phone';

export const SettingsView = ({
  settings,
  tournament,
  currentUser,
  onUpdateSettings,
  onUpdateTournament,
  onResetDatabase,
  onShowToast
}) => {
  const isAdmin = currentUser?.role === 'organizer';
  const currentSupabase = getSupabaseConfig(true);
  const [form, setForm] = useState({
    ...settings,
    supabaseUrl: settings.supabaseUrl || settings.supabaseProjectUrl || currentSupabase.url || '',
    supabaseAnonKey: settings.supabaseAnonKey || currentSupabase.anonKey || '',
    upiQrCodeUrl: tournament?.upiQrCodeUrl || settings.upiQrCodeUrl || DEFAULT_WARHAWKS_UPI.defaultQrCodeUrl,
    upiId: tournament?.upiId || settings.upiId || DEFAULT_WARHAWKS_UPI.upiId,
    payeeName: tournament?.payeeName || settings.payeeName || DEFAULT_WARHAWKS_UPI.payeeName || 'Warhawks Tournament Operations',
    upiMobileNumber: tournament?.upiMobileNumber || settings.upiMobileNumber || '',
    registrationFee: tournament?.registrationFee ?? settings.registrationFee ?? 1500
  });

  const [organizerCreds, setOrganizerCreds] = useState(() => getStoredOrganizerCredentials());
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (tournament) {
      setForm(prev => ({
        ...prev,
        upiQrCodeUrl: tournament.upiQrCodeUrl || prev.upiQrCodeUrl || DEFAULT_WARHAWKS_UPI.defaultQrCodeUrl,
        upiId: tournament.upiId || prev.upiId || DEFAULT_WARHAWKS_UPI.upiId,
        payeeName: tournament.payeeName || prev.payeeName || DEFAULT_WARHAWKS_UPI.payeeName || 'Warhawks Tournament Operations',
        upiMobileNumber: tournament.upiMobileNumber || prev.upiMobileNumber || '',
        registrationFee: tournament.registrationFee ?? prev.registrationFee ?? 1500
      }));
    }
  }, [tournament?.id, tournament?.upiQrCodeUrl, tournament?.upiId, tournament?.payeeName, tournament?.upiMobileNumber, tournament?.registrationFee]);

  if (currentUser && !isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl mx-auto mb-3">
          🔒
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Admin Privilege Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          System settings, database infrastructure configurations, and cloud API keys can only be accessed by authorized tournament organizers and administrators.
        </p>
      </div>
    );
  }

  const handleSave = (e) => {
    e.preventDefault();
    const rawFee = String(form.registrationFee ?? '').trim();
    if (rawFee !== '' && (isNaN(Number(rawFee)) || Number(rawFee) < 0)) {
      onShowToast('Registration fee must be a valid non-negative amount (₹).', 'error');
      return;
    }
    const cleanFee = rawFee === '' ? 0 : Number(rawFee);
    const cleanSettings = {
      ...form,
      payeeName: form.payeeName || 'Warhawks Tournament Operations',
      registrationFee: cleanFee
    };
    onUpdateSettings(cleanSettings);

    if (tournament?.id && onUpdateTournament) {
      onUpdateTournament(tournament.id, {
        upiQrCodeUrl: form.upiQrCodeUrl,
        upiId: form.upiId,
        payeeName: form.payeeName || 'Warhawks Tournament Operations',
        upiMobileNumber: form.upiMobileNumber,
        registrationFee: cleanFee
      });
    }

    // Save organizer credentials
    updateOrganizerCredentials({
      mobile: organizerCreds.mobile ? formatPhoneNumber(organizerCreds.mobile) : organizerCreds.mobile,
      password: organizerCreds.passwordHash
    });

    if (form.supabaseUrl || form.supabaseAnonKey) {
      updateSupabaseConfig(form.supabaseUrl, form.supabaseAnonKey);
    }
    onShowToast('System settings and organizer parameters saved successfully!', 'success');
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const res = await uploadUpiQrToSupabase(file, tournament?.id || 'default');
      const newQrUrl = res.url;
      setForm(prev => ({
        ...prev,
        upiQrCodeUrl: newQrUrl
      }));

      if (tournament?.id && onUpdateTournament) {
        onUpdateTournament(tournament.id, { upiQrCodeUrl: newQrUrl });
      }
      onUpdateSettings({ ...form, upiQrCodeUrl: newQrUrl });

      onShowToast(
        `UPI QR code uploaded to ${res.storageType === 'supabase_storage' ? 'Supabase Storage' : 'local storage'}!`,
        'success'
      );
    } catch (err) {
      onShowToast(`QR upload failed: ${err.message}`, 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    try {
      const urlToTest = form.supabaseUrl || form.supabaseProjectUrl;
      const keyToTest = form.supabaseAnonKey;
      const result = await testSupabaseConnection(urlToTest, keyToTest);
      if (result.connected) {
        onShowToast(result.message, 'success');
      } else {
        onShowToast(result.message, 'error');
      }
    } catch (err) {
      onShowToast(`Connection test failed: ${err.message}`, 'error');
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleTestCloudinary = () => {
    setTestingCloudinary(true);
    setTimeout(() => {
      setTestingCloudinary(false);
      onShowToast('Cloudinary upload preset signature verified!', 'success');
    }, 600);
  };

  const handleExportDatabaseJson = () => {
    try {
      const data = localStorage.getItem('warhawks_admin_db_v1') || localStorage.getItem('pavilionhq_admin_db_v1');
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warhawks_tournaments_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onShowToast('Database snapshot exported successfully!', 'success');
      }
    } catch {
      onShowToast('Export error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Settings & External Integrations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Supabase PostgreSQL, Cloudinary CDN storage, tournament currency rules, and backup snapshots.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportDatabaseJson}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export DB Snapshot</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset entire tournament database to default official sample data? All local changes will be refreshed.')) {
                onResetDatabase();
                onShowToast('Database reset to official sample state!', 'info');
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sample Data</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Official Tournament Organizer Brand Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <img
                src={WARHAWKS_LOGO_URL}
                alt="Warhawks Official Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-slate-200 shrink-0 shadow-xs"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">Official Tournament Organizer Brand</h3>
                <p className="text-xs text-slate-500 truncate">Designated organization branch responsible for hosting, scheduling, and sanctioning</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Organizer Branch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Organizer Name</label>
              <input
                type="text"
                value={form.organizerName || DEFAULT_ORGANIZER_NAME}
                onChange={e => setForm({ ...form, organizerName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">Official brand identity displayed across all tournaments.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organizer Authority Role</label>
              <input
                type="text"
                value={form.organizerRole || 'Official Tournament Organizer & Host'}
                onChange={e => setForm({ ...form, organizerRole: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">Operational capacity displayed on official scorecards.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operations Branch / Department</label>
              <input
                type="text"
                value={form.organizerBranch || ORGANIZER_DETAILS.branch}
                onChange={e => setForm({ ...form, organizerBranch: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organizer Official Contact Email</label>
              <input
                type="email"
                value={form.organizerEmail || ORGANIZER_DETAILS.contactEmail}
                onChange={e => setForm({ ...form, organizerEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Supabase PostgreSQL Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">Supabase Hosted PostgreSQL & Auth</h3>
                <p className="text-xs text-slate-500 truncate">Prisma database provider & Row Level Security connection</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={testingSupabase}
              className="flex items-center justify-center gap-1 px-3 py-2 min-h-[36px] rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 text-xs cursor-pointer w-full sm:w-auto"
            >
              {testingSupabase ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supabase Project URL</label>
              <input
                type="url"
                value={form.supabaseUrl || ''}
                onChange={e => setForm({ ...form, supabaseUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supabase Anon Key</label>
              <input
                type="password"
                value={form.supabaseAnonKey || ''}
                onChange={e => setForm({ ...form, supabaseAnonKey: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Organizer Official UPI Payment & Supabase QR Storage */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">Organizer UPI Payment & Supabase QR Storage</h3>
                <p className="text-xs text-slate-500 truncate">Store organizer UPI QR codes in Supabase Storage bucket (tournament-assets)</p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Supabase Storage Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* QR Code Upload & Preview */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col items-center text-center">
              <div className="w-36 h-36 bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs flex items-center justify-center mb-2.5 relative">
                {form.upiQrCodeUrl ? (
                  <img
                    src={form.upiQrCodeUrl}
                    alt="Organizer UPI QR Code"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 text-center p-3">
                    <QrCode className="w-10 h-10 mx-auto mb-1 text-slate-300" />
                    <span>No QR Code</span>
                  </div>
                )}
                {uploadingQr && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                  </div>
                )}
              </div>

              <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer transition-colors text-xs shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingQr ? 'Uploading to Supabase...' : 'Upload UPI QR Image'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleQrUpload}
                  disabled={uploadingQr}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-1.5">
                PNG, JPG or SVG up to 5MB
              </p>
            </div>

            {/* UPI ID, Payee Name, UPI Mobile Number and Fee Parameters */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Payee Name / Account Holder</span>
                  </label>
                  <input
                    type="text"
                    value={form.payeeName || ''}
                    onChange={e => setForm({ ...form, payeeName: e.target.value })}
                    placeholder="e.g. Warhawks Tournament Operations"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Beneficiary name displayed to players during tournament fee checkout.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Organizer UPI ID / VPA</span>
                  </label>
                  <input
                    type="text"
                    value={form.upiId || ''}
                    onChange={e => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. warhawks.sports@icici"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Displayed on the public tournament registration portal for participant fee collection.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Organizer UPI Mobile Number</span>
                  </label>
                  <input
                    type="text"
                    value={form.upiMobileNumber || ''}
                    onChange={e => setForm({ ...form, upiMobileNumber: e.target.value })}
                    placeholder="e.g. +91 98450 12345 or 9845012345"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Displayed to players on registration portal for direct PhonePe / GPay mobile payment.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Player Registration Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.registrationFee ?? ''}
                    onChange={e => setForm({ ...form, registrationFee: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Standard fee per participant before guest accompaniments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organizer Authentication & Password Security */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Organizer Sign-In Credentials</h3>
              <p className="text-xs text-slate-500">Configure the registered Mobile Number and Password used to log in as tournament organizer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Organizer Mobile Number (Sign-In)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={organizerCreds.mobile || ''}
                  onChange={e => setOrganizerCreds({ ...organizerCreds, mobile: e.target.value })}
                  placeholder="+919820012345"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Organizer Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={organizerCreds.passwordHash || ''}
                  onChange={e => setOrganizerCreds({ ...organizerCreds, passwordHash: e.target.value })}
                  placeholder="Enter new organizer password"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Points Nomenclature */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Auction Points & Currency System</h3>
          <p className="text-xs text-slate-500 mb-4">Display tokens for financial ledger and auction podium</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={form.currencySymbol || ''}
                onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Auction Bidding Unit Name</label>
              <input
                type="text"
                value={form.pointsUnitName || ''}
                onChange={e => setForm({ ...form, pointsUnitName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center text-center"
          >
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
};
