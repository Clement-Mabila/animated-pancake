-- Restores grid layout and section dividers for the 6 dynamic sections.
-- Adds display_group (grid grouping) and divider_before (SectionDivider label) to workflow_questions.
-- Applied across ALL templates — safe to run multiple times.

ALTER TABLE public.workflow_questions
  ADD COLUMN IF NOT EXISTS display_group  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS divider_before TEXT DEFAULT NULL;

-- ── ROI ──────────────────────────────────────────────────────
-- 3-col grid: cost trio
UPDATE public.workflow_questions SET display_group = 'roi_g1'
WHERE section_slug = 'roi'
  AND field_key IN ('baseline_annual_cost', 'target_cost_reduction', 'target_payback_period');

-- 2-col grid: performance pair + divider before first
UPDATE public.workflow_questions SET display_group = 'roi_g2'
WHERE section_slug = 'roi'
  AND field_key IN ('target_sqft_per_robot_day', 'target_util_hours_per_day');

UPDATE public.workflow_questions SET divider_before = 'Performance targets'
WHERE section_slug = 'roi' AND field_key = 'target_sqft_per_robot_day';

-- ── KPIs ─────────────────────────────────────────────────────
UPDATE public.workflow_questions SET divider_before = 'Dashboard configuration'
WHERE section_slug = 'kpis' AND field_key = 'headline_kpi';

-- ── Roles ────────────────────────────────────────────────────
UPDATE public.workflow_questions SET divider_before = 'Report recipients'
WHERE section_slug = 'roles' AND field_key = 'fleet_wide_recipients';

UPDATE public.workflow_questions SET divider_before = 'Access & permissions'
WHERE section_slug = 'roles' AND field_key = 'schedule_amendment_access';

-- ── FSM ──────────────────────────────────────────────────────
UPDATE public.workflow_questions SET divider_before = 'SLA configuration'
WHERE section_slug = 'fsm' AND field_key = 'sla_tier';

-- 2-col grid: sla pair
UPDATE public.workflow_questions SET display_group = 'fsm_g1'
WHERE section_slug = 'fsm'
  AND field_key IN ('sla_tier', 'sla_credit_rate');

UPDATE public.workflow_questions SET divider_before = 'Break/Fix approval'
WHERE section_slug = 'fsm' AND field_key = 'breakfix_approval_method';

UPDATE public.workflow_questions SET divider_before = 'Reporting & feedback'
WHERE section_slug = 'fsm' AND field_key = 'wo_report_delivery';

UPDATE public.workflow_questions SET divider_before = 'Preventive maintenance'
WHERE section_slug = 'fsm' AND field_key = 'pm_schedule_recurrence';

-- 2-col grid: PM pair
UPDATE public.workflow_questions SET display_group = 'fsm_g2'
WHERE section_slug = 'fsm'
  AND field_key IN ('pm_schedule_recurrence', 'pm_completion_recipient');

UPDATE public.workflow_questions SET divider_before = 'Parts & commissioning'
WHERE section_slug = 'fsm' AND field_key = 'defective_parts_handover';

-- ── Insight ──────────────────────────────────────────────────
UPDATE public.workflow_questions SET divider_before = 'Select report components'
WHERE section_slug = 'insight' AND field_key = 'selected_components';

UPDATE public.workflow_questions SET divider_before = 'Select KPIs & set targets'
WHERE section_slug = 'insight' AND field_key = 'selected_kpis';

UPDATE public.workflow_questions SET divider_before = 'Report delivery'
WHERE section_slug = 'insight' AND field_key = 'report_frequency';

-- ── Timezone ─────────────────────────────────────────────────
UPDATE public.workflow_questions SET divider_before = 'Time zones'
WHERE section_slug = 'timezone' AND field_key = 'primary_timezone';

UPDATE public.workflow_questions SET divider_before = 'Report schedule'
WHERE section_slug = 'timezone' AND field_key = 'daily_report_time';

-- 3-col grid: report schedule trio
UPDATE public.workflow_questions SET display_group = 'tz_g1'
WHERE section_slug = 'timezone'
  AND field_key IN ('daily_report_time', 'weekly_report_schedule', 'monthly_report_schedule');
