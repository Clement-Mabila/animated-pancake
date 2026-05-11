-- Archive template migration
-- Adds explicit is_archived column to workflow_templates.
-- Previously "archived" was inferred (not active, not draft).
-- This makes the state machine explicit: is_draft | is_active | is_archived
-- Idempotent — safe to run multiple times.

ALTER TABLE public.workflow_templates
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any template that is neither active nor draft is archived
UPDATE public.workflow_templates
  SET is_archived = true
  WHERE is_active = false
    AND is_draft  = false
    AND is_archived = false;
