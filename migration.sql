-- ─────────────────────────────────────────────────────────────
-- Phase-Aware Client Configuration Migration
-- Idempotent — safe to run multiple times
-- ─────────────────────────────────────────────────────────────

-- 1. New professional hierarchy roles for client contacts
--    (site_manager already exists — omitted intentionally)
ALTER TYPE contact_role_label ADD VALUE IF NOT EXISTS 'exec';
ALTER TYPE contact_role_label ADD VALUE IF NOT EXISTS 'ops_director';

-- 2. New columns on client_contacts
ALTER TABLE public.client_contacts
  ADD COLUMN IF NOT EXISTS phone                text null,
  ADD COLUMN IF NOT EXISTS orchestrator_user_id uuid  null;

-- 3. Phase enum (idempotent via DO block)
DO $$ BEGIN
  CREATE TYPE config_phase AS ENUM ('early', 'pre_deploy', 'deploy', 'post');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Phase column on configurations (defaults to early for all existing rows)
ALTER TABLE public.configurations
  ADD COLUMN IF NOT EXISTS phase config_phase NOT NULL DEFAULT 'early';

-- 5. One contact → one configuration (enforces the 1:1 rule at DB level)
ALTER TABLE public.configurations
  DROP CONSTRAINT IF EXISTS uq_config_per_contact;
ALTER TABLE public.configurations
  ADD CONSTRAINT uq_config_per_contact UNIQUE (client_contact_id);

-- 6. Unique email per location — required for upsert conflict resolution
ALTER TABLE public.client_contacts
  DROP CONSTRAINT IF EXISTS uq_contact_email_location;
ALTER TABLE public.client_contacts
  ADD CONSTRAINT uq_contact_email_location UNIQUE (email, location_id);
