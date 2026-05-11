-- Configuration Ownership Constraints Migration
-- Replaces the old broad unique constraints with four partial unique indexes
-- that correctly encode the 4 ownership rules.
--
-- Rule 1 — Location-only (no sublocation, no contact): one config per location
-- Rule 2 — Sublocation-only (sublocation, no contact): one config per sublocation
-- Rule 3 — Contact + location (no sublocation): one config per (contact, location)
-- Rule 4 — Contact + sublocation: one config per (contact, sublocation)

-- ── Drop old constraints ────────────────────────────────────────────────────

ALTER TABLE public.configurations
  DROP CONSTRAINT IF EXISTS unique_location_config;

ALTER TABLE public.configurations
  DROP CONSTRAINT IF EXISTS uq_config_per_contact;

-- ── Drop any old indexes with the same names (in case they were created as indexes) ──

DROP INDEX IF EXISTS public.unique_location_config;
DROP INDEX IF EXISTS public.uq_config_per_contact;

-- ── Rule 1: Location-level (no sublocation, no contact) ────────────────────
-- One location-wide config when no contact and no sublocation is involved.

CREATE UNIQUE INDEX IF NOT EXISTS uq_config_location_only
  ON public.configurations (location_id)
  WHERE sub_location_id IS NULL
    AND client_contact_id IS NULL;

-- ── Rule 2: Sublocation-level (sublocation, no contact) ────────────────────
-- One config per sublocation when no contact is involved.

CREATE UNIQUE INDEX IF NOT EXISTS uq_config_sublocation_only
  ON public.configurations (sub_location_id)
  WHERE client_contact_id IS NULL;

-- ── Rule 3: Contact + location (no sublocation) ────────────────────────────
-- A contact can have one location-level config per location,
-- but can also hold separate configs across multiple sublocations.

CREATE UNIQUE INDEX IF NOT EXISTS uq_config_contact_location
  ON public.configurations (client_contact_id, location_id)
  WHERE sub_location_id IS NULL;

-- ── Rule 4: Contact + sublocation ──────────────────────────────────────────
-- A contact can have one config per sublocation.

CREATE UNIQUE INDEX IF NOT EXISTS uq_config_contact_sublocation
  ON public.configurations (client_contact_id, sub_location_id);
