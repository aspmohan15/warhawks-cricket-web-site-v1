-- ==============================================================================
-- WARHAWKS CRICKET TOURNAMENT MANAGEMENT
-- Migration: Fix Row-Level Security (RLS) for Tournaments & Organizers
-- Date: 2026-10-19
-- ==============================================================================

-- 1. Dedicated organizer sessions table for authenticated administrative tokens
CREATE TABLE IF NOT EXISTS public.organizer_sessions (
  token TEXT PRIMARY KEY,
  mobile TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()) + interval '7 days'
);

ALTER TABLE public.organizer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read of sessions for verification queries
DROP POLICY IF EXISTS "Public read organizer_sessions" ON public.organizer_sessions;
CREATE POLICY "Public read organizer_sessions"
  ON public.organizer_sessions FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_organizer_sessions_token_exp ON public.organizer_sessions (token, expires_at);

-- 2. Enhanced is_organizer() function checking both Supabase Auth & Organizer Sessions
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
  -- Check 1: Supabase Auth JWT (for authenticated Supabase accounts)
  IF auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'organizer'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Check 2: HTTP Request Headers (x-organizer-token or Bearer authorization)
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
    -- Fall through gracefully on header parse errors
  END;

  RETURN false;
END;
$$;

-- 3. Security Definer RPC for Organizer Authentication (Works from Web, Server, and Netlify)
CREATE OR REPLACE FUNCTION public.authenticate_organizer(p_mobile text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
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

-- 4. Logout RPC
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

-- 5. Tournaments RLS Policies
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public & Players can view published non-archived tournaments" ON public.tournaments;
CREATE POLICY "Public & Players can view published non-archived tournaments"
  ON public.tournaments FOR SELECT
  USING (is_archived = false OR public.is_organizer());

DROP POLICY IF EXISTS "Organizers have full control over tournaments" ON public.tournaments;
CREATE POLICY "Organizers have full control over tournaments"
  ON public.tournaments FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- 6. Players RLS Policies
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public & Players can view players" ON public.players;
CREATE POLICY "Public & Players can view players"
  ON public.players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage players" ON public.players;
CREATE POLICY "Organizers can manage players"
  ON public.players FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- Remove any old or conflicting player policies
DROP POLICY IF EXISTS "Players can register during open registration" ON public.players;
DROP POLICY IF EXISTS "Organizers can update players" ON public.players;
DROP POLICY IF EXISTS "Organizers can delete players" ON public.players;

-- 7. Registrations RLS Policies (Public self-service during open window, Organizer full control)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public players can view registrations" ON public.registrations;
CREATE POLICY "Public players can view registrations"
  ON public.registrations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers can manage registrations" ON public.registrations;
CREATE POLICY "Organizers can manage registrations"
  ON public.registrations FOR ALL
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());
