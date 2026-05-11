-- ─────────────────────────────────────────────────────────────
-- Workflow definition tables + configuration gate / deploy state
-- Idempotent — safe to run multiple times
-- Requires: public.config_phase enum (see migration.sql)
-- ─────────────────────────────────────────────────────────────

-- 1. Workflow template (one active default)
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_sections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid        NOT NULL REFERENCES public.workflow_templates (id) ON DELETE CASCADE,
  slug              text        NOT NULL,
  title             text        NOT NULL,
  subtitle          text,
  sort_order        int         NOT NULL DEFAULT 0,
  checkpoint_count  int         NOT NULL DEFAULT 0,
  active            boolean     NOT NULL DEFAULT true,
  UNIQUE (template_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workflow_questions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id               uuid        NOT NULL REFERENCES public.workflow_templates (id) ON DELETE CASCADE,
  section_slug              text        NOT NULL,
  field_key                 text        NOT NULL,
  label                     text,
  field_type                text        NOT NULL DEFAULT 'text',
  visible_in_phases         config_phase[] NOT NULL,
  is_partial                boolean     NOT NULL DEFAULT false,
  instruction_pre_deploy    text,
  instruction_post_deploy   text,
  dummy_value               text,
  dummy_tooltip             text,
  sort_order                int         NOT NULL DEFAULT 0,
  active                    boolean     NOT NULL DEFAULT true,
  UNIQUE (template_id, section_slug, field_key)
);

CREATE TABLE IF NOT EXISTS public.workflow_deploy_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid        NOT NULL REFERENCES public.workflow_templates (id) ON DELETE CASCADE,
  task_key      text        NOT NULL,
  title         text        NOT NULL,
  description   text,
  sort_order    int         NOT NULL DEFAULT 0,
  UNIQUE (template_id, task_key)
);

-- 2. Configuration extensions
ALTER TABLE public.configurations
  ADD COLUMN IF NOT EXISTS gate_answers jsonb NULL;

ALTER TABLE public.configurations
  ADD COLUMN IF NOT EXISTS deploy_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.configurations
  ADD COLUMN IF NOT EXISTS workflow_template_id uuid NULL
    REFERENCES public.workflow_templates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_questions_template_section
  ON public.workflow_questions (template_id, section_slug);

CREATE INDEX IF NOT EXISTS idx_workflow_sections_template_sort
  ON public.workflow_sections (template_id, sort_order);

-- 3. RLS — definitions are public read; writes via service role / admin only
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_deploy_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_templates_select_all ON public.workflow_templates;
CREATE POLICY workflow_templates_select_all ON public.workflow_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS workflow_sections_select_all ON public.workflow_sections;
CREATE POLICY workflow_sections_select_all ON public.workflow_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS workflow_questions_select_all ON public.workflow_questions;
CREATE POLICY workflow_questions_select_all ON public.workflow_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS workflow_deploy_tasks_select_all ON public.workflow_deploy_tasks;
CREATE POLICY workflow_deploy_tasks_select_all ON public.workflow_deploy_tasks
  FOR SELECT USING (true);

-- 4. Seed default template (fixed id for idempotent upserts)
INSERT INTO public.workflow_templates (id, name, is_active)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Default onboarding', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- Deactivate other templates when default is active (optional hygiene)
UPDATE public.workflow_templates SET is_active = false WHERE id <> '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE public.workflow_templates SET is_active = true WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

