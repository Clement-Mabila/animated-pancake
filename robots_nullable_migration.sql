-- Make optional robot fields nullable
-- serial_id, alias, and map_name are not always known at onboarding time.
-- Idempotent — safe to run multiple times.

ALTER TABLE public.robots
  ALTER COLUMN serial_id DROP NOT NULL,
  ALTER COLUMN alias     DROP NOT NULL,
  ALTER COLUMN map_name  DROP NOT NULL;
