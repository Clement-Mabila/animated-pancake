-- ── Soft-delete columns on sections ─────────────────────────
ALTER TABLE workflow_sections
  ADD COLUMN IF NOT EXISTS is_deleted  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- ── Soft-delete columns on questions ─────────────────────────
ALTER TABLE workflow_questions
  ADD COLUMN IF NOT EXISTS is_deleted  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- ── Canonical default flag on templates ──────────────────────
ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS is_default  boolean      NOT NULL DEFAULT false;

-- ── Mark the canonical default template ──────────────────────
UPDATE workflow_templates
  SET is_default = true
  WHERE id = 'b5603bbb-6caa-4835-b1d2-0ac518bae84e';

-- ── Performance indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sections_template_deleted
  ON workflow_sections(template_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_questions_template_deleted
  ON workflow_questions(template_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_templates_default
  ON workflow_templates(is_default) WHERE is_default = true;
