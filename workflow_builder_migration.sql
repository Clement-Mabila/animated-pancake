-- Workflow Builder admin UI — schema additions
-- Run after workflow_migration.sql
-- Idempotent — safe to run multiple times

-- Add draft support + timestamps to workflow_templates
ALTER TABLE public.workflow_templates
  ADD COLUMN IF NOT EXISTS is_draft    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Ensure only one draft can exist at a time (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_one_draft
  ON public.workflow_templates (is_draft)
  WHERE is_draft = true;

-- RLS: allow admin writes via service role (admin client bypasses RLS)
-- No extra policies needed — createAdminClient() uses service role key.

COMMENT ON COLUMN public.workflow_templates.is_draft IS
  'True while this template is being edited as a draft. Publish swaps it with is_active.';
