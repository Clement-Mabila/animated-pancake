-- Fix workflow template seed data to exactly match the current onboarding form
-- Run after workflow_migration.sql + workflow_builder_migration.sql
-- Idempotent — safe to run multiple times

-- ── Correct phase assignments ────────────────────────────────
-- Source of truth: PHASE_SECTIONS in src/lib/phases.ts
--
--   early:      roi, contacts, timezone
--   pre_deploy: roi, kpis, fleet, contacts, roles, alerts, integrations, fsm, insight, timezone, docs
--   post:       kpis, fleet, roles, alerts, integrations, insight

-- Sections that belong to early + pre_deploy (wrong in original seed: had pre_deploy + post)
UPDATE public.workflow_questions
SET visible_in_phases = ARRAY['early'::config_phase, 'pre_deploy'::config_phase]
WHERE template_id = '11111111-1111-1111-1111-111111111111'
  AND section_slug IN ('roi', 'contacts', 'timezone')
  AND field_key = '__all__';

-- Sections that belong to pre_deploy + post (kpis/fleet/roles/alerts/integrations already correct;
-- insight was wrong: had post-only)
UPDATE public.workflow_questions
SET visible_in_phases = ARRAY['pre_deploy'::config_phase, 'post'::config_phase]
WHERE template_id = '11111111-1111-1111-1111-111111111111'
  AND section_slug IN ('kpis', 'fleet', 'roles', 'alerts', 'integrations', 'insight')
  AND field_key = '__all__';

-- FSM belongs to pre_deploy only (wrong in original seed: had post-only)
UPDATE public.workflow_questions
SET visible_in_phases = ARRAY['pre_deploy'::config_phase]
WHERE template_id = '11111111-1111-1111-1111-111111111111'
  AND section_slug = 'fsm'
  AND field_key = '__all__';

-- ── Add missing docs section ─────────────────────────────────

INSERT INTO public.workflow_sections
  (template_id, slug, title, subtitle, sort_order, checkpoint_count, active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'docs', 'Document requests', 'Facility map, org chart, W-9', 11, 3, true
)
ON CONFLICT (template_id, slug) DO UPDATE SET
  title            = EXCLUDED.title,
  subtitle         = EXCLUDED.subtitle,
  sort_order       = EXCLUDED.sort_order,
  checkpoint_count = EXCLUDED.checkpoint_count,
  active           = EXCLUDED.active;

-- Add __all__ gate question for docs (pre_deploy only — no Q2 questions in docs)
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, sort_order, active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'docs', '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase], 0, true
)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  visible_in_phases = EXCLUDED.visible_in_phases,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ── Verification (run manually to confirm) ───────────────────
-- SELECT section_slug, visible_in_phases
-- FROM public.workflow_questions
-- WHERE template_id = '11111111-1111-1111-1111-111111111111'
--   AND field_key = '__all__'
-- ORDER BY sort_order;
