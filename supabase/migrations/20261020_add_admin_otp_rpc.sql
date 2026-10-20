-- ==============================================================================
-- Warhawks Cricket Tournament Management System
-- Migration: Add Security Definer RPCs for Passwordless Admin OTP Authentication
-- Date: 2026-10-20
-- ==============================================================================

-- 1. Ensure tables exist
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

-- Seed primary administrator account if not present
INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
VALUES (
  'adm-primary-01',
  'Warhawks Primary Operations Chief',
  '+917339041622',
  'operations@warhawks.org',
  encode(digest('warhawks2026whk_salt_2026', 'sha256'), 'hex'),
  'primary_admin',
  true
)
ON CONFLICT (mobile) DO UPDATE SET
  is_active = true,
  role = 'primary_admin';

-- 2. RPC: request_admin_otp
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

  -- Check matching administrator
  SELECT id, name, mobile, role, is_active INTO v_admin
  FROM public.administrators
  WHERE (mobile = v_clean OR mobile = replace(v_clean, '+91', ''))
    AND is_active = true
  LIMIT 1;

  -- Auto-seed primary admin if requested
  IF v_admin.id IS NULL AND (v_clean = '+917339041622' OR v_clean LIKE '%7339041622') THEN
    INSERT INTO public.administrators (id, name, mobile, email, password_hash, role, is_active)
    VALUES (
      'adm-primary-01',
      'Warhawks Primary Operations Chief',
      '+917339041622',
      'operations@warhawks.org',
      encode(digest('warhawks2026whk_salt_2026', 'sha256'), 'hex'),
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

  -- Generate 6-digit OTP
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

-- 3. RPC: verify_admin_otp
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

  v_is_primary := (v_admin.role = 'primary_admin' OR v_clean = '+917339041622' OR v_clean LIKE '%7339041622');

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
