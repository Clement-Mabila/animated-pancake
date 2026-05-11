-- ── onboarding_init_tokens ────────────────────────────────────────────────────
-- Idempotent — safe to run multiple times.
--
-- Single-use, short-lived tokens that allow an authenticated admin to start
-- the onboarding form pre-identified, skipping the identity (Step 1) screen.
--
-- Lifecycle:
--   1. Admin clicks "Add user" in /admin/contacts — server action inserts a row
--      with expires_at = NOW() + 1 hour and redeemed_at = NULL.
--   2. Browser navigates to /onboarding?init_token=<id>.
--   3. The onboarding page (server component) validates the token:
--        - exists, not expired, redeemed_at IS NULL
--      Then immediately sets redeemed_at = NOW() (single-use enforcement).
--   4. Admin identity is pre-populated; identity step is skipped.
--
-- No anon/authenticated RLS policies — access is service-role only via
-- createAdminClient() (SUPABASE_SERVICE_ROLE_KEY).

CREATE TABLE IF NOT EXISTS public.onboarding_init_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   TEXT        NOT NULL,
  admin_email     TEXT        NOT NULL,
  admin_name      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  redeemed_at     TIMESTAMPTZ
);

ALTER TABLE public.onboarding_init_tokens ENABLE ROW LEVEL SECURITY;

-- Index to speed up lookup by token (primary key already indexed, this is a no-op
-- but makes intent explicit for future maintainers).
CREATE INDEX IF NOT EXISTS onboarding_init_tokens_expires_at_idx
  ON public.onboarding_init_tokens (expires_at);
