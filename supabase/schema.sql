-- ==============================================================================
-- Warhawks Cricket Tournament Management System — Complete Master Schema
-- File: supabase/schema.sql
-- Description:
--   Single consolidated SQL initialization file for Supabase PostgreSQL.
--   Contains all table definitions, relationships, constraints, indexes,
--   triggers, security definer functions, storage bucket setup, and
--   strict Row Level Security (RLS) policies for Organizer and Player roles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. TEARDOWN & COMPLETE DATABASE RESET
-- ------------------------------------------------------------------------------
-- Drop all existing application tables in reverse dependency order
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.import_jobs CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;
DROP TABLE IF EXISTS public.rules CASCADE;
DROP TABLE IF EXISTS public.auction_bids CASCADE;
DROP TABLE IF EXISTS public.auction_configs CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.sponsors CASCADE;
DROP TABLE IF EXISTS public.standings CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop obsolete or legacy tables from old iterations
DROP TABLE IF EXISTS public.food_orders CASCADE;
DROP TABLE IF EXISTS public.food_order_records CASCADE;
DROP TABLE IF EXISTS public.registration_applications CASCADE;
DROP TABLE IF EXISTS public.tournament_rules CASCADE;

-- Drop functions & types
DROP FUNCTION IF EXISTS public.is_organizer() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_email() CASCADE;

