-- ─────────────────────────────────────────────────────────────
-- Admin self-registration: approval_status lifecycle
-- Run after admin_migration.sql
-- Idempotent
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS approval_status text;

UPDATE public.admin_users
SET approval_status = 'active'
WHERE approval_status IS NULL;

ALTER TABLE public.admin_users
  ALTER COLUMN approval_status SET DEFAULT 'active';

ALTER TABLE public.admin_users
  ALTER COLUMN approval_status SET NOT NULL;

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_approval_status_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_approval_status_check
  CHECK (approval_status IN ('pending_email_verify', 'awaiting_approval', 'active'));

COMMENT ON COLUMN public.admin_users.approval_status IS
  'pending_email_verify: registered, must confirm OTP; awaiting_approval: superuser must set active in DB; active: full admin login';

-- ── FK-safe manual whitelist (avoids admin_users_user_id_fkey errors) ─────────
-- `user_id` MUST exist in auth.users. Do NOT paste a fake UUID or the literal text "<auth.users.id>".
-- Option A — Create the user under Dashboard → Authentication first, then run (edit email):

INSERT INTO public.admin_users (user_id, email, full_name, approval_status)
SELECT u.id, lower(trim(u.email)), COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), 'Admin'), 'active'
FROM auth.users AS u
WHERE lower(trim(u.email)) = lower(trim('you@company.com'))
ON CONFLICT (user_id) DO NOTHING;

-- Option B — Inspect IDs (pick the row that matches your admin):

-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 20;