-- 5. Sections (match app SECTIONS metadata)
INSERT INTO public.workflow_sections (template_id, slug, title, subtitle, sort_order, checkpoint_count, active)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'roi',          'ROI targets',                            'Baseline costs & outcome goals',           1,  4, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'kpis',         'KPIs & performance metrics',               'Dashboard metric configuration',         2,  5, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'fleet',        'Validate robot fleet & locations',         'Confirm ingested data is accurate',      3,  9, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'contacts',     'Contacts by location & role',            'Site and fleet-level contacts',          4,  7, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'roles',        'Reporting roles & access',               'Access tiers and permissions',           5,  6, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alerts',       'Alert configuration & routing',          'Priority levels and recipients',         6,  7, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'integrations', 'Client systems integrations',            'SSO, task management, facilities & more',7,  6, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'fsm',          'Field Service Management & Work Orders', 'Service, SLA, approval & warranty setup', 8, 11, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'insight',      'Location insight reports',               'Per-site report configuration',          9,  6, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'timezone',     'Time zone & reporting schedule',         'Delivery cadence & report scheduling',    10, 5, true)
ON CONFLICT (template_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  sort_order = EXCLUDED.sort_order,
  checkpoint_count = EXCLUDED.checkpoint_count,
  active = EXCLUDED.active;

-- 6. Questions: __all__ = entire section body visible in listed phases (legacy PHASE_SECTIONS parity)
-- Deploy phase uses operational checklist only (no form sections in deploy)
INSERT INTO public.workflow_questions (template_id, section_slug, field_key, label, field_type, visible_in_phases, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'roi',          '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'kpis',         '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'fleet',        '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'contacts',     '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'roles',        '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alerts',       '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'integrations', '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'fsm',          '__all__', NULL, 'text', ARRAY['post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'insight',      '__all__', NULL, 'text', ARRAY['post'::config_phase], 0, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'timezone',     '__all__', NULL, 'text', ARRAY['pre_deploy'::config_phase, 'post'::config_phase], 0, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  visible_in_phases = EXCLUDED.visible_in_phases,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- 7. Deploy-phase operational checklist (reconciled prompt)
INSERT INTO public.workflow_deploy_tasks (template_id, task_key, title, description, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'ingest_robots', 'Ingest robots', 'Define robot alias, location and sub-location maps in Orchestrator', 1),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'report_cadence', 'Set report cadence', 'Configure daily / weekly / monthly delivery times per customer spec', 2),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'robot_register_validation', 'Robot register validation', 'Verify robot register matches agreed fleet count and models', 3),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'validate_access_controls', 'Validate access controls', 'Each user role logs in and confirms they can see correct data scope', 4),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'orchestrator_training', 'Orchestrator training', 'Conduct training sessions for all customer user roles before handover', 5)
ON CONFLICT (template_id, task_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE public.workflow_templates IS 'Versioned onboarding workflow; one is_active for public resolver';
COMMENT ON TABLE public.workflow_questions IS 'field_key __all__ means entire section; else granular field visibility for phase';

-- 8. Granular overlays (dummy + partial copy) — coexist with __all__ for same section
INSERT INTO public.workflow_questions (
  template_id, section_slug, field_key, label, field_type, visible_in_phases,
  is_partial, instruction_pre_deploy, instruction_post_deploy, dummy_value, dummy_tooltip, sort_order, active
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'alerts',
    'quiet_hours',
    'Alert suppression / quiet hours',
    'text',
    ARRAY['pre_deploy'::config_phase, 'post'::config_phase],
    false,
    NULL,
    NULL,
    '22:00–06:00',
    'MBody default quiet hours. Customer can override.',
    1,
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'kpis',
    'kpi_targets',
    'KPI targets & thresholds (per KPI)',
    'textarea',
    ARRAY['pre_deploy'::config_phase, 'post'::config_phase],
    true,
    'Use industry benchmark dummy targets for now.',
    'Refine using 2 weeks of live operational data.',
    'Industry benchmark values',
    'Placeholder targets until post-deploy tuning.',
    2,
    true
  )
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  visible_in_phases = EXCLUDED.visible_in_phases,
  is_partial = EXCLUDED.is_partial,
  instruction_pre_deploy = EXCLUDED.instruction_pre_deploy,
  instruction_post_deploy = EXCLUDED.instruction_post_deploy,
  dummy_value = EXCLUDED.dummy_value,
  dummy_tooltip = EXCLUDED.dummy_tooltip,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;