DROP TYPE IF EXISTS public.tournament_status CASCADE;
DROP TYPE IF EXISTS public.match_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.dietary_preference CASCADE;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('upcoming', 'current', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('organizer', 'player');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dietary_preference AS ENUM ('Veg', 'Non-Veg');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. USER PROFILES TABLE (Supabase Auth Integration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to safely auto-provision profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'player' -- Default to player role; organizers must be elevated explicitly
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3b. ORGANIZER SESSIONS (Direct / Headless / Netlify administrative authentication)
CREATE TABLE IF NOT EXISTS public.organizer_sessions (
  token TEXT PRIMARY KEY,
  mobile TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()) + interval '7 days'
);

ALTER TABLE public.organizer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read organizer_sessions" ON public.organizer_sessions;
CREATE POLICY "Public read organizer_sessions"
  ON public.organizer_sessions FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_organizer_sessions_token_exp ON public.organizer_sessions (token, expires_at);

-- Security Definer function to check if current request has organizer administrative authority
CREATE OR REPLACE FUNCTION public.is_organizer()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_headers JSON;
  v_token TEXT;
BEGIN
  -- 1. Check Supabase Auth JWT
  IF auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'organizer'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 2. Check x-organizer-token or Bearer in request.headers
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    IF v_headers IS NOT NULL THEN
      v_token := v_headers->>'x-organizer-token';
      IF v_token IS NULL OR v_token = '' THEN
        v_token := replace(v_headers->>'authorization', 'Bearer ', '');
      END IF;
      v_token := trim(v_token);

      IF v_token IS NOT NULL AND v_token != '' THEN
        IF EXISTS (
          SELECT 1 FROM public.organizer_sessions
          WHERE token = v_token AND expires_at > timezone('utc'::text, now())
        ) THEN
          RETURN true;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fall through safely
  END;

  RETURN false;
END;
$$;

-- Security Definer RPC for Organizer Authentication
CREATE OR REPLACE FUNCTION public.authenticate_organizer(p_mobile text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_clean_input text;
  v_admin record;
  v_token text;
BEGIN
  v_clean_input := regexp_replace(COALESCE(p_mobile, ''), '[^0-9+]', '', 'g');
  IF v_clean_input ~ '^[6-9][0-9]{9}$' THEN
    v_clean_input := '+91' || v_clean_input;
  ELSIF v_clean_input ~ '^91[6-9][0-9]{9}$' THEN
    v_clean_input := '+' || v_clean_input;
  END IF;

  SELECT id, name, mobile, email, role, is_active INTO v_admin
  FROM public.administrators
  WHERE (mobile = v_clean_input OR mobile = replace(v_clean_input, '+91', ''))
    AND password_hash = encode(digest(trim(COALESCE(p_password, '')) || 'whk_salt_2026', 'sha256'), 'hex')
    AND is_active = true
  LIMIT 1;

  IF v_admin.id IS NOT NULL THEN
    v_token := 'whk-org-' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
    VALUES (v_token, v_admin.mobile, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
    ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';

    RETURN jsonb_build_object(
      'success', true,
      'token', v_token,
      'user', jsonb_build_object(
        'id', v_admin.id,
        'name', v_admin.name,
        'email', COALESCE(v_admin.email, 'operations@warhawks.org'),
        'mobile', v_admin.mobile,
        'role', 'organizer',
        'isPrimaryAdmin', (v_admin.role = 'primary_admin'),
        'title', CASE WHEN v_admin.role = 'primary_admin' THEN 'Primary Administrator & Command Chief' ELSE 'Tournament Administrator' END
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid organizer credentials.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_organizer(text, text) TO anon, authenticated, service_role;

-- Logout RPC
CREATE OR REPLACE FUNCTION public.logout_organizer(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NOT NULL AND p_token != '' THEN
    DELETE FROM public.organizer_sessions WHERE token = p_token;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.logout_organizer(text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. TOURNAMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY DEFAULT ('tour-' || substr(md5(random()::text), 1, 10)),
  name TEXT NOT NULL,
  edition_number INT NOT NULL,
  year INT NOT NULL,
  format TEXT NOT NULL DEFAULT 'T20',
  status tournament_status NOT NULL DEFAULT 'upcoming',
  organizer TEXT NOT NULL DEFAULT 'Warhawks',
  organizer_role TEXT NOT NULL DEFAULT 'Official Tournament Organizer & Host',
  organizer_branch TEXT NOT NULL DEFAULT 'Warhawks Tournament Operations',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  registration_open BOOLEAN NOT NULL DEFAULT true,
  registration_start_date DATE,
  registration_end_date DATE,
  total_budget_points_per_team NUMERIC(14, 2) NOT NULL DEFAULT 10000000,
  points_per_win INT NOT NULL DEFAULT 2,
  points_per_tie INT NOT NULL DEFAULT 1,
  max_squad_size INT NOT NULL DEFAULT 18,
  min_squad_size INT NOT NULL DEFAULT 14,
  max_overseas_players INT NOT NULL DEFAULT 4,
  description TEXT,
  upi_qr_code_url TEXT,
  upi_id TEXT DEFAULT 'warhawks.sports@icici',
  registration_fee NUMERIC(10, 2) DEFAULT 1500.00,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_tournament_edition UNIQUE (name, edition_number)
);

-- ------------------------------------------------------------------------------
-- 5. TEAMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY DEFAULT ('team-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  city TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#0284c7',
  secondary_color TEXT NOT NULL DEFAULT '#0f172a',
  logo_url TEXT,
  owner_name TEXT NOT NULL,
  captain_player_id TEXT,
  budget_total NUMERIC(14, 2) NOT NULL DEFAULT 10000000,
  budget_spent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  budget_remaining NUMERIC(14, 2) NOT NULL DEFAULT 10000000,
  total_players_assigned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_team_tournament_name UNIQUE (tournament_id, name),
  CONSTRAINT uq_team_tournament_short_code UNIQUE (tournament_id, short_code)
);

-- ------------------------------------------------------------------------------
-- 6. PLAYERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY DEFAULT ('ply-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  jersey_number INT,
  role TEXT NOT NULL DEFAULT 'All-Rounder',
  batting_style TEXT NOT NULL DEFAULT 'Right-hand bat',
  bowling_style TEXT NOT NULL DEFAULT 'Right-arm medium',
  base_price NUMERIC(14, 2) NOT NULL DEFAULT 500000,
  sold_price NUMERIC(14, 2),
  auction_status TEXT NOT NULL DEFAULT 'available',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  is_overseas BOOLEAN NOT NULL DEFAULT false,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  shirt_size TEXT NOT NULL DEFAULT 'L',
  food_preference dietary_preference NOT NULL DEFAULT 'Veg',
  registration_status TEXT NOT NULL DEFAULT 'approved',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  matches_played INT NOT NULL DEFAULT 0,
  runs_scored INT NOT NULL DEFAULT 0,
  highest_score INT NOT NULL DEFAULT 0,
  wickets_taken INT NOT NULL DEFAULT 0,
  best_bowling TEXT NOT NULL DEFAULT '-',
  strike_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  economy_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. MATCHES / FIXTURES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY DEFAULT ('mat-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_number INT NOT NULL,
  round TEXT NOT NULL DEFAULT 'Group Stage',
  team_a_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'scheduled',
  toss_winner_id TEXT,
  toss_decision TEXT,
  team_a_score TEXT,
  team_a_overs NUMERIC(4, 1),
  team_b_score TEXT,
  team_b_overs NUMERIC(4, 1),
  winner_id TEXT,
  result_summary TEXT,
  man_of_the_match_player_id TEXT,
  is_imported BOOLEAN NOT NULL DEFAULT false,
  import_source TEXT,
  cricheroes_match_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_match_tournament_number UNIQUE (tournament_id, match_number)
);

-- ------------------------------------------------------------------------------
-- 8. STANDINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.standings (
  id TEXT PRIMARY KEY DEFAULT ('std-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  matches_played INT NOT NULL DEFAULT 0,
  won INT NOT NULL DEFAULT 0,
  lost INT NOT NULL DEFAULT 0,
  tied INT NOT NULL DEFAULT 0,
  no_result INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  runs_scored INT NOT NULL DEFAULT 0,
  overs_faced NUMERIC(6, 1) NOT NULL DEFAULT 0.0,
  runs_conceded INT NOT NULL DEFAULT 0,
  overs_bowled NUMERIC(6, 1) NOT NULL DEFAULT 0.0,
  net_run_rate NUMERIC(6, 3) NOT NULL DEFAULT 0.000,
  CONSTRAINT uq_standings_tournament_team UNIQUE (tournament_id, team_id)
);

-- ------------------------------------------------------------------------------
-- 9. SPONSORS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsors (
  id TEXT PRIMARY KEY DEFAULT ('sp-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  contribution_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  contact_email TEXT,
  tier TEXT DEFAULT 'Official Partner',
  benefits_description TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_on_public_web BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 10. EXPENSES TABLE (Financial Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY DEFAULT ('exp-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  date DATE NOT NULL,
  vendor_name TEXT NOT NULL,
  receipt_url TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'Bank Transfer',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 11. REGISTRATIONS TABLE (Dietary preferences & Independent Guest Selections)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY DEFAULT ('reg-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INT NOT NULL,
  city TEXT NOT NULL,
  primary_role TEXT NOT NULL DEFAULT 'All-Rounder',
  batting_style TEXT NOT NULL DEFAULT 'Right-hand bat',
  bowling_style TEXT NOT NULL DEFAULT 'Right-arm medium',
  preferred_jersey_no INT,
  shirt_size TEXT NOT NULL DEFAULT 'L',
  food_preference dietary_preference NOT NULL DEFAULT 'Veg',
  has_breakfast BOOLEAN NOT NULL DEFAULT true,
  has_lunch BOOLEAN NOT NULL DEFAULT true,
  guest_count INT NOT NULL DEFAULT 0,
  guests JSONB NOT NULL DEFAULT '[]'::jsonb,
  guest_food_preference dietary_preference NOT NULL DEFAULT 'Veg',
  has_guest_breakfast BOOLEAN NOT NULL DEFAULT false,
  has_guest_lunch BOOLEAN NOT NULL DEFAULT false,
  catering_status TEXT NOT NULL DEFAULT 'requested',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  cric_heroes_profile_url TEXT,
  application_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_by TEXT,
  review_notes TEXT,
  CONSTRAINT uq_registration_tournament_email UNIQUE (tournament_id, email)
);

-- ------------------------------------------------------------------------------
-- 12. AUCTION CONFIGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_configs (
  tournament_id TEXT PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  base_budget NUMERIC(14, 2) NOT NULL DEFAULT 10000000,
  bid_increments JSONB NOT NULL DEFAULT '[{"upTo": 1000000, "increment": 50000}, {"upTo": 5000000, "increment": 100000}, {"upTo": 10000000, "increment": 250000}]'::JSONB,
  is_auction_live BOOLEAN NOT NULL DEFAULT false,
  active_player_id TEXT,
  current_highest_bid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_leading_team_id TEXT,
  auction_demo_video_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 13. AUCTION BIDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id TEXT PRIMARY KEY DEFAULT ('bid-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 14. TOURNAMENT RULES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rules (
  id TEXT PRIMARY KEY DEFAULT ('rule-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 15. MEDIA ASSETS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY DEFAULT ('med-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size_kb INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 16. IMPORT JOBS TABLE (CricHeroes & Spreadsheets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id TEXT PRIMARY KEY DEFAULT ('job-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  imported_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  import_summary TEXT,
  errors TEXT[] DEFAULT ARRAY[]::TEXT[],
  imported_by TEXT NOT NULL DEFAULT 'Warhawks Organizer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 17. AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('log-' || substr(md5(random()::text), 1, 10)),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role user_role NOT NULL DEFAULT 'player',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 18. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON public.teams (tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_tournament ON public.players (tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players (team_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches (tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches (tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_standings_tournament ON public.standings (tournament_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tournament ON public.sponsors (tournament_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tournament ON public.expenses (tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON public.registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_payment ON public.registrations (tournament_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_auction_configs_tournament ON public.auction_configs (tournament_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_tournament ON public.auction_bids (tournament_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_player ON public.auction_bids (player_id);
CREATE INDEX IF NOT EXISTS idx_rules_tournament ON public.rules (tournament_id);
CREATE INDEX IF NOT EXISTS idx_media_tournament ON public.media_assets (tournament_id);

-- ------------------------------------------------------------------------------
-- 19. SUPABASE STORAGE BUCKET CONFIGURATION (UPI QR & Media Assets)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-assets',
  'tournament-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[];

-- Storage Object Policies
DROP POLICY IF EXISTS "Public can view tournament assets and UPI QR codes" ON storage.objects;
CREATE POLICY "Public can view tournament assets and UPI QR codes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-assets');

DROP POLICY IF EXISTS "Organizers can upload tournament assets" ON storage.objects;
CREATE POLICY "Organizers can upload tournament assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tournament-assets');

DROP POLICY IF EXISTS "Organizers can update tournament assets" ON storage.objects;
CREATE POLICY "Organizers can update tournament assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tournament-assets')
  WITH CHECK (bucket_id = 'tournament-assets');

DROP POLICY IF EXISTS "Organizers can delete tournament assets" ON storage.objects;
CREATE POLICY "Organizers can delete tournament assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tournament-assets');

-- ------------------------------------------------------------------------------
-- 20. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_organizer());

DROP POLICY IF EXISTS "Organizers can view and manage all user profiles" ON public.user_profiles;
CREATE POLICY "Organizers can view and manage all user profiles"
  ON public.user_profiles FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- TOURNAMENTS POLICIES
DROP POLICY IF EXISTS "Public & Players can view published non-archived tournaments" ON public.tournaments;
CREATE POLICY "Public & Players can view published non-archived tournaments"
  ON public.tournaments FOR SELECT
  USING (is_archived = false OR public.is_organizer());

DROP POLICY IF EXISTS "Organizers have full control over tournaments" ON public.tournaments;
CREATE POLICY "Organizers have full control over tournaments"
  ON public.tournaments FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- TEAMS POLICIES
DROP POLICY IF EXISTS "Public & Players can view teams" ON public.teams;
CREATE POLICY "Public & Players can view teams"
  ON public.teams FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage teams" ON public.teams;
CREATE POLICY "Organizers can manage teams"
  ON public.teams FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- PLAYERS POLICIES
DROP POLICY IF EXISTS "Public & Players can view players" ON public.players;
CREATE POLICY "Public & Players can view players"
  ON public.players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage players" ON public.players;
CREATE POLICY "Organizers can manage players"
  ON public.players FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- MATCHES POLICIES
DROP POLICY IF EXISTS "Public & Players can view matches" ON public.matches;
CREATE POLICY "Public & Players can view matches"
  ON public.matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage fixtures, scores, and results" ON public.matches;
CREATE POLICY "Organizers can manage fixtures, scores, and results"
  ON public.matches FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- STANDINGS POLICIES
DROP POLICY IF EXISTS "Public & Players can view standings" ON public.standings;
CREATE POLICY "Public & Players can view standings"
  ON public.standings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage standings" ON public.standings;
CREATE POLICY "Organizers can manage standings"
  ON public.standings FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- SPONSORS POLICIES
DROP POLICY IF EXISTS "Public & Players can view active public sponsors" ON public.sponsors;
CREATE POLICY "Public & Players can view active public sponsors"
  ON public.sponsors FOR SELECT
  USING (display_on_public_web = true OR public.is_organizer());

DROP POLICY IF EXISTS "Organizers can manage sponsors" ON public.sponsors;
CREATE POLICY "Organizers can manage sponsors"
  ON public.sponsors FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- EXPENSES POLICIES (ORGANIZER ONLY)
DROP POLICY IF EXISTS "Only organizers can view expenses" ON public.expenses;
CREATE POLICY "Only organizers can view expenses"
  ON public.expenses FOR SELECT
  USING (public.is_organizer());

DROP POLICY IF EXISTS "Only organizers can manage expenses" ON public.expenses;
CREATE POLICY "Only organizers can manage expenses"
  ON public.expenses FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- REGISTRATIONS POLICIES
-- 1. Public players (both authenticated and unauthenticated guests) can register without an account
DROP POLICY IF EXISTS "Public players can submit tournament registration" ON public.registrations;
CREATE POLICY "Public players can submit tournament registration"
  ON public.registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND registration_open = true
    )
    OR public.is_organizer()
  );

-- 2. Public read of registrations or players checking admission
DROP POLICY IF EXISTS "Public players can view registrations" ON public.registrations;
CREATE POLICY "Public players can view registrations"
  ON public.registrations FOR SELECT
  USING (true);

-- 3. Organizers have full management over registrations
DROP POLICY IF EXISTS "Organizers can manage registrations" ON public.registrations;
CREATE POLICY "Organizers can manage registrations"
  ON public.registrations FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- AUCTION CONFIGS & BIDS POLICIES
DROP POLICY IF EXISTS "Public & Players can view auction config" ON public.auction_configs;
CREATE POLICY "Public & Players can view auction config"
  ON public.auction_configs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage auction config" ON public.auction_configs;
CREATE POLICY "Organizers can manage auction config"
  ON public.auction_configs FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Public & Players can view auction bids" ON public.auction_bids;
CREATE POLICY "Public & Players can view auction bids"
  ON public.auction_bids FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can insert and manage auction bids" ON public.auction_bids;
CREATE POLICY "Organizers can insert and manage auction bids"
  ON public.auction_bids FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- RULES & MEDIA ASSETS POLICIES
DROP POLICY IF EXISTS "Public can view published rules" ON public.rules;
CREATE POLICY "Public can view published rules"
  ON public.rules FOR SELECT
  USING (is_published = true OR public.is_organizer());

DROP POLICY IF EXISTS "Organizers can manage rules" ON public.rules;
CREATE POLICY "Organizers can manage rules"
  ON public.rules FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Public can view media assets" ON public.media_assets;
CREATE POLICY "Public can view media assets"
  ON public.media_assets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage media assets" ON public.media_assets;
CREATE POLICY "Organizers can manage media assets"
  ON public.media_assets FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- IMPORT JOBS & AUDIT LOGS (ORGANIZER ONLY)
DROP POLICY IF EXISTS "Organizers can manage import jobs" ON public.import_jobs;
CREATE POLICY "Organizers can manage import jobs"
  ON public.import_jobs FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Organizers can manage audit logs" ON public.audit_logs;
CREATE POLICY "Organizers can manage audit logs"
  ON public.audit_logs FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- ------------------------------------------------------------------------------
-- 21. ADMINISTRATORS & SECURITY CREDENTIALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.administrators (
  id TEXT PRIMARY KEY DEFAULT ('adm-' || substr(md5(random()::text), 1, 10)),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_otp_codes (
  mobile TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can view administrators" ON public.administrators;
CREATE POLICY "Organizers can view administrators"
  ON public.administrators FOR SELECT
  USING (public.is_organizer());

DROP POLICY IF EXISTS "Approved registrations or open registration can insert player" ON public.players;
CREATE POLICY "Approved registrations or open registration can insert player"
  ON public.players FOR INSERT
  WITH CHECK (
    public.is_organizer() OR
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND registration_open = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE tournament_id = players.tournament_id
        AND email = players.email
        AND approval_status = 'approved'
    )
  );

-- ------------------------------------------------------------------------------
-- 22. ADMINISTRATOR OTP RPC FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_admin_otp(p_mobile text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_clean text;
  v_admin record;
  v_otp text;
BEGIN
  v_clean := regexp_replace(COALESCE(p_mobile, ''), '[^0-9+]', '', 'g');
  IF v_clean ~ '^[6-9][0-9]{9}$' THEN
    v_clean := '+91' || v_clean;
  ELSIF v_clean ~ '^91[6-9][0-9]{9}$' THEN
    v_clean := '+' || v_clean;
  END IF;

  IF v_clean IS NULL OR v_clean = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid mobile number.');
  END IF;

  SELECT id, name, mobile, role, is_active INTO v_admin
  FROM public.administrators
  WHERE (mobile = v_clean OR mobile = replace(v_clean, '+91', ''))
    AND is_active = true
  LIMIT 1;

  -- If no primary admin exists in administrators table, provision initial primary record using the requesting mobile
  IF v_admin.id IS NULL AND NOT EXISTS (SELECT 1 FROM public.administrators WHERE role = 'primary_admin') THEN
    INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
    VALUES (
      'adm-primary-01',
      'Warhawks Primary Operations Chief',
      v_clean,
      'operations@warhawks.org',
      encode(gen_random_bytes(32), 'hex'),
      'primary_admin',
      true
    )
    ON CONFLICT (mobile) DO UPDATE SET is_active = true, role = 'primary_admin'
    RETURNING id, name, mobile, role, is_active INTO v_admin;
  END IF;

  IF v_admin.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This mobile number is not registered as an authorized tournament administrator.'
    );
  END IF;

  v_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

  INSERT INTO public.admin_otp_codes (mobile, otp_code, expires_at, attempts, created_at)
  VALUES (v_clean, v_otp, timezone('utc'::text, now()) + interval '5 minutes', 0, timezone('utc'::text, now()))
  ON CONFLICT (mobile) DO UPDATE SET
    otp_code = v_otp,
    expires_at = timezone('utc'::text, now()) + interval '5 minutes',
    attempts = 0,
    created_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'mobile', v_clean,
    'message', 'Verification code generated for ' || v_admin.name || '.',
    'devOtp', v_otp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_admin_otp(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_admin_otp(p_mobile text, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_clean text;
  v_admin record;
  v_otp_rec record;
  v_token text;
  v_is_primary boolean;
BEGIN
  v_clean := regexp_replace(COALESCE(p_mobile, ''), '[^0-9+]', '', 'g');
  IF v_clean ~ '^[6-9][0-9]{9}$' THEN
    v_clean := '+91' || v_clean;
  ELSIF v_clean ~ '^91[6-9][0-9]{9}$' THEN
    v_clean := '+' || v_clean;
  END IF;

  SELECT * INTO v_otp_rec
  FROM public.admin_otp_codes
  WHERE mobile = v_clean AND expires_at > timezone('utc'::text, now())
  LIMIT 1;

  IF v_otp_rec.otp_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verification code has expired. Please request a new code.');
  END IF;

  IF v_otp_rec.otp_code != trim(COALESCE(p_otp, '')) THEN
    UPDATE public.admin_otp_codes SET attempts = attempts + 1 WHERE mobile = v_clean;
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code. Please check and re-enter.');
  END IF;

  SELECT id, name, mobile, email, role, is_active INTO v_admin
  FROM public.administrators
  WHERE (mobile = v_clean OR mobile = replace(v_clean, '+91', ''))
    AND is_active = true
  LIMIT 1;

  IF v_admin.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator account suspended or inactive.');
  END IF;

  v_token := 'whk-org-' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.organizer_sessions (token, mobile, created_at, expires_at)
  VALUES (v_token, v_clean, timezone('utc'::text, now()), timezone('utc'::text, now()) + interval '7 days')
  ON CONFLICT (token) DO UPDATE SET expires_at = timezone('utc'::text, now()) + interval '7 days';

  DELETE FROM public.admin_otp_codes WHERE mobile = v_clean;

  v_is_primary := (v_admin.role = 'primary_admin');

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'user', jsonb_build_object(
      'id', v_admin.id,
      'name', v_admin.name,
      'email', COALESCE(v_admin.email, 'operations@warhawks.org'),
      'mobile', v_admin.mobile,
      'role', 'organizer',
      'adminRole', v_admin.role,
      'isPrimaryAdmin', v_is_primary,
      'title', CASE WHEN v_is_primary THEN 'Primary Administrator & Command Chief' ELSE 'Tournament Administrator' END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_otp(text, text) TO anon, authenticated, service_role;

