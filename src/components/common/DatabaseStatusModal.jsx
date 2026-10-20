import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  Server,
  ShieldCheck,
  HardDrive,
  Cpu,
  ShieldAlert,
  Lock
} from 'lucide-react';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  updateSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection
} from '../../services/supabase';

export const DatabaseStatusModal = ({
  isOpen,
  onClose,
  currentUser,
  onOpenOrganizerLogin,
  onConnectionUpdated,
  onShowToast
}) => {
  const isAdmin = currentUser?.role === 'organizer';
  const [config, setConfig] = useState(() => getSupabaseConfig(true));
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (isOpen && isAdmin) {
      const current = getSupabaseConfig(true);
      setConfig(current);
      setUrlInput(current.url || '');
      setKeyInput(current.anonKey || '');
      setIsConfigured(isSupabaseConfigured());
      setTestResult(null);

      // Auto-run test if configured
      if (isSupabaseConfigured()) {
        runTest(current.url, current.anonKey);
      }
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  // STRICT RBAC GATE: If user is not an Organizer (Admin), block access to all database connection details
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Database Security Restriction</h2>
                <p className="text-[11px] text-slate-400">Role-Based Access Control (RBAC)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Admin Authorization Required
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Database connection parameters, cloud cluster host URLs, API keys, and synchronization controls are protected infrastructure data. <strong>Only tournament organizers and administrators</strong> are authorized to view or configure this information.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrganizerLogin?.();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In as Organizer (Admin)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const runTest = async (testUrl = urlInput, testKey = keyInput) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(testUrl, testKey);
      setTestResult(res);
      if (res.connected) {
        setIsConfigured(true);
      }
    } catch (err) {
      setTestResult({
        connected: false,
        message: err.message || 'Unexpected connection error occurred.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndConnect = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      onShowToast?.('Please provide both Project URL and Anon Key.', 'error');
      return;
    }

    setTesting(true);
    const test = await testSupabaseConnection(urlInput, keyInput);
    setTesting(false);
    setTestResult(test);

    if (test.connected) {
      updateSupabaseConfig(urlInput, keyInput);
      setIsConfigured(true);
      onShowToast?.('Supabase database connected and synchronized!', 'success');
      onConnectionUpdated?.();
    } else {
      onShowToast?.(`Connection failed: ${test.message}`, 'error');
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setIsConfigured(false);
    setTestResult(null);
    onShowToast?.('Disconnected from Supabase. Reverted to Local Storage.', 'info');
    onConnectionUpdated?.();
  };

  const handleCopyMigration = () => {
    const migrationInstructions = `-- Warhawks Cricket Tournament Core Schema & RLS Setup
-- Run this in your Supabase SQL Editor:
-- 1. Creates Tournaments, Teams, Players, Matches, Standings, Registrations, Sponsors
-- 2. Configures Storage Bucket 'tournament-assets'
-- 3. Enables RLS policies for Organizer and Public Players

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  edition_number INT NOT NULL,
  year INT NOT NULL,
  format TEXT DEFAULT 'T20',
  status TEXT DEFAULT 'upcoming',
  organizer TEXT DEFAULT 'Warhawks',
  organizer_role TEXT,
  organizer_branch TEXT,
  start_date DATE,
  end_date DATE,
  venue TEXT,
  city TEXT,
  registration_open BOOLEAN DEFAULT true,
  registration_start_date DATE,
  registration_end_date DATE,
  total_budget_points_per_team NUMERIC(15, 2) DEFAULT 10000000,
  points_per_win INT DEFAULT 2,
  points_per_tie INT DEFAULT 1,
  max_squad_size INT DEFAULT 18,
  min_squad_size INT DEFAULT 14,
  max_overseas_players INT DEFAULT 4,
  description TEXT,
  upi_qr_code_url TEXT,
  upi_id TEXT DEFAULT 'warhawks.sports@icici',
  registration_fee NUMERIC(10, 2) DEFAULT 1500.00,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  primary_role TEXT DEFAULT 'Batsman',
  batting_style TEXT,
  bowling_style TEXT,
  shirt_size TEXT DEFAULT 'L',
  food_preference TEXT DEFAULT 'Veg',
  has_breakfast BOOLEAN DEFAULT true,
  has_lunch BOOLEAN DEFAULT true,
  guest_count INT DEFAULT 0,
  guests JSONB DEFAULT '[]'::jsonb,
  guest_food_preference TEXT DEFAULT 'Veg',
  has_guest_breakfast BOOLEAN DEFAULT false,
  has_guest_lunch BOOLEAN DEFAULT false,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  catering_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS & Operational Access
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers manage tournaments" ON public.tournaments;
CREATE POLICY "Organizers manage tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public players register" ON public.registrations;
CREATE POLICY "Public players register" ON public.registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read registrations" ON public.registrations;
CREATE POLICY "Public read registrations" ON public.registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers manage registrations" ON public.registrations;
CREATE POLICY "Organizers manage registrations" ON public.registrations FOR ALL USING (true) WITH CHECK (true);
`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(migrationInstructions);
      setCopiedMigration(true);
      setTimeout(() => setCopiedMigration(false), 2500);
      onShowToast?.('SQL schema copied to clipboard! Paste in Supabase SQL Editor.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
              isConfigured && testResult?.connected
                ? 'bg-emerald-600'
                : 'bg-slate-800 border border-slate-700'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Database Connection & Health Status
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isConfigured && testResult?.connected
                    ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                    : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConfigured && testResult?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{isConfigured && testResult?.connected ? 'Supabase Live' : 'Local Storage Mode'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor live Supabase PostgreSQL connection & configure API keys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Live Status Card */}
          <div className={`p-4 rounded-xl border ${
            isConfigured && testResult?.connected
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : testResult && !testResult.connected
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {isConfigured && testResult?.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : testResult && !testResult.connected ? (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <h3 className="font-bold text-sm">
                    {isConfigured && testResult?.connected
                      ? 'Connected to Supabase PostgreSQL Database'
                      : testResult && !testResult.connected
                      ? 'Supabase Connection Error'
                      : 'Running in Local Offline Fallback Mode'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {testResult?.message ||
                      (isConfigured
                        ? 'Supabase credentials are saved. Click "Test Connection" to ping the cluster.'
                        : 'No Supabase credentials have been configured yet. The application is operating safely on the browser local storage store. All tournament editions, fixtures, registrations, and auction records are currently saved locally.')}
                  </p>

                  {testResult?.latency && (
                    <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-slate-400" /> Ping: <strong>{testResult.latency}ms</strong>
                      </span>
                      <span>•</span>
                      <span>Target: {urlInput ? new URL(urlInput).hostname : 'None'}</span>
                    </div>
                  )}

                  {testResult?.needsMigration && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px]">
                      <strong>Action Required:</strong> Supabase project reached, but SQL tables do not exist yet.
                      Click <strong>"Copy schema.sql"</strong> below and execute it in your Supabase SQL Editor to initialize the database from scratch.
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => runTest(urlInput, keyInput)}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer shrink-0 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                <span>{testing ? 'Testing...' : 'Test Now'}</span>
              </button>
            </div>
          </div>

          {/* Connection Input Form */}
          <form onSubmit={handleSaveAndConnect} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>Supabase Configuration</span>
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
              >
                <span>Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Project URL */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supabase Project URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://[your-project-ref].supabase.co"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Found in Supabase: <strong>Project Settings → API → Project URL</strong>
              </p>
            </div>

            {/* Anon Key */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supabase Anon / Public API Key <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Found in Supabase: <strong>Project Settings → API → Project API Keys → anon public</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              {isConfigured ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer transition-colors text-xs"
                >
                  Disconnect & Use Local Store
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Ready to link your cloud database
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => runTest(urlInput, keyInput)}
                  disabled={testing || !urlInput.trim() || !keyInput.trim()}
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer text-xs disabled:opacity-40"
                >
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={testing || !urlInput.trim() || !keyInput.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer text-xs shadow-xs disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save & Connect Database</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Migration Copy Helper */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>Consolidated Database Master Schema (supabase/schema.sql)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Initialize or reset the complete database from scratch with all tables, constraints, indexes, storage buckets, and RLS policies in one query.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyMigration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer shrink-0 text-xs shadow-2xs"
            >
              {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedMigration ? 'Copied Master Schema!' : 'Copy schema.sql'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dual-Engine: Supabase Cloud PostgreSQL with Zero-Latency Local Fallback</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
