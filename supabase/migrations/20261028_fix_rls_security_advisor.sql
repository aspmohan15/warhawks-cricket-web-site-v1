-- Migration: 20261028_fix_rls_security_advisor.sql
-- Description: Enable Row Level Security on public.announcements and harden sensitive tables
-- Resolves Supabase Security Advisor warning: rls_disabled_in_public

BEGIN;

-- 1. Enable RLS on announcements
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing policies on announcements
DROP POLICY IF EXISTS "Organizers can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public & Players can view active announcements" ON public.announcements;

-- 3. Policy: Organizers have full control over announcements
CREATE POLICY "Organizers can manage announcements"
ON public.announcements
FOR ALL
TO public
USING (is_organizer())
WITH CHECK (is_organizer());

-- 4. Policy: Public & Players can view active tournament announcements
CREATE POLICY "Public & Players can view active announcements"
ON public.announcements
FOR SELECT
TO public
USING (is_active = true OR is_organizer());

-- 5. Harden admin_otp_codes: revoke unrestricted public access and limit to organizers
DROP POLICY IF EXISTS "Public access admin_otp_codes" ON public.admin_otp_codes;
DROP POLICY IF EXISTS "Organizers manage admin_otp_codes" ON public.admin_otp_codes;

CREATE POLICY "Organizers manage admin_otp_codes"
ON public.admin_otp_codes
FOR ALL
TO public
USING (is_organizer())
WITH CHECK (is_organizer());

-- 6. Harden organizer_sessions: prevent unauthenticated clients from reading active session tokens
DROP POLICY IF EXISTS "Public read organizer_sessions" ON public.organizer_sessions;
DROP POLICY IF EXISTS "Organizers can view and manage organizer_sessions" ON public.organizer_sessions;

CREATE POLICY "Organizers can view and manage organizer_sessions"
ON public.organizer_sessions
FOR ALL
TO public
USING (is_organizer())
WITH CHECK (is_organizer());

-- 7. Harden administrators: prevent unauthenticated clients from reading password_hash
DROP POLICY IF EXISTS "Public read administrators" ON public.administrators;
DROP POLICY IF EXISTS "Organizers manage administrators" ON public.administrators;

CREATE POLICY "Organizers manage administrators"
ON public.administrators
FOR ALL
TO public
USING (is_organizer())
WITH CHECK (is_organizer());

COMMIT;
