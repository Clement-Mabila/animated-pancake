-- multi_template_migration.sql
-- Enable multiple concurrent workflow templates with enterprise metadata
-- Run after workflow_builder_migration.sql in Supabase SQL editor
-- Idempotent — safe to run multiple times

-- 1. Remove single-draft constraint (allow multiple concurrent drafts)
DROP INDEX IF EXISTS uq_workflow_one_draft;

-- 2. Add enterprise metadata columns
ALTER TABLE public.workflow_templates
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS department         text,
  ADD COLUMN IF NOT EXISTS version            text,
  ADD COLUMN IF NOT EXISTS tags               text[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color              text,
  ADD COLUMN IF NOT EXISTS last_published_at  timestamptz;

COMMENT ON COLUMN public.workflow_templates.description IS
  'Optional description of what this template is designed for';
COMMENT ON COLUMN public.workflow_templates.department IS
  'Owning department (operations, engineering, customer_success, enterprise, sales, finance, general)';
COMMENT ON COLUMN public.workflow_templates.version IS
  'Optional version label, e.g. v1.0 or 2025 Q1';
COMMENT ON COLUMN public.workflow_templates.tags IS
  'Freeform labels for filtering and categorisation';
COMMENT ON COLUMN public.workflow_templates.color IS
  'Hex color used for the template card in the UI, e.g. #F97316';
COMMENT ON COLUMN public.workflow_templates.last_published_at IS
  'Timestamp of the last time this template was set as active';
