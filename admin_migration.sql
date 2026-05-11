-- ─────────────────────────────────────────────────────────────
-- Admin panel: users whitelist, 2FA session tracking, audit log, exports
-- Idempotent — safe to run multiple times
-- ─────────────────────────────────────────────────────────────

-- 1. Admin whitelist (links auth.users to app admin record)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users (lower(email));

-- 2. Email OTP step-up / magic-link completion tracking
CREATE TABLE IF NOT EXISTS public.admin_2fa_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  challenge_sent_at  timestamptz,
  passed_at          timestamptz,
  expires_at         timestamptz,
  ip                 text,
  user_agent         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_2fa_user_passed ON public.admin_2fa_sessions (user_id, passed_at DESC);

-- 3. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users (user_id) ON DELETE CASCADE,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  diff          jsonb,
  ip            text
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log (admin_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_log (entity_type, entity_id, occurred_at DESC);

-- 4. Export version metadata (payload not stored)
CREATE TABLE IF NOT EXISTS public.export_versions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id        uuid NOT NULL REFERENCES public.admin_users (user_id) ON DELETE CASCADE,
  scope                text NOT NULL CHECK (scope IN ('one', 'many', 'all')),
  configuration_ids    uuid[] NOT NULL DEFAULT '{}',
  generated_at         timestamptz NOT NULL DEFAULT now(),
  version              int NOT NULL DEFAULT 1,
  payload_sha256       text NOT NULL,
  payload_size_bytes   bigint NOT NULL DEFAULT 0,
  included_incomplete boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_export_versions_generated ON public.export_versions (generated_at DESC);

-- ── RLS: deny by default; allow authenticated self-read where needed for proxy ──

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_2fa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_versions ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-run
DROP POLICY IF EXISTS admin_users_select_self ON public.admin_users;
CREATE POLICY admin_users_select_self ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admin_2fa_select_self ON public.admin_2fa_sessions;
CREATE POLICY admin_2fa_select_self ON public.admin_2fa_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for authenticated on admin_2fa_sessions (writes via service role only)
-- No INSERT/UPDATE/DELETE for authenticated on admin_2fa_sessions, audit, export_versions
-- Service role bypasses RLS for server actions.

COMMENT ON TABLE public.admin_users IS 'Supabase Auth users allowed to access /admin';
COMMENT ON TABLE public.admin_2fa_sessions IS 'Tracks email OTP step-up completion for admin';
COMMENT ON TABLE public.admin_audit_log IS 'Admin configuration edits and actions';
COMMENT ON TABLE public.export_versions IS 'Metadata for JSON exports (no payload stored)';
