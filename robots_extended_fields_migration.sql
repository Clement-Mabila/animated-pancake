-- Extend robots table with professional onboarding fields
-- Idempotent — safe to run multiple times.

ALTER TABLE public.robots
  ADD COLUMN IF NOT EXISTS model            TEXT,
  ADD COLUMN IF NOT EXISTS firmware_version TEXT,
  ADD COLUMN IF NOT EXISTS floor_level      INTEGER,
  ADD COLUMN IF NOT EXISTS commissioned_at  TIMESTAMPTZ;

-- Seed model suggestions (MBody robot lineup)
INSERT INTO public.config_suggestions (section_id, field_key, value, usage_count, is_mbody_default)
SELECT 'fleet', 'robot_model', v, 0, true
FROM (VALUES ('L3'), ('L4'), ('L50'), ('S5'), ('SP50')) AS t(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.config_suggestions
  WHERE section_id = 'fleet'
    AND field_key   = 'robot_model'
    AND lower(value) = lower(v)
);
